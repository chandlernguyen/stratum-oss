"""
Supabase JWT authentication for FastAPI
Handles JWT token validation and user extraction for both local and production environments
"""
from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from typing import Dict, Any, Optional
import jwt
import os
import requests
from apps.api.utils.database import get_supabase_client
import logging

logger = logging.getLogger(__name__)

class SupabaseAuth:
    def __init__(self):
        # No default secret. The previous default was Supabase's well-known
        # local secret, which is public knowledge, so a token signed with it
        # verified anywhere the variable was unset.
        self.jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        self.supabase_url = os.getenv("SUPABASE_URL", "http://127.0.0.1:56321")
        self.is_local = self.supabase_url.startswith("http://127.0.0.1") or self.supabase_url.startswith("http://localhost")
        self.issuer = f"{self.supabase_url}/auth/v1"
        self._jwks_keys = None
        
    def get_jwks_keys(self):
        """Get JWKS keys from Supabase (both local and production)"""
        if self._jwks_keys is None:
            try:
                # Fetch JWKS from Supabase
                jwks_url = f"{self.supabase_url}/auth/v1/.well-known/jwks.json"
                response = requests.get(jwks_url, timeout=10)
                response.raise_for_status()
                self._jwks_keys = response.json()
            except Exception as e:
                logger.error(f"Failed to fetch JWKS keys: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to fetch JWT verification keys"
                )
        return self._jwks_keys
        
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode JWT token (uses ES256 with JWKS for both local and production)"""
        try:
            # First, check the token's algorithm
            unverified_header = jwt.get_unverified_header(token)
            token_alg = unverified_header.get("alg")

            # If token uses HS256 (legacy local setup), use shared secret
            if token_alg == "HS256" and self.is_local:
                # Legacy local development: use HS256 with the shared secret.
                if not self.jwt_secret:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="SUPABASE_JWT_SECRET is not configured",
                    )
                payload = jwt.decode(
                    token,
                    self.jwt_secret,
                    algorithms=["HS256"],
                    audience="authenticated",
                    issuer=self.issuer,
                )
            else:
                # Use ES256 (Elliptic Curve) with JWKS for both local and production
                # (Local Supabase CLI v2.x+ uses ES256 by default with signing_keys.json)
                key_id = unverified_header.get("kid")

                if not key_id:
                    raise jwt.InvalidTokenError("Token missing key ID")

                # Find the matching key in JWKS
                jwks = self.get_jwks_keys()
                public_key = None

                for key in jwks.get("keys", []):
                    if key.get("kid") == key_id:
                        # Use ECAlgorithm for ES256 keys (Elliptic Curve)
                        public_key = jwt.algorithms.ECAlgorithm.from_jwk(key)
                        break

                if not public_key:
                    raise jwt.InvalidTokenError("Unable to find matching key")

                # Verify token with public key using ES256
                payload = jwt.decode(
                    token,
                    public_key,
                    algorithms=["ES256"],
                    audience="authenticated",
                    issuer=self.issuer,
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )
    
    def get_user_from_token(self, token: str) -> Dict[str, Any]:
        """Extract user information from JWT token"""
        payload = self.verify_jwt_token(token)
        
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role", "authenticated"),
            "app_metadata": payload.get("app_metadata", {}),
            "user_metadata": payload.get("user_metadata", {})
        }
    
    def get_supabase_client_with_token(self, token: str) -> Client:
        """Get Supabase client with user's JWT token for RLS"""
        # No default. A fallback here would fail open: a misconfigured
        # deployment would silently target the wrong project rather than
        # reporting the missing configuration.
        supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
        if not supabase_anon_key:
            raise ValueError(
                "SUPABASE_ANON_KEY environment variable is not set; "
                "cannot build an RLS-scoped Supabase client."
            )

        # Create Supabase client with user's access token
        # This ensures RLS policies work correctly
        from supabase import create_client
        client = create_client(self.supabase_url, supabase_anon_key)
        client.auth.set_session(access_token=token, refresh_token="")
        return client

# Global instance
supabase_auth = SupabaseAuth()

# FastAPI dependency for extracting authenticated user
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
) -> Dict[str, Any]:
    """FastAPI dependency to get current authenticated user with org_id"""
    try:
        # Never log the bearer token, not even a prefix: it is credential
        # material and log pipelines are rarely as protected as the tokens
        # themselves. The outcome is logged below instead.
        logger.info("Attempting bearer token authentication")
        user = supabase_auth.get_user_from_token(credentials.credentials)
        logger.info(f"Successfully authenticated user: {user.get('email', 'unknown')}")

        # Fetch org_id, full_name, and org_name from users table (with org join)
        # Note: Must specify FK relationship explicitly due to multiple FKs between users and organizations
        user_id = user.get("id")
        if user_id:
            user_response = supabase.table("users").select("org_id, full_name, organizations!users_org_id_fkey(name)").eq("id", user_id).execute()
            if user_response.data and len(user_response.data) > 0:
                user_data = user_response.data[0]
                user["org_id"] = user_data.get("org_id")
                user["full_name"] = user_data.get("full_name")
                # Extract org name from joined organizations table
                org_data = user_data.get("organizations")
                if org_data:
                    user["org_name"] = org_data.get("name")
                logger.info(f"User org_id: {user.get('org_id')}, full_name: {user.get('full_name')}")

        return user
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

async def get_supabase_client_for_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Client:
    """FastAPI dependency to get Supabase client with user's token"""
    try:
        return supabase_auth.get_supabase_client_with_token(credentials.credentials)
    except Exception as e:
        logger.error(f"Failed to create authenticated Supabase client: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not create authenticated database connection"
        )

async def get_current_user_with_org(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
) -> Dict[str, Any]:
    """
    FastAPI dependency to get current user with organization validation.

    LONG-TERM SOLUTION: Always fetches org_id from database (single source of truth).
    The users table is the authoritative source for organization membership.
    """
    user = await get_current_user(credentials, supabase)

    # org_id MUST come from database (already fetched by get_current_user)
    org_id = user.get("org_id")

    if not org_id:
        # This should never happen if user exists in users table
        # Log this as an error case for monitoring
        logger.error(f"User {user.get('email')} has no org_id in users table")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an organization. Please contact support."
        )

    # Add convenient fields for easier access
    user["user_id"] = user.get("id") or user.get("sub")

    # org_id is already set from database, no need to set it again

    return user