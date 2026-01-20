from fastapi.testclient import TestClient

def test_add_account(client: TestClient):
    response = client.post(
        "/api/accounts",
        json={"name": "Test Service", "issuer": "TestCorp", "secret": "JBSWY3DPEHPK3PXP"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Service"
    assert data["id"] is not None

def test_list_accounts(client: TestClient):
    # Add one first
    client.post(
        "/api/accounts",
        json={"name": "Test Service", "issuer": "TestCorp", "secret": "JBSWY3DPEHPK3PXP"}
    )
    
    response = client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "code" in data[0]
    assert "ttl" in data[0]
