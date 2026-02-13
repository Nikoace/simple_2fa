from fastapi.testclient import TestClient


def test_read_accounts_include_secret(client: TestClient):
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
    assert "secret" in first_account
