import pytest
from fastapi.testclient import TestClient
import time

def test_full_workflow(client, test_file, db):
    # 1. Upload file
    with open(test_file, "rb") as f:
        response = client.post(
            "/upload",
            files={"file": ("test.fasta", f, "text/plain")}
        )
    assert response.status_code == 200
    upload_id = response.json()["id"]
    
    # 2. Start analysis
    response = client.post(f"/analysis/{upload_id}", json={"method": "mafft"})
    assert response.status_code == 200
    task_id = response.json()["task_id"]
    
    # 3. Poll for status (with timeout)
    max_retries = 30
    retry_count = 0
    while retry_count < max_retries:
        response = client.get(f"/status/{task_id}")
        assert response.status_code == 200
        status = response.json()["status"]
        
        if status in ["SUCCESS", "FAILURE"]:
            break
            
        time.sleep(1)
        retry_count += 1
    
    assert retry_count < max_retries, "Task timed out"
    
    # 4. Check results
    response = client.get("/uploads")
    assert response.status_code == 200
    uploads = response.json()
    
    found_upload = next(
        (u for u in uploads if u["id"] == upload_id),
        None
    )
    assert found_upload is not None
    assert len(found_upload["analyses"]) > 0 