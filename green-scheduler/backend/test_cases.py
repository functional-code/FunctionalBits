import sys
import os
import uuid
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import SessionLocal, JobRecord
import celery_worker

def setup_job(priority="Low"):
    db = SessionLocal()
    job_id = str(uuid.uuid4())
    db_job = JobRecord(
        id=job_id,
        name=f"Test Job {job_id[:4]}",
        requested_region="CAISO_NORTH",
        energy_usage=1.0,
        priority=priority,
        status="Pending",
        execution_region="Pending...",
        carbon_intensity_used=0.0,
        carbon_saved=0.0
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    db.close()
    return job_id

class MockTask:
    def retry(self, countdown, exc):
        return Exception(f"Task Retried: {exc} with countdown {countdown}")

def run_tests():
    db = SessionLocal()
    celery_worker.celery_app.conf.update(task_always_eager=True, task_eager_propagates=True)
    
    with open("test_results.log", "w") as f:
        f.write("===========================================\n")
        f.write("--- Testing Case 1: Under 50 (mock: 30) ---\n")
        f.write("===========================================\n")
        job_id_1 = setup_job(priority="Low")
        f.write(f"Created Job: {job_id_1}\n")
        
        with patch('celery_worker.get_current_intensity', return_value=30):
            try:
                res = celery_worker.process_job.delay(job_id_1)
                f.write(f"Process Job Output: {res.result}\n")
                db.expire_all()
                job = db.query(JobRecord).filter(JobRecord.id == job_id_1).first()
                f.write(f"Final DB Status: {job.status}\n")
                f.write(f"Execution Region: {job.execution_region}\n")
            except Exception as e:
                f.write(f"Exception: {e}\n")

        f.write("\n===========================================\n")
        f.write("--- Testing Case 2: 50 to 100 (mock: 70) ---\n")
        f.write("===========================================\n")
        job_id_2 = setup_job(priority="Low")
        f.write(f"Created Job: {job_id_2}\n")
        
        with patch('celery_worker.get_current_intensity', return_value=70):
            try:
                res = celery_worker.process_job.delay(job_id_2)
                f.write(f"Process Job Output: {res.result}\n")
            except Exception as e:
                db.expire_all()
                job = db.query(JobRecord).filter(JobRecord.id == job_id_2).first()
                f.write(f"Exception Raised (Expected): {e}\n")
                f.write(f"Final DB Status (Expected: Delayed): {job.status}\n")

        f.write("\n===========================================\n")
        f.write("--- Testing Case 3: Above 100 (mock: 150) ---\n")
        f.write("===========================================\n")
        job_id_3 = setup_job(priority="Low")
        f.write(f"Created Job: {job_id_3}\n")
        
        # Test Case 3: We make the initial requested region "150", but we need the test 
        # to trigger a region hop. The loop checks available_regions. Let's mock the 
        # intensity based on the requested region parameter to simulate a hop.
        def mock_intensity(region):
            if region == "CAISO_NORTH": return 150 # Start high
            if region == "NO1": return 20          # Greenest option
            return 250                             # Very high alternatives
            
        with patch('celery_worker.get_current_intensity', side_effect=mock_intensity):
            try:
                res = celery_worker.process_job.delay(job_id_3)
                f.write(f"Process Job Output: {res.result}\n")
                db.expire_all()
                job = db.query(JobRecord).filter(JobRecord.id == job_id_3).first()
                f.write(f"Final DB Status (Expected: Completed): {job.status}\n")
                f.write(f"Execution Region Hopped To: {job.execution_region}\n")
                f.write(f"Carbon Saved: {job.carbon_saved}\n")
            except Exception as e:
                f.write(f"Exception: {e}\n")
            
if __name__ == "__main__":
    run_tests()
