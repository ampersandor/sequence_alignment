import requests

response = requests.post(
    "http://localhost:8000/run",
    json={
        "tool": "mafft",
        "path": "/data/input.fasta",
        "session_id": "test-123"
    }
)
print(response.json())
