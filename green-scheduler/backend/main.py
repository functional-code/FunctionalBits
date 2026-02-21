from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid
import datetime
from sqlalchemy import create_engine, Column, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

# --- Database Setup (Supabase) ---
# For Supabase, you get a Postgres connection string like postgresql://user:password@db.supabase.co:5432/postgres
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db") # Fallback to sqlite for initial testing if no SUPABASE URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class JobRecord(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    requested_region = Column(String)
    energy_usage = Column(Float)
    priority = Column(String)
    status = Column(String)  # Pending, Running, Completed, Delayed
    execution_region = Column(String)
    carbon_intensity_used = Column(Float)
    carbon_saved = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Models ---
class JobCreate(BaseModel):
    name: str
    region: Optional[str] = "CAISO_NORTH"
    energy_usage: float
    priority: str

class JobResponse(BaseModel):
    id: str
    name: str
    requested_region: str
    energy_usage: float
    priority: str
    status: str
    execution_region: Optional[str]
    carbon_intensity_used: Optional[float]
    carbon_saved: Optional[float]
    created_at: datetime.datetime
    completed_at: Optional[datetime.datetime]

class StatsResponse(BaseModel):
    total_carbon_saved: float
    total_jobs_processed: int
    current_intensity: float
    highest_region: dict
    lowest_region: dict
    history: List[dict] # Will hold graph data

# --- FastAPI App ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    yield
    # Shutdown logic

app = FastAPI(title="Green Scheduler API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow frontend in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routes ---

@app.post("/api/jobs", response_model=JobResponse)
async def submit_job(job_in: JobCreate, db: Session = Depends(get_db)):
    job_id = str(uuid.uuid4())
    db_job = JobRecord(
        id=job_id,
        name=job_in.name,
        requested_region=job_in.region,
        energy_usage=job_in.energy_usage,
        priority=job_in.priority,
        status="Pending",
        execution_region="Pending...",
        carbon_intensity_used=0.0,
        carbon_saved=0.0
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    # TODO: Invoke Celery Task here instead of calling immediately
    from celery_worker import process_job
    process_job.delay(job_id)
    
    return db_job

@app.get("/api/jobs", response_model=List[JobResponse])
def read_jobs(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    jobs = db.query(JobRecord).order_by(JobRecord.created_at.desc()).offset(skip).limit(limit).all()
    return jobs

@app.delete("/api/jobs/{job_id}", response_model=dict)
def delete_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"status": "success"}

@app.get("/api/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    # Calculate total saved in last 48 hours
    forty_eight_hours_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=48)
    
    from sqlalchemy import func
    total_saved = db.query(func.sum(JobRecord.carbon_saved)).filter(
        JobRecord.created_at >= forty_eight_hours_ago,
        JobRecord.status == 'Completed'
    ).scalar() or 0.0

    total_jobs_processed = db.query(func.count(JobRecord.id)).filter(
        JobRecord.status == 'Completed'
    ).scalar() or 0

    # Calculate true total array of all intensities to get a global average
    available_regions = ["CAISO_NORTH", "ERCOT_ALL", "ISONE_ALL", "NYISO_NYC", "PJM_ALL", "NO1"]
    from celery_worker import get_current_intensity
    
    all_intensities = []
    highest_carbon = {"region": "Unknown", "intensity": 0}
    lowest_carbon = {"region": "Unknown", "intensity": 99999}
    
    for r in available_regions:
        intensity = get_current_intensity(r)
        if intensity:
            all_intensities.append(intensity)
            if intensity > highest_carbon["intensity"]:
                highest_carbon = {"region": r, "intensity": intensity}
            if intensity < lowest_carbon["intensity"]:
                lowest_carbon = {"region": r, "intensity": intensity}
                
    current_avg_intensity = 0
    if len(all_intensities) > 0:
        current_avg_intensity = round(sum(all_intensities) / len(all_intensities), 1)

    # Generate mock 48-hour history data for the dashboard chart
    import random
    history = []
    for i in range(48, 0, -1):
        time_point = datetime.datetime.utcnow() - datetime.timedelta(hours=i)
        history.append({
            "timestamp": time_point.strftime("%H:%M"),
            "intensity": random.randint(80, 400)
        })
    # Add the real average intensity as the latest point
    history.append({
        "timestamp": datetime.datetime.utcnow().strftime("%H:%M"),
        "intensity": current_avg_intensity
    })

    return {
        "total_carbon_saved": total_saved,
        "total_jobs_processed": total_jobs_processed,
        "current_intensity": current_avg_intensity,
        "highest_region": highest_carbon,
        "lowest_region": lowest_carbon,
        "history": history
    }
