import sqlite3
import datetime
import os
from typing import List, Dict, Any

DB_PATH = "eco_ledger.db"

def init_db():
    """Initializes the SQLite database with the event log table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Using Event Sourcing Pattern: immutable append-only event log
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type TEXT NOT NULL,
            carbon_impact REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def append_event(action_type: str, carbon_impact: float) -> int:
    """Appends an immutable event to the ledger."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO events (action_type, carbon_impact) VALUES (?, ?)",
        (action_type, carbon_impact)
    )
    event_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return event_id

def calculate_current_budget() -> float:
    """
    Event Sourcing Math: Reduces/sums the immutable event logs
    to compute the current carbon footprint total.
    Positive values mean emissions, negative mean reductions.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT SUM(carbon_impact) FROM events")
    result = cursor.fetchone()[0]
    conn.close()
    
    return float(result) if result is not None else 0.0

def greedy_scheduler(tasks: List[Dict[str, Any]], available_slots: List[float]) -> Dict[str, Any]:
    """
    Algorithmic Scheduler using a Greedy approach.
    Suggests when to perform heavy tasks based on mock off-peak grid hours.
    
    :param tasks: List of dicts like {'name': 'Washing Machine', 'duration': 2.0}
    :param available_slots: List of floats representing available off-peak block durations (hours).
    :return: Dict containing scheduled tasks and any unscheduled tasks.
    """
    # Sort tasks by duration descending (fit largest tasks first into largest slots)
    sorted_tasks = sorted(tasks, key=lambda x: x['duration'], reverse=True)
    
    # Sort available slots descending
    slots = sorted(available_slots, reverse=True)
    
    scheduled = []
    unscheduled = []
    
    for task in sorted_tasks:
        task_duration = task['duration']
        placed = False
        
        # Try to find the tightest fitting slot that can accommodate the task
        # To make it simple greedy, we just try to find the first slot that fits
        # after sorting slots descending. Alternatively, best fit:
        best_slot_idx = -1
        for i, slot in enumerate(slots):
            if slot >= task_duration:
                best_slot_idx = i
                # Found the largest slot that can fit it (since sorted descending)
                # To be more optimal, we could look for the smallest slot that fits,
                # but simple greedy fits it in the largest available to guarantee it fits.
                break
                
        if best_slot_idx != -1:
            # Place task
            scheduled.append({
                'task': task['name'],
                'duration': task_duration,
                'slot_index_used': best_slot_idx
            })
            # Reduce available slot duration
            slots[best_slot_idx] -= task_duration
            placed = True
        else:
            unscheduled.append(task['name'])
            
    return {
        'scheduled': scheduled,
        'unscheduled': unscheduled,
        'remaining_slots': slots
    }
