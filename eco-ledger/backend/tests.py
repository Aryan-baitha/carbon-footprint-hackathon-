import pytest
import os
import sqlite3
from backend.engine import init_db, append_event, calculate_current_budget, greedy_scheduler, get_all_events, get_event_stats
from backend.middleware import sanitize_string, RateLimiter
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


# ==========================================
# 1. Event Sourcing Math Tests
# ==========================================

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

def test_empty_budget():
    """Edge case: budget is zero when no events exist."""
    assert calculate_current_budget() == 0.0

def test_negative_net_budget():
    """Tests that budget can go negative (net carbon reduction — a good thing!)."""
    append_event("planted_100_trees", -500.0)
    append_event("solar_panel_install", -200.0)
    append_event("drove_car", 10.0)
    assert calculate_current_budget() == -690.0

def test_large_batch_events():
    """Stress test: handles 100+ events correctly."""
    expected = 0.0
    for i in range(150):
        impact = 1.5 if i % 2 == 0 else -0.5
        append_event(f"action_{i}", impact)
        expected += impact
    
    result = calculate_current_budget()
    assert abs(result - expected) < 0.01  # floating point tolerance


# ==========================================
# 2. Event History (Audit Trail) Tests
# ==========================================

def test_get_all_events_returns_full_history():
    """Tests that get_all_events returns the complete immutable audit trail."""
    append_event("drove_car", 15.5)
    append_event("planted_tree", -5.0)
    append_event("ate_beef", 20.0)
    
    events = get_all_events()
    assert len(events) == 3
    assert events[0]["action_type"] == "drove_car"
    assert events[0]["carbon_impact"] == 15.5
    assert events[0]["running_total"] == 15.5
    assert events[1]["running_total"] == 10.5
    assert events[2]["running_total"] == 30.5

def test_get_all_events_empty():
    """Edge case: returns empty list when no events."""
    events = get_all_events()
    assert events == []

def test_get_event_stats():
    """Tests aggregated statistics for chart visualization."""
    append_event("drove_car", 15.5)
    append_event("planted_tree", -5.0)
    append_event("bus_travel", 3.0)
    
    stats = get_event_stats()
    assert stats["total_emissions"] == 18.5  # 15.5 + 3.0
    assert stats["total_reductions"] == 5.0  # abs(-5.0)
    assert stats["net_budget"] == 13.5
    assert stats["event_count"] == 3
    assert len(stats["daily_breakdown"]) >= 1


# ==========================================
# 3. Greedy Scheduler Algorithm Tests
# ==========================================

def test_greedy_scheduler_best_fit():
    """Tests the Best-Fit Decreasing algorithmic scheduler."""
    tasks = [
        {"name": "Washing Machine", "duration": 2.0},
        {"name": "Dishwasher", "duration": 1.0},
        {"name": "Dryer", "duration": 1.5}
    ]
    # Slots available: one 3.0 hour block, one 1.0 hour block
    available_slots = [3.0, 1.0]
    
    result = greedy_scheduler(tasks, available_slots)
    
    # The BFD algorithm sorts tasks by duration desc: 2.0, 1.5, 1.0
    # It sorts slots desc: 3.0, 1.0
    # 2.0 -> best fit is 3.0 (remaining 1.0) over 1.0 (doesn't fit)
    # 1.5 -> doesn't fit in 1.0 or 1.0 -> unscheduled
    # 1.0 -> best fit is 1.0 (remaining 0.0) — tighter than the other 1.0
    
    scheduled_tasks = [s["task"] for s in result["scheduled"]]
    assert "Washing Machine" in scheduled_tasks
    assert "Dishwasher" in scheduled_tasks
    assert "Dryer" in result["unscheduled"]
    assert result["utilization_percent"] > 0

def test_scheduler_empty_tasks():
    """Edge case: no tasks provided."""
    result = greedy_scheduler([], [3.0, 1.0])
    assert result["scheduled"] == []
    assert result["unscheduled"] == []
    assert result["utilization_percent"] == 0.0

def test_scheduler_all_fit():
    """Tests when all tasks fit perfectly into available slots."""
    tasks = [
        {"name": "Task A", "duration": 1.0},
        {"name": "Task B", "duration": 2.0}
    ]
    available_slots = [2.0, 1.0]
    
    result = greedy_scheduler(tasks, available_slots)
    assert len(result["scheduled"]) == 2
    assert len(result["unscheduled"]) == 0
    assert result["utilization_percent"] == 100.0

def test_scheduler_none_fit():
    """Edge case: no task can fit in any slot."""
    tasks = [
        {"name": "Heavy Task", "duration": 5.0},
        {"name": "Another Big", "duration": 10.0}
    ]
    available_slots = [1.0, 2.0]
    
    result = greedy_scheduler(tasks, available_slots)
    assert len(result["scheduled"]) == 0
    assert len(result["unscheduled"]) == 2

def test_scheduler_single_task_single_slot():
    """Tests the simplest scheduling case."""
    tasks = [{"name": "Iron", "duration": 0.5}]
    available_slots = [1.0]
    
    result = greedy_scheduler(tasks, available_slots)
    assert len(result["scheduled"]) == 1
    assert result["scheduled"][0]["task"] == "Iron"
    assert result["remaining_slots"] == [0.5]


# ==========================================
# 4. Security Middleware Tests
# ==========================================

def test_sanitizer_xss_prevention():
    """Tests that HTML/XSS payloads are properly escaped."""
    malicious = '<script>alert("hacked")</script>'
    result = sanitize_string(malicious)
    # The sanitizer first escapes HTML (< becomes &lt;) then the SQL layer strips semicolons
    # So <script> is never present in raw form — XSS is fully prevented
    assert "<script>" not in result
    assert "<" not in result  # No raw angle brackets remain
    assert ">" not in result  # Confirms full HTML escaping

def test_sanitizer_sql_injection():
    """Tests that SQL injection characters are removed."""
    malicious = "'; DROP TABLE events; --"
    result = sanitize_string(malicious)
    assert ";" not in result
    assert "'" not in result
    assert "DROP TABLE" in result  # keywords are still there, but injection chars are gone

def test_sanitizer_preserves_normal_text():
    """Tests that normal, safe text is not altered (except HTML entity encoding)."""
    normal = "Planted a tree in Varanasi"
    result = sanitize_string(normal)
    assert result == normal

def test_sanitizer_length_limit():
    """Tests that oversized inputs are truncated."""
    oversized = "A" * 1000
    result = sanitize_string(oversized)
    assert len(result) == 500  # MAX_INPUT_LENGTH

def test_rate_limiter():
    """Tests the in-memory rate limiter."""
    limiter = RateLimiter(max_requests=3, window_seconds=60)
    
    assert limiter.is_allowed("192.168.1.1") == True
    assert limiter.is_allowed("192.168.1.1") == True
    assert limiter.is_allowed("192.168.1.1") == True
    assert limiter.is_allowed("192.168.1.1") == False  # 4th request blocked
    
    # Different IP should still be allowed
    assert limiter.is_allowed("192.168.1.2") == True

def test_rate_limiter_remaining():
    """Tests remaining request count reporting."""
    limiter = RateLimiter(max_requests=5, window_seconds=60)
    
    assert limiter.get_remaining("10.0.0.1") == 5
    limiter.is_allowed("10.0.0.1")
    assert limiter.get_remaining("10.0.0.1") == 4

# ==========================================
# 5. Additional Edge Case Tests (Reaching 30 tests)
# ==========================================

def test_scheduler_multiple_identical_tasks():
    """Test scheduler with multiple identical tasks."""
    tasks = [
        {"name": "Light", "duration": 0.5},
        {"name": "Light", "duration": 0.5},
        {"name": "Light", "duration": 0.5}
    ]
    available_slots = [1.5]
    result = greedy_scheduler(tasks, available_slots)
    assert len(result["scheduled"]) == 3
    assert len(result["unscheduled"]) == 0

def test_scheduler_float_precision_durations():
    """Test scheduler with float precision durations."""
    tasks = [{"name": "Task", "duration": 0.33}]
    available_slots = [1.0]
    result = greedy_scheduler(tasks, available_slots)
    assert len(result["scheduled"]) == 1
    assert result["remaining_slots"][0] == 0.67

def test_scheduler_large_slots_small_tasks():
    """Test scheduler with one very large slot and many small tasks."""
    tasks = [{"name": f"T{i}", "duration": 0.1} for i in range(10)]
    available_slots = [2.0]
    result = greedy_scheduler(tasks, available_slots)
    assert len(result["scheduled"]) == 10
    assert result["remaining_slots"][0] == 1.0

def test_scheduler_tasks_larger_than_all_slots():
    """Test tasks that are individually larger than any slot."""
    tasks = [{"name": "Huge Task", "duration": 5.0}]
    available_slots = [2.0, 2.0, 2.0]
    result = greedy_scheduler(tasks, available_slots)
    assert len(result["scheduled"]) == 0
    assert len(result["unscheduled"]) == 1

def test_rate_limiter_window_expiration():
    """Test rate limiter window expiration (simulated)."""
    limiter = RateLimiter(max_requests=2, window_seconds=0.1)
    import time
    limiter.is_allowed("127.0.0.1")
    limiter.is_allowed("127.0.0.1")
    assert limiter.is_allowed("127.0.0.1") == False
    time.sleep(0.15)  # wait for window to expire
    assert limiter.is_allowed("127.0.0.1") == True

def test_sanitizer_numeric_input_preservation():
    """Test that numbers passed to sanitize_string are preserved."""
    assert sanitize_string(123) == 123
    assert sanitize_string(45.6) == 45.6

def test_sanitizer_empty_string():
    """Test sanitizer with empty string."""
    assert sanitize_string("") == ""

def test_sanitizer_none_input():
    """Test sanitizer with None."""
    assert sanitize_string(None) is None

def test_event_sourcing_fractional_impacts():
    """Test fractional impacts in event sourcing."""
    append_event("test", 0.3)
    append_event("test", 0.1)
    append_event("test", 0.2)
    assert calculate_current_budget() == 0.6

def test_get_all_events_order():
    """Test that get_all_events returns in ascending ID order."""
    append_event("first", 1.0)
    append_event("second", 2.0)
    events = get_all_events()
    assert events[0]["action_type"] == "first"
    assert events[1]["action_type"] == "second"
    assert events[0]["id"] < events[1]["id"]

def test_get_event_stats_empty():
    """Test get_event_stats with empty DB."""
    stats = get_event_stats()
    assert stats["total_emissions"] == 0.0
    assert stats["total_reductions"] == 0.0
    assert stats["net_budget"] == 0.0
    assert stats["event_count"] == 0
    assert stats["daily_breakdown"] == []

def test_greedy_scheduler_utilization_calc():
    """Test that utilization is correctly calculated."""
    tasks = [{"name": "Task", "duration": 1.5}]
    available_slots = [2.0]
    result = greedy_scheduler(tasks, available_slots)
    assert result["utilization_percent"] == 75.0
