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
    assert "secret" in data[0]


def test_add_account_invalid_secret(client: TestClient):
    """Test that invalid secrets are rejected with 400 error."""
    response = client.post(
        "/api/accounts",
        json={"name": "Test", "issuer": "Test", "secret": "invalid-secret!"}
    )
    assert response.status_code == 400
    assert "Invalid secret" in response.json()["detail"]


def test_add_account_invalid_base32_chars(client: TestClient):
    """Test that secrets with invalid Base32 characters are rejected."""
    response = client.post(
        "/api/accounts",
        json={"name": "Test", "issuer": "Test", "secret": "hellotest"}
    )
    assert response.status_code == 400
    assert "Invalid secret" in response.json()["detail"]

