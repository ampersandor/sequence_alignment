import pytest
from fastapi.testclient import TestClient
from app.models import Upload, Analysis

def test_upload_file(client, test_file):
    # Test file upload
    with open(test_file, "rb") as f:
        response = client.post(
            "/upload",
            files={"file": ("test.fasta", f, "text/plain")}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "filename" in data
    assert data["filename"] == "test.fasta"

def test_start_analysis(client, test_file, db):
    # First upload a file
    with open(test_file, "rb") as f:
        response = client.post(
            "/upload",
            files={"file": ("test.fasta", f, "text/plain")}
        )
    upload_id = response.json()["id"]
    
    # Start analysis
    response = client.post(f"/analysis/{upload_id}", json={"method": "mafft"})
    assert response.status_code == 200
    data = response.json()
    assert "task_id" in data
    assert "analysis_id" in data

def test_get_uploads(client, test_file, db):
    # Upload a file first
    with open(test_file, "rb") as f:
        client.post(
            "/upload",
            files={"file": ("test.fasta", f, "text/plain")}
        )
    
    # Get uploads
    response = client.get("/uploads")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert "filename" in data[0]
    assert "analyses" in data[0]

@pytest.mark.asyncio
async def test_task_status(client, test_file, db):
    # Upload and start analysis
    with open(test_file, "rb") as f:
        response = client.post(
            "/upload",
            files={"file": ("test.fasta", f, "text/plain")}
        )
    upload_id = response.json()["id"]
    
    response = client.post(f"/analysis/{upload_id}", json={"method": "mafft"})
    task_id = response.json()["task_id"]
    
    # Check status
    response = client.get(f"/status/{task_id}")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data

def test_error_handling(client):
    # Test non-existent upload ID
    response = client.post("/analysis/999999", json={"method": "mafft"})
    assert response.status_code == 404
    
    # Test invalid method
    response = client.post("/analysis/1", json={"method": "invalid_method"})
    assert response.status_code == 422 