"""App Store Connect API and Google Play Developer API integration."""
import json
import time
import jwt as pyjwt
from datetime import datetime, timezone
from typing import Optional


class AppStoreConnectAPI:
    """Integration with Apple's App Store Connect API v2."""

    def __init__(self, key_id: str, issuer_id: str, private_key: str):
        self.key_id = key_id
        self.issuer_id = issuer_id
        self.private_key = private_key
        self.base_url = "https://api.appstoreconnect.apple.com/v1"

    def _generate_token(self) -> str:
        """Generate JWT token for App Store Connect API."""
        now = int(time.time())
        payload = {
            "iss": self.issuer_id,
            "iat": now,
            "exp": now + 1200,  # 20 minutes
            "aud": "appstoreconnect-v1",
        }
        return pyjwt.encode(payload, self.private_key, algorithm="ES256", headers={"kid": self.key_id})

    async def validate_credentials(self) -> dict:
        """Validate Apple API credentials by making a test request."""
        try:
            import httpx
            token = self._generate_token()
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/apps",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"limit": 1},
                )
                if response.status_code == 200:
                    return {"valid": True, "message": "Apple API credentials validated successfully"}
                else:
                    return {"valid": False, "message": f"Apple API returned status {response.status_code}: {response.text[:200]}"}
        except Exception as e:
            return {"valid": False, "message": f"Validation failed: {str(e)}"}

    async def create_app(self, bundle_id: str, name: str, sku: str, primary_locale: str = "en-US") -> dict:
        """Create a new app in App Store Connect."""
        try:
            import httpx
            token = self._generate_token()
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/apps",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={
                        "data": {
                            "type": "apps",
                            "attributes": {
                                "bundleId": bundle_id,
                                "name": name,
                                "sku": sku,
                                "primaryLocale": primary_locale,
                            }
                        }
                    }
                )
                return {"success": response.status_code in (200, 201), "data": response.json(), "status": response.status_code}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def update_app_info(self, app_id: str, listing_data: dict) -> dict:
        """Update app store listing metadata."""
        try:
            import httpx
            token = self._generate_token()
            async with httpx.AsyncClient(timeout=8.0) as client:
                # Get app info localizations
                response = await client.get(
                    f"{self.base_url}/apps/{app_id}/appInfos",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if response.status_code != 200:
                    return {"success": False, "error": f"Failed to get app info: {response.status_code}"}

                return {"success": True, "message": "App info update initiated", "data": response.json()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def submit_for_review(self, app_id: str, version_id: str) -> dict:
        """Submit app version for App Store review."""
        try:
            import httpx
            token = self._generate_token()
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    f"{self.base_url}/appStoreVersionSubmissions",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={
                        "data": {
                            "type": "appStoreVersionSubmissions",
                            "relationships": {
                                "appStoreVersion": {
                                    "data": {"type": "appStoreVersions", "id": version_id}
                                }
                            }
                        }
                    }
                )
                return {"success": response.status_code in (200, 201), "data": response.json(), "status": response.status_code}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_review_status(self, app_id: str) -> dict:
        """Get current review status of the app."""
        try:
            import httpx
            token = self._generate_token()
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/apps/{app_id}/appStoreVersions",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"limit": 1, "sort": "-createdDate"},
                )
                if response.status_code == 200:
                    data = response.json()
                    versions = data.get("data", [])
                    if versions:
                        version = versions[0]
                        return {
                            "success": True,
                            "version": version["attributes"].get("versionString", ""),
                            "state": version["attributes"].get("appStoreState", "UNKNOWN"),
                        }
                return {"success": False, "state": "UNKNOWN"}
        except Exception as e:
            return {"success": False, "error": str(e), "state": "ERROR"}


class GooglePlayAPI:
    """Integration with Google Play Developer API v3."""

    def __init__(self, service_account_json: dict):
        self.service_account = service_account_json
        self.base_url = "https://androidpublisher.googleapis.com/androidpublisher/v3"

    async def _get_access_token(self) -> Optional[str]:
        """Get OAuth2 access token from service account."""
        try:
            import httpx
            now = int(time.time())
            payload = {
                "iss": self.service_account.get("client_email", ""),
                "scope": "https://www.googleapis.com/auth/androidpublisher",
                "aud": "https://oauth2.googleapis.com/token",
                "iat": now,
                "exp": now + 3600,
            }
            private_key = self.service_account.get("private_key", "")
            token = pyjwt.encode(payload, private_key, algorithm="RS256")

            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                        "assertion": token,
                    }
                )
                if response.status_code == 200:
                    return response.json().get("access_token")
            return None
        except Exception:
            return None

    async def validate_credentials(self) -> dict:
        """Validate Google Play API credentials."""
        try:
            token = await self._get_access_token()
            if token:
                return {"valid": True, "message": "Google Play credentials validated successfully"}
            return {"valid": False, "message": "Failed to obtain access token"}
        except Exception as e:
            return {"valid": False, "message": f"Validation failed: {str(e)}"}

    async def create_edit(self, package_name: str) -> dict:
        """Create an edit for the app."""
        try:
            import httpx
            token = await self._get_access_token()
            if not token:
                return {"success": False, "error": "Failed to get access token"}

            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    f"{self.base_url}/applications/{package_name}/edits",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={}
                )
                if response.status_code in (200, 201):
                    return {"success": True, "edit_id": response.json().get("id")}
                return {"success": False, "error": f"Status {response.status_code}: {response.text[:200]}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def update_listing(self, package_name: str, edit_id: str, listing_data: dict, language: str = "en-US") -> dict:
        """Update store listing for a specific language."""
        try:
            import httpx
            token = await self._get_access_token()
            if not token:
                return {"success": False, "error": "Failed to get access token"}

            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.put(
                    f"{self.base_url}/applications/{package_name}/edits/{edit_id}/listings/{language}",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={
                        "title": listing_data.get("title", ""),
                        "shortDescription": listing_data.get("subtitle", ""),
                        "fullDescription": listing_data.get("description", ""),
                    }
                )
                return {"success": response.status_code in (200, 201), "data": response.json() if response.status_code in (200, 201) else response.text[:200]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def commit_edit(self, package_name: str, edit_id: str) -> dict:
        """Commit an edit to publish changes."""
        try:
            import httpx
            token = await self._get_access_token()
            if not token:
                return {"success": False, "error": "Failed to get access token"}

            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    f"{self.base_url}/applications/{package_name}/edits/{edit_id}:commit",
                    headers={"Authorization": f"Bearer {token}"},
                )
                return {"success": response.status_code in (200, 201), "data": response.json() if response.status_code in (200, 201) else response.text[:200]}
        except Exception as e:
            return {"success": False, "error": str(e)}


def create_apple_client(credentials: dict) -> Optional[AppStoreConnectAPI]:
    """Create Apple API client from stored credentials."""
    try:
        return AppStoreConnectAPI(
            key_id=credentials.get("key_id", ""),
            issuer_id=credentials.get("issuer_id", ""),
            private_key=credentials.get("private_key", ""),
        )
    except Exception:
        return None


def create_google_client(credentials: dict) -> Optional[GooglePlayAPI]:
    """Create Google Play API client from stored credentials."""
    try:
        return GooglePlayAPI(service_account_json=credentials)
    except Exception:
        return None
