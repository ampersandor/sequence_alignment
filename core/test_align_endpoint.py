import requests
import json

def test_align_endpoint():
    """Test the /align endpoint with correct request format"""
    
    base_url = "http://localhost:8000"
    file_path = "28c3e9a3-9f4d-492b-9bca-e080f7b9aab4_16S.fasta"
    
    # Correct request format
    correct_payload = {
        "align_tool": "mafft",
        "options": "--auto"
    }
    
    print("Testing correct request format...")
    try:
        response = requests.post(
            f"{base_url}/align/{file_path}",
            json=correct_payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
    except json.JSONDecodeError as e:
        print(f"Invalid JSON response: {e}")
        print(f"Raw response: {response.text}")

def test_invalid_requests():
    """Test various invalid request formats to see error messages"""
    
    base_url = "http://localhost:8000"
    file_path = "test.fasta"
    
    test_cases = [
        {
            "name": "Empty JSON",
            "payload": {}
        },
        {
            "name": "Missing align_tool",
            "payload": {"options": "--auto"}
        },
        {
            "name": "Missing options", 
            "payload": {"align_tool": "mafft"}
        },
        {
            "name": "Invalid align_tool",
            "payload": {"align_tool": "invalid_tool", "options": "--auto"}
        },
        {
            "name": "Wrong field names",
            "payload": {"tool": "mafft", "params": "--auto"}
        }
    ]
    
    for test_case in test_cases:
        print(f"\nTesting: {test_case['name']}")
        try:
            response = requests.post(
                f"{base_url}/align/{file_path}",
                json=test_case['payload'],
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Status Code: {response.status_code}")
            if response.status_code == 422:
                error_details = response.json()
                print(f"Validation Error: {error_details}")
            else:
                print(f"Response: {response.json()}")
                
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    print("=== Testing /align endpoint ===")
    test_align_endpoint()
    
    print("\n=== Testing invalid requests ===")
    test_invalid_requests() 