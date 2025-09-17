// Global variables for enhanced features
console.log('Logic.js script loaded successfully');
let calculationHistory = [];
let pendingCalculation = null;
let apiKey = localStorage.getItem('gemini_api_key') || '';

// Monitoring system variables
let monitoringData = {
    dkaHhs: {
        bgReadings: [], // {timestamp, value, protocolType}
        infusionRates: [], // {timestamp, value, protocolType}
        lastBgFlag: null,
        lastRateFlag: null
    },
    nonDka: {
        bgReadings: [], // {timestamp, value, protocolType}
        infusionRates: [], // {timestamp, value, protocolType}
        lastStableFlag: null
    },
    activeFlags: [], // {type, message, timestamp, acknowledged}
    timer: {
        startTime: null,
        duration: 60 * 60 * 1000, // 1 hour in milliseconds
        intervalId: null,
        isRunning: false
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired - initializing application');

    // Check disclaimer acceptance
    checkDisclaimer();
    
    // Load calculation history
    loadHistory();
    
    // Initialize dark mode
    initDarkMode();
    
    // Initialize API key UI
    initApiKeyUI();

    // Initialize monitoring system
    loadMonitoringData();
    updateFlagsDisplay();
    updateTimerDisplay();
    updateTimerControls();
    updateMonitoringStatus();

    // Initialize tracking graph
    setTimeout(initTrackingGraph, 100);

    // Initialize data summary
    updateDataSummary();

    // Initialize calculator tools
    initCalculatorTools();
    
    // Tab navigation is now handled by onclick handlers in HTML

    // --- INSULIN PROTOCOL DROPDOWN ---
    const insulinSelect = document.getElementById('insulin-protocol-select');
    const nonDkaProtocolDiv = document.getElementById('non-dka-hhs-protocol');
    const dkaProtocolDiv = document.getElementById('dka-hhs-protocol');
    const nonDkaSidebar = document.getElementById('non-dka-sidebar');
    const dkaSidebar = document.getElementById('dka-sidebar');

    if (insulinSelect) {
        insulinSelect.addEventListener('change', () => {
            const isDka = insulinSelect.value === 'dka-hhs';
            nonDkaProtocolDiv.style.display = isDka ? 'none' : 'block';
            dkaProtocolDiv.style.display = isDka ? 'block' : 'none';
            nonDkaSidebar.style.display = isDka ? 'none' : 'block';
            dkaSidebar.style.display = isDka ? 'block' : 'none';
        });
    }
    
    // --- DKA PHASE TABS ---
    const dkaPhaseTabs = document.querySelector('.dka-phase-tabs');
    if (dkaPhaseTabs) {
        const dkaPhaseButtons = dkaPhaseTabs.querySelectorAll('.dka-phase-button');
        const dkaPhaseContents = document.querySelectorAll('.dka-phase-content');

        dkaPhaseButtons.forEach(button => {
            button.addEventListener('click', () => {
                const phase = button.dataset.dkaPhase;

                dkaPhaseButtons.forEach(btn => btn.classList.remove('active'));
                dkaPhaseContents.forEach(content => content.classList.remove('active'));

                button.classList.add('active');
                document.getElementById(`dka-${phase}-content`).classList.add('active');
            });
        });
    }

    // --- DYNAMIC VISIBILITY FOR PREVIOUS BG INPUT ---
    const currentBgAdjInput = document.getElementById('current-bg-adj');
    const previousBgRow = document.getElementById('previous-bg-row');
    if (currentBgAdjInput && previousBgRow) {
        currentBgAdjInput.addEventListener('input', () => {
            const currentBg = parseInt(currentBgAdjInput.value, 10);
            if (!isNaN(currentBg) && currentBg > 100) {
                previousBgRow.style.display = 'grid';
            } else {
                previousBgRow.style.display = 'none';
            }
        });
    }
    
    // --- WEIGHT CONVERTER LOGIC ---
    function setupWeightConverter(lbsId, kgId) {
        const lbsInput = document.getElementById(lbsId);
        const kgInput = document.getElementById(kgId);

        if (lbsInput && kgInput) {
            lbsInput.addEventListener('input', () => {
                const lbs = parseFloat(lbsInput.value);
                if (!isNaN(lbs)) {
                    kgInput.value = (lbs / 2.20462).toFixed(2);
                } else {
                    kgInput.value = '';
                }
            });

            kgInput.addEventListener('input', () => {
                const kg = parseFloat(kgInput.value);
                if (!isNaN(kg)) {
                    lbsInput.value = (kg * 2.20462).toFixed(2);
                } else {
                    lbsInput.value = '';
                }
            });
        }
    }
    setupWeightConverter('lbs-input', 'kg-input');
    setupWeightConverter('other-lbs-input', 'other-kg-input');

    // --- DKA BOLUS CHECKBOX ---
    const showBolusCheckbox = document.getElementById('show-bolus-calc');
    const bolusCalculatorContent = document.getElementById('bolus-calculator-content');
    if(showBolusCheckbox && bolusCalculatorContent) {
        showBolusCheckbox.addEventListener('change', () => {
            bolusCalculatorContent.style.display = showBolusCheckbox.checked ? 'block' : 'none';
        });
    }

    // Keyboard functionality now handled by direct HTML onkeypress/onkeydown handlers
});

// === GLOBAL KEYBOARD HANDLER ===
function handleGlobalKeydown(event) {
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const confirmButton = activeModal.querySelector('.confirm-btn');
            if (confirmButton) {
                confirmButton.click();
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            const cancelButton = activeModal.querySelector('.cancel-btn');
            if (cancelButton) {
                cancelButton.click();
            }
        }
    }
}

// === TAB NAVIGATION FUNCTION ===
function switchTab(protocol) {
    console.log('Switching to tab:', protocol);

    const tabButtons = document.querySelectorAll('.tab-button');
    const protocolContents = document.querySelectorAll('.protocol-content');

    // Remove active class from all tabs and contents
    tabButtons.forEach(btn => btn.classList.remove('active'));
    protocolContents.forEach(content => content.classList.remove('active'));

    // Add active class to clicked tab
    const clickedTab = document.querySelector(`[data-protocol="${protocol}"]`);
    if (clickedTab) {
        clickedTab.classList.add('active');
    }

    // Show corresponding content
    const content = document.getElementById(`${protocol}-protocol-content`);
    if (content) {
        content.classList.add('active');
    }
}

// === ENHANCED FEATURES ===

// Disclaimer management
function checkDisclaimer() {
    const accepted = localStorage.getItem('disclaimer_accepted');
    const banner = document.getElementById('disclaimer-banner');
    if (banner && !accepted) {
        banner.classList.remove('hidden');
    } else if (banner) {
        banner.classList.add('hidden');
    }
}

function acceptDisclaimer() {
    localStorage.setItem('disclaimer_accepted', 'true');
    const banner = document.getElementById('disclaimer-banner');
    if (banner) {
        banner.classList.add('hidden');
    }
}

// Dark mode
function initDarkMode() {
    const isDark = localStorage.getItem('dark_mode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon();
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('dark_mode', isDark);
    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    const btn = document.getElementById('dark-mode-toggle');
    if (btn) {
        const icon = btn.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }
}

// History management
function loadHistory() {
    const saved = localStorage.getItem('calculation_history');
    if (saved) {
        calculationHistory = JSON.parse(saved);
        updateHistoryDisplay();
    }
}

function saveHistory() {
    localStorage.setItem('calculation_history', JSON.stringify(calculationHistory));
    updateHistoryDisplay();
}

function addToHistory(protocol, inputs, result, isCritical = false) {
    const entry = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        protocol,
        inputs,
        result,
        isCritical
    };
    
    calculationHistory.unshift(entry);
    if (calculationHistory.length > 50) {
        calculationHistory = calculationHistory.slice(0, 50);
    }
    
    saveHistory();
}

function updateHistoryDisplay() {
    const content = document.getElementById('history-content');
    const count = document.getElementById('history-count');
    
    if (count) {
        count.textContent = calculationHistory.length;
    }
    
    if (content) {
        if (calculationHistory.length === 0) {
            content.innerHTML = '<p class="history-empty">No calculations yet</p>';
        } else {
            content.innerHTML = calculationHistory.map(entry => `
                <div class="history-item ${entry.isCritical ? 'critical' : ''}">
                    <div class="history-timestamp">${entry.timestamp}</div>
                    <div class="history-protocol">${entry.protocol}</div>
                    <div class="history-details">
                        <strong>Input:</strong> ${entry.inputs}<br>
                        <strong>Result:</strong> ${entry.result}
                    </div>
                </div>
            `).join('');
        }
    }
}

function toggleHistory() {
    const panel = document.getElementById('history-panel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all calculation history?')) {
        calculationHistory = [];
        saveHistory();
    }
}

// Feedback Modal
function toggleFeedback() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        modal.classList.toggle('active');
    }
}

function submitFeedback() {
    const form = document.getElementById('feedback-form');
    const feedbackText = document.getElementById('feedback-text').value;

    if (!feedbackText) {
        alert('Please enter your feedback before submitting.');
        return;
    }

    const formData = new FormData(form);

    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    }).then(response => {
        if (response.ok) {
            alert('Thank you for your feedback!');
            form.reset();
            toggleFeedback();
        } else {
            response.json().then(data => {
                if (Object.hasOwn(data, 'errors')) {
                    alert(data["errors"].map(error => error["message"]).join(", "));
                } else {
                    alert('Oops! There was a problem submitting your form');
                }
            })
        }
    }).catch(error => {
        alert('Oops! There was an error submitting your form.');
        console.error('Formspree error:', error);
    });
}
document.getElementById('feedback-form').addEventListener('submit', function(e) {
    e.preventDefault();
    submitFeedback();
});


// Confirmation modal for critical calculations
function showConfirmation(message, values, callback) {
    pendingCalculation = callback;
    const modal = document.getElementById('confirmation-modal');
    const messageEl = document.getElementById('confirmation-message');
    const valuesEl = document.getElementById('modal-values');
    
    if (modal && messageEl && valuesEl) {
        messageEl.textContent = message;
        valuesEl.innerHTML = values;
        modal.classList.add('active');
    } else {
        callback();
    }
}

function confirmCalculation() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    if (pendingCalculation) {
        pendingCalculation();
        pendingCalculation = null;
    }
}

function cancelCalculation() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    pendingCalculation = null;
}

// Add timestamp to results
function addTimestamp(resultsDiv) {
    const timestamp = document.createElement('div');
    timestamp.className = 'calculation-timestamp';
    timestamp.textContent = `Calculated at ${new Date().toLocaleTimeString()}`;
    resultsDiv.appendChild(timestamp);
}

// Add completion indicator
function addCompletionIndicator(resultsDiv) {
    const indicator = document.createElement('div');
    indicator.className = 'completion-indicator';
    indicator.innerHTML = '<i class="fas fa-check-circle"></i> Calculation Complete';
    resultsDiv.appendChild(indicator);
}

// API Key management
function initApiKeyUI() {
    const setup = document.getElementById('api-key-setup');
    const chatInterface = document.getElementById('chat-interface');
    
    if (apiKey && setup && chatInterface) {
        setup.style.display = 'none';
        chatInterface.style.display = 'block';
    }
}

function saveApiKey() {
    const input = document.getElementById('api-key-input');
    if (input && input.value) {
        apiKey = input.value;
        localStorage.setItem('gemini_api_key', apiKey);
        
        const setup = document.getElementById('api-key-setup');
        const chatInterface = document.getElementById('chat-interface');
        
        if (setup && chatInterface) {
            setup.style.display = 'none';
            chatInterface.style.display = 'block';
        }
        
        input.value = '';
    } else {
        alert('Please enter a valid API key');
    }
}

function changeApiKey() {
    const setup = document.getElementById('api-key-setup');
    const chatInterface = document.getElementById('chat-interface');
    
    if (setup && chatInterface) {
        setup.style.display = 'block';
        chatInterface.style.display = 'none';
    }
}

// === ORIGINAL CLINICAL CALCULATIONS (PRESERVED EXACTLY) ===

/**
 * Calculates and displays heparin dose adjustments.
 */
function getHeparinInstructions() {
    const apttInput = document.getElementById('heparin-aptt');
    const apttValue = parseFloat(apttInput.value);
    const resultsDiv = document.getElementById('heparin-results');

    resultsDiv.innerHTML = '';

    if (isNaN(apttValue) || apttValue < 0) {
        resultsDiv.innerHTML = '<p class="result-error">Please enter a valid aPTT value.</p>';
        return;
    }

    const isCritical = apttValue >= 200 || apttValue < 30;
    
    if (isCritical) {
        showConfirmation(
            'This is a critical aPTT value requiring immediate attention.',
            `aPTT Value: ${apttValue} seconds`,
            () => performHeparinCalculation(apttValue, resultsDiv)
        );
    } else {
        performHeparinCalculation(apttValue, resultsDiv);
    }
}

function performHeparinCalculation(apttValue, resultsDiv) {
    let bolus = 'None';
    let holdInfusion = 'No';
    let doseChange = '';
    let nextAptt = '6 hrs';
    let highlightClass = 'result-warning'; 

    if (apttValue < 30) {
        bolus = '80 units/kg';
        doseChange = 'Increase by 4 units/kg/hr';
    } else if (apttValue >= 30 && apttValue <= 50) {
        bolus = '40 units/kg';
        doseChange = 'Increase by 3 units/kg/hr';
    } else if (apttValue >= 51 && apttValue <= 69) {
        doseChange = 'Increase by 2 units/kg/hr';
    } else if (apttValue >= 70 && apttValue <= 90) {
        doseChange = 'No Dose Change';
        nextAptt = '6 hrs or next morning';
        highlightClass = 'result-therapeutic'; 
    } else if (apttValue >= 91 && apttValue <= 100) {
        doseChange = 'Decrease by 1 unit/kg/hr';
    } else if (apttValue >= 101 && apttValue <= 110) {
        holdInfusion = '30 min';
        doseChange = 'Decrease by 2 units/kg/hr';
    } else if (apttValue >= 111 && apttValue <= 120) {
        holdInfusion = '1 hr';
        doseChange = 'Decrease by 3 units/kg/hr';
    } else if (apttValue >= 121 && apttValue <= 199) {
        holdInfusion = '2 hrs';
        doseChange = 'Decrease by 3 units/kg/hr';
    } else { // apttValue >= 200
        holdInfusion = 'Hold & PAGE MD, check aPTT q2h until < 121';
        doseChange = 'PAGE MD, DECREASE by 4 units/kg/hr and restart when aPTT < 121';
        nextAptt = '6 hrs after aPTT < 121';
        highlightClass = 'result-critical'; 
    }

    const htmlOutput = `
        <div class="result-grid">
            <div class="result-item">
                <h3>Bolus:</h3>
                <p>${bolus}</p>
            </div>
            <div class="result-item ${highlightClass === 'result-critical' ? 'result-critical' : ''}">
                <h3>Hold Infusion:</h3>
                <p>${holdInfusion}</p>
            </div>
            <div class="result-item ${highlightClass === 'result-therapeutic' || highlightClass === 'result-critical' ? highlightClass : ''}">
                <h3>Dose Change:</h3>
                <p>${doseChange}</p>
            </div>
            <div class="result-item">
                <h3>Next aPTT:</h3>
                <p>${nextAptt}</p>
            </div>
        </div>
    `;
    resultsDiv.innerHTML = htmlOutput;
    
    addTimestamp(resultsDiv);
    addCompletionIndicator(resultsDiv);
    
    const isCritical = apttValue >= 200 || apttValue < 30;
    addToHistory(
        'Heparin Protocol',
        `aPTT: ${apttValue}`,
        `${doseChange}, Hold: ${holdInfusion}`,
        isCritical
    );
}

/**
 * Calculates the initial insulin infusion rate for Non-DKA.
 */
function calculateInsulinRate() {
    const bgInput = document.getElementById('insulin-bg');
    const resultsDiv = document.getElementById('insulin-rate-results');
    const bg = parseInt(bgInput.value, 10);

    if (isNaN(bg) || bg <= 0) {
        resultsDiv.innerHTML = `<p class="result-error">Please enter a valid Blood Glucose (BG) value.</p>`;
        return;
    }

    if (bg > 600) {
        showConfirmation(
            'Blood glucose is critically high.',
            `Blood Glucose: ${bg} mg/dL`,
            () => performInsulinRateCalculation(bg, resultsDiv)
        );
    } else {
        performInsulinRateCalculation(bg, resultsDiv);
    }
}

function performInsulinRateCalculation(bg, resultsDiv) {
    let rateMessage = '';
    let resultClass = 'result-info';

    const calculatedRate = (bg - 60) * 0.02;
    
    if (calculatedRate < 0) {
         rateMessage = `BG is below the threshold for calculation. Consult provider.`;
         resultClass = 'result-warning';
    } else {
        rateMessage = `Calculated initial infusion rate: <strong>${calculatedRate.toFixed(1)} units/hr</strong>.`;
        if (bg > 600) {
            rateMessage += `<br><br><strong style="color: #c0392b;">Warning: BG > 600 mg/dL. Starting rate REQUIRES PHYSICIAN ORDER.</strong>`;
            resultClass = 'result-critical';
        }
    }

    const cautionsHtml = `
        <div class="result-item result-critical" style="text-align: left; margin-top: 1rem;">
            <h4 style="color: black; margin-top: 0; margin-bottom: 0.5rem;">Cautions:</h4>
            <ul style="padding-left: 20px; margin: 0; color: black; list-style-position: inside;">
                <li>Caution with elderly, CKD and low body weight individuals.</li>
                <li>Caution with BG > 600 mg/dL (starting dose may be too high).</li>
                <li>Notify provider if insulin infusion rate is > 20 units/hour.</li>
            </ul>
        </div>
    `;
   
    resultsDiv.innerHTML = `<p class="${resultClass}" style="padding: 15px; border-radius: 5px; border-left-width: 5px; border-left-style: solid;">${rateMessage}</p>` + cautionsHtml;
    
    addTimestamp(resultsDiv);
    addCompletionIndicator(resultsDiv);
    
    addToHistory(
        'Non-DKA Insulin Initial Rate',
        `BG: ${bg} mg/dL`,
        `Rate: ${calculatedRate.toFixed(1)} units/hr`,
        bg > 600
    );

    // Add to monitoring system
    addMonitoringData('non-dka', bg, calculatedRate >= 0 ? calculatedRate : null);
}

/**
 * Calculates adjustments for an existing Non-DKA insulin infusion.
 */
function calculateInsulinAdjustment() {
    const currentRateInput = document.getElementById('current-rate');
    const currentBgInput = document.getElementById('current-bg-adj');
    const previousBgInput = document.getElementById('previous-bg');
    const isT1DMInput = document.getElementById('type-1-dm');
    const resultsDiv = document.getElementById('insulin-adjustment-results');

    const currentRate = parseFloat(currentRateInput.value);
    const currentBg = parseInt(currentBgInput.value, 10);
    const isT1DM = isT1DMInput.checked;

    resultsDiv.innerHTML = '';

    if (isNaN(currentRate) || isNaN(currentBg) || currentRate < 0 || currentBg <= 0) {
        resultsDiv.innerHTML = `<p class="result-error">Please enter valid values for Current Rate and Current BG.</p>`;
        return;
    }

    if (currentBg <= 70 || currentBg > 400) {
        showConfirmation(
            'Blood glucose is at a critical level.',
            `Current BG: ${currentBg} mg/dL<br>Current Rate: ${currentRate} units/hr`,
            () => performInsulinAdjustmentCalculation(currentRate, currentBg, previousBgInput, isT1DM, resultsDiv)
        );
    } else {
        performInsulinAdjustmentCalculation(currentRate, currentBg, previousBgInput, isT1DM, resultsDiv);
    }
}

function performInsulinAdjustmentCalculation(currentRate, currentBg, previousBgInput, isT1DM, resultsDiv) {
    let adjustment = '';
    let newRateInfo = '';
    let resultClass = 'result-warning';

    if (currentBg <= 70) {
        resultClass = 'result-critical';
        if (isT1DM) {
            adjustment = "<strong>Action:</strong> Hold insulin drip and initiate hypoglycemia SDO. If BG remains < 140 mg/dL after treatment, start D5W at 50 cc/hr and monitor BG hourly. <br><strong>Resumption:</strong> Once BG ≥ 140 mg/dL, call physician to resume insulin at 50% previous rate and continue to follow the insulin protocol. Stop D5W one hour after insulin is resumed if BG ≥ 140 mg/dL.";
        } else {
            adjustment = "<strong>Action:</strong> Hold insulin drip and initiate hypoglycemia SDO. If BG remains < 140 mg/dL after treatment, check BG hourly until BG ≥ 140 mg/dL. <br><strong>Resumption:</strong> Once BG ≥ 140 mg/dL, call physician to resume insulin at 50% previous rate and continue to follow the insulin protocol.";
        }
    } else if (currentBg >= 71 && currentBg <= 100) {
        resultClass = 'result-critical';
        if (isT1DM) {
            adjustment = "<strong>Action:</strong> Hold insulin drip and recheck BG in 15 mins. If BG remains 71-140 mg/dL, start D5W at 50 cc/hr and check BG q30 mins x 2, then hourly. <br><strong>Resumption:</strong> Once BG ≥ 140 mg/dL, call physician to resume insulin at 50% previous rate and continue to follow the insulin protocol. Stop D5W one hour after insulin is resumed if BG ≥ 140 mg/dL.";
        } else {
            adjustment = "<strong>Action:</strong> Hold insulin drip and recheck BG in 15 mins. If BG remains 71-140 mg/dL, check BG q30 mins x 2, then hourly. <br><strong>Resumption:</strong> Once BG ≥ 140 mg/dL, call physician to resume insulin at 50% previous rate and continue to follow the insulin protocol.";
        }
    } 
    else {
        const previousBg = parseInt(previousBgInput.value, 10);
        
        if (currentBg >= 101 && currentBg <= 140) {
            if (!isNaN(previousBg) && previousBg < 100) {
                const newRate = Math.max(0, currentRate - 1);
                adjustment = `<strong>Action:</strong> Decrease rate by 1 unit/hr. <br><strong>Follow-up:</strong> Check BG q 30 min until ≥ 140 mg/dL.`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg >= 141 && previousBg <= 300) {
                const change = Math.max(currentRate * 0.50, 2);
                const newRate = Math.max(0, currentRate - change);
                adjustment = `<strong>Action:</strong> Decrease rate by ${change.toFixed(1)} units/hr (50% or 2 units/hr, whichever is greater). <br><strong>Follow-up:</strong> Check BG q 30 min until ≥ 140 mg/dL.`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg > 300) {
                const change = Math.max(currentRate * 0.70, 2);
                const newRate = Math.max(0, currentRate - change);
                adjustment = `<strong>Action:</strong> Decrease rate by ${change.toFixed(1)} units/hr (70% or 2 units/hr, whichever is greater). <br><strong>Follow-up:</strong> Check BG q 30 min until ≥ 140 mg/dL.`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else { 
                const change = Math.max(currentRate * 0.25, 0.5);
                const newRate = Math.max(0, currentRate - change);
                adjustment = `<strong>Action:</strong> Decrease rate by ${change.toFixed(1)} units/hr (25% or 0.5 units/hr, whichever is greater). <br><strong>Follow-up:</strong> Check BG q 30 min until ≥ 140 mg/dL.`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            }
        } 
        else if (currentBg >= 141 && currentBg <= 180) {
            if (!isNaN(previousBg) && previousBg >= 201) {
                 const change = Math.max(currentRate * 0.50, 2);
                 const newRate = Math.max(0, currentRate - change);
                 adjustment = `<strong>Action:</strong> Decrease rate by ${change.toFixed(1)} units/hr (50% or 2 units/hr, whichever is greater). <br><strong>Follow-up:</strong> Continue hourly BG checks.`;
                 newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
                 resultClass = 'result-warning';
            } else {
                 resultClass = 'result-therapeutic';
                 adjustment = "<strong>Action:</strong> No change in rate.";
                 newRateInfo = `<strong>Current Rate:</strong> ${currentRate.toFixed(1)} units/hr`;
            }
        } 
        else if (currentBg >= 181 && currentBg <= 200) {
            if (!isNaN(previousBg) && previousBg < 100) {
                const newRate = currentRate + 1;
                adjustment = `<strong>Action:</strong> Increase rate by 1 unit/hr.`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg >= 100 && previousBg <= 180) {
                const newRate = currentRate + 0.5;
                adjustment = `<strong>Action:</strong> Increase rate by 0.5 unit/hr.`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            }
            else if (!isNaN(previousBg) && previousBg >= 181 && previousBg <= 200) {
                const change = Math.max(currentRate * 0.25, 1.0);
                const newRate = currentRate + change;
                adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (25% or 1 unit/hr, whichever is greater).`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg >= 201 && previousBg <= 250) {
                adjustment = "<strong>Action:</strong> No change to current rate.";
                newRateInfo = `<strong>Current Rate:</strong> ${currentRate.toFixed(1)} units/hr`;
                resultClass = 'result-therapeutic';
            } else if (!isNaN(previousBg) && previousBg >= 251) {
                const change = Math.max(currentRate * 0.25, 2);
                const newRate = Math.max(0, currentRate - change);
                adjustment = `<strong>Action:</strong> Decrease rate by ${change.toFixed(1)} units/hr (25% or 2 units/hr, whichever is greater).`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else {
                const newRate = currentRate + 0.5;
                adjustment = `<strong>Action:</strong> Increase rate by 0.5 units/hr.`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            }
        } 
        else if (currentBg >= 201 && currentBg <= 250) {
            if (!isNaN(previousBg) && previousBg <= 180) {
                const change = Math.max(currentRate * 0.25, 2.0);
                const newRate = currentRate + change;
                adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (25% or 2 units/hr, whichever is greater).`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg >= 181 && previousBg <= 300) {
                const change = Math.max(currentRate * 0.25, 1.0);
                const newRate = currentRate + change;
                adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (25% or 1 unit/hr, whichever is greater).`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg >= 301 && previousBg <= 400) {
                const newRate = currentRate + 1.0;
                adjustment = `<strong>Action:</strong> Increase rate by 1 unit/hr.`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg > 400) {
                adjustment = "<strong>Action:</strong> No change to current rate.";
                newRateInfo = `<strong>Current Rate:</strong> ${currentRate.toFixed(1)} units/hr`;
                resultClass = 'result-therapeutic';
            } else {
                 const change = Math.max(currentRate * 0.25, 1.0);
                 const newRate = Math.round((currentRate + change) * 10) / 10;
                 adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (Fallback).`;
                 newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            }
        }
        else if (currentBg >= 251 && currentBg <= 300) {
             if (!isNaN(previousBg) && previousBg <= 140) {
                const change = Math.max(currentRate * 0.25, 2.5);
                const newRate = currentRate + change;
                adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (25% or 2.5 units/hr, whichever is greater).`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg >= 141 && previousBg <= 180) {
                const change = Math.max(currentRate * 0.25, 1.5);
                const newRate = currentRate + change;
                adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (25% or 1.5 units/hr, whichever is greater).`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg >= 181 && previousBg <= 250) {
                const change = Math.max(currentRate * 0.25, 1.0);
                const newRate = currentRate + change;
                adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (25% or 1 unit/hr, whichever is greater).`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg >= 251 && previousBg <= 300) {
                const change = Math.max(currentRate * 0.25, 1.5);
                const newRate = currentRate + change;
                adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (25% or 1.5 units/hr, whichever is greater).`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg >= 301 && previousBg <= 400) {
                const change = Math.max(currentRate * 0.25, 2.0);
                const newRate = currentRate + change;
                adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (25% or 2 units/hr, whichever is greater).`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            } else if (!isNaN(previousBg) && previousBg > 400) {
                adjustment = "<strong>Action:</strong> No change to current rate.";
                newRateInfo = `<strong>Current Rate:</strong> ${currentRate.toFixed(1)} units/hr`;
                resultClass = 'result-therapeutic';
            }
        } 
        else if (currentBg >= 301 && currentBg <= 400) {
            const change = Math.max(currentRate * 0.40, 3.0);
            const newRate = currentRate + change;
            adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (40% or 3 units/hr, whichever is greater).`;
            newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
        } 
        else { 
            const change = Math.max(currentRate * 0.50, 4.0);
            const newRate = currentRate + change;
            adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (50% or 4 units/hr, whichever is greater).`;
            newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
        }
    }

    resultsDiv.innerHTML = `
        <div class="result-item ${resultClass}" style="text-align: left;">
             <p>${adjustment}</p>
             ${newRateInfo ? `<p style="margin-top: 0.5rem;">${newRateInfo}</p>` : ''}
        </div>
    `;
    
    addTimestamp(resultsDiv);
    addCompletionIndicator(resultsDiv);
    
    const previousBg = parseInt(previousBgInput.value, 10);
    const inputStr = `Current BG: ${currentBg}, Rate: ${currentRate}${!isNaN(previousBg) ? `, Prev BG: ${previousBg}` : ''}${isT1DM ? ', T1DM' : ''}`;
    
    addToHistory(
        'Non-DKA Insulin Adjustment',
        inputStr,
        adjustment.replace(/<[^>]*>/g, '').substring(0, 50) + '...',
        currentBg <= 70 || currentBg > 400
    );

    // Extract new rate from adjustment logic and add to monitoring system
    let newRate = currentRate;
    if (adjustment.includes('New Rate:')) {
        const rateMatch = newRateInfo.match(/(\d+\.?\d*) units\/hr/);
        if (rateMatch) {
            newRate = parseFloat(rateMatch[1]);
        }
    }
    addMonitoringData('non-dka', currentBg, newRate);
}

// --- DKA/HHS PROTOCOL ---
function calculateDkaBolus() {
    const weight = parseFloat(document.getElementById('bolus-weight').value);
    const resultsDiv = document.getElementById('bolus-results');
    
    if (isNaN(weight) || weight <= 0) {
        resultsDiv.innerHTML = `<p class="result-error">Please enter a valid weight.</p>`;
        return;
    }
    
    const bolusAmount = Math.min(weight * 0.1, 10); // 0.1 units/kg, max 10 units
    resultsDiv.innerHTML = `<div class="result-item result-therapeutic">
        <p><strong>Regular Insulin Bolus:</strong> ${bolusAmount.toFixed(1)} units IV</p>
        <p style="margin-top: 0.5rem; font-size: 0.9em;">Calculated as 0.1 units/kg (Maximum: 10 units)</p>
    </div>`;
    
    addTimestamp(resultsDiv);
    addCompletionIndicator(resultsDiv);
    
    addToHistory(
        'DKA Bolus Calculation',
        `Weight: ${weight} kg`,
        `Bolus: ${bolusAmount.toFixed(1)} units IV`,
        false
    );
}

function calculateDkaInitiation() {
    const weight = parseFloat(document.getElementById('phase1-initiation-weight').value);
    const resultsDiv = document.getElementById('phase1-initiation-results');
    if (isNaN(weight) || weight <= 0) {
        resultsDiv.innerHTML = `<p class="result-error">Please enter a valid weight.</p>`;
        return;
    }
    const initialRate = weight * 0.1;
    resultsDiv.innerHTML = `<div class="result-item result-therapeutic">
        <p><strong>Initial Infusion Rate:</strong> ${initialRate.toFixed(1)} units/hr</p>
        <p class="critical-warning" style="margin-top: 1rem;">Continue to Phase 1 Continuation only after 1 hour has passed.</p>
    </div>`;
    
    addTimestamp(resultsDiv);
    addCompletionIndicator(resultsDiv);
    
    addToHistory(
        'DKA Phase 1 Initiation',
        `Weight: ${weight} kg`,
        `Initial Rate: ${initialRate.toFixed(1)} units/hr`,
        false
    );

    // Add to monitoring system
    addMonitoringData('dka-hhs', null, initialRate);
}

function calculateDkaPhase1Continuation() {
    const currentRate = parseFloat(document.getElementById('phase1-current-rate').value);
    const rateChange = parseFloat(document.getElementById('phase1-rate-change').value);
    const resultsDiv = document.getElementById('phase1-continuation-results');

    if (isNaN(currentRate) || isNaN(rateChange) || currentRate < 0) {
        resultsDiv.innerHTML = `<p class="result-error">Please enter valid Current Rate and BG Drop.</p>`;
        return;
    }

    let adjustmentText = '';
    let newRate = currentRate;
    let resultClass = 'result-therapeutic'; 

    if (rateChange <= 50) { 
        newRate = currentRate * 1.5;
        adjustmentText = `Increase current infusion rate by 50%.`;
        resultClass = 'result-warning';
    } else if (rateChange > 50 && rateChange <= 100) {
        adjustmentText = `No change to infusion rate.`;
    } else { // rateChange > 100
        newRate = currentRate * 0.5;
        adjustmentText = `Decrease current infusion rate by 50%.<br><strong class="critical-warning">Begin neuro checks q1hr x2 and BG checks q30min x2.</strong>`;
        resultClass = 'result-critical';
    }

    resultsDiv.innerHTML = `
        <div class="result-item ${resultClass}">
            <p><strong>Action:</strong> ${adjustmentText}</p>
            <p style="margin-top: 0.5rem;"><strong>New Infusion Rate:</strong> ${newRate.toFixed(1)} units/hr</p>
        </div>`;
    
    addTimestamp(resultsDiv);
    addCompletionIndicator(resultsDiv);
    
    addToHistory(
        'DKA Phase 1 Continuation',
        `Current Rate: ${currentRate}, BG Drop: ${rateChange}`,
        `New Rate: ${newRate.toFixed(1)} units/hr`,
        rateChange > 100
    );

    // Add to monitoring system
    addMonitoringData('dka-hhs', null, newRate);
}

function calculateDkaTransition() {
    const weight = parseFloat(document.getElementById('transition-weight').value);
    const currentRate = parseFloat(document.getElementById('transition-current-rate').value);
    const resultsDiv = document.getElementById('transition-results');

    if (isNaN(weight) || weight <= 0 || isNaN(currentRate)) {
        resultsDiv.innerHTML = `<p class="result-error">Please enter valid weight and current rate.</p>`;
        return;
    }

    const calculatedRate = weight * 0.05;
    const newRate = Math.min(calculatedRate, currentRate);
    
    resultsDiv.innerHTML = `
        <div class="result-item result-therapeutic">
            <p><strong>Calculated Transition Rate (0.05 units/kg/hr):</strong> ${calculatedRate.toFixed(1)} units/hr</p>
            <p style="margin-top: 0.5rem;"><strong>New Infusion Rate (Use lower of the two):</strong> ${newRate.toFixed(1)} units/hr</p>
            <p style="margin-top: 1rem;"><strong>Action:</strong> Change IVF to D5 1/2NS at 100 ml/hr and move to Phase 2 with next BG check.</p>
        </div>`;
    
    addTimestamp(resultsDiv);
    addCompletionIndicator(resultsDiv);
    
    addToHistory(
        'DKA Transition Phase',
        `Weight: ${weight} kg, Current Rate: ${currentRate}`,
        `New Rate: ${newRate.toFixed(1)} units/hr`,
        false
    );

    // Add to monitoring system
    addMonitoringData('dka-hhs', null, newRate);
}

function calculateDkaPhase2() {
    const currentRate = parseFloat(document.getElementById('phase2-current-rate').value);
    const currentBg = parseInt(document.getElementById('phase2-current-bg').value, 10);
    const resultsDiv = document.getElementById('phase2-results');

    if (isNaN(currentRate) || isNaN(currentBg)) {
        resultsDiv.innerHTML = `<p class="result-error">Please enter valid current rate and BG.</p>`;
        return;
    }

    let adjustment = '', newRate = currentRate, resultClass = 'result-warning';
    
    if (currentBg > 250) {
        newRate += 2;
        adjustment = `<strong>Action:</strong> Increase rate by 2 units/hr.`;
    } else if (currentBg >= 201) {
        newRate += 1;
        adjustment = `<strong>Action:</strong> Increase rate by 1 unit/hr.`;
    } else if (currentBg >= 150) {
        adjustment = "<strong>Action:</strong> No change to infusion rate.";
        resultClass = 'result-therapeutic';
    } else if (currentBg >= 70) {
        newRate *= 0.5;
        adjustment = `<strong>Action:</strong> Decrease rate by 50%.<br><strong>Follow-up:</strong> Recheck BG in 30 minutes.`;
    } else { // BG < 70
        newRate *= 0.5;
        adjustment = `<strong class="critical-warning"><strong>Action</strong>: Stop infusion. Follow SDO for Hypoglycemia.</strong><br><strong>Resumption:</strong> When BG > 150 mg/dL, resume infusion at 50% of the most recent rate (${(currentRate * 0.5).toFixed(1)} units/hr).`;
        resultClass = 'result-critical';
    }
    
    resultsDiv.innerHTML = `
        <div class="result-item ${resultClass}">
            <p>${adjustment}</p>
            ${currentBg >= 70 ? `<p style="margin-top: 0.5rem;"><strong>New Infusion Rate:</strong> ${newRate.toFixed(1)} units/hr</p>` : ''}
        </div>`;
    
    addTimestamp(resultsDiv);
    addCompletionIndicator(resultsDiv);
    
    addToHistory(
        'DKA Phase 2',
        `Current Rate: ${currentRate}, BG: ${currentBg}`,
        `New Rate: ${newRate.toFixed(1)} units/hr`,
        currentBg < 70
    );

    // Add to monitoring system
    addMonitoringData('dka-hhs', currentBg, newRate);
}

// --- Gemini AI ---
const geminiSendBtn = document.getElementById('gemini-send-btn');
const geminiInput = document.getElementById('gemini-input');
const geminiChatBox = document.getElementById('gemini-chat-box');

const handleGeminiChat = async () => {
    const userMessage = geminiInput.value.trim();
    if (!userMessage) return;
    
    if (!apiKey) {
        appendMessage('Please set up your API key first.', 'bot error');
        return;
    }

    appendMessage(userMessage, 'user');
    geminiInput.value = '';
    
    const thinkingMessage = appendMessage('Thinking...', 'bot');

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

        const systemPrompt = "You are a helpful assistant for medical professionals. Provide informative, accurate, and concise responses. You are supplementary only - always remind users to use clinical judgment. Do not provide direct medical advice. Answer questions about clinical protocols, drug interactions, and medical calculations based on provided information or public knowledge. Always cite sources when possible. Keep responses brief and focused.";

        const payload = {
            contents: [{ 
                parts: [{ 
                    text: systemPrompt + "\n\nUser question: " + userMessage 
                }] 
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];

        let botResponse = "Sorry, I couldn't process that request. Please try again.";
        if (candidate && candidate.content?.parts?.[0]?.text) {
            botResponse = candidate.content.parts[0].text;
            botResponse += "\n\n*Remember: This is supplementary information only. Always use your clinical judgment and verify independently.*";
        }

        thinkingMessage.innerHTML = formatResponse(botResponse);

    } catch (error) {
        console.error("Gemini API Error:", error);
        thinkingMessage.innerHTML = `Error: ${error.message}. Please check your API key and try again.`;
        thinkingMessage.classList.add('error');
    }
};

function appendMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender.split(' ')[0]}-message`);
    if (sender.includes('error')) {
        messageElement.classList.add('error');
    }
    messageElement.innerHTML = `<p>${message}</p>`;
    geminiChatBox.appendChild(messageElement);
    geminiChatBox.scrollTop = geminiChatBox.scrollHeight;
    return messageElement.querySelector('p');
}

function formatResponse(text) {
    return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// === MONITORING SYSTEM FUNCTIONS ===

function addMonitoringData(protocolType, bgValue, infusionRate) {
    const timestamp = new Date();

    if (protocolType === 'dka-hhs') {
        if (bgValue !== null && bgValue !== undefined) {
            monitoringData.dkaHhs.bgReadings.push({
                timestamp,
                value: bgValue,
                protocolType
            });
            // Keep only last 24 hours of readings
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            monitoringData.dkaHhs.bgReadings = monitoringData.dkaHhs.bgReadings.filter(
                reading => reading.timestamp > cutoff
            );
        }

        if (infusionRate !== null && infusionRate !== undefined) {
            monitoringData.dkaHhs.infusionRates.push({
                timestamp,
                value: infusionRate,
                protocolType
            });
            // Keep only last 24 hours of readings
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            monitoringData.dkaHhs.infusionRates = monitoringData.dkaHhs.infusionRates.filter(
                reading => reading.timestamp > cutoff
            );
        }
    } else {
        // Non-DKA protocols
        if (bgValue !== null && bgValue !== undefined) {
            monitoringData.nonDka.bgReadings.push({
                timestamp,
                value: bgValue,
                protocolType
            });
            // Keep only last 24 hours of readings
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            monitoringData.nonDka.bgReadings = monitoringData.nonDka.bgReadings.filter(
                reading => reading.timestamp > cutoff
            );
        }

        if (infusionRate !== null && infusionRate !== undefined) {
            monitoringData.nonDka.infusionRates.push({
                timestamp,
                value: infusionRate,
                protocolType
            });
            // Keep only last 24 hours of readings
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            monitoringData.nonDka.infusionRates = monitoringData.nonDka.infusionRates.filter(
                reading => reading.timestamp > cutoff
            );
        }
    }

    // Check for flag conditions after adding new data
    checkDkaHhsConditions();
    checkNonDkaConditions();
    saveMonitoringData();

    // Update graph with new data
    updateGraph();
    updateDataSummary();
}

function checkDkaHhsConditions() {
    const now = new Date();

    // Check BG > 250 for 2 consecutive hours
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const recentBgReadings = monitoringData.dkaHhs.bgReadings.filter(
        reading => reading.timestamp >= twoHoursAgo
    );

    const highBgReadings = recentBgReadings.filter(reading => reading.value > 250);
    if (highBgReadings.length >= 2 && recentBgReadings.length >= 2) {
        // Check if all readings in the past 2 hours are > 250
        const allHigh = recentBgReadings.every(reading => reading.value > 250);
        if (allHigh && (!monitoringData.dkaHhs.lastBgFlag ||
            now.getTime() - monitoringData.dkaHhs.lastBgFlag.getTime() > 60 * 60 * 1000)) {
            addFlag('dka-bg-high', 'Blood glucose > 250 mg/dL for 2+ consecutive hours. Notify Provider.', 'critical');
            monitoringData.dkaHhs.lastBgFlag = now;
        }
    }

    // Check infusion rate < 2.0 for 4 consecutive hours
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const recentRateReadings = monitoringData.dkaHhs.infusionRates.filter(
        reading => reading.timestamp >= fourHoursAgo
    );

    const lowRateReadings = recentRateReadings.filter(reading => reading.value < 2.0);
    if (lowRateReadings.length >= 2 && recentRateReadings.length >= 2) {
        // Check if all readings in the past 4 hours are < 2.0
        const allLow = recentRateReadings.every(reading => reading.value < 2.0);
        if (allLow && (!monitoringData.dkaHhs.lastRateFlag ||
            now.getTime() - monitoringData.dkaHhs.lastRateFlag.getTime() > 60 * 60 * 1000)) {
            addFlag('dka-rate-low', 'Infusion rate < 2.0 units/hr for 4+ consecutive hours. Notify Provider.', 'critical');
            monitoringData.dkaHhs.lastRateFlag = now;
        }
    }
}

function checkNonDkaConditions() {
    const now = new Date();

    // Check stable BG (100-180) for 6+ consecutive hours
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const recentBgReadings = monitoringData.nonDka.bgReadings.filter(
        reading => reading.timestamp >= sixHoursAgo
    );

    if (recentBgReadings.length >= 3) { // At least 3 readings over 6 hours
        const stableReadings = recentBgReadings.filter(
            reading => reading.value >= 100 && reading.value <= 180
        );

        // Check if all readings in the past 6 hours are stable
        const allStable = recentBgReadings.every(
            reading => reading.value >= 100 && reading.value <= 180
        );

        if (allStable && (!monitoringData.nonDka.lastStableFlag ||
            now.getTime() - monitoringData.nonDka.lastStableFlag.getTime() > 60 * 60 * 1000)) {
            addFlag('non-dka-stable', 'Blood glucose stable (100-180 mg/dL) for 6+ consecutive hours. Notify Provider. Consider switching to SQ insulin.', 'info');
            monitoringData.nonDka.lastStableFlag = now;
        }
    }
}

function addFlag(type, message, severity = 'info') {
    const flag = {
        id: Date.now() + Math.random(),
        type,
        message,
        severity,
        timestamp: new Date(),
        acknowledged: false
    };

    monitoringData.activeFlags.push(flag);
    updateFlagsDisplay();
    saveMonitoringData();

    // Show notification
    showNotification(message, severity);
}

function acknowledgeFlag(flagId) {
    const flag = monitoringData.activeFlags.find(f => f.id === flagId);
    if (flag) {
        flag.acknowledged = true;
        updateFlagsDisplay();
        saveMonitoringData();
    }
}

function clearFlag(flagId) {
    monitoringData.activeFlags = monitoringData.activeFlags.filter(f => f.id !== flagId);
    updateFlagsDisplay();
    saveMonitoringData();
}

function saveMonitoringData() {
    localStorage.setItem('monitoringData', JSON.stringify(monitoringData));
}

function loadMonitoringData() {
    const saved = localStorage.getItem('monitoringData');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Restore Date objects
            ['dkaHhs', 'nonDka'].forEach(type => {
                if (parsed[type]) {
                    ['bgReadings', 'infusionRates'].forEach(prop => {
                        if (parsed[type][prop]) {
                            parsed[type][prop] = parsed[type][prop].map(reading => ({
                                ...reading,
                                timestamp: new Date(reading.timestamp)
                            }));
                        }
                    });

                    // Initialize infusionRates for nonDka if it doesn't exist (backward compatibility)
                    if (type === 'nonDka' && !parsed[type].infusionRates) {
                        parsed[type].infusionRates = [];
                    }
                    if (parsed[type].lastBgFlag) {
                        parsed[type].lastBgFlag = new Date(parsed[type].lastBgFlag);
                    }
                    if (parsed[type].lastRateFlag) {
                        parsed[type].lastRateFlag = new Date(parsed[type].lastRateFlag);
                    }
                    if (parsed[type].lastStableFlag) {
                        parsed[type].lastStableFlag = new Date(parsed[type].lastStableFlag);
                    }
                }
            });

            if (parsed.activeFlags) {
                parsed.activeFlags = parsed.activeFlags.map(flag => ({
                    ...flag,
                    timestamp: new Date(flag.timestamp)
                }));
            }

            Object.assign(monitoringData, parsed);
        } catch (e) {
            console.error('Error loading monitoring data:', e);
        }
    }
}

// === TIMER FUNCTIONS ===

function startTimer() {
    if (monitoringData.timer.isRunning) return;

    monitoringData.timer.startTime = new Date();
    monitoringData.timer.isRunning = true;

    monitoringData.timer.intervalId = setInterval(() => {
        updateTimerDisplay();
    }, 1000);

    updateTimerDisplay();
    updateTimerControls();
}

function stopTimer() {
    if (!monitoringData.timer.isRunning) return;

    clearInterval(monitoringData.timer.intervalId);
    monitoringData.timer.isRunning = false;
    monitoringData.timer.startTime = null;

    updateTimerDisplay();
    updateTimerControls();
}

function resetTimer() {
    stopTimer();
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    const targetTimeDisplay = document.getElementById('target-time-display');

    if (!timerDisplay) return;

    if (monitoringData.timer.isRunning && monitoringData.timer.startTime) {
        const elapsed = Date.now() - monitoringData.timer.startTime.getTime();
        const remaining = Math.max(0, monitoringData.timer.duration - elapsed);

        const minutes = Math.floor(remaining / (60 * 1000));
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (targetTimeDisplay) {
            const targetTime = new Date(monitoringData.timer.startTime.getTime() + monitoringData.timer.duration);
            targetTimeDisplay.textContent = `Target: ${targetTime.toLocaleTimeString()}`;
        }

        if (remaining === 0) {
            stopTimer();
            showNotification('Timer completed! Time for next assessment.', 'info');
        }
    } else {
        timerDisplay.textContent = '60:00';
        if (targetTimeDisplay) {
            const targetTime = new Date(Date.now() + monitoringData.timer.duration);
            targetTimeDisplay.textContent = `Target: ${targetTime.toLocaleTimeString()}`;
        }
    }
}

function updateTimerControls() {
    const startBtn = document.getElementById('timer-start-btn');
    const stopBtn = document.getElementById('timer-stop-btn');
    const resetBtn = document.getElementById('timer-reset-btn');

    if (startBtn) startBtn.disabled = monitoringData.timer.isRunning;
    if (stopBtn) stopBtn.disabled = !monitoringData.timer.isRunning;
    if (resetBtn) resetBtn.disabled = monitoringData.timer.isRunning;
}

// === NOTIFICATION AND UI FUNCTIONS ===

function showNotification(message, severity = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${severity}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${severity === 'critical' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="notification-close">×</button>
        </div>
    `;

    // Add to notification container
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    container.appendChild(notification);

    // Auto-remove after 10 seconds for info, 30 seconds for critical
    const autoRemoveTime = severity === 'critical' ? 30000 : 10000;
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, autoRemoveTime);
}

function updateFlagsDisplay() {
    const flagsContainer = document.getElementById('flags-container');
    if (!flagsContainer) return;

    const activeFlags = monitoringData.activeFlags.filter(flag => !flag.acknowledged);

    if (activeFlags.length === 0) {
        flagsContainer.innerHTML = '<p class="no-flags">No active alerts</p>';
        updateFlagBadge();
        return;
    }

    flagsContainer.innerHTML = activeFlags.map(flag => `
        <div class="flag-item flag-${flag.severity}">
            <div class="flag-content">
                <div class="flag-header">
                    <i class="fas ${flag.severity === 'critical' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                    <span class="flag-time">${flag.timestamp.toLocaleTimeString()}</span>
                </div>
                <div class="flag-message">${flag.message}</div>
                <div class="flag-actions">
                    <button onclick="acknowledgeFlag(${flag.id})" class="flag-btn flag-acknowledge">Acknowledge</button>
                    <button onclick="clearFlag(${flag.id})" class="flag-btn flag-clear">Clear</button>
                </div>
            </div>
        </div>
    `).join('');

    updateFlagBadge();
}

function toggleMonitoringPanel() {
    const panel = document.getElementById('monitoring-panel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

function updateMonitoringStatus() {
    const statusContainer = document.getElementById('monitoring-status');
    if (!statusContainer) return;

    const dkaReadings = monitoringData.dkaHhs.bgReadings.length + monitoringData.dkaHhs.infusionRates.length;
    const nonDkaReadings = monitoringData.nonDka.bgReadings.length + monitoringData.nonDka.infusionRates.length;
    const totalReadings = dkaReadings + nonDkaReadings;
    const activeFlags = monitoringData.activeFlags.filter(f => !f.acknowledged).length;

    statusContainer.innerHTML = `
        <div class="status-item">
            <span class="status-label">Total Readings:</span>
            <span class="status-value">${totalReadings}</span>
        </div>
        <div class="status-item">
            <span class="status-label">Active Flags:</span>
            <span class="status-value status-flags">${activeFlags}</span>
        </div>
        <div class="status-item">
            <span class="status-label">Timer:</span>
            <span class="status-value">${monitoringData.timer.isRunning ? 'Running' : 'Stopped'}</span>
        </div>
    `;

    // Update flag badge
    updateFlagBadge();
}

function updateFlagBadge() {
    const flagBadge = document.getElementById('flag-badge');
    if (!flagBadge) return;

    const activeFlags = monitoringData.activeFlags.filter(f => !f.acknowledged).length;

    if (activeFlags > 0) {
        flagBadge.textContent = activeFlags;
        flagBadge.style.display = 'flex';
    } else {
        flagBadge.style.display = 'none';
    }
}

// === TRACKING GRAPH FUNCTIONS ===

let trackingChart = null;

function initTrackingGraph() {
    const canvas = document.getElementById('tracking-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    trackingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12
                    }
                }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 6
                },
                line: {
                    tension: 0.3
                }
            }
        }
    });

    updateGraph();
}

function updateGraph() {
    if (!trackingChart) return;

    const graphType = document.getElementById('graph-type-select')?.value || 'bg';
    const timeframe = parseInt(document.getElementById('graph-timeframe-select')?.value || '24');

    const cutoffTime = new Date(Date.now() - timeframe * 60 * 60 * 1000);

    // Combine and sort all data points
    const allData = [];

    // Add DKA/HHS data
    monitoringData.dkaHhs.bgReadings.forEach(reading => {
        if (reading.timestamp >= cutoffTime) {
            allData.push({
                timestamp: reading.timestamp,
                bg: reading.value,
                type: 'dka-hhs'
            });
        }
    });

    monitoringData.dkaHhs.infusionRates.forEach(reading => {
        if (reading.timestamp >= cutoffTime) {
            const existing = allData.find(d =>
                Math.abs(d.timestamp.getTime() - reading.timestamp.getTime()) < 60000
            );
            if (existing) {
                existing.rate = reading.value;
            } else {
                allData.push({
                    timestamp: reading.timestamp,
                    rate: reading.value,
                    type: 'dka-hhs'
                });
            }
        }
    });

    // Add Non-DKA data
    monitoringData.nonDka.bgReadings.forEach(reading => {
        if (reading.timestamp >= cutoffTime) {
            allData.push({
                timestamp: reading.timestamp,
                bg: reading.value,
                type: 'non-dka'
            });
        }
    });

    monitoringData.nonDka.infusionRates.forEach(reading => {
        if (reading.timestamp >= cutoffTime) {
            const existing = allData.find(d =>
                Math.abs(d.timestamp.getTime() - reading.timestamp.getTime()) < 60000
            );
            if (existing) {
                existing.rate = reading.value;
            } else {
                allData.push({
                    timestamp: reading.timestamp,
                    rate: reading.value,
                    type: 'non-dka'
                });
            }
        }
    });

    // Sort by timestamp
    allData.sort((a, b) => a.timestamp - b.timestamp);

    // Prepare chart data
    const labels = allData.map(d => d.timestamp.toLocaleTimeString());
    const datasets = [];

    if (graphType === 'bg' || graphType === 'both') {
        const bgData = allData.map(d => d.bg || null);
        datasets.push({
            label: 'Blood Glucose (mg/dL)',
            data: bgData,
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            yAxisID: 'y',
            spanGaps: true
        });
    }

    if (graphType === 'rate' || graphType === 'both') {
        const rateData = allData.map(d => d.rate || null);
        datasets.push({
            label: 'Infusion Rate (units/hr)',
            data: rateData,
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            yAxisID: graphType === 'both' ? 'y1' : 'y',
            spanGaps: true
        });
    }

    // Update chart options for dual axis if showing both
    if (graphType === 'both') {
        trackingChart.options.scales.y1 = {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
                drawOnChartArea: false,
                color: 'rgba(0,0,0,0.1)'
            },
            title: {
                display: true,
                text: 'Infusion Rate (units/hr)'
            }
        };
        trackingChart.options.scales.y.title = {
            display: true,
            text: 'Blood Glucose (mg/dL)'
        };
    } else {
        delete trackingChart.options.scales.y1;
        trackingChart.options.scales.y.title = {
            display: true,
            text: graphType === 'bg' ? 'Blood Glucose (mg/dL)' : 'Infusion Rate (units/hr)'
        };
    }

    trackingChart.data.labels = labels;
    trackingChart.data.datasets = datasets;
    trackingChart.update();
}

function clearTrackingData(type) {
    const confirmations = {
        'bg': 'Are you sure you want to clear all Blood Glucose data? This action cannot be undone.',
        'rates': 'Are you sure you want to clear all Infusion Rate data? This action cannot be undone.',
        'all': 'Are you sure you want to clear ALL tracking data? This will remove all Blood Glucose and Infusion Rate data. This action cannot be undone.'
    };

    if (!confirm(confirmations[type])) {
        return;
    }

    const now = new Date();
    let cleared = 0;

    switch (type) {
        case 'bg':
            cleared += monitoringData.dkaHhs.bgReadings.length;
            cleared += monitoringData.nonDka.bgReadings.length;
            monitoringData.dkaHhs.bgReadings = [];
            monitoringData.nonDka.bgReadings = [];
            break;

        case 'rates':
            cleared += monitoringData.dkaHhs.infusionRates.length;
            cleared += monitoringData.nonDka.infusionRates.length;
            monitoringData.dkaHhs.infusionRates = [];
            monitoringData.nonDka.infusionRates = [];
            break;

        case 'all':
            cleared += monitoringData.dkaHhs.bgReadings.length;
            cleared += monitoringData.dkaHhs.infusionRates.length;
            cleared += monitoringData.nonDka.bgReadings.length;
            cleared += monitoringData.nonDka.infusionRates.length;

            monitoringData.dkaHhs.bgReadings = [];
            monitoringData.dkaHhs.infusionRates = [];
            monitoringData.nonDka.bgReadings = [];
            monitoringData.nonDka.infusionRates = [];

            // Also clear related flags that might no longer be relevant
            monitoringData.dkaHhs.lastBgFlag = null;
            monitoringData.dkaHhs.lastRateFlag = null;
            monitoringData.nonDka.lastStableFlag = null;
            break;
    }

    // Save changes and update displays
    saveMonitoringData();
    updateGraph();
    updateDataSummary();
    updateMonitoringStatus();

    // Show confirmation
    const typeNames = {
        'bg': 'Blood Glucose',
        'rates': 'Infusion Rate',
        'all': 'All tracking'
    };

    showNotification(`${typeNames[type]} data cleared (${cleared} readings removed)`, 'info');
}

function updateDataSummary() {
    const summaryElement = document.getElementById('data-summary-text');
    if (!summaryElement) return;

    const dkaBgCount = monitoringData.dkaHhs.bgReadings.length;
    const dkaRateCount = monitoringData.dkaHhs.infusionRates.length;
    const nonDkaBgCount = monitoringData.nonDka.bgReadings.length;
    const nonDkaRateCount = monitoringData.nonDka.infusionRates.length;

    const totalReadings = dkaBgCount + dkaRateCount + nonDkaBgCount + nonDkaRateCount;

    if (totalReadings === 0) {
        summaryElement.textContent = 'No tracking data available';
        summaryElement.className = 'data-summary-empty';
    } else {
        const parts = [];
        if (dkaBgCount + nonDkaBgCount > 0) {
            parts.push(`${dkaBgCount + nonDkaBgCount} BG readings`);
        }
        if (dkaRateCount + nonDkaRateCount > 0) {
            parts.push(`${dkaRateCount + nonDkaRateCount} rate readings`);
        }

        summaryElement.textContent = `${totalReadings} total: ${parts.join(', ')}`;
        summaryElement.className = 'data-summary-active';
    }
}

// === CALCULATOR TOOLS ===

let calculatorDisplay = '';
let calculatorLastResult = 0;

function initCalculatorTools() {
    // Initialize weight converter
    const calcLbsInput = document.getElementById('calc-lbs-input');
    const calcKgInput = document.getElementById('calc-kg-input');

    if (calcLbsInput && calcKgInput) {
        calcLbsInput.addEventListener('input', () => {
            const lbs = parseFloat(calcLbsInput.value);
            if (!isNaN(lbs)) {
                calcKgInput.value = (lbs / 2.20462).toFixed(2);
            } else {
                calcKgInput.value = '';
            }
        });

        calcKgInput.addEventListener('input', () => {
            const kg = parseFloat(calcKgInput.value);
            if (!isNaN(kg)) {
                calcLbsInput.value = (kg * 2.20462).toFixed(2);
            } else {
                calcLbsInput.value = '';
            }
        });
    }

    // Initialize calculator display
    updateCalculatorDisplay();
}

function appendToDisplay(value) {
    const display = document.getElementById('calc-display');
    if (!display) return;

    // Clear display if it shows an error or result
    if (calculatorDisplay === 'Error' || calculatorDisplay === calculatorLastResult.toString()) {
        calculatorDisplay = '';
    }

    calculatorDisplay += value;
    updateCalculatorDisplay();
}

function clearCalculator() {
    calculatorDisplay = '';
    calculatorLastResult = 0;
    updateCalculatorDisplay();
}

function clearEntry() {
    calculatorDisplay = calculatorDisplay.slice(0, -1);
    updateCalculatorDisplay();
}

function calculateResult() {
    const display = document.getElementById('calc-display');
    if (!display || !calculatorDisplay) return;

    try {
        // Replace display symbols with actual operators
        let expression = calculatorDisplay
            .replace(/×/g, '*')
            .replace(/÷/g, '/');

        // Validate expression (only allow numbers, operators, parentheses, and decimal points)
        if (!/^[0-9+\-*/.() ]+$/.test(expression)) {
            throw new Error('Invalid expression');
        }

        // Evaluate the expression safely
        const result = Function('"use strict"; return (' + expression + ')')();

        if (!isFinite(result)) {
            throw new Error('Invalid result');
        }

        calculatorLastResult = result;
        calculatorDisplay = result.toString();
        updateCalculatorDisplay();

    } catch (error) {
        calculatorDisplay = 'Error';
        updateCalculatorDisplay();
        setTimeout(() => {
            clearCalculator();
        }, 2000);
    }
}

function updateCalculatorDisplay() {
    const display = document.getElementById('calc-display');
    if (!display) return;

    // Format display for better readability
    let displayValue = calculatorDisplay || '0';

    // Replace operators with symbols for display
    displayValue = displayValue
        .replace(/\*/g, '×')
        .replace(/\//g, '÷');

    display.value = displayValue;
}

if(geminiSendBtn && geminiInput){
    geminiSendBtn.addEventListener('click', handleGeminiChat);
    geminiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleGeminiChat();
        }
    });
}

