// =====================================================================
// Swadeshi Khata — Premium Frontend Logic
// Event-Sourced Carbon Budgeter with Smart AI Chat & Data Visualization
// Author: Aryan Baitha (AEC, Batch 2024-2028)
// =====================================================================

const API_BASE_URL = '/api';

// --- Utility Functions ---
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

const formatNumber = (num) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num);

/**
 * Escapes HTML to prevent XSS when inserting user-provided text into innerHTML.
 * This is a critical frontend-side security measure.
 */
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// --- Personalization & Detailed Guided Tour ---
const onboardingOverlay = document.getElementById('onboarding-overlay');
const onboardingCard = document.getElementById('onboarding-card');
const userGreeting = document.getElementById('user-greeting');

const tourSteps = [
    {
        target: null,
        html: `
            <div class="text-center animate-fade-in-up">
                <div class="text-6xl mb-4">🙏🏽</div>
                <h2 class="text-3xl font-bold text-white mb-2">Namaste & Swagat Hai!</h2>
                <p class="text-slate-300 mb-6 text-sm">Welcome to Swadeshi Khata, an initiative towards a greener Bharat. <br>To make this journey special, aapka shubh naam kya hai?</p>
                <input type="text" id="user-name-input" class="input-premium w-full rounded-xl px-4 py-3 text-white text-center text-lg mb-6 border-india-saffron/50 focus:border-india-saffron" placeholder="Enter your beautiful name..." autocomplete="off">
                <button id="next-tour-btn" class="btn-primary-india w-full text-white font-bold py-3.5 rounded-xl shadow-lg text-lg">Chalo Shuru Karein 🚀</button>
            </div>
        `
    },
    {
        target: 'tour-budget',
        html: `
            <div class="animate-fade-in-up">
                <h2 class="text-xl font-bold text-india-saffron mb-2">Swadeshi Khata (Net Budget) 🌍</h2>
                <p class="text-slate-300 text-sm mb-6">This is your main dashboard. It uses an <strong>Event-Sourcing pattern</strong>. Hum aapke sabhi activities ko permanently record karte hain aur unka total yahan dikhate hain.</p>
                <button id="next-tour-btn" class="btn-primary-india w-full text-white font-bold py-3 rounded-xl shadow-lg">Aage Badhein (Next)</button>
            </div>
        `
    },
    {
        target: 'refresh-budget-btn',
        html: `
            <div class="animate-fade-in-up">
                <h2 class="text-xl font-bold text-india-saffron mb-2">Refresh Button 🔄</h2>
                <p class="text-slate-300 text-sm mb-6">Aagar aapko latest budget fetch karna ho manually, toh is button ko dabayein.</p>
                <button id="next-tour-btn" class="btn-primary-india w-full text-white font-bold py-3 rounded-xl shadow-lg">Aage Badhein</button>
            </div>
        `
    },
    {
        target: 'tour-log-section',
        html: `
            <div class="animate-fade-in-up">
                <h2 class="text-xl font-bold text-india-saffron mb-2">Activity Logger ✍️</h2>
                <p class="text-slate-300 text-sm mb-6">Yahan aap apni rozmara ki activities likh sakte hain. Example: <em>Auto rikshaw travel (+4.5)</em> ya <em>Gaon mein ped lagaya (-10.0)</em>.</p>
                <button id="next-tour-btn" class="btn-primary-india w-full text-white font-bold py-3 rounded-xl shadow-lg">Next</button>
            </div>
        `
    },
    {
        target: 'submit-event-btn',
        html: `
            <div class="animate-fade-in-up">
                <h2 class="text-xl font-bold text-india-saffron mb-2">Darj Karein 📝</h2>
                <p class="text-slate-300 text-sm mb-6">Activity aur impact likhne ke baad, is button par click karke usko permanent ledger mein save karein.</p>
                <button id="next-tour-btn" class="btn-primary-india w-full text-white font-bold py-3 rounded-xl shadow-lg">Next</button>
            </div>
        `
    },
    {
        target: 'tour-scheduler',
        html: `
            <div class="animate-fade-in-up">
                <h2 class="text-xl font-bold text-india-blue mb-2">Smart Scheduler ⚡</h2>
                <p class="text-slate-300 text-sm mb-6">Heavy appliances (jaise washing machine, AC) off-peak time mein chalane se emissions kam hote hain. Yeh tool usme apki madad karega!</p>
                <button id="next-tour-btn" class="btn-primary-india w-full text-white font-bold py-3 rounded-xl shadow-lg">Next</button>
            </div>
        `
    },
    {
        target: 'tour-task-inputs',
        html: `
            <div class="animate-fade-in-up">
                <h2 class="text-xl font-bold text-india-blue mb-2">Queue mein Daalein ➕</h2>
                <p class="text-slate-300 text-sm mb-6">Pehle yahan task ka naam aur ghante (duration) daaliye aur <strong>Queue Task</strong> dabaiye. Yeh task list mein add ho jayega.</p>
                <button id="next-tour-btn" class="btn-primary-india w-full text-white font-bold py-3 rounded-xl shadow-lg">Next</button>
            </div>
        `
    },
    {
        target: 'run-scheduler-btn',
        html: `
            <div class="animate-fade-in-up">
                <h2 class="text-xl font-bold text-india-green mb-2">Optimize Karein 🚀</h2>
                <p class="text-slate-300 text-sm mb-6">Sab tasks add hone ke baad, yeh hara (green) button dabayein! Humara <em>Best-Fit Decreasing Greedy Algorithm</em> tasks ko optimal off-peak hours mein fit kar dega.</p>
                <button id="next-tour-btn" class="btn-primary-india w-full text-white font-bold py-3 rounded-xl shadow-lg">Next</button>
            </div>
        `
    },
    {
        target: 'tour-helper',
        html: `
            <div class="animate-fade-in-up">
                <h2 class="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    Eco Sahayak 👳🏽‍♂️
                </h2>
                <p class="text-slate-300 text-sm mb-6">Koi dikkat aaye? Main hamesha yahin right corner mein rahunga. Bas is Indian flag 🇮🇳 wale icon pe click karein.</p>
                <button id="next-tour-btn" class="bg-gradient-to-r from-india-green to-india-blue hover:scale-[1.02] transition-transform w-full text-white font-bold py-3.5 rounded-xl shadow-lg">Tour Khatam Karein & Shuru Karein!</button>
            </div>
        `
    }
];

let currentTourStep = 0;
let userName = localStorage.getItem('harit_user_name');

function updateGreeting() {
    if (userName) {
        userGreeting.innerHTML = `Namaste, <span class="text-india-saffron font-bold text-base">${escapeHTML(userName)}</span> 🙏`;
    }
}

function renderTourStep() {
    const step = tourSteps[currentTourStep];
    document.querySelectorAll('.highlight-element').forEach(el => el.classList.remove('highlight-element'));
    
    if (step.target) {
        const targetEl = document.getElementById(step.target);
        if (targetEl) {
            targetEl.classList.add('highlight-element');
            if (targetEl.tagName === 'BUTTON') {
                targetEl.style.boxShadow = "0 0 0 10px rgba(255, 153, 51, 0.6), 0 0 40px rgba(255, 153, 51, 0.4)";
            }
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    onboardingCard.innerHTML = step.html;
    
    document.getElementById('next-tour-btn').addEventListener('click', () => {
        if (currentTourStep === 0) {
            const inputName = document.getElementById('user-name-input').value.trim();
            userName = inputName || 'Prakriti Rakshak';
            localStorage.setItem('harit_user_name', userName);
            updateGreeting();
        }
        
        currentTourStep++;
        if (currentTourStep < tourSteps.length) {
            renderTourStep();
        } else {
            document.querySelectorAll('.highlight-element').forEach(el => {
                el.classList.remove('highlight-element');
                el.style.boxShadow = '';
            });
            onboardingOverlay.classList.remove('opacity-100', 'pointer-events-auto');
            onboardingOverlay.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => { onboardingOverlay.style.display = 'none'; }, 500);
            
            setTimeout(() => toggleHelper(), 1000);
        }
    });
    
    if (currentTourStep === 0) {
        setTimeout(() => document.getElementById('user-name-input').focus(), 100);
    }
}

function initOnboarding() {
    updateGreeting();
    const hasSeenTour = localStorage.getItem('harit_tour_seen_v4'); 
    
    if (!hasSeenTour || !userName) {
        onboardingOverlay.style.display = 'flex';
        setTimeout(() => {
            onboardingOverlay.classList.remove('opacity-0', 'pointer-events-none');
            onboardingOverlay.classList.add('opacity-100', 'pointer-events-auto');
            onboardingCard.classList.remove('scale-95');
            onboardingCard.classList.add('scale-100');
        }, 50);
        
        renderTourStep();
        localStorage.setItem('harit_tour_seen_v4', 'true');
    }
}

// --- Dashboard Logic ---
const budgetDisplay = document.getElementById('carbon-budget-display');
const refreshBudgetBtn = document.getElementById('refresh-budget-btn');

async function fetchBudget() {
    refreshBudgetBtn.classList.add('animate-spin');
    try {
        const response = await fetch(`${API_BASE_URL}/budget`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        const currentVal = parseFloat(budgetDisplay.textContent.replace(/,/g, '')) || 0;
        const targetVal = data.total_carbon_budget;
        
        animateValue(budgetDisplay, currentVal, targetVal, 1000);
        
        budgetDisplay.classList.remove('text-india-saffron', 'text-red-500', 'text-white', 'text-gradient-india', 'text-india-green');
        
        if (targetVal > 50) {
            budgetDisplay.classList.add('text-red-500');
        } else if (targetVal < 0) {
            budgetDisplay.classList.add('text-india-green');
        } else {
            budgetDisplay.classList.add('text-gradient-india');
        }
    } catch (error) {
        budgetDisplay.textContent = '---';
    } finally {
        setTimeout(() => refreshBudgetBtn.classList.remove('animate-spin'), 500);
    }
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = start + (end - start) * ease;
        obj.innerHTML = formatNumber(current);
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerHTML = formatNumber(end);
    };
    window.requestAnimationFrame(step);
}

refreshBudgetBtn.addEventListener('click', debounce(fetchBudget, 300));
// =====================================================================
// INDIAN EMISSION FACTORS DATABASE — Auto Carbon Estimation
// Sources: IPCC, India GHG Program, TERI estimates (approximate values)
// =====================================================================

const EMISSION_FACTORS = [
    // 🚗 Transportation (per typical trip/usage)
    { keywords: ['car', 'gaadi', 'drive', 'drove'], impact: 2.3, label: 'Car travel (~10km)', category: 'transport' },
    { keywords: ['auto', 'rickshaw', 'auto rickshaw'], impact: 0.5, label: 'Auto rickshaw ride', category: 'transport' },
    { keywords: ['bus', 'dha', 'city bus'], impact: 0.9, label: 'Bus commute', category: 'transport' },
    { keywords: ['bike', 'motorcycle', 'scooty', 'scooter', 'two wheeler'], impact: 1.0, label: 'Motorcycle/Scooter ride', category: 'transport' },
    { keywords: ['train', 'railway', 'rail', 'metro'], impact: 0.4, label: 'Train/Metro journey', category: 'transport' },
    { keywords: ['flight', 'fly', 'plane', 'airplane', 'hawai'], impact: 90.0, label: 'Domestic flight', category: 'transport' },
    { keywords: ['uber', 'ola', 'cab', 'taxi'], impact: 2.5, label: 'Cab/Taxi ride', category: 'transport' },
    { keywords: ['cycle', 'bicycle', 'cycling', 'walk', 'walked', 'paidal'], impact: -0.5, label: 'Zero-emission travel ✨', category: 'green' },
    { keywords: ['electric', 'ev', 'electric car', 'electric vehicle'], impact: 0.5, label: 'EV travel (low emission)', category: 'transport' },

    // 🍽️ Food & Diet
    { keywords: ['beef', 'steak', 'gosht'], impact: 6.5, label: 'Beef/Red meat meal', category: 'food' },
    { keywords: ['mutton', 'lamb', 'bakra'], impact: 5.0, label: 'Mutton meal', category: 'food' },
    { keywords: ['chicken', 'murgi', 'poultry'], impact: 1.8, label: 'Chicken meal', category: 'food' },
    { keywords: ['fish', 'machli', 'seafood'], impact: 1.5, label: 'Fish/Seafood meal', category: 'food' },
    { keywords: ['veg', 'vegetarian', 'sabzi', 'dal', 'daal', 'roti', 'chawal'], impact: 0.5, label: 'Vegetarian meal', category: 'food' },
    { keywords: ['vegan', 'plant based'], impact: 0.3, label: 'Vegan meal', category: 'food' },

    // ⚡ Electricity & Appliances (Indian grid: ~0.82 kg CO₂/kWh)
    { keywords: ['ac', 'air conditioner', 'air conditioning', 'cooling'], impact: 1.2, label: 'AC (1 hour)', category: 'energy' },
    { keywords: ['heater', 'geyser', 'water heater', 'hot water'], impact: 1.5, label: 'Geyser/Heater (1 hour)', category: 'energy' },
    { keywords: ['washing machine', 'laundry', 'kapde dhoye'], impact: 0.4, label: 'Washing machine (1 load)', category: 'energy' },
    { keywords: ['iron', 'press', 'ironing', 'kapde press'], impact: 0.3, label: 'Clothes ironing', category: 'energy' },
    { keywords: ['tv', 'television', 'screen', 'netflix', 'streaming'], impact: 0.1, label: 'TV/Streaming (1 hour)', category: 'energy' },
    { keywords: ['fridge', 'refrigerator', 'freezer'], impact: 0.8, label: 'Refrigerator (daily)', category: 'energy' },
    { keywords: ['fan', 'pankha', 'ceiling fan'], impact: 0.06, label: 'Fan (1 hour)', category: 'energy' },
    { keywords: ['light', 'bulb', 'lamp', 'led'], impact: 0.01, label: 'LED light (1 hour)', category: 'energy' },
    { keywords: ['generator', 'genset', 'inverter'], impact: 2.5, label: 'Diesel generator (1 hour)', category: 'energy' },
    { keywords: ['cooking', 'gas', 'lpg', 'stove', 'chulha', 'khana banaya'], impact: 0.6, label: 'LPG cooking (1 meal)', category: 'energy' },

    // 🌱 Green / Reduction Activities
    { keywords: ['tree', 'plant', 'ped', 'paudha', 'sapling'], impact: -22.0, label: 'Planted a tree 🌳 (annual offset)', category: 'green' },
    { keywords: ['solar', 'solar panel', 'renewable'], impact: -15.0, label: 'Solar panel (daily offset)', category: 'green' },
    { keywords: ['compost', 'khaad', 'organic waste'], impact: -2.0, label: 'Composting waste', category: 'green' },
    { keywords: ['recycle', 'reuse', 'purana saman'], impact: -1.5, label: 'Recycled materials', category: 'green' },
    { keywords: ['public transport', 'shared ride', 'carpool', 'pool'], impact: -1.0, label: 'Chose shared transport 🌍', category: 'green' },

    // 🏠 Household / Others
    { keywords: ['shopping', 'khareedari', 'online order', 'delivery', 'amazon', 'flipkart'], impact: 3.5, label: 'Online shopping (delivery + packaging)', category: 'other' },
    { keywords: ['plastic', 'bottle', 'polythene', 'bag'], impact: 0.8, label: 'Plastic usage', category: 'other' },
    { keywords: ['paper', 'print', 'printing'], impact: 0.3, label: 'Paper/Printing', category: 'other' },
    { keywords: ['waste', 'garbage', 'kachra', 'dump'], impact: 1.2, label: 'Waste to landfill', category: 'other' },
];

/**
 * Auto-estimates carbon impact based on user's activity description.
 * Uses keyword matching against the Indian emission factors database.
 * Returns { impact, label, category } or null if no match found.
 */
function autoEstimateCarbon(activityText) {
    const text = activityText.toLowerCase().trim();
    if (text.length < 2) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const factor of EMISSION_FACTORS) {
        for (const keyword of factor.keywords) {
            if (text.includes(keyword)) {
                // Longer keyword matches are more specific = higher priority
                const score = keyword.length;
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = factor;
                }
            }
        }
    }

    return bestMatch;
}

// DOM references for auto-estimation
const actionTypeInput = document.getElementById('action_type');
const carbonImpactInput = document.getElementById('carbon_impact');
const autoEstimateBadge = document.getElementById('auto-estimate-badge');
const autoEstimateText = document.getElementById('auto-estimate-text');

// Debounced auto-estimation as user types
const debouncedAutoEstimate = debounce((text) => {
    const match = autoEstimateCarbon(text);
    if (match) {
        carbonImpactInput.value = match.impact;
        autoEstimateText.textContent = `🤖 ${match.label} → ${match.impact > 0 ? '+' : ''}${match.impact} kg CO₂e`;
        autoEstimateBadge.classList.remove('hidden');
        autoEstimateBadge.classList.add('flex');
        // Flash the carbon input to draw attention
        carbonImpactInput.classList.add('border-india-saffron');
        setTimeout(() => carbonImpactInput.classList.remove('border-india-saffron'), 1000);
    } else {
        autoEstimateBadge.classList.add('hidden');
        autoEstimateBadge.classList.remove('flex');
    }
}, 300);

actionTypeInput.addEventListener('input', (e) => {
    debouncedAutoEstimate(e.target.value);
});

// Quick-pick activity chip handlers
document.querySelectorAll('.activity-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const activity = chip.getAttribute('data-activity');
        const impact = parseFloat(chip.getAttribute('data-impact'));
        
        actionTypeInput.value = activity;
        carbonImpactInput.value = impact;
        
        // Show auto-estimate badge
        const label = EMISSION_FACTORS.find(f => f.impact === impact)?.label || activity;
        autoEstimateText.textContent = `🤖 ${label} → ${impact > 0 ? '+' : ''}${impact} kg CO₂e`;
        autoEstimateBadge.classList.remove('hidden');
        autoEstimateBadge.classList.add('flex');
        
        // Visual feedback on the clicked chip
        chip.classList.add('ring-2', 'ring-india-saffron/50', 'scale-110');
        setTimeout(() => chip.classList.remove('ring-2', 'ring-india-saffron/50', 'scale-110'), 600);
    });
});


// --- Event Submission Logic ---
const eventForm = document.getElementById('event-form');
const eventFeedback = document.getElementById('event-feedback');

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-event-btn');
    const actionType = document.getElementById('action_type').value.trim();
    const carbonImpact = parseFloat(document.getElementById('carbon_impact').value);

    // Frontend validation
    if (!actionType || actionType.length < 2) {
        showFeedback('Please enter a valid activity name (min 2 characters).', 'error');
        return;
    }
    if (isNaN(carbonImpact)) {
        showFeedback('Please enter a valid carbon impact number.', 'error');
        return;
    }

    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = `<svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    submitBtn.disabled = true;

    const payload = {
        action_type: actionType,
        carbon_impact: carbonImpact
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        showFeedback('Behtareen! Activity record ho gayi ✨', 'success');
        eventForm.reset();
        // Hide auto-estimate badge on reset
        autoEstimateBadge.classList.add('hidden');
        autoEstimateBadge.classList.remove('flex');
        // Refresh all data after a new event
        setTimeout(() => {
            fetchBudget();
            fetchEventHistory();
            fetchAndRenderCharts();
        }, 400);
    } catch (error) {
        showFeedback('Oops! Kuch gadbad hai. Phir se try karein.', 'error');
    } finally {
        submitBtn.innerHTML = originalBtnHTML;
        submitBtn.disabled = false;
    }
});

// Keyboard shortcut: Ctrl+Enter to submit event form
document.getElementById('carbon_impact').addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        eventForm.dispatchEvent(new Event('submit'));
    }
});

function showFeedback(message, type) {
    eventFeedback.textContent = message;
    eventFeedback.className = `text-sm text-center py-3 rounded-xl mt-4 font-medium transition-all ${
        type === 'success' ? 'bg-india-green/20 text-india-green border border-india-green/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
    } block`;
    setTimeout(() => eventFeedback.classList.add('hidden'), 4000);
}


// --- Algorithmic Scheduler Logic ---
let pendingTasks = [];
const taskNameInput = document.getElementById('task-name');
const taskDurationInput = document.getElementById('task-duration');
const addTaskBtn = document.getElementById('add-task-btn');
const taskListUI = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const taskCountLabel = document.getElementById('task-count');
const runSchedulerBtn = document.getElementById('run-scheduler-btn');
const modal = document.getElementById('results-modal');
const resultsModalContent = document.getElementById('results-modal-content');
const closeModalBtn = document.getElementById('close-modal');

addTaskBtn.addEventListener('click', () => {
    const name = taskNameInput.value.trim();
    const duration = parseFloat(taskDurationInput.value);
    if (name && duration > 0) {
        pendingTasks.push({ name, duration });
        if (emptyState) emptyState.remove();
        const li = document.createElement('li');
        li.className = "flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 animate-fade-in-up text-sm";
        li.innerHTML = `<span class="text-white font-medium">${escapeHTML(name)}</span><span class="text-slate-400 bg-black/30 px-2 py-1 rounded text-xs">${duration} hrs</span>`;
        taskListUI.appendChild(li);
        taskCountLabel.textContent = `${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''}`;
        taskNameInput.value = '';
        taskDurationInput.value = '';
        taskNameInput.focus();
    }
});

// Keyboard shortcut: Enter in task fields to add task
taskDurationInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addTaskBtn.click();
    }
});

runSchedulerBtn.addEventListener('click', async () => {
    if (pendingTasks.length === 0) return;
    const originalBtnHTML = runSchedulerBtn.innerHTML;
    runSchedulerBtn.innerHTML = `<svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    
    const available_slots = [4.0, 2.0]; 
    try {
        const response = await fetch(`${API_BASE_URL}/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: pendingTasks, available_slots })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const schedule = data.schedule;
        
        const scheduledItemsUI = document.getElementById('scheduled-items');
        scheduledItemsUI.innerHTML = '';
        if (schedule.scheduled.length > 0) {
            schedule.scheduled.forEach(item => {
                scheduledItemsUI.innerHTML += `
                    <li class="flex items-center gap-3 bg-india-green/10 border border-india-green/20 p-3 rounded-xl text-slate-200 text-sm">
                        <div class="w-2 h-2 rounded-full bg-india-green flex-shrink-0"></div>
                        <span class="font-medium flex-1">${escapeHTML(item.task)}</span>
                        <span class="text-xs text-india-green bg-india-green/10 px-2 py-1 rounded">${item.duration}h → Slot ${item.slot_index_used + 1}</span>
                    </li>`;
            });
        } else scheduledItemsUI.innerHTML = `<li class="text-sm text-slate-500 italic">Koi nahi fit hua</li>`;
        
        const unscheduledItemsUI = document.getElementById('unscheduled-items');
        unscheduledItemsUI.innerHTML = '';
        if (schedule.unscheduled.length > 0) {
            schedule.unscheduled.forEach(item => {
                unscheduledItemsUI.innerHTML += `
                    <li class="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-slate-300 text-sm">
                        <div class="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                        <span class="flex-1">${escapeHTML(item)}</span>
                        <span class="text-xs text-red-400">Limit ke bahar</span>
                    </li>`;
            });
        } else unscheduledItemsUI.innerHTML = `<li class="text-sm text-slate-500 italic">Sab fit ho gaye! Ekdum badhiya!</li>`;
        
        // Show utilization
        const utilizationDisplay = document.getElementById('utilization-display');
        if (utilizationDisplay) {
            utilizationDisplay.textContent = `${schedule.utilization_percent || 0}%`;
        }
        
        openModal();
        pendingTasks = [];
        taskListUI.innerHTML = `<li class="text-slate-500 text-sm text-center py-4" id="empty-state">Abhi tak koi task nahi joda gaya.</li>`;
        taskCountLabel.textContent = `0 tasks`;
    } catch (error) {
        showFeedback('Server se connect karne mein problem aayi.', 'error');
    } finally {
        runSchedulerBtn.innerHTML = originalBtnHTML;
    }
});

function openModal() {
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if (resultsModalContent) {
            resultsModalContent.classList.remove('scale-95');
            resultsModalContent.classList.add('scale-100');
        }
    }, 10);
}

function closeModal() {
    modal.classList.add('opacity-0');
    if (resultsModalContent) {
        resultsModalContent.classList.remove('scale-100');
        resultsModalContent.classList.add('scale-95');
    }
    setTimeout(() => modal.classList.add('hidden'), 300);
}

closeModalBtn.addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', closeModal);


// =====================================================================
// DATA VISUALIZATION — Chart.js Integration
// =====================================================================

let doughnutChart = null;
let lineChart = null;

async function fetchAndRenderCharts() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const stats = data.stats;

        // Update stat cards with animated counters
        animateValue(document.getElementById('stat-emissions'), 0, stats.total_emissions, 1200);
        animateValue(document.getElementById('stat-reductions'), 0, stats.total_reductions, 1200);
        animateStatCounter(document.getElementById('stat-event-count'), 0, stats.event_count, 800);

        // Doughnut Chart: Emissions vs Reductions
        const doughnutCanvas = document.getElementById('doughnut-chart');
        const doughnutEmpty = document.getElementById('chart-empty-doughnut');

        if (stats.total_emissions === 0 && stats.total_reductions === 0) {
            doughnutCanvas.style.display = 'none';
            doughnutEmpty.classList.remove('hidden');
        } else {
            doughnutCanvas.style.display = 'block';
            doughnutEmpty.classList.add('hidden');

            if (doughnutChart) doughnutChart.destroy();
            doughnutChart = new Chart(doughnutCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Emissions (kg CO₂e)', 'Reductions (kg CO₂e)'],
                    datasets: [{
                        data: [stats.total_emissions, stats.total_reductions],
                        backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(19, 136, 8, 0.8)'
                        ],
                        borderColor: [
                            'rgba(239, 68, 68, 1)',
                            'rgba(19, 136, 8, 1)'
                        ],
                        borderWidth: 2,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#94a3b8',
                                font: { family: 'Outfit', size: 12 },
                                padding: 16,
                                usePointStyle: true,
                                pointStyleWidth: 10
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(22, 24, 33, 0.95)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            titleFont: { family: 'Outfit', weight: 'bold' },
                            bodyFont: { family: 'Outfit' },
                            padding: 12,
                            cornerRadius: 12
                        }
                    }
                }
            });
        }

        // Line Chart: Cumulative Carbon Over Time
        const lineCanvas = document.getElementById('line-chart');
        const lineEmpty = document.getElementById('chart-empty-line');

        if (stats.daily_breakdown.length === 0) {
            lineCanvas.style.display = 'none';
            lineEmpty.classList.remove('hidden');
        } else {
            lineCanvas.style.display = 'block';
            lineEmpty.classList.add('hidden');

            const recentStats = stats.daily_breakdown.slice(-30);
            const labels = recentStats.map(d => d.date);
            const cumulativeData = recentStats.map(d => d.cumulative);
            const emissionsData = recentStats.map(d => d.emissions);
            const reductionsData = recentStats.map(d => d.reductions);

            if (lineChart) lineChart.destroy();
            lineChart = new Chart(lineCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Cumulative Net (kg CO₂e)',
                            data: cumulativeData,
                            borderColor: '#FF9933',
                            backgroundColor: 'rgba(255, 153, 51, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#FF9933',
                            borderWidth: 2.5
                        },
                        {
                            label: 'Daily Emissions',
                            data: emissionsData,
                            borderColor: 'rgba(239, 68, 68, 0.7)',
                            backgroundColor: 'transparent',
                            borderDash: [5, 5],
                            tension: 0.3,
                            pointRadius: 3,
                            borderWidth: 1.5
                        },
                        {
                            label: 'Daily Reductions',
                            data: reductionsData,
                            borderColor: 'rgba(19, 136, 8, 0.7)',
                            backgroundColor: 'transparent',
                            borderDash: [5, 5],
                            tension: 0.3,
                            pointRadius: 3,
                            borderWidth: 1.5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false, mode: 'index' },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255,255,255,0.03)' },
                            ticks: { color: '#64748b', font: { family: 'Outfit', size: 11 } }
                        },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.03)' },
                            ticks: { color: '#64748b', font: { family: 'Outfit', size: 11 } }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#94a3b8',
                                font: { family: 'Outfit', size: 11 },
                                padding: 16,
                                usePointStyle: true,
                                pointStyleWidth: 10
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(22, 24, 33, 0.95)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            titleFont: { family: 'Outfit', weight: 'bold' },
                            bodyFont: { family: 'Outfit' },
                            padding: 12,
                            cornerRadius: 12
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Chart data fetch error:', error);
    }
}

function animateStatCounter(el, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = Math.round(start + (end - start) * ease);
        el.textContent = current;
        if (progress < 1) window.requestAnimationFrame(step);
        else el.textContent = end;
    };
    window.requestAnimationFrame(step);
}


// =====================================================================
// EVENT HISTORY TABLE — Immutable Audit Trail
// =====================================================================

const historyTableBody = document.getElementById('history-table-body');
const refreshHistoryBtn = document.getElementById('refresh-history-btn');

async function fetchEventHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/events`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const events = data.events;

        if (events.length === 0) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center text-slate-500">
                        <div class="flex flex-col items-center gap-2">
                            <span class="text-4xl">📭</span>
                            <p>Abhi tak koi event record nahi hua.</p>
                            <p class="text-xs text-slate-600">Events log karne ke baad yahan dikhenge.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        // Render events in reverse chronological order (newest first)
        const reversedEvents = [...events].reverse();
        historyTableBody.innerHTML = reversedEvents.map(event => {
            const isEmission = event.carbon_impact > 0;
            const impactClass = isEmission ? 'text-red-400' : 'text-india-green';
            const impactIcon = isEmission ? '🔺' : '🟢';
            const formattedDate = new Date(event.timestamp).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            return `
                <tr class="history-row border-b border-white/5">
                    <td class="px-6 py-4 text-slate-500 font-mono text-xs">${event.id}</td>
                    <td class="px-6 py-4 text-white font-medium">${escapeHTML(event.action_type)}</td>
                    <td class="px-6 py-4 ${impactClass} font-semibold">
                        <span class="mr-1">${impactIcon}</span>
                        ${event.carbon_impact > 0 ? '+' : ''}${event.carbon_impact.toFixed(1)}
                    </td>
                    <td class="px-6 py-4 text-india-saffron font-medium">${event.running_total.toFixed(1)}</td>
                    <td class="px-6 py-4 text-slate-400 text-xs">${formattedDate}</td>
                </tr>`;
        }).join('');
    } catch (error) {
        console.error('History fetch error:', error);
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-red-400 text-sm">
                    ⚠️ Server se data load nahi ho paya. Backend chalu hai?
                </td>
            </tr>`;
    }
}

refreshHistoryBtn.addEventListener('click', debounce(() => {
    fetchEventHistory();
    fetchAndRenderCharts();
}, 300));


// =====================================================================
// EXPANDED AI HELPER (Eco Sahayak) — Keyword-Based Intent Engine
// =====================================================================

const toggleHelperBtn = document.getElementById('toggle-helper-btn');
const helperPanel = document.getElementById('helper-panel');
const closeHelperBtn = document.getElementById('close-helper-panel');
const helperChatArea = document.getElementById('helper-chat-area');
const helperForm = document.getElementById('helper-form');
const helperInput = document.getElementById('helper-input');
const suggestionChips = document.querySelectorAll('.helper-chip');

function toggleHelper() {
    if (helperPanel.classList.contains('hidden')) {
        helperPanel.classList.remove('hidden');
        const pingIndicator = toggleHelperBtn.querySelector('.animate-ping');
        if (pingIndicator) pingIndicator.parentElement.remove();
        setTimeout(() => helperPanel.classList.remove('opacity-0', 'scale-95'), 10);
    } else {
        helperPanel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => helperPanel.classList.add('hidden'), 300);
    }
}

toggleHelperBtn.addEventListener('click', toggleHelper);
closeHelperBtn.addEventListener('click', toggleHelper);

// Enhanced Keyword-based Intent Engine with more intents
function getBotResponse(msg) {
    const text = msg.toLowerCase();
    
    if (text.includes('auto estimate') || text.includes('auto calculate') || text.includes('automatic')) {
        return "🤖 Swadeshi Khata mein <strong>30+ Indian emission factors</strong> ka database hai! Jab aap activity type karenge (jaise 'car', 'tree', 'AC'), Carbon Asar automatically fill ho jayega. Aap quick-pick chips bhi use kar sakte hain ek click mein activity log karne ke liye!";
    }
    if (text.includes('log') || text.includes('activity') || text.includes('add')) {
        return "Naya activity add karne ke liye left panel ka istemaal karein. Activity likhte hi Carbon Asar <strong>automatically calculate</strong> ho jayega! Quick-pick chips se ek click mein bhi log kar sakte hain. Pro tip: Ctrl+Enter se form quickly submit kar sakte hain.";
    }
    if (text.includes('budget') || text.includes('footprint') || text.includes('score')) {
        return "Aapka Net Carbon Footprint 'Event-Sourcing' se live calculate hota hai. Hum Python ke <code>functools.reduce</code> se immutable event log ko aggregate karte hain. Top left card mein apna score dekh sakte hain.";
    }
    if (text.includes('schedule') || text.includes('appliance') || text.includes('task')) {
        return "Smart Scheduler ek <strong>Best-Fit Decreasing Greedy Algorithm</strong> use karta hai. Yeh sabse tight-fit slot dhundhta hai har task ke liye, jisse maximum efficiency aaye! Apne heavy appliances queue mein dalein aur optimize karein.";
    }
    if (text.includes('chart') || text.includes('graph') || text.includes('visual') || text.includes('analytics')) {
        return "📊 Neeche scroll karein! Wahan aapko do charts milenge: (1) Doughnut chart emissions vs reductions ka breakdown dikhata hai, (2) Line chart aapka cumulative carbon footprint over time dikhata hai. Jitna data dalenge, utna accha visualization hoga!";
    }
    if (text.includes('history') || text.includes('ledger') || text.includes('audit') || text.includes('trail')) {
        return "📜 Immutable Event Ledger section mein scroll karein. Wahan aapki saari past activities dikhti hain timestamps ke saath — plus ek running total column bhi hai jo Event-Sourcing ka asli jadoo dikhata hai!";
    }
    if (text.includes('event sourcing') || text.includes('event-sourcing') || text.includes('khata')) {
        return "Event-Sourcing ek software design pattern hai. Hum sirf ek number update nahi karte — har action ko ek immutable event ki tarah permanently record karte hain. Phir unko reduce/sum karke current state nikalte hain. Isse pura audit trail milta hai!";
    }
    if (text.includes('security') || text.includes('safe') || text.includes('secure')) {
        return "🛡️ Swadeshi Khata mein kaafi security layers hain: (1) XSS protection via HTML escaping, (2) SQL injection prevention, (3) Input length validation (max 500 chars), (4) Per-IP rate limiting (60 req/min), (5) Security headers (CSP, HSTS, X-Frame-Options)";
    }
    if (text.includes('algorithm') || text.includes('greedy') || text.includes('best-fit')) {
        return "🧠 Humara scheduler Best-Fit Decreasing strategy use karta hai: Tasks ko bade se chhote sort karo, phir har task ke liye sabse tight-fitting slot dhundho. Yeh First-Fit se better hai kyunki wasted space minimize hoti hai!";
    }
    if (text.includes('tip') || text.includes('idea') || text.includes('reduce')) {
        const tips = [
            "💡 Tip: Washing machine ko raat mein chalane se grid par load kam padta hai aur emissions ghatte hain.",
            "💡 Tip: Gaadi ke bajaye public transport ya auto rickshaw ka istemaal karein. Iska carbon impact bahut kam hota hai!",
            "💡 Tip: LED bulbs ka istemaal karke aap apni bijli khapat aur carbon footprint dono bacha sakte hain.",
            "💡 Tip: Local aur seasonal fruits-vegetables khaane se transport emissions kam hoti hain!",
            "💡 Tip: Laptop/computer ko sleep mode mein rakhein jab use nahi kar rahe — chhoti savings, bada impact!"
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    }
    if (text.includes('hello') || text.includes('hi') || text.includes('namaste')) {
        return `Namaste ${escapeHTML(userName || 'Dost')}! 🙏 Main apka Eco Sahayak hoon. Puchiye jo puchna hai — budget, charts, history, scheduling, ya koi bhi sawaal!`;
    }
    if (text.includes('tech') || text.includes('stack') || text.includes('built')) {
        return "🔧 Tech Stack: Frontend — Vanilla HTML/CSS/JS + Chart.js + Tailwind CDN. Backend — Python FastAPI + SQLite. Architecture — Event-Sourcing pattern. Algorithm — Best-Fit Decreasing Greedy. Testing — Pytest (19+ tests). All without any heavy Node.js frameworks!";
    }
    
    return "Maaf kijiyega, mujhe ye samajh nahi aaya 😅. Par aap mujhse Budget, Charts, History, Scheduling, Security, Algorithm, ya Tips ke baare mein puch sakte hain!";
}

function appendUserMessage(msg) {
    const bubble = `
        <div class="flex justify-end gap-3 animate-fade-in-up">
            <div class="bg-india-blue/40 p-3 rounded-2xl rounded-tr-none border border-india-blue/50 text-white text-sm text-right max-w-[85%] shadow-md">
                ${escapeHTML(msg)}
            </div>
        </div>
    `;
    helperChatArea.insertAdjacentHTML('beforeend', bubble);
    scrollToBottom();
}

function appendBotMessage(msg) {
    const bubbleId = 'bot-msg-' + Date.now();
    const typingBubble = `
        <div id="${bubbleId}" class="flex gap-3 animate-fade-in-up">
            <span class="text-2xl flex-shrink-0" aria-hidden="true">👳🏽‍♂️</span>
            <div class="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5 text-slate-200 text-sm shadow-md flex items-center gap-1 min-w-[60px]">
                <div class="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
                <div class="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
                <div class="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
            </div>
        </div>
    `;
    helperChatArea.insertAdjacentHTML('beforeend', typingBubble);
    scrollToBottom();
    
    setTimeout(() => {
        const bubbleEl = document.getElementById(bubbleId);
        if (bubbleEl) {
            bubbleEl.innerHTML = `
                <span class="text-2xl flex-shrink-0" aria-hidden="true">👳🏽‍♂️</span>
                <div class="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5 text-slate-200 leading-relaxed text-sm shadow-md">
                    ${msg}
                </div>
            `;
            scrollToBottom();
        }
    }, 800 + Math.random() * 500); 
}

function scrollToBottom() {
    helperChatArea.scrollTop = helperChatArea.scrollHeight;
}

helperForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = helperInput.value.trim();
    if (!msg) return;
    
    appendUserMessage(msg);
    helperInput.value = '';
    
    const response = getBotResponse(msg);
    appendBotMessage(response);
});

suggestionChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
        const msg = e.target.innerText;
        appendUserMessage(msg);
        const response = getBotResponse(msg);
        appendBotMessage(response);
    });
});


// =====================================================================
// INITIALIZATION
// =====================================================================

(async function init() {
    try {
        await fetch(`${API_BASE_URL}/reset`, { method: 'POST' });
    } catch (e) {
        console.error('Failed to reset db on load', e);
    }
    initOnboarding();
    fetchBudget();
    fetchEventHistory();
    fetchAndRenderCharts();
})();
