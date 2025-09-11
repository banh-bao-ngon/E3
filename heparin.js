document.addEventListener('DOMContentLoaded', () => {
    // --- TAB NAVIGATION ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const protocolContents = document.querySelectorAll('.protocol-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const protocol = button.dataset.protocol;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            protocolContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${protocol}-protocol-content`).classList.add('active');
        });
    });

    // --- INSULIN PROTOCOL DROPDOWN ---
    const insulinSelect = document.getElementById('insulin-protocol-select');
    const nonDkaProtocolDiv = document.getElementById('non-dka-hhs-protocol');
    const dkaProtocolDiv = document.getElementById('dka-hhs-protocol');

    if (insulinSelect) {
        insulinSelect.addEventListener('change', () => {
            if (insulinSelect.value === 'dka-hhs') {
                nonDkaProtocolDiv.style.display = 'none';
                dkaProtocolDiv.style.display = 'block';
            } else {
                nonDkaProtocolDiv.style.display = 'block';
                dkaProtocolDiv.style.display = 'none';
            }
        });
    }

    // --- DYNAMIC VISIBILITY FOR PREVIOUS BG INPUT ---
    const currentBgAdjInput = document.getElementById('current-bg-adj');
    const previousBgRow = document.getElementById('previous-bg-row');
    if (currentBgAdjInput && previousBgRow) {
        currentBgAdjInput.addEventListener('input', () => {
            const currentBg = parseInt(currentBgAdjInput.value, 10);
            if (!isNaN(currentBg) && currentBg > 100) {
                previousBgRow.style.display = 'grid'; // Show the input row
            } else {
                previousBgRow.style.display = 'none'; // Hide it
            }
        });
    }


    // Add event listener for Enter key on input fields
    const heparinApttInput = document.getElementById('heparin-aptt');
    if (heparinApttInput) {
        heparinApttInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                getHeparinInstructions();
            }
        });
    }

    const insulinBgInput = document.getElementById('insulin-bg');
    if (insulinBgInput) {
        insulinBgInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                calculateInsulinRate();
            }
        });
    }
    
    // Add event listeners for the adjustment calculator fields
    const adjInputs = ['current-rate', 'previous-bg', 'current-bg-adj'];
    adjInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    calculateInsulinAdjustment();
                }
            });
        }
    });
});


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

    let bolus = 'None';
    let holdInfusion = 'No';
    let doseChange = '';
    let nextAptt = '6 hrs';
    let highlightClass = 'result-warning'; 

    if (apttValue < 30) {
        bolus = '80 units/kg';
        doseChange = 'Increase by 4 units/kg/hr';
    } else if (apttValue >= 30 && apttValue <= 40) {
        bolus = '40 units/kg';
        doseChange = 'Increase by 3 units/kg/hr';
    } else if (apttValue >= 41 && apttValue <= 50) {
        doseChange = 'Increase by 2 units/kg/hr';
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
            <div class="result-item ${highlightClass === 'result-critical' ? 'result-critical' : ''}">
                <h3>Bolus:</h3>
                <p>${bolus}</p>
            </div>
            <div class="result-item ${highlightClass === 'result-therapeutic' ? 'result-therapeutic' : ''}">
                <h3>Dose Change:</h3>
                <p>${doseChange}</p>
            </div>
            <div class="result-item ${highlightClass === 'result-critical' ? 'result-critical' : ''}">
                <h3>Hold Infusion:</h3>
                <p>${holdInfusion}</p>
            </div>
            <div class="result-item">
                <h3>Next aPTT:</h3>
                <p>${nextAptt}</p>
            </div>
        </div>
    `;
    resultsDiv.innerHTML = htmlOutput;
}


/**
 * Calculates the initial insulin infusion rate.
 */
function calculateInsulinRate() {
    const bgInput = document.getElementById('insulin-bg');
    const resultsDiv = document.getElementById('insulin-rate-results');
    const bg = parseInt(bgInput.value, 10);

    if (isNaN(bg) || bg <= 0) {
        resultsDiv.innerHTML = `<p class="result-error">Please enter a valid Blood Glucose (BG) value.</p>`;
        return;
    }

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
}

/**
 * Calculates adjustments for an existing insulin infusion.
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

    let adjustment = '';
    let newRateInfo = '';
    let resultClass = 'result-warning';

    // Logic for BG <= 100 (does not require previous BG)
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
    // Logic for BG > 100 (may require previous BG)
    else {
        const previousBg = parseInt(previousBgInput.value, 10);
        
        // Rule for Current BG 101-140
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
            } else { // Fallback rule for 101-140
                const change = Math.max(currentRate * 0.25, 0.5);
                const newRate = Math.max(0, currentRate - change);
                adjustment = `<strong>Action:</strong> Decrease rate by ${change.toFixed(1)} units/hr (25% or 0.5 units/hr, whichever is greater). <br><strong>Follow-up:</strong> Check BG q 30 min until ≥ 140 mg/dL.`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            }
        } 
        // Rule: Current BG 141-180
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
        // Rule: Current BG 181-200
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
            } else { // Fallback for 181-200 if previous BG does not match any ranges
                const newRate = currentRate + 0.5;
                adjustment = `<strong>Action:</strong> Increase rate by 0.5 units/hr.`;
                newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            }
        } 
        // Rule: Current BG 201-250
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
            } else { // Fallback if previous BG is not entered
                 const change = Math.max(currentRate * 0.25, 1.0);
                 const newRate = Math.round((currentRate + change) * 10) / 10;
                 adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (Fallback).`;
                 newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
            }
        }
        // Rule: Current BG 251-300
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
        // Rule: Current BG 301-400
        else if (currentBg >= 301 && currentBg <= 400) {
            const change = Math.max(currentRate * 0.40, 3.0);
            const newRate = currentRate + change;
            adjustment = `<strong>Action:</strong> Increase rate by ${change.toFixed(1)} units/hr (40% or 3 units/hr, whichever is greater).`;
            newRateInfo = `<strong>New Rate:</strong> ${newRate.toFixed(1)} units/hr`;
        } 
        // Rule: Current BG > 400
        else { // BG > 400
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
}

