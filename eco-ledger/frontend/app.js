// Eco-Ledger Frontend Logic (Vanilla JS)

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Utility: Debounce function for API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- Carbon Budget Logic ---
const budgetDisplay = document.getElementById('carbon-budget-display');
const refreshBudgetBtn = document.getElementById('refresh-budget-btn');

async function fetchBudget() {
    try {
        const response = await fetch(`${API_BASE_URL}/budget`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        // Format to 2 decimal places
        budgetDisplay.textContent = data.total_carbon_budget.toFixed(2);
        
        // Color coding based on value
        if (data.total_carbon_budget > 50) {
            budgetDisplay.classList.replace('text-white', 'text-red-500');
            budgetDisplay.classList.replace('text-green-500', 'text-red-500');
        } else if (data.total_carbon_budget < 0) {
            budgetDisplay.classList.replace('text-white', 'text-green-500');
            budgetDisplay.classList.replace('text-red-500', 'text-green-500');
        } else {
            budgetDisplay.classList.replace('text-red-500', 'text-white');
            budgetDisplay.classList.replace('text-green-500', 'text-white');
        }
    } catch (error) {
        console.error('Error fetching budget:', error);
        budgetDisplay.textContent = 'Err';
    }
}

// Debounce the refresh to prevent spamming
const debouncedFetchBudget = debounce(fetchBudget, 300);

refreshBudgetBtn.addEventListener('click', debouncedFetchBudget);


// --- Event Submission Logic ---
const eventForm = document.getElementById('event-form');
const eventFeedback = document.getElementById('event-feedback');

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const actionTypeInput = document.getElementById('action_type').value;
    const carbonImpactInput = parseFloat(document.getElementById('carbon_impact').value);
    
    const payload = {
        action_type: actionTypeInput,
        carbon_impact: carbonImpactInput
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        // Show success feedback
        eventFeedback.textContent = "Event successfully added!";
        eventFeedback.className = "text-sm mt-2 text-center text-green-400 block";
        
        // Reset form
        eventForm.reset();
        
        // Automatically fetch updated budget after slight delay
        setTimeout(fetchBudget, 500);
        
        // Hide feedback after 3s
        setTimeout(() => {
            eventFeedback.classList.add('hidden');
        }, 3000);
        
    } catch (error) {
        console.error('Error submitting event:', error);
        eventFeedback.textContent = "Failed to add event. See console.";
        eventFeedback.className = "text-sm mt-2 text-center text-red-400 block";
    }
});


// --- Algorithmic Scheduler Logic ---
let pendingTasks = [];
const taskNameInput = document.getElementById('task-name');
const taskDurationInput = document.getElementById('task-duration');
const addTaskBtn = document.getElementById('add-task-btn');
const taskListUI = document.getElementById('task-list');
const runSchedulerBtn = document.getElementById('run-scheduler-btn');
const scheduleResults = document.getElementById('schedule-results');
const scheduledItemsUI = document.getElementById('scheduled-items');
const unscheduledItemsUI = document.getElementById('unscheduled-items');

addTaskBtn.addEventListener('click', () => {
    const name = taskNameInput.value.trim();
    const duration = parseFloat(taskDurationInput.value);
    
    if (name && duration > 0) {
        pendingTasks.push({ name, duration });
        
        // Update UI
        const li = document.createElement('li');
        li.textContent = `${name} (${duration} hrs)`;
        taskListUI.appendChild(li);
        
        // Clear inputs
        taskNameInput.value = '';
        taskDurationInput.value = '';
    }
});

runSchedulerBtn.addEventListener('click', async () => {
    if (pendingTasks.length === 0) return;
    
    // Mock available off-peak slots (e.g., 4 hrs at night, 2 hrs afternoon)
    const available_slots = [4.0, 2.0]; 
    
    try {
        const response = await fetch(`${API_BASE_URL}/schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tasks: pendingTasks,
                available_slots: available_slots
            })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const schedule = data.schedule;
        
        // Render Results
        scheduledItemsUI.innerHTML = `<strong>Scheduled Tasks:</strong><br>`;
        if (schedule.scheduled.length > 0) {
            schedule.scheduled.forEach(item => {
                scheduledItemsUI.innerHTML += `- ${item.task} (Slot Index ${item.slot_index_used})<br>`;
            });
        } else {
            scheduledItemsUI.innerHTML += `None<br>`;
        }
        
        unscheduledItemsUI.innerHTML = `<strong>Unscheduled (No space):</strong><br>`;
        if (schedule.unscheduled.length > 0) {
            schedule.unscheduled.forEach(item => {
                unscheduledItemsUI.innerHTML += `- ${item}<br>`;
            });
        } else {
            unscheduledItemsUI.innerHTML += `None<br>`;
        }
        
        scheduleResults.classList.remove('hidden');
        
        // Clear pending tasks
        pendingTasks = [];
        taskListUI.innerHTML = '';
        
    } catch (error) {
        console.error('Error running scheduler:', error);
        alert('Error communicating with scheduling algorithm.');
    }
});

// Init
fetchBudget();
