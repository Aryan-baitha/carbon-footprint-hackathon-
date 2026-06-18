from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import time

from backend.engine import init_db, append_event, calculate_current_budget, greedy_scheduler, get_all_events, get_event_stats
from backend.middleware import sanitize_inputs, rate_limiter

app = FastAPI(
    title="Eco-Ledger API",
    description="Event-sourced carbon footprint tracker with greedy scheduling",
    version="2.0.0"
)

# Setup CORS for frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to every response for defense-in-depth."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com;"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """ASGI middleware that enforces per-IP rate limiting."""
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        
        if not rate_limiter.is_allowed(client_ip):
            remaining = rate_limiter.get_remaining(client_ip)
            return JSONResponse(
                status_code=429,
                content={
                    "status": "error",
                    "message": "Rate limit exceeded. Please wait before making more requests.",
                    "remaining_requests": remaining
                }
            )
        
        response = await call_next(request)
        # Add rate limit headers for client awareness
        remaining = rate_limiter.get_remaining(client_ip)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Limit"] = "60"
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"status": "error", "message": "Internal Server Error", "detail": str(exc)})


# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# Models
class EventModel(BaseModel):
    action_type: str
    carbon_impact: float

class TaskModel(BaseModel):
    name: str
    duration: float

class ScheduleRequestModel(BaseModel):
    tasks: List[TaskModel]
    available_slots: List[float]


# --- Health Check ---
@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring and deployment verification."""
    return {
        "status": "healthy",
        "service": "Eco-Ledger API",
        "version": "2.0.0",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


# --- Event Sourcing Endpoints ---
@app.post("/api/events", status_code=201)
@sanitize_inputs
async def add_event(event: EventModel):
    """
    Endpoint to append a new carbon event (Event-Sourcing pattern).
    Uses the @sanitize_inputs decorator for security.
    """
    try:
        event_id = append_event(event.action_type, event.carbon_impact)
        return {"status": "success", "event_id": event_id, "message": "Event appended to ledger."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/events")
async def list_events():
    """
    Retrieves the full immutable event log (audit trail).
    Core feature of Event Sourcing — complete history reconstruction.
    """
    try:
        events = get_all_events()
        return {"status": "success", "events": events, "count": len(events)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/budget")
async def get_budget():
    """
    Endpoint to fetch the calculated total carbon budget.
    Reduces the event log dynamically using functional reduce.
    """
    try:
        total = calculate_current_budget()
        return {"status": "success", "total_carbon_budget": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def get_stats():
    """
    Aggregated statistics for data visualization (charts).
    Returns emissions vs reductions breakdown and daily time-series data.
    """
    try:
        stats = get_event_stats()
        return {"status": "success", "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Scheduler Endpoint ---
@app.post("/api/schedule", status_code=200)
async def get_schedule(req: ScheduleRequestModel):
    """
    Endpoint to get optimal task scheduling using a Best-Fit Decreasing greedy algorithm.
    Returns scheduled/unscheduled tasks with slot utilization metrics.
    """
    try:
        tasks_dict = [{"name": t.name, "duration": t.duration} for t in req.tasks]
        result = greedy_scheduler(tasks_dict, req.available_slots)
        return {"status": "success", "schedule": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
