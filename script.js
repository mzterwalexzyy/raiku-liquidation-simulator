// --- Configuration ---
const STANDARD_FAIL_RATE = 0.65; // 65% failure rate for race
const RAIKU_FAIL_RATE = 0.00; // 0% failure rate (guaranteed)
const PROFIT_PER_LIQUIDATION = 12.50; // Base profit for dashboard race
const LIQ_POOL_SIZE = 15; // Set to 15 positions for the card view
const LIQ_THRESHOLD = 1.05; // Liquidation threshold (Health Factor)
const AOT_SCHEDULE_THRESHOLD = 1.20; // Max HF to allow AoT scheduling

// --- State and DOM Element Selection ---
let isConnected = false; 
let liqPoolData = []; 

// Dashboard Race Stats
let standardTotalProfit = 0;
let raikuTotalProfit = 0;
let standardSuccessful = 0;
let raikuSuccessful = 0;

// Live Pool Stats
let manualStandardAttempts = 0;
let manualRaikuAttempts = 0;
let manualStandardSuccess = 0;
let manualRaikuSuccess = 0;
let manualTotalProfit = 0.00;

const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletStatus = document.getElementById('walletStatus');
const walletAddress = document.getElementById('walletAddress');

const finalSummary = document.getElementById('final-summary');
const liqPoolSummary = document.getElementById('liqPoolSummary');
const liqPoolCardContainer = document.getElementById('liq-pool-card-container'); 
const dashboardChartsContainer = document.getElementById('dashboard-charts');


// Bot Elements (Keep existing IDs for Dashboard)
const standardSubmitted = document.getElementById('standardSubmitted');
const standardSuccessfulDisplay = document.getElementById('standardSuccessful'); 
const standardFailed = document.getElementById('standardFailed');
const standardMessage = document.getElementById('standardMessage');
const standardProfitDisplay = document.getElementById('standardProfit');

const raikuSubmitted = document.getElementById('raikuSubmitted');
const raikuSuccessfulDisplay = document.getElementById('raikuSuccessful'); 
const raikuFailed = document.getElementById('raikuFailed');
const raikuMessage = document.getElementById('raikuMessage');
const raikuProfitDisplay = document.getElementById('raikuProfit');

// Modal & Navigation Elements
const welcomeModal = document.getElementById('welcomeModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const navLinks = document.querySelectorAll('.nav-link');
const appViews = document.querySelectorAll('.app-view');

// Input Field Elements (Race Sim)
const liquidationQuantityInput = document.getElementById('liquidationQuantityInput');
const liquidationQuantityDisplay = document.getElementById('liquidationQuantityDisplay');
const runSimulationBtn = document.getElementById('runSimulationBtn');


// --- Utility Functions ---

function generateRandomAddress() {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '';
    for (let i = 0; i < 44; i++) {
        address += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return address;
}

function resetSimulation() {
    // Reset Dashboard view stats
    standardSubmitted.textContent = 0;
    standardSuccessfulDisplay.textContent = 0;
    standardFailed.textContent = 0;
    raikuSubmitted.textContent = 0;
    raikuSuccessfulDisplay.textContent = 0;
    raikuFailed.textContent = 0;
    standardMessage.textContent = '';
    raikuMessage.textContent = '';
    finalSummary.textContent = '';
    finalSummary.className = 'summary-box';

    standardTotalProfit = 0;
    raikuTotalProfit = 0;
    standardSuccessful = 0;
    raikuSuccessful = 0;
    standardProfitDisplay.textContent = '$0.00';
    raikuProfitDisplay.textContent = '$0.00';

    // Reset Live Pool view stats
    manualStandardAttempts = 0;
    manualRaikuAttempts = 0;
    manualStandardSuccess = 0;
    manualRaikuSuccess = 0;
    manualTotalProfit = 0.00;

    liqPoolSummary.textContent = 'Connect Wallet to monitor the Live Liquidation Pool.';
    dashboardChartsContainer.innerHTML = ''; // Clear previous charts
    
    // Clear the Live Pool Chart container
    const liqpoolView = document.getElementById('liqpool');
    let chartDiv = liqpoolView.querySelector('#liqpool-charts');
    if (chartDiv) {
        chartDiv.remove();
    }

    generatePoolData(); 
}

// --- Wallet & Connection Handlers ---

function disconnectWallet() {
    isConnected = false;
    connectWalletBtn.textContent = 'Connect Wallet';
    connectWalletBtn.classList.remove('disconnect-btn'); 

    walletStatus.textContent = 'Status: Disconnected';
    walletStatus.classList.remove('connected');
    walletAddress.textContent = '';
    
    runSimulationBtn.disabled = true;
    
    document.querySelectorAll('.liq-button, .aot-button').forEach(btn => btn.disabled = true);

    resetSimulation();
}

connectWalletBtn.addEventListener('click', () => {
    if (isConnected) {
        disconnectWallet();
    } else {
        const address = generateRandomAddress();
        isConnected = true;
        connectWalletBtn.textContent = 'Disconnect Wallet';
        connectWalletBtn.classList.add('disconnect-btn'); 
        
        walletStatus.textContent = 'Status: Connected';
        walletStatus.classList.add('connected');
        walletAddress.textContent = `Wallet: ${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
        
        runSimulationBtn.disabled = false;
        
        document.querySelectorAll('.liq-button, .aot-button').forEach(btn => btn.disabled = false);
        
        updatePoolSummary();
    }
});


// --- DASHBOARD: Liquidation Race Core ---

function simulateLiquidation(isRaiku, failRate, submittedElement, successfulElementDisplay, failedElement, messageElement, profitDisplay) {
    return new Promise(resolve => {
        const isSuccessful = Math.random() > failRate;
        
        let submitted = parseInt(submittedElement.textContent) + 1;
        submittedElement.textContent = submitted;

        setTimeout(() => {
            let profitGained = 0;
            if (isSuccessful) {
                let successCount = parseInt(successfulElementDisplay.textContent) + 1;
                successfulElementDisplay.textContent = successCount;
                
                profitGained = PROFIT_PER_LIQUIDATION;
                if (isRaiku) {
                    raikuTotalProfit += profitGained;
                    raikuSuccessful++;
                    raikuProfitDisplay.textContent = `$${raikuTotalProfit.toFixed(2)}`;
                    messageElement.textContent = "Success: Guaranteed execution—profit captured.";
                } else {
                    standardTotalProfit += profitGained;
                    standardSuccessful++;
                    standardProfitDisplay.textContent = `$${standardTotalProfit.toFixed(2)}`;
                    messageElement.textContent = "Success: Standard RPC was lucky and won the race.";
                }
                messageElement.style.color = '#7ed321'; 
            } else {
                let failedCount = parseInt(failedElement.textContent) + 1;
                failedElement.textContent = failedCount;
                
                messageElement.textContent = isRaiku 
                    ? "ERROR: Raiku Infrastructure FAILED (Extreme Edge Case)" 
                    : "ERROR: Transaction Dropped (Lost Liquidation Race)";
                
                messageElement.style.color = '#d0021b';
            }
            resolve(isSuccessful);
        }, Math.random() * 400 + 50);
    });
}


runSimulationBtn.addEventListener('click', async () => {
    resetSimulation(); // Reset clears current chart
    runSimulationBtn.disabled = true;
    
    const userQuantity = parseInt(liquidationQuantityInput.value) || 10;
    
    for (let i = 0; i < userQuantity; i++) {
        await Promise.all([
            simulateLiquidation(false, STANDARD_FAIL_RATE, standardSubmitted, standardSuccessfulDisplay, standardFailed, standardMessage, standardProfitDisplay),
            simulateLiquidation(true, RAIKU_FAIL_RATE, raikuSubmitted, raikuSuccessfulDisplay, raikuFailed, raikuMessage, raikuProfitDisplay)
        ]);
    }

    // Final Summary
    const raikuProfit = raikuTotalProfit;
    const standardProfit = standardTotalProfit;
    const profitDifference = (raikuProfit - standardProfit).toFixed(2);
    
    let summaryText = `Raiku wins! Raiku captured $${raikuProfit.toFixed(2)} in profit vs. Standard's $${standardProfit.toFixed(2)}. That's a $${profitDifference} difference!`;
    finalSummary.textContent = summaryText;
    finalSummary.classList.add('success-msg');
    
    // Generate and display the chart for the dashboard
    generateChart('dashboard');

    runSimulationBtn.disabled = false;
});


// --- LIVE LIQUIDATION POOL LOGIC (AoT Update) ---

function generatePoolData() {
    const assets = ['SOL', 'USDC', 'mSOL', 'RAY', 'BONK'];
    liqPoolData = [];
    for (let i = 1; i <= LIQ_POOL_SIZE; i++) {
        // Generate health factor between 0.95 and 1.25 (1.05 is the threshold)
        let healthFactor = (Math.random() * (1.25 - 0.95) + 0.95);
        
        let profit = (Math.random() * (50 - 10) + 10).toFixed(2);
        
        liqPoolData.push({
            id: i,
            asset: assets[Math.floor(Math.random() * assets.length)],
            health: parseFloat(healthFactor.toFixed(3)),
            profit: parseFloat(profit),
            status: 'IDLE' 
        });
    }
    // Sort by health factor to put vulnerable loans at the top
    liqPoolData.sort((a, b) => a.health - b.health);
    renderPoolCards();
}

function renderPoolCards() {
    liqPoolCardContainer.innerHTML = '';
    
    liqPoolData.forEach(position => {
        const isVulnerable = position.health <= LIQ_THRESHOLD;
        const isAtRisk = position.health > LIQ_THRESHOLD && position.health <= AOT_SCHEDULE_THRESHOLD;
        const isSafe = position.health > AOT_SCHEDULE_THRESHOLD;

        const card = document.createElement('div');
        card.className = `liq-position-card ${isVulnerable ? 'vulnerable' : (isAtRisk ? 'at-risk' : 'safe')}`;
        card.dataset.id = position.id;

        let statusText;
        let actionButtonsHTML = '';

        if (isVulnerable) {
            statusText = 'VULNERABLE (Immediate Liquidation)';
            actionButtonsHTML = `
                <button class="liq-button standard-liq-btn" 
                    data-profit="${position.profit}" 
                    data-type="standard" 
                    data-id="${position.id}"
                    ${!isConnected ? 'disabled' : ''}>
                    Standard RPC (JIT)
                </button>
                <button class="liq-button raiku-liq-btn" 
                    data-profit="${position.profit}" 
                    data-type="raiku" 
                    data-id="${position.id}"
                    ${!isConnected ? 'disabled' : ''}>
                    Raiku RPC (JIT)
                </button>`;
        } else if (isAtRisk) {
            statusText = 'AT RISK (Ideal for AoT Scheduling)';
            actionButtonsHTML = `
                <button class="liq-button standard-liq-btn" disabled>Too Early for Standard JIT</button>
                <button class="aot-button raiku-aot-btn" 
                    data-profit="${position.profit}" 
                    data-type="raiku-aot" 
                    data-id="${position.id}"
                    ${!isConnected ? 'disabled' : ''}>
                    Schedule Raiku AoT @ ${LIQ_THRESHOLD}
                </button>`;
        } else { // isSafe
            statusText = 'SAFE (Health Too High)';
            actionButtonsHTML = `<button class="liq-button safe-btn" disabled>Position is Safe</button>`;
        }

        card.innerHTML = `
            <h3>Position #${position.id}</h3>
            <div class="card-stats">
                <p><strong>Asset:</strong> <span>${position.asset}</span></p>
                <p><strong>Health Factor:</strong> <span class="health-value ${isVulnerable || isAtRisk ? 'health-low' : 'health-high'}">${position.health.toFixed(3)}</span> (Liq @ ${LIQ_THRESHOLD})</p>
                <p><strong>Potential Profit:</strong> <span class="profit-value">$${position.profit.toFixed(2)}</span></p>
            </div>

            <p class="status-message">${statusText}</p>

            <div class="action-buttons">
                ${actionButtonsHTML}
            </div>
            <div class="feedback-notification" id="feedback-${position.id}"></div>
        `;

        liqPoolCardContainer.appendChild(card);
    });

    // Add event listeners to the new buttons
    document.querySelectorAll('.liq-button').forEach(button => {
        button.addEventListener('click', handleManualLiquidation);
    });
    document.querySelectorAll('.aot-button').forEach(button => {
        button.addEventListener('click', handleAotScheduling);
    });
}

function updatePoolSummary() {
    const totalAttempts = manualStandardAttempts + manualRaikuAttempts;
    const totalSuccess = manualStandardSuccess + manualRaikuSuccess;
    
    liqPoolSummary.textContent = `Manual Attempts: ${totalAttempts} | Raiku Success: ${manualRaikuSuccess} | Standard Success: ${manualStandardSuccess} | Total Profit Seized: $${manualTotalProfit.toFixed(2)}`;
    
    if (totalAttempts > 0) {
        liqPoolSummary.classList.add('success-msg');
        liqPoolSummary.classList.remove('summary-box');
    } else {
        liqPoolSummary.classList.remove('success-msg');
        liqPoolSummary.classList.add('summary-box');
    }
    
    // Always update the chart on pool activity
    generateChart('liqpool');
}

function showNotification(cardId, message, isSuccess) {
    const notificationDiv = document.getElementById(`feedback-${cardId}`);
    notificationDiv.textContent = message;
    notificationDiv.className = `feedback-notification ${isSuccess ? 'success-feedback' : 'fail-feedback'}`;
    
    setTimeout(() => {
        notificationDiv.textContent = '';
        notificationDiv.className = 'feedback-notification';
    }, 4000);
}


function handleManualLiquidation(event) {
    if (!isConnected) return;
    
    const button = event.target;
    const card = button.closest('.liq-position-card');
    const cardId = parseInt(button.dataset.id);
    const isRaiku = button.dataset.type.includes('raiku');
    const profit = parseFloat(button.dataset.profit);
    
    // Disable all liquidation buttons for this card
    card.querySelectorAll('.liq-button').forEach(btn => btn.disabled = true);
    
    button.textContent = `Sending Tx...`;

    const failRate = isRaiku ? RAIKU_FAIL_RATE : STANDARD_FAIL_RATE;
    const isSuccessful = Math.random() > failRate;
    
    if (isRaiku) { manualRaikuAttempts++; } else { manualStandardAttempts++; }
    
    setTimeout(() => {
        let notificationMessage;

        if (isSuccessful) {
            if (isRaiku) { manualRaikuSuccess++; } else { manualStandardSuccess++; }
            manualTotalProfit += profit;
            notificationMessage = isRaiku 
                ? `✅ SUCCESS! Raiku JIT Profit $${profit.toFixed(2)}` 
                : `🍀 SUCCESS! Standard JIT Got Lucky! Profit: $${profit.toFixed(2)}`;
            
            button.textContent = `SUCCESS: $${profit.toFixed(2)}`;
            button.style.backgroundColor = '#7ed321';
            button.style.color = '#0a0a0a';
            
            // If one won, mark the other as too late
            const otherBtn = card.querySelector(isRaiku ? '.standard-liq-btn' : '.raiku-liq-btn');
            if (otherBtn) {
                 otherBtn.style.backgroundColor = '#2a2a2a';
                 otherBtn.textContent = 'MISSED (Position Gone)';
                 otherBtn.style.color = '#777';
            }

        } else {
            notificationMessage = isRaiku 
                ? `❌ ERROR: Raiku Infrastructure Failed (Extreme Edge Case)`
                : `❌ FAILED! Standard JIT Dropped Tx. Profit Lost.`;
            
            button.textContent = `FAILED!`;
            button.style.backgroundColor = '#d0021b';
            button.style.color = '#e0e0e0';

            // If Standard failed, Raiku can't be attempted either (position is gone or claimed by another bot)
            const otherBtn = card.querySelector(isRaiku ? '.standard-liq-btn' : '.raiku-liq-btn');
            if (otherBtn) {
                otherBtn.textContent = 'MISSED (Position Gone)';
                otherBtn.style.backgroundColor = '#3a3a3a';
                otherBtn.style.color = '#bbb';
                otherBtn.disabled = true;
            }
        }

        showNotification(cardId, notificationMessage, isSuccessful);
        updatePoolSummary();
    }, 500); // Quick resolution for manual JIT clicks
}

function handleAotScheduling(event) {
    if (!isConnected) return;
    
    const button = event.target;
    const card = button.closest('.liq-position-card');
    const cardId = parseInt(button.dataset.id);
    const profit = parseFloat(button.dataset.profit);
    
    // Disable all buttons for this card
    card.querySelectorAll('.liq-button, .aot-button').forEach(btn => btn.disabled = true);
    
    button.textContent = `AoT Scheduled... Monitoring HF ↓`;
    button.style.backgroundColor = '#4a90e2'; // Blue for Pending
    
    // Simulate the health factor dropping over time
    const timeToLiq = Math.random() * 5000 + 3000; // 3 to 8 seconds
    
    // 1. Show scheduling success
    showNotification(cardId, `⏱️ Raiku AoT Monitoring Position. Estimated Liquidation in ${(timeToLiq/1000).toFixed(1)}s`, true);

    // 2. Simulate the guarantee and execution
    setTimeout(() => {
        
        // This execution is GUARANTEED (0% fail rate for AoT)
        manualRaikuAttempts++;
        manualRaikuSuccess++;
        manualTotalProfit += profit;
        
        const notificationMessage = `✅ AoT SUCCESS! Raiku executed GUARANTEED liquidation! Profit: $${profit.toFixed(2)}`;
        
        button.textContent = `SUCCESS: $${profit.toFixed(2)}`;
        button.style.backgroundColor = '#a6ff00';
        button.style.color = '#0a0a0a';
        
        // Disable the standard button if it existed (it was already disabled, but update text)
        const standardBtn = card.querySelector('.standard-liq-btn');
        if (standardBtn) {
            standardBtn.style.backgroundColor = '#2a2a2a';
            standardBtn.textContent = 'MISSED (Raiku AoT Won)';
            standardBtn.style.color = '#777';
        }

        showNotification(cardId, notificationMessage, true);
        updatePoolSummary();
    }, timeToLiq);
}


// --- Chart Generation Logic (FIXED TEXT COLOR) ---

function generateChart(view) {
    let data;
    let title;
    
    if (view === 'dashboard') {
        // Data from the Dashboard Sim Race
        data = {
            'Standard RPC': standardSuccessful,
            'Raiku AoT': raikuSuccessful
        };
        title = 'Simulation Race: Successful Attempts Comparison';
    } else if (view === 'liqpool') {
        // Data from the Live Liquidation Pool
        data = {
            'Standard JIT': manualStandardSuccess,
            'Raiku JIT/AoT': manualRaikuSuccess
        };
        title = 'Live Pool: Successful Liquidations (Manual Attempts)';
    } else {
        return;
    }

    const labels = Object.keys(data);
    const values = Object.values(data);
    const colors = ['#d0021b', '#a6ff00'];

    // This is a structured HTML representation of the chart (Bar Chart)
    
    let chartHTML = `<h2 class="chart-title">${title}</h2>`;
    chartHTML += `<div style="display: flex; gap: 40px; align-items: flex-end; justify-content: center; width: 80%; max-width: 400px; height: 250px; background-color: #1a1a1a; padding: 20px 40px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);">`;
    
    const maxValue = Math.max(...values, 1); 

    labels.forEach((label, index) => {
        const height = (values[index] / maxValue) * 100;
        
        chartHTML += `
            <div style="display: flex; flex-direction: column; align-items: center; width: 120px; height: 100%; justify-content: flex-end;">
                <div style="height: ${height}%; min-height: 5px; width: 60%; background-color: ${colors[index]}; border-radius: 4px 4px 0 0; display: flex; justify-content: center; align-items: flex-start;">
                    <span style="color: #ffffff; font-weight: bold; margin-top: -20px; font-size: 1.2em; z-index: 10;">${values[index]}</span> 
                </div>
                <div style="color: #e0e0e0; margin-top: 10px; font-size: 0.9em; text-align: center;">${label}</div>
            </div>
        `;
    });
    
    chartHTML += `</div>`;
    
    // Inject into the correct container
    if (view === 'dashboard') {
        dashboardChartsContainer.innerHTML = chartHTML;
    } else if (view === 'liqpool') {
        // Find the #liqpool view and inject it after the header
        const liqpoolView = document.getElementById('liqpool');
        let chartDiv = liqpoolView.querySelector('#liqpool-charts');
        if (!chartDiv) {
            chartDiv = document.createElement('div');
            chartDiv.id = 'liqpool-charts';
            chartDiv.className = 'results-charts-container';
            liqpoolView.insertBefore(chartDiv, liqpoolView.querySelector('.app-header').nextSibling);
        }
        chartDiv.innerHTML = chartHTML;
    }
}


// --- View Switching Logic ---

function switchView(viewId) {
    appViews.forEach(view => {
        view.classList.remove('active');
        if (view.id === viewId) {
            view.classList.add('active');
        }
    });
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.view === viewId) {
            link.classList.add('active');
        }
    });
    document.getElementById('app-container').scrollIntoView({ behavior: 'smooth' });
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const viewId = link.dataset.view;
        if (viewId === 'about') {
            document.getElementById('about-footer').scrollIntoView({ behavior: 'smooth' });
        } else {
            switchView(viewId);
        }
    });
});

// --- Initial Setup and Modal ---

function closeModal() {
    if (welcomeModal) {
        welcomeModal.style.display = 'none';
        // Ensure the correct view is active after closing the modal
        switchView('liqpool'); 
    }
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
}

window.onload = function() {
    if (welcomeModal) {
        welcomeModal.style.display = 'block';
    } else {
        // If modal logic is skipped/broken, ensure we start on the correct view
        switchView('liqpool');
    }
    
    generatePoolData(); 
    generateChart('dashboard'); // Render initial empty chart for dashboard
}

window.addEventListener('click', (event) => {
    if (event.target === welcomeModal) {
        closeModal();
    }
});

// Input Field Listener (Keep)
liquidationQuantityInput.addEventListener('input', () => {
    let value = parseInt(liquidationQuantityInput.value);
    if (isNaN(value) || value < 1) {
        value = 1;
    } else if (value > 100) {
        value = 100;
    }
    liquidationQuantityInput.value = value;
    liquidationQuantityDisplay.textContent = value;
});
// --- Mobile Menu Toggle Logic (NEW) ---

const menuToggleBtn = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const closeMenuBtn = document.getElementById('close-menu-btn');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-links .nav-link');

// Function to open the menu
menuToggleBtn.addEventListener('click', () => {
    mobileMenu.classList.add('active');
});

// Function to close the menu
closeMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.remove('active');
});

// Close the menu when a link is clicked
mobileNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        // Use existing switchView logic, but also close the menu
        e.preventDefault();
        const viewId = link.dataset.view;
        if (viewId === 'about') {
            document.getElementById('about-footer').scrollIntoView({ behavior: 'smooth' });
        } else {
            switchView(viewId);
        }
        mobileMenu.classList.remove('active');
    });
});
// Initial Setup
runSimulationBtn.disabled = true;