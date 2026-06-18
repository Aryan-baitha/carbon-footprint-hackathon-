import os
import random
import sys
import sqlite3
from datetime import datetime, timedelta

DB_PATH = "eco_ledger.db"

# Ensure we are in the right directory to import backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.engine import init_db

# Initialize DB (creates it if not exists)
init_db()

# Clear existing events so we start fresh with exactly 30
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("DELETE FROM events")
conn.commit()

actions = [
    ("car_commute", 5.0),
    ("tree_planting", -2.5),
    ("public_transit", 1.5),
    ("solar_energy", -4.0),
    ("meat_consumption", 3.5),
    ("bicycle_ride", -1.0),
    ("flight_travel", 15.0),
    ("recycling", -1.5),
    ("electricity_usage", 2.0),
    ("vegan_meal", -0.5)
]

base_date = datetime.now() - timedelta(days=29)
events_to_insert = []

# Generate random events over the last 30 days
for i in range(30):
    current_date = base_date + timedelta(days=i)
    # 1 to 4 events per day
    num_events = random.randint(1, 4)
    for _ in range(num_events):
        action, impact = random.choice(actions)
        
        # Random time of day
        hour = random.randint(6, 22) # 6 AM to 10 PM
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        
        event_time = current_date.replace(hour=hour, minute=minute, second=second)
        events_to_insert.append({
            "action": f"{action}",
            "impact": impact,
            "timestamp": event_time
        })

# Sort chronologically (important for event sourcing)
events_to_insert.sort(key=lambda x: x["timestamp"])

# Insert into database
for event in events_to_insert:
    timestamp_str = event["timestamp"].strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute(
        "INSERT INTO events (action_type, carbon_impact, timestamp) VALUES (?, ?, ?)",
        (event["action"], event["impact"], timestamp_str)
    )

conn.commit()
conn.close()

print(f"Successfully inserted {len(events_to_insert)} sample user inputs with random timestamps over the last 30 days!")
