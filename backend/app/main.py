from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.routers import admin, applications, auth, health, users

app = FastAPI(
    title="JobTrackr API",
    description="Job Application Tracker with AI Resume Analyzer - Backend API",
    version="0.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Attach limiter to FastAPI state
app.state.limiter = limiter


# Custom RateLimitExceeded handler returning uniform {"detail": "..."}
@app.exception_handler(RateLimitExceeded)
def custom_rate_limit_exceeded_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    """Format rate limit exceptions consistently as JSON."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
    )


# CORS configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(applications.router)


@app.get("/")
def root() -> dict[str, str]:
    """Root endpoint providing service information."""
    return {
        "service": "JobTrackr API",
        "docs": "/docs",
        "health": "/api/health",
        "environment": settings.ENVIRONMENT,
    }
