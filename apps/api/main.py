import os
from pathlib import Path
from dotenv import load_dotenv

# Load env vars BEFORE any app imports — modules like billing.py read env at import time.
#
# The path must be explicit. A bare load_dotenv() searches upward from the
# current working directory, and the documented setup runs uvicorn from the
# repository root, where `apps/api/.env` is not on that path: find_dotenv()
# returns "" and the file created by README step 3 is silently ignored. With
# no .env loaded, importing this module raised
# "SUPABASE_URL environment variable not set" and the server never started.
_API_DIR = Path(__file__).resolve().parent
load_dotenv(_API_DIR / ".env")  # Load .env base config
load_dotenv(_API_DIR / ".env.local", override=True)  # Load .env.local overrides (Stripe keys, secrets)

from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from jose import jwt, jwk, JWTError
from typing import Dict, Any
import requests
import uuid

from .utils.error_sanitization import sanitize_error_message, sanitize_validation_error
from .routers import direct_agents, profile, action_plan_detector, business_context, dashboard_metrics, insights, business_intelligence, cross_agent_intelligence, persona_detection, strategy_detection, intelligence, outputs_hub, similarity_detection, user_data, invitations, billing, mobile_push
from .middleware.mfa import verify_aal2
from .middleware.ai_rate_limit import enforce_ai_rate_limit
from .middleware.locale import LocaleMiddleware
from .routers.content_recommendations import router as content_recommendations_router
from .routers.roi_recommendations import router as roi_recommendations_router
from .routers.opportunity_recommendations import router as opportunity_recommendations_router
from .routers.campaign_plan_recommendations import router as campaign_plan_recommendations_router
from .routers.dashboard_recommendations import router as dashboard_recommendations_router
from .routers.campaign_metrics import router as campaign_metrics_router
from .routers.campaigns_v2 import campaigns_router
from .routers.brand_guidelines_v2 import brand_guidelines_router
from .routers.synthetic_personas_v2 import synthetic_personas_router
from .routers.marketing_strategies_v2 import marketing_strategies_router
from .routers.organizations_v2 import organizations_router
from .routers.clients_v2 import clients_router
from .routers.documents_v2 import documents_router
from .routers.team import router as team_router
from .routers.outputs import router as outputs_router
from .routers.collaboration import router as collaboration_router
from .routers.marketing_strategy_outputs_legacy import router as marketing_strategy_outputs_legacy_router
from .routes import cache_metrics
from .auth.supabase_auth import get_current_user

import logging
import sys

# Configure the root logger to output to console
logger = logging.getLogger()

# Respect LOG_LEVEL environment variable, default to INFO
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logger.setLevel(getattr(logging, log_level, logging.INFO))

# Create a console handler and set its level
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(getattr(logging, log_level, logging.INFO))

# Create a formatter and add it to the handler
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)

# Add the handler to the logger
logger.addHandler(console_handler)

# Silence noisy HTTP/2 protocol libraries that generate excessive DEBUG logs
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("hpack").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.INFO)

# --- Configuration ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET") # For local HS256 validation

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL environment variable not set")

# Determine if we are in a local development environment
IS_LOCAL_DEV = SUPABASE_JWT_SECRET is not None

JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
AUDIENCE = "authenticated"
ISSUER = f"{SUPABASE_URL}/auth/v1"

# Security: Disable debug mode in production
# Debug mode exposes stack traces and internal errors to clients
DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"

app = FastAPI(
    title="STRAŦUM API",
    description="Intelligence Over Execution - Marketing Intelligence Platform",
    version="1.0.0",
    debug=DEBUG_MODE,
    # Disable API docs in production for security
    docs_url="/docs" if DEBUG_MODE else None,
    redoc_url="/redoc" if DEBUG_MODE else None,
    openapi_url="/openapi.json" if DEBUG_MODE else None,
)

# Add CORS middleware
# Get allowed origins from environment variable, default to common dev origins
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:56310,http://127.0.0.1:56310"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Specific origins required when using credentials
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add locale detection middleware
# Extracts locale from X-Locale or Accept-Language headers
# Sets request.state.locale for use by agents
app.add_middleware(LocaleMiddleware)

# --- Security Headers Middleware ---
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Add security headers to all API responses.

    Defense in depth: Even though Cloud Run enforces HTTPS,
    these headers protect against various attack vectors.

    Reference: OWASP Secure Headers Project
    https://owasp.org/www-project-secure-headers/
    """
    response = await call_next(request)

    # HSTS: Force HTTPS for 1 year (31536000 seconds)
    # Tells browsers to NEVER attempt HTTP connections
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # X-Frame-Options: Prevent clickjacking
    # API responses should never be embedded in iframes
    response.headers["X-Frame-Options"] = "DENY"

    # X-Content-Type-Options: Prevent MIME sniffing
    # Forces browsers to respect Content-Type header
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Referrer-Policy: Control referrer information
    # Prevents leaking full URLs in cross-origin requests
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Content-Security-Policy: Minimal CSP for API
    # JSON API doesn't need script/style resources
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"

    return response

# --- Global Exception Handlers for Error Sanitization ---

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Handle HTTP exceptions with sanitized error messages.

    In production (DEBUG=false):
    - Sanitizes error messages to prevent information disclosure
    - Hides stack traces and internal details
    - Logs full errors server-side

    In development (DEBUG=true):
    - Returns detailed error messages for debugging
    """
    request_id = str(uuid.uuid4())

    # Add request ID to request state for logging
    request.state.request_id = request_id

    sanitized_response = sanitize_error_message(
        error=exc,
        status_code=exc.status_code,
        debug_mode=DEBUG_MODE,
        request_id=request_id
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=sanitized_response
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle Pydantic validation errors with sanitized messages.

    Validation errors can expose field names, allowed values, and schema details.
    """
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # Log validation error details server-side
    logger.warning(
        f"Validation error: {len(exc.errors())} field(s) invalid",
        extra={
            "request_id": request_id,
            "errors": exc.errors(),
            "path": request.url.path
        }
    )

    sanitized_response = sanitize_validation_error(
        validation_errors=exc.errors(),
        debug_mode=DEBUG_MODE
    )

    if request_id:
        sanitized_response["request_id"] = request_id

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=sanitized_response
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler for unexpected exceptions.

    CRITICAL: In production, this prevents stack traces from being exposed to clients.
    All unhandled exceptions are logged server-side and return generic 500 errors.
    """
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # Log full exception details server-side
    logger.exception(
        f"Unhandled exception: {type(exc).__name__}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method
        },
        exc_info=exc
    )

    sanitized_response = sanitize_error_message(
        error=exc,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        debug_mode=DEBUG_MODE,
        request_id=request_id
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=sanitized_response
    )


# Include routers
app.include_router(documents_router.router, prefix="/api/v1", dependencies=[Depends(verify_aal2)])
app.include_router(direct_agents.router, dependencies=[Depends(verify_aal2)])
app.include_router(organizations_router.router, dependencies=[Depends(verify_aal2)])
app.include_router(clients_router.router, dependencies=[Depends(verify_aal2)])
app.include_router(campaigns_router.router, dependencies=[Depends(verify_aal2)])
app.include_router(profile.router, dependencies=[Depends(verify_aal2)])
app.include_router(action_plan_detector.router, prefix="/api/v1", dependencies=[Depends(verify_aal2), Depends(enforce_ai_rate_limit)])
app.include_router(business_context.router, dependencies=[Depends(verify_aal2)])
app.include_router(dashboard_metrics.router, prefix="/api/v1/dashboard", tags=["dashboard"], dependencies=[Depends(verify_aal2)])
app.include_router(insights.router, dependencies=[Depends(verify_aal2)])
app.include_router(business_intelligence.router, dependencies=[Depends(verify_aal2)])
app.include_router(cross_agent_intelligence.router, dependencies=[Depends(verify_aal2)])
app.include_router(synthetic_personas_router.router, dependencies=[Depends(verify_aal2)])
app.include_router(persona_detection.router, dependencies=[Depends(verify_aal2), Depends(enforce_ai_rate_limit)])
app.include_router(strategy_detection.router, dependencies=[Depends(verify_aal2), Depends(enforce_ai_rate_limit)])
app.include_router(intelligence.router, dependencies=[Depends(verify_aal2)])
app.include_router(marketing_strategies_router.router, dependencies=[Depends(verify_aal2)])
app.include_router(brand_guidelines_router.router, dependencies=[Depends(verify_aal2)])
app.include_router(outputs_hub.router, dependencies=[Depends(verify_aal2)])
app.include_router(outputs_router, dependencies=[Depends(verify_aal2)])
app.include_router(marketing_strategy_outputs_legacy_router, dependencies=[Depends(verify_aal2)])
app.include_router(content_recommendations_router, dependencies=[Depends(verify_aal2), Depends(enforce_ai_rate_limit)])
app.include_router(roi_recommendations_router, dependencies=[Depends(verify_aal2), Depends(enforce_ai_rate_limit)])
app.include_router(opportunity_recommendations_router, dependencies=[Depends(verify_aal2), Depends(enforce_ai_rate_limit)])
app.include_router(campaign_plan_recommendations_router, dependencies=[Depends(verify_aal2), Depends(enforce_ai_rate_limit)])
app.include_router(dashboard_recommendations_router, dependencies=[Depends(verify_aal2), Depends(enforce_ai_rate_limit)])
app.include_router(campaign_metrics_router, dependencies=[Depends(verify_aal2)])
app.include_router(similarity_detection.router, dependencies=[Depends(verify_aal2)])
app.include_router(cache_metrics.router, prefix="/api/v1", dependencies=[Depends(verify_aal2)])
app.include_router(user_data.router, dependencies=[Depends(verify_aal2)])
app.include_router(team_router, dependencies=[Depends(verify_aal2)])
app.include_router(collaboration_router, dependencies=[Depends(verify_aal2)])
app.include_router(invitations.router)  # PUBLIC endpoint - no authentication required
app.include_router(billing.router)  # Mixed auth: webhook is PUBLIC (Stripe signature), other endpoints use get_current_user
app.include_router(mobile_push.router)

# --- JWT Verification Logic ---

jwks_cache = {}

def get_jwks():
    """Fetches and caches the JSON Web Key Set (JWKS) from Supabase."""
    if not jwks_cache:
        response = requests.get(JWKS_URL)
        response.raise_for_status()
        jwks_cache.update(response.json())
    return jwks_cache

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user_with_org(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """
    Dependency to decode and validate the JWT from the Authorization header.
    - For local dev, uses HS256 with the SUPABASE_JWT_SECRET.
    - For production, uses ES256 with the public key from the JWKS endpoint.
    - Also ensures that an `org_id` is present in the token's app_metadata.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        if IS_LOCAL_DEV:
            # Local development: use HS256 with the shared secret
            payload = jwt.decode(
                token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience=AUDIENCE, issuer=ISSUER
            )
        else:
            # Production: use ES256 with the public key from JWKS
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            if not kid:
                raise JWTError("Missing 'kid' in token header")
            jwks = get_jwks()
            rsa_key = next((key for key in jwks["keys"] if key["kid"] == kid), None)
            if not rsa_key:
                raise JWTError("Matching key not found in JWKS")
            payload = jwt.decode(
                token, rsa_key, algorithms=["ES256"], audience=AUDIENCE, issuer=ISSUER
            )

        # --- Multi-tenancy Check ---
        org_id = payload.get("app_metadata", {}).get("org_id")
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not associated with an organization"
            )
        return payload

    except JWTError as e:
        raise credentials_exception from e
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail="Could not fetch signing keys") from e


# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to STRAŦUM API - Intelligence Over Execution"}

@app.get("/api/v1/health")
def health_check():
    """
    Liveness plus enough configuration detail to diagnose a fresh install.

    `demo_mode` is reported because the application deliberately imports without
    credentials, so the warning that model output is canned would otherwise only
    appear on the first agent call. scripts/verify-setup.sh reads this.
    """
    from apps.api.config.gemini_client import is_demo_mode

    demo = is_demo_mode()
    return {
        "status": "ok",
        "demo_mode": demo,
        "model_provider": "canned (DEMO_MODE)" if demo else "google-genai",
    }

@app.get("/api/v1/me")
async def read_current_user(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Example of a protected route.
    It uses the `get_current_user` dependency to ensure the user is authenticated.
    Returns the decoded JWT payload (user claims).
    """
    return current_user
