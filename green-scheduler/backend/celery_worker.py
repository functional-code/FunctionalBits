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
        return random.choice([100, 250, 400])
        
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
    return random.choice([100, 250, 400])

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
    low_threshold = 150
    high_threshold = 250
    norway_intensity = 20

    # User inputs
    priority = job.priority
    energy_usage_kwh = job.energy_usage

    if intensity < low_threshold:
        # Scenario A: Green Window (Run Immediately)
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
        execution_region = "Norway (Mocked)"
        carbon_used = norway_intensity
        # Carbon saved based on energy usage: (Intensity - Greener_Intensity) * kWh
        calc_intensity = intensity if intensity else 300 # fallback for calc
        carbon_saved = float(calc_intensity - norway_intensity) * energy_usage_kwh

    # Simulate heavy workload (sleep for 5 seconds)
    import time
    time.sleep(5)

    # Update job record with results
    job.status = "Completed"
    job.execution_region = execution_region
    job.carbon_intensity_used = carbon_used
    job.carbon_saved = carbon_saved
    
    db.commit()
    db.refresh(job)
    db.close()

    return f"Job {job_id} Completed in {execution_region} saving {carbon_saved} gCO2."
