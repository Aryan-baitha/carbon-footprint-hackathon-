import pytest
import os
import sqlite3
from backend.engine import init_db, append_event, calculate_current_budget, greedy_scheduler
import backend.engine as engine

# Override DB_PATH for testing
TEST_DB = "test_eco_ledger.db"

@pytest.fixture(autouse=True)
def setup_teardown():
    # Setup: override db path and init
    engine.DB_PATH = TEST_DB
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    init_db()
    
    yield
    
    # Teardown: remove test db
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

def test_event_sourcing_math():
    """Tests if the event sourcing correctly calculates the budget."""
    # Initially 0
    assert calculate_current_budget() == 0.0
    
    # Add an emission (positive)
    append_event("drove_car", 15.5)
    assert calculate_current_budget() == 15.5
    
    # Add a reduction (negative)
    append_event("planted_tree", -5.0)
    assert calculate_current_budget() == 10.5
    
    # Add another emission
    append_event("ate_beef", 20.0)
    assert calculate_current_budget() == 30.5

def test_greedy_scheduler():
    """Tests the algorithmic scheduler."""
    tasks = [
        {"name": "Washing Machine", "duration": 2.0},
        {"name": "Dishwasher", "duration": 1.0},
        {"name": "Dryer", "duration": 1.5}
    ]
    # Slots available: one 3.0 hour block, one 1.0 hour block
    available_slots = [3.0, 1.0]
    
    result = greedy_scheduler(tasks, available_slots)
    
    # The greedy algorithm sorts tasks by duration desc: 2.0, 1.5, 1.0
    # It sorts slots desc: 3.0, 1.0
    # 2.0 goes into 3.0 -> slot becomes 1.0
    # 1.5 doesn't fit in 1.0 or 1.0 -> unscheduled
    # 1.0 goes into 1.0 -> slot becomes 0.0
    
    scheduled_tasks = [s["task"] for s in result["scheduled"]]
    assert "Washing Machine" in scheduled_tasks
    assert "Dishwasher" in scheduled_tasks
    assert "Dryer" in result["unscheduled"]
