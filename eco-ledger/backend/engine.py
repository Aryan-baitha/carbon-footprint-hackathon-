import sqlite3
import datetime
import os
from typing import List, Dict, Any
from functools import reduce

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

def clear_db():
    """Clears all events from the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events")
    conn.commit()
    conn.close()

def calculate_current_budget() -> float:
    """
    Event Sourcing Math: Reduces/sums the immutable event logs
    to compute the current carbon footprint total.
    Positive values mean emissions, negative mean reductions.
    Uses Python's functools.reduce for functional-style aggregation.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT carbon_impact FROM events ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return 0.0

    # Functional reduce over the immutable event log
    total = reduce(lambda acc, row: acc + row[0], rows, 0.0)
    return round(total, 2)

def get_all_events() -> List[Dict[str, Any]]:
    """
    Retrieves the complete immutable event log (audit trail).
    This is the core value of Event Sourcing — full history reconstruction.
    Returns events with a running total to show budget evolution.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, action_type, carbon_impact, timestamp FROM events ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()

    events = []
    running_total = 0.0
    for row in rows:
        running_total += row[2]
        events.append({
            "id": row[0],
            "action_type": row[1],
            "carbon_impact": row[2],
            "timestamp": row[3],
            "running_total": round(running_total, 2)
        })
    return events

def get_event_stats() -> Dict[str, Any]:
    """
    Aggregates event data for chart visualizations.
    Returns:
    - total_emissions: sum of all positive impacts
    - total_reductions: sum of all negative impacts (as positive number)
    - net_budget: overall total
    - daily_breakdown: list of {date, emissions, reductions, net} for line chart
    - event_count: total number of events
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Overall aggregates
    cursor.execute("SELECT SUM(carbon_impact) FROM events WHERE carbon_impact > 0")
    total_emissions = cursor.fetchone()[0] or 0.0

    cursor.execute("SELECT SUM(carbon_impact) FROM events WHERE carbon_impact < 0")
    total_reductions_raw = cursor.fetchone()[0] or 0.0

    cursor.execute("SELECT COUNT(*) FROM events")
    event_count = cursor.fetchone()[0] or 0

    # Daily breakdown for time-series chart
    cursor.execute("""
        SELECT 
            DATE(timestamp) as date,
            SUM(CASE WHEN carbon_impact > 0 THEN carbon_impact ELSE 0 END) as emissions,
            SUM(CASE WHEN carbon_impact < 0 THEN carbon_impact ELSE 0 END) as reductions,
            SUM(carbon_impact) as net
        FROM events
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp) ASC
    """)
    daily_rows = cursor.fetchall()
    conn.close()

    daily_breakdown = []
    cumulative = 0.0
    for row in daily_rows:
        cumulative += row[3]
        daily_breakdown.append({
            "date": row[0],
            "emissions": round(row[1], 2),
            "reductions": round(abs(row[2]), 2),
            "net": round(row[3], 2),
            "cumulative": round(cumulative, 2)
        })

    return {
        "total_emissions": round(total_emissions, 2),
        "total_reductions": round(abs(total_reductions_raw), 2),
        "net_budget": round(total_emissions + total_reductions_raw, 2),
        "event_count": event_count,
        "daily_breakdown": daily_breakdown
    }


def greedy_scheduler(tasks: List[Dict[str, Any]], available_slots: List[float]) -> Dict[str, Any]:
    """
    Algorithmic Scheduler using a Best-Fit Decreasing (BFD) greedy approach.
    
    Strategy:
    1. Sort tasks by duration DESCENDING (largest first)
    2. For each task, find the TIGHTEST fitting slot (Best-Fit)
       — i.e., the slot with the smallest remaining capacity that can still fit the task
    3. This minimizes wasted slot capacity and maximizes scheduling efficiency
    
    Time Complexity: O(n * m) where n = tasks, m = slots
    Space Complexity: O(n + m)
    
    :param tasks: List of dicts like {'name': 'Washing Machine', 'duration': 2.0}
    :param available_slots: List of floats representing available off-peak block durations (hours).
    :return: Dict containing scheduled tasks, unscheduled tasks, and utilization metrics.
    """
    if not tasks:
        return {
            'scheduled': [],
            'unscheduled': [],
            'remaining_slots': list(available_slots),
            'utilization_percent': 0.0
        }

    # Sort tasks by duration descending (fit largest tasks first)
    sorted_tasks = sorted(tasks, key=lambda x: x['duration'], reverse=True)
    
    # Track original slot capacities for utilization calculation
    original_capacity = sum(available_slots)
    slots = sorted(available_slots, reverse=True)
    
    scheduled = []
    unscheduled = []
    total_scheduled_duration = 0.0
    
    for task in sorted_tasks:
        task_duration = task['duration']
        
        # Best-Fit: Find the slot with SMALLEST remaining capacity that still fits
        best_slot_idx = -1
        best_remaining = float('inf')
        
        for i, slot in enumerate(slots):
            if slot >= task_duration:
                remaining_after = slot - task_duration
                if remaining_after < best_remaining:
                    best_remaining = remaining_after
                    best_slot_idx = i
        
        if best_slot_idx != -1:
            # Place task in the best-fit slot
            scheduled.append({
                'task': task['name'],
                'duration': task_duration,
                'slot_index_used': best_slot_idx,
                'slot_remaining_after': round(slots[best_slot_idx] - task_duration, 2)
            })
            # Reduce available slot duration
            slots[best_slot_idx] -= task_duration
            total_scheduled_duration += task_duration
        else:
            unscheduled.append(task['name'])
    
    # Calculate utilization percentage
    utilization = (total_scheduled_duration / original_capacity * 100) if original_capacity > 0 else 0.0
    
    return {
        'scheduled': scheduled,
        'unscheduled': unscheduled,
        'remaining_slots': [round(s, 2) for s in slots],
        'utilization_percent': round(utilization, 2)
    }
