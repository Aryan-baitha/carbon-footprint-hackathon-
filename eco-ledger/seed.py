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

# Insert exactly 30 user inputs, one for each day of the last 30 days
for i in range(30):
    action, impact = random.choice(actions)
    unique_action = f"{action}_{i+1}"
    
    event_date = base_date + timedelta(days=i)
    timestamp_str = event_date.strftime('%Y-%m-%d %H:%M:%S')
    
    cursor.execute(
        "INSERT INTO events (action_type, carbon_impact, timestamp) VALUES (?, ?, ?)",
        (unique_action, impact, timestamp_str)
    )

conn.commit()
conn.close()

print("Successfully inserted 30 sample user inputs spread over the last 30 days!")
