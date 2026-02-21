import os
import sys
import time
from celery import Celery
from dotenv import load_dotenv

# Ensure the backend directory is in the Python path for Celery imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

redis_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "green_scheduler",
    broker=redis_url,
    backend=redis_url
)

import requests
from requests.auth import HTTPBasicAuth

def get_watttime_token():
    username = os.getenv("WATTTIME_USERNAME")
    password = os.getenv("WATTTIME_PASSWORD")
    if not username or not password:
        return None
    
    login_url = 'https://api2.watttime.org/v2/login'
    rsp = requests.get(login_url, auth=HTTPBasicAuth(username, password))
    if rsp.status_code == 200:
        return rsp.json().get('token')
    return None

def get_current_intensity(region="CAISO_NORTH"):
    token = get_watttime_token()
    if not token:
        # Fallback to random if credentials not provided
        import random
        # Fully randomize so the dashboard "greenest" and "worst" jump around dynamically
        return float(random.choice([20, 40, 80, 100, 150, 250, 300, 400]))
        
    forecast_url = 'https://api2.watttime.org/v3/forecast'
    headers = {'Authorization': f'Bearer {token}'}
    params = {'region': region, 'signal_type': 'co2_moer'}
    rsp = requests.get(forecast_url, headers=headers, params=params)
    
    if rsp.status_code == 200:
        data = rsp.json().get('data', [])
        if data and len(data) > 0:
            moer_lbs_mwh = data[0].get('value')
            if moer_lbs_mwh is not None:
                return round(float(moer_lbs_mwh) * 0.453592, 1)
            
    # Fallback if API fails
    import random
    return float(random.choice([45, 90, 151, 200, 40]))

@celery_app.task(name="process_job", bind=True, max_retries=10)
def process_job(self, job_id: str):
    from main import SessionLocal, JobRecord
    
    db = SessionLocal()
    job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    
    if not job:
        db.close()
        return "Job not found"
        
    job.status = "Running"
    db.commit()

    # Logic Engine implementation
    # Get current intensity for the requested region
    intensity = get_current_intensity(job.requested_region)
    low_threshold = 120
    high_threshold = 200

    # User inputs
    priority = job.priority
    energy_usage_kwh = job.energy_usage
    
    # Calculate universal highest/lowest intensities for this point in time
    # (Still useful for logging or other logic if needed)
    available_regions = ["CAISO_NORTH", "ERCOT_ALL", "ISONE_ALL", "NYISO_NYC", "PJM_ALL", "NO1"]
    highest_carbon = intensity if intensity else 300
    lowest_carbon = intensity if intensity else 300
    
    for r in available_regions:
        r_intensity = get_current_intensity(r)
        if r_intensity:
            if r_intensity > highest_carbon:
                highest_carbon = r_intensity
            if r_intensity < lowest_carbon:
                lowest_carbon = r_intensity

    if intensity < low_threshold:
        # Scenario A: Green Window (Run Immediately)
        # It ran where requested, so technically no "extra" carbon was saved by hopping
        execution_region = job.requested_region
        carbon_used = intensity
        carbon_saved = 0.0
    elif low_threshold <= intensity < high_threshold and priority != "High":
        # Scenario B: Delay (Medium Carbon, wait 2 mins)
        job.status = "Delayed"
        db.commit()
        db.close()
        # Retry in 2 minutes (120 seconds)
        raise self.retry(countdown=120, exc=Exception("Delayed due to Medium Carbon"))
    else:
        # Scenario C: Region-Hop (High Carbon OR High Priority bypassing delay)
        # Bypassing delay means if it's high priority and medium carbon, it hops instead of waiting.
        execution_region = job.requested_region
        carbon_used = intensity if intensity else 300
        
        for r in available_regions:
            r_intensity = get_current_intensity(r)
            if r_intensity and r_intensity < carbon_used:
                carbon_used = r_intensity
                execution_region = r

        # Calculate savings relative to the originally requested region
        carbon_saved = float(intensity - carbon_used) * energy_usage_kwh
        if carbon_saved < 0:
            carbon_saved = 0.0

    # Set up initial continuous job state
    job.status = "Running"
    job.execution_region = execution_region
    job.carbon_intensity_used = carbon_used
    job.carbon_saved = carbon_saved
    
    db.commit()
    db.refresh(job)
    db.close()

    # Queue the continuous accumulator task to run every 60 seconds
    accumulate_carbon.apply_async((job_id,), countdown=45)

    return f"Job {job_id} started continuously in {execution_region}."

@celery_app.task(name="accumulate_carbon", bind=True)
def accumulate_carbon(self, job_id: str):
    from main import SessionLocal, JobRecord
    
    db = SessionLocal()
    try:
        job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
        
        if not job or job.status != "Running":
            return f"Job {job_id} stopped or not found."
            
        if job.requested_region == job.execution_region:
            current_savings = 0.0
        else:
            intensity_requested = get_current_intensity(job.requested_region)
            intensity_execution = get_current_intensity(job.execution_region)
            
            # Ensure intensities are not None
            if intensity_requested is not None and intensity_execution is not None:
                current_savings = float(intensity_requested - intensity_execution) * job.energy_usage
            else:
                current_savings = 0.0
            
        if current_savings > 0:
            job.carbon_saved += current_savings
            
        db.commit()
    except Exception as e:
        print(f"Transient error in accumulate_carbon for {job_id}: {e}")
    finally:
        db.close()
        # Always re-queue for the next tick regardless of errors
        if not celery_app.conf.task_always_eager:
            accumulate_carbon.apply_async((job_id,), countdown=45)
            
    return f"Accumulated carbon tick processed for {job_id}"
