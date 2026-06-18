# Eco-Ledger: Event-Sourced Carbon Budgeter

**Author:** Aryan Baitha (B.Tech CSE, Asansol Engineering College, Batch 2024-2028)

Eco-Ledger is a production-ready, highly secure, and accessible web application designed to help users track and manage their carbon footprint. 

## Key Features & Architecture

*   **Event-Sourcing Architecture:** Instead of using simple CRUD updates, Eco-Ledger records every user action (e.g., "drove_car", "planted_tree") as an immutable event log in the SQLite database. The total carbon budget is dynamically calculated by reducing/summing these event logs, ensuring a robust, auditable trail of all carbon-related activities.
*   **Security Sanitization Middleware:** A custom ASGI middleware in Python sanitizes all incoming text inputs from the frontend. This robust layer protects the application from Cross-Site Scripting (XSS) and SQL Injection attacks, maintaining high security standards.
*   **Greedy Algorithms for Task Scheduling:** The backend includes an algorithmic scheduler that uses a greedy approach. It analyzes mock off-peak grid hours to suggest the optimal times for users to perform heavy energy tasks (like running a washing machine), helping to minimize their carbon footprint.
*   **WCAG Compliance:** The vanilla HTML/JS frontend is built with accessibility as a primary focus. It features high contrast visuals, semantic HTML tags, and strictly includes `aria-labels` on all interactive elements, ensuring usability for everyone.

## Tech Stack

*   **Frontend:** Vanilla HTML, CSS (Tailwind via CDN), and JavaScript (No Node.js frameworks).
*   **Backend:** Python with FastAPI.
*   **Database:** SQLite (`sqlite3` built-in module).

## Running the Application

### Prerequisites
*   Python 3.9+

### Setup
1.  Clone the repository and navigate to the `eco-ledger` directory.
2.  Create a virtual environment: `python -m venv venv`
3.  Activate the virtual environment:
    *   Windows: `venv\Scripts\activate`
    *   macOS/Linux: `source venv/bin/activate`
4.  Install dependencies: `pip install -r requirements.txt`
5.  Copy `.env.example` to `.env` (optional).

### Run the Backend Server
```bash
uvicorn backend.main:app --reload
```
The API will be available at `http://127.0.0.1:8000`.

### Open the Frontend
Simply open the `frontend/index.html` file in your preferred web browser.

## Testing

To run the unit tests for the event sourcing math and greedy scheduling algorithm:
```bash
pytest backend/tests.py
```
