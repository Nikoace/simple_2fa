from fastapi.testclient import TestClient

def test_read_accounts_no_secret(client: TestClient):
    # Create an account
    client.post(
        "/api/accounts",
        json={"name": "No Secret Test", "issuer": "TestCorp", "secret": "JBSWY3DPEHPK3PXP"}
    )

    response = client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    first_account = data[0]
    
    # This assertion is expected to fail currently, as secret IS returned
    assert "secret" not in first_account, "Secret corrupted the response!"
