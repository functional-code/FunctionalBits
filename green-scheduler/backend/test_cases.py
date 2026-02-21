import sys
import os
import uuid
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import SessionLocal, JobRecord
import celery_worker

def setup_job(priority="Low", requested_region="CAISO_NORTH"):
    db = SessionLocal()
    job_id = str(uuid.uuid4())
    db_job = JobRecord(
        id=job_id,
        name=f"Test Job {job_id[:4]}",
        requested_region=requested_region,
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
    
    test_cases = [
        {"name": "Combo 1: Int < 120, Priority Low", "mock_int": 100, "priority": "Low", "expected": "Completed (No Hop)"},
        {"name": "Combo 2: Int < 120, Priority High", "mock_int": 100, "priority": "High", "expected": "Completed (No Hop)"},
        {"name": "Combo 3: 120 <= Int < 200, Priority Low", "mock_int": 150, "priority": "Low", "expected": "Delayed"},
        {"name": "Combo 4: 120 <= Int < 200, Priority High", "mock_int": 150, "priority": "High", "expected": "Completed (Region Hop)"},
        {"name": "Combo 5: Int >= 200, Priority Low", "mock_int": 250, "priority": "Low", "expected": "Completed (Region Hop)"},
        {"name": "Combo 6: Int >= 200, Priority High", "mock_int": 250, "priority": "High", "expected": "Completed (Region Hop)"},
    ]

    with open("test_results.log", "w") as f:
        for tc in test_cases:
            f.write("===========================================\n")
            f.write(f"--- {tc['name']} ---\n")
            f.write(f"Parameters: Priority={tc['priority']}, Mocked Region Intensity={tc['mock_int']}\n")
            
            job_id = setup_job(priority=tc['priority'])
            f.write(f"Created Job: {job_id}\n")
            
            def mock_intensity_func(region):
                if region == "CAISO_NORTH": return tc['mock_int']
                if region == "NO1": return 20   # Always available green region
                return 300                      # Other regions bad
                
            with patch('celery_worker.get_current_intensity', side_effect=mock_intensity_func):
                try:
                    res = celery_worker.process_job.delay(job_id)
                    f.write(f"Process Job Output: {res.result}\n")
                    db.expire_all()
                    job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
                    f.write(f"Final DB Status: {job.status}\n")
                    f.write(f"Execution Region: {job.execution_region}\n")
                    f.write(f"Carbon Saved: {job.carbon_saved}\n")
                except Exception as e:
                    f.write(f"Exception Raised: {e}\n")
                    db.expire_all()
                    job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
                    f.write(f"Final DB Status: {job.status}\n")
            f.write("===========================================\n\n")

if __name__ == "__main__":
    run_tests()
