from mcp.server.fastmcp import FastMCP
import httpx
import json

# Initialize FastMCP server
mcp = FastMCP("Simple 2FA MCP Server")

@mcp.tool()
def get_2fa_codes() -> str:
    """
    Retrieve current 2FA codes for all accounts from the running backend service.
    Returns a JSON string containing the list of accounts with their codes and remaining TTL.
    """
    try:
        # Access the backend API directly
        # The backend should be running on localhost:8000
        response = httpx.get("http://localhost:8000/api/accounts")
        response.raise_for_status()
        
        # The API already returns the data structure we want
        # [{"name":..., "issuer":..., "code":..., "ttl":...}, ...]
        accounts_list = response.json()
        
        return json.dumps(accounts_list, indent=2)
    except httpx.RequestError as exc:
        return json.dumps({"error": f"An error occurred while requesting {exc.request.url!r}."})
    except httpx.HTTPStatusError as exc:
        return json.dumps({"error": f"Error response {exc.response.status_code} while requesting {exc.request.url!r}."})
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    # Standard MCP server runs over stdio by default
    mcp.run()
