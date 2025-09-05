function getInstructions() {
    const apttInput = document.getElementById('aptt');
    const apttValue = parseFloat(apttInput.value);
    const resultsDiv = document.getElementById('results');

    // Clear previous results
    resultsDiv.innerHTML = '';

    if (isNaN(apttValue) || apttValue < 0) {
        resultsDiv.innerHTML = '<p style="color: red;">Please enter a valid aPTT value.</p>';
        return;
    }

    let bolus = '';
    let holdInfusion = 'No';
    let doseChange = '';
    let nextAptt = '6 hrs';
    let highlightClass = '';

    if (apttValue < 30) {
        bolus = '80 units/kg';
        doseChange = 'Increase by 4 units/kg/hr';
    } else if (apttValue >= 30 && apttValue <= 40) {
        bolus = '40 units/kg';
        doseChange = 'Increase by 3 units/kg/hr';
    } else if (apttValue >= 51 && apttValue <= 69) {
        bolus = 'None';
        doseChange = 'Increase by 2 units/kg/hr';
    } else if (apttValue >= 70 && apttValue <= 90) {
        bolus = 'None';
        doseChange = 'No Dose Change';
        nextAptt = '6 hrs or next morning';
        highlightClass = 'highlight-green';
    } else if (apttValue >= 91 && apttValue <= 100) {
        bolus = 'None';
        doseChange = 'Decrease by 1 unit/kg/hr';
    } else if (apttValue >= 101 && apttValue <= 110) {
        bolus = 'None';
        holdInfusion = '30 min';
        doseChange = 'Decrease by 2 units/kg/hr';
    } else if (apttValue >= 111 && apttValue <= 120) {
        bolus = 'None';
        holdInfusion = '1 hr';
        doseChange = 'Decrease by 3 units/kg/hr';
    } else if (apttValue >= 121 && apttValue <= 199) {
        bolus = 'None';
        holdInfusion = '2 hrs';
        doseChange = 'Decrease by 3 units/kg/hr';
    } else if (apttValue >= 200) {
        bolus = 'None';
        holdInfusion = 'Hold, check aPTT q2h until <121**';
        doseChange = 'DECREASE by 4 units/kg/hr and restart when aPTT <121';
        nextAptt = '6hrs after aPTT <121';
        highlightClass = 'highlight-red';
    } else {
        // This handles aPTT values between 41 and 50, which is not on the protocol chart
        resultsDiv.innerHTML = '<p style="color: red;">The provided aPTT value is outside the ranges defined in the protocol chart.</p>';
        return;
    }

    const htmlOutput = `
        <div class="result-item ${highlightClass}">
            <h2>Bolus:</h2>
            <p>${bolus}</p>
        </div>
        <div class="result-item">
            <h2>Hold Infusion:</h2>
            <p>${holdInfusion}</p>
        </div>
        <div class="result-item">
            <h2>Dose Change:</h2>
            <p>${doseChange}</p>
        </div>
        <div class="result-item">
            <h2>Next aPTT:</h2>
            <p>${nextAptt}</p>
        </div>
    `;

    resultsDiv.innerHTML = htmlOutput;
}