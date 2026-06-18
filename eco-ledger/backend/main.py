from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from backend.engine import init_db, append_event, calculate_current_budget, greedy_scheduler
from backend.middleware import sanitize_inputs

app = FastAPI(title="Eco-Ledger API")

# Setup CORS for frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/api/events")
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

@app.get("/api/budget")
async def get_budget():
    """
    Endpoint to fetch the calculated total carbon budget.
    Reduces the event log dynamically.
    """
    try:
        total = calculate_current_budget()
        return {"status": "success", "total_carbon_budget": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/schedule")
async def get_schedule(req: ScheduleRequestModel):
    """
    Endpoint to get optimal task scheduling using a greedy algorithm.
    """
    try:
        tasks_dict = [{"name": t.name, "duration": t.duration} for t in req.tasks]
        result = greedy_scheduler(tasks_dict, req.available_slots)
        return {"status": "success", "schedule": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
