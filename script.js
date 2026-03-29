
// Constants
const REFRESH_INTERVAL = 60000; // 1 minute in milliseconds

// Main currencies to display
const mainCurrencies = {
    USD: "US Dollar",
    EUR: "Euro",
    JPY: "Japanese Yen",
    GBP: "British Pound",
    AUD: "Australian Dollar",
    CAD: "Canadian Dollar",
    CHF: "Swiss Franc",
    SGD: "Singapore Dollar",
    MYR: "Malaysian Ringgit",
    INR: "Indian Rupee",
    PHP: "Philippine Peso"
};

// State variables
let lastUpdated = new Date();
let previousRates = {};
let allRates = {}; // Store all currency pair rates
let currenciesToTrack = [
    { from: "USD", to: "PHP" },
    { from: "JPY", to: "PHP" }
];
let chartCurrency = "USD";
let chartData = [];
let historyData = [];
let selectedTimeFrame = 5; // Default: 5 days

// DOM Elements
const refreshButton = document.getElementById('refreshButton');
const currencyCardsContainer = document.getElementById('currency-cards');
const lastUpdatedSpan = document.getElementById('lastUpdated');
const amountInput = document.getElementById('amount');
const fromCurrencySelect = document.getElementById('fromCurrency');
const toCurrencySelect = document.getElementById('toCurrency');
const swapButton = document.getElementById('swapButton');
const conversionResultElement = document.getElementById('conversionResult');
const conversionRateElement = document.getElementById('conversionRate');
const chartButtons = document.querySelectorAll('.chart-btn');
const chartContainer = document.getElementById('chart');
const timeframeButtons = document.querySelectorAll('.timeframe-btn');
const historyTableBody = document.getElementById('history-table-body');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateLastUpdatedDisplay();
    populateCurrencySelects();
    fetchAllRates();
    setupEventListeners();
    
    // Auto-refresh every minute
    setInterval(() => {
        fetchAllRates();
    }, REFRESH_INTERVAL);
});

// Utility Functions
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function calculateRateChange(oldRate, newRate) {
    if (oldRate === 0) return 0;
    return parseFloat(((newRate - oldRate) / oldRate * 100).toFixed(2));
}

function getCurrencyIcon(currency) {
    if (currency === "USD") {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4299E1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>';
    } else if (currency === "JPY") {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F56565" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V2M6 12h12M8 7h8M8 17h8"></path></svg>';
    } else {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4299E1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v12"></path><path d="M8 12h8"></path></svg>';
    }
}

// Initialize currency selects
function populateCurrencySelects() {
    const currencies = Object.keys(mainCurrencies).sort();
    
    // Clear existing options
    fromCurrencySelect.innerHTML = '';
    toCurrencySelect.innerHTML = '';
    
    // Add options for each currency
    currencies.forEach(currency => {
        const fromOption = new Option(`${currency} - ${mainCurrencies[currency]}`, currency);
        const toOption = new Option(`${currency} - ${mainCurrencies[currency]}`, currency);
        
        fromCurrencySelect.add(fromOption);
        toCurrencySelect.add(toOption);
    });
    
    // Set default values
    fromCurrencySelect.value = 'USD';
    toCurrencySelect.value = 'PHP';
}

// Data Fetching with fallback rates
async function fetchAllRates() {
    refreshButton.disabled = true;
    
    try {
        // Store current rates before refreshing
        storeCurrentRatesAsPrevious();
        
        // Use fallback rates
        allRates = getFallbackRates();
        
        // Add small random variations to simulate rate changes for USD/PHP and JPY/PHP
        const usdPhpRate = allRates['USD_PHP'] * (1 + (Math.random() * 0.02 - 0.01)); // ±1% variation
        const jpyPhpRate = allRates['JPY_PHP'] * (1 + (Math.random() * 0.02 - 0.01)); // ±1% variation
        
        // Update the rates in allRates
        allRates['USD_PHP'] = usdPhpRate;
        allRates['JPY_PHP'] = jpyPhpRate;
        
        // Update UI after the rates have been updated
        renderCurrencyCards();
        updateConverterUI();
        
        // Add to history
        addHistoryRecord('USD', 'PHP', usdPhpRate);
        addHistoryRecord('JPY', 'PHP', jpyPhpRate);
        
        // Update chart
        generateChartData();
        
        // Update timestamp
        lastUpdated = new Date();
        updateLastUpdatedDisplay();
        
        showToast("Exchange rates updated");
    } catch (error) {
        console.error("Error refreshing rates:", error);
        showToast("Failed to update exchange rates", true);
    } finally {
        refreshButton.disabled = false;
    }
}

function storeCurrentRatesAsPrevious() {
    // Only store if we have data
    if (Object.keys(allRates).length > 0) {
        previousRates = {...allRates};
    }
}

// Add a record to history table
function addHistoryRecord(from, to, newRate) {
    const oldRate = previousRates[`${from}_${to}`] || newRate;
    const changePercent = calculateRateChange(oldRate, newRate);
    
    // Only add to history if rates actually changed
    if (oldRate !== newRate) {
        // Create history entry
        const historyEntry = {
            timestamp: new Date(),
            pair: `${from}/${to}`,
            oldRate: oldRate,
            newRate: newRate,
            changePercent: changePercent
        };
        
        // Add to history data (limited to 20 entries)
        historyData.unshift(historyEntry);
        if (historyData.length > 20) {
            historyData.pop();
        }
        
        // Update history table
        renderHistoryTable();
        
        // Update chart data with new point
        if (chartCurrency === from && to === 'PHP') {
            updateChartWithNewPoint(newRate);
        }
    }
}

// Render history table
function renderHistoryTable() {
    if (!historyTableBody) return;
    
    historyTableBody.innerHTML = '';
    
    if (historyData.length === 0) {
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-message">No rate changes recorded yet. Updates will appear here when rates change.</td>
            </tr>
        `;
        return;
    }
    
    historyData.forEach(entry => {
        const row = document.createElement('tr');
        const isPositive = entry.changePercent >= 0;
        
        row.innerHTML = `
            <td>${formatDateTime(entry.timestamp)}</td>
            <td>${entry.pair}</td>
            <td>${entry.oldRate.toFixed(4)}</td>
            <td>${entry.newRate.toFixed(4)}</td>
            <td class="${isPositive ? 'positive-change' : 'negative-change'}">
                ${isPositive ? '+' : ''}${entry.changePercent.toFixed(2)}%
            </td>
        `;
        
        historyTableBody.appendChild(row);
    });
}

// UI Updates
function renderCurrencyCards() {
    currencyCardsContainer.innerHTML = '';
    
    const currencyData = getCurrencyData();
    currencyData.forEach(data => {
        const card = createCurrencyCard(data);
        currencyCardsContainer.appendChild(card);
    });
}

function createCurrencyCard(data) {
    const { from, to, rate, change, lastUpdated } = data;
    const isPositive = change >= 0;
    
    const card = document.createElement('div');
    card.className = 'card animate-fade-in';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="currency-pair">
                ${getCurrencyIcon(from)}
                <span>${from}/${to}</span>
            </div>
            <div class="badge ${isPositive ? 'positive' : 'negative'}">
                ${isPositive ? '+' : ''}${change}%
            </div>
        </div>
        <p class="rate">${rate.toFixed(4)}</p>
        <div class="card-footer">
            <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 2v6h-6"></path>
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                    <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
                    <path d="M21 22v-6h-6"></path>
                </svg>
                Last updated: ${lastUpdated}
            </span>
        </div>
    `;
    
    return card;
}

function getCurrencyData() {
    return currenciesToTrack.map(({ from, to }) => {
        let rate = allRates[`${from}_${to}`] || 0;
        let change = 0;
        
        // Calculate change if we have previous rates
        if (previousRates[`${from}_${to}`]) {
            change = calculateRateChange(previousRates[`${from}_${to}`], rate);
        }
        
        return {
            from,
            to,
            rate,
            change,
            lastUpdated: formatTime(lastUpdated)
        };
    });
}

function updateLastUpdatedDisplay() {
    lastUpdatedSpan.textContent = formatTime(lastUpdated);
}

function showToast(message, isError = false) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 3000);
}

// Currency Converter
function updateConverterUI() {
    // Update conversion result
    updateConversionResult();
}

function updateConversionResult() {
    const amount = parseFloat(amountInput.value) || 0;
    const fromCurrency = fromCurrencySelect.value;
    const toCurrency = toCurrencySelect.value;
    
    // Fix for same currency conversion
    if (fromCurrency === toCurrency) {
        conversionResultElement.textContent = `${amount.toFixed(2)} ${fromCurrency} = ${amount.toFixed(2)} ${toCurrency}`;
        conversionRateElement.textContent = `1 ${fromCurrency} = 1 ${toCurrency}`;
        return;
    }
    
    // Get conversion rate
    const rateKey = `${fromCurrency}_${toCurrency}`;
    let rate = allRates[rateKey];
    
    if (!rate && fromCurrency && toCurrency) {
        // Try to calculate via USD if direct rate not available
        if (allRates[`USD_${fromCurrency}`] && allRates[`USD_${toCurrency}`]) {
            // from -> USD -> to
            const fromToUsd = 1 / allRates[`USD_${fromCurrency}`];
            const usdToTo = allRates[`USD_${toCurrency}`];
            rate = fromToUsd * usdToTo;
        } else {
            // Use fallback rate from our predefined values
            rate = getFallbackRate(fromCurrency, toCurrency);
        }
    }
    
    if (!rate) rate = 1; // Default if we can't get a rate
    
    const convertedAmount = (amount * rate).toFixed(4);
    
    conversionResultElement.textContent = `${amount} ${fromCurrency} = ${convertedAmount} ${toCurrency}`;
    conversionRateElement.textContent = `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
}

function getFallbackRates() {
    // Fallback rates when API fails
    const fallbackRates = {
        'USD_PHP': 57.37,
        'JPY_PHP': 0.38,
        'EUR_PHP': 61.47,
        'GBP_PHP': 73.79,
        'AUD_PHP': 37.41,
        'CAD_PHP': 41.86,
        'CHF_PHP': 64.45,
        'SGD_PHP': 42.48,
        'MYR_PHP': 12.87,
        'INR_PHP': 0.68,
        'PHP_USD': 0.0175,
        'PHP_JPY': 2.61,
        'PHP_EUR': 0.0163,
        'PHP_GBP': 0.0135,
        'PHP_AUD': 0.0267,
        'PHP_CAD': 0.0239,
        'PHP_CHF': 0.0155,
        'PHP_SGD': 0.0235,
        'PHP_MYR': 0.0777,
        'PHP_INR': 1.47
    };
    
    // Calculate cross rates for all currencies
    const currencies = Object.keys(mainCurrencies);
    
    for (let i = 0; i < currencies.length; i++) {
        const fromCurrency = currencies[i];
        
        for (let j = 0; j < currencies.length; j++) {
            const toCurrency = currencies[j];
            
            if (fromCurrency !== toCurrency && !fallbackRates[`${fromCurrency}_${toCurrency}`]) {
                // Try to calculate via PHP
                if (fallbackRates[`${fromCurrency}_PHP`] && fallbackRates[`PHP_${toCurrency}`]) {
                    fallbackRates[`${fromCurrency}_${toCurrency}`] = 
                        fallbackRates[`${fromCurrency}_PHP`] * fallbackRates[`PHP_${toCurrency}`];
                } else if (fallbackRates[`PHP_${fromCurrency}`] && fallbackRates[`${toCurrency}_PHP`]) {
                    fallbackRates[`${fromCurrency}_${toCurrency}`] = 
                        (1 / fallbackRates[`PHP_${fromCurrency}`]) * fallbackRates[`${toCurrency}_PHP`]; 
                }
            }
        }
    }
    
    return fallbackRates;
}

function getFallbackRate(fromCurrency, toCurrency) {
    const fallbackRates = getFallbackRates();
    const rateKey = `${fromCurrency}_${toCurrency}`;
    
    if (fallbackRates[rateKey]) {
        return fallbackRates[rateKey];
    }
    
    if (fallbackRates[`${toCurrency}_${fromCurrency}`]) {
        return 1 / fallbackRates[`${toCurrency}_${fromCurrency}`];
    }
    
    return 1; // Default if no rate found
}

// Chart
function generateChartData() {
    // Generate data based on selected timeframe
    const data = generateHistoricalData(chartCurrency, selectedTimeFrame);
    
    // Render chart with the generated data
    renderChart(data);
}

function generateHistoricalData(currency, days) {
    const data = [];
    const now = new Date();
    
    // Determine step size and data points based on timeframe
    let dataPoints = 10; // Default number of points
    let dateFormat = { hour: '2-digit', minute: '2-digit' };
    
    if (days === 1) {
        // For 1 day, generate hourly data points
        dataPoints = 24;
        dateFormat = { hour: '2-digit', minute: '2-digit' };
        
        for (let i = 0; i < dataPoints; i++) {
            const hoursAgo = 24 - i;
            const date = new Date(now);
            date.setHours(date.getHours() - hoursAgo);
            
            // Generate realistic hourly data
            const baseRate = currency === 'USD' ? 57.37 : 0.38; // USD/PHP or JPY/PHP base
            // Fluctuations more pronounced during business hours
            const isBusinessHour = date.getHours() >= 9 && date.getHours() <= 17;
            const volatilityFactor = isBusinessHour ? 0.001 : 0.0005;
            const trend = Math.sin(i / 3) * volatilityFactor * baseRate;
            const noise = (Math.random() * 0.004 - 0.002) * baseRate;
            
            const rate = baseRate + trend + noise;
            
            data.push({
                date: formatTime(date),
                rate: rate,
                timestamp: date
            });
        }
    } else if (days === 5) {
        // For 5 days, show every 12 hours (10 data points)
        dataPoints = 10;
        dateFormat = { weekday: 'short', hour: '2-digit' };
        
        for (let i = 0; i < dataPoints; i++) {
            const hoursAgo = (120 - (i * 12)); // 5 days * 24 hours = 120 hours, every 12 hours
            const date = new Date(now);
            date.setHours(date.getHours() - hoursAgo);
            
            const baseRate = currency === 'USD' ? 57.37 : 0.38;
            // Create a slight trend with daily patterns
            const dayIndex = Math.floor(i / 2); // Which day (0-4)
            const trend = (dayIndex * 0.002 - 0.004) * baseRate; // Small downward then upward trend
            const dayPattern = Math.sin(dayIndex * Math.PI / 2) * 0.005 * baseRate;
            const noise = (Math.random() * 0.006 - 0.003) * baseRate;
            
            const rate = baseRate + trend + dayPattern + noise;
            
            data.push({
                date: formatDate(date, dateFormat),
                rate: rate,
                timestamp: date
            });
        }
    } else if (days === 30) {
        // For 30 days, show every 3 days (10 data points)
        dataPoints = 10;
        dateFormat = { month: 'short', day: 'numeric' };
        
        for (let i = 0; i < dataPoints; i++) {
            const daysAgo = 30 - (i * 3);
            const date = new Date(now);
            date.setDate(date.getDate() - daysAgo);
            
            const baseRate = currency === 'USD' ? 57.37 : 0.38;
            // Monthly pattern - slight oscillation
            const trend = Math.sin(i / 1.6) * 0.02 * baseRate;
            // More volatility for longer time periods
            const noise = (Math.random() * 0.02 - 0.01) * baseRate;
            
            const rate = baseRate + trend + noise;
            
            data.push({
                date: formatDate(date, dateFormat),
                rate: rate,
                timestamp: date
            });
        }
    } else if (days === 365) {
        // For 1 year, show monthly data (12 data points)
        dataPoints = 12;
        dateFormat = { month: 'short', year: 'numeric' };
        
        for (let i = 0; i < dataPoints; i++) {
            const monthsAgo = 12 - i;
            const date = new Date(now);
            date.setMonth(date.getMonth() - monthsAgo);
            
            const baseRate = currency === 'USD' ? 57.37 : 0.38;
            // Annual trend - more significant movement
            const yearTrend = (i * 0.04 - 0.22) * baseRate; // Decline then recovery
            const seasonalFactor = Math.sin(i * Math.PI / 6) * 0.03 * baseRate; // Seasonal patterns
            const noise = (Math.random() * 0.06 - 0.03) * baseRate; // More significant noise for yearly data
            
            const rate = baseRate + yearTrend + seasonalFactor + noise;
            
            data.push({
                date: formatDate(date, dateFormat),
                rate: rate,
                timestamp: date
            });
        }
    }
    
    // Always ensure the last data point is close to the current rate
    if (data.length > 0 && allRates[`${currency}_PHP`]) {
        const lastIndex = data.length - 1;
        // Make the last data point reflect the current rate with a tiny random variation
        data[lastIndex].rate = allRates[`${currency}_PHP`] * (1 + (Math.random() * 0.002 - 0.001));
    }
    
    return data;
}

function formatDate(date, options = { month: 'short', day: 'numeric' }) {
    return date.toLocaleDateString('en-US', options);
}

// Update chart with new data point
function updateChartWithNewPoint(newRate) {
    // Create new data set with existing timeframe
    const data = generateHistoricalData(chartCurrency, selectedTimeFrame);
    
    // Replace the last point with current rate
    if (data.length > 0) {
        data[data.length - 1].rate = newRate;
    }
    
    renderChart(data);
}

function renderChart(data) {
    if (!chartContainer) return;
    
    // Find min and max for scaling
    const rates = data.map(item => item.rate);
    const minRate = Math.min(...rates) * 0.99;
    const maxRate = Math.max(...rates) * 1.01;
    const range = maxRate - minRate;
    
    // Create SVG chart
    const chartHeight = 250;
    const chartWidth = chartContainer.clientWidth - 40;
    const padding = { top: 40, right: 10, bottom: 30, left: 50 };
    const graphHeight = chartHeight - padding.top - padding.bottom;
    const graphWidth = chartWidth - padding.left - padding.right;
    
    // Calculate positions
    const points = data.map((item, index) => {
        const x = padding.left + (index * (graphWidth / Math.max(1, (data.length - 1))));
        const y = padding.top + graphHeight - ((item.rate - minRate) / range * graphHeight);
        return `${x},${y}`;
    }).join(' ');
    
    // Generate SVG
    chartContainer.innerHTML = `
        <svg width="${chartWidth}" height="${chartHeight}">
            <!-- Title -->
            <text x="${padding.left}" y="${padding.top - 25}" font-size="12" fill="#333" font-weight="bold">
                ${chartCurrency}/PHP Exchange Rate
            </text>
            
            <!-- Axes -->
            <line x1="${padding.left}" y1="${padding.top + graphHeight}" 
                  x2="${padding.left + graphWidth}" y2="${padding.top + graphHeight}" 
                  stroke="#ccc" stroke-width="1" />
            <line x1="${padding.left}" y1="${padding.top}" 
                  x2="${padding.left}" y2="${padding.top + graphHeight}" 
                  stroke="#ccc" stroke-width="1" />
            
            <!-- Horizontal grid lines -->
            ${[0.25, 0.5, 0.75].map(ratio => {
                const y = padding.top + graphHeight * (1 - ratio);
                const value = (minRate + range * ratio).toFixed(chartCurrency === "USD" ? 2 : 3);
                return `
                    <line x1="${padding.left}" y1="${y}" x2="${padding.left + graphWidth}" y2="${y}" 
                          stroke="#e5e5e5" stroke-width="1" stroke-dasharray="4,4" />
                    <text x="${padding.left - 5}" y="${y}" text-anchor="end" font-size="10" fill="#666">
                        ${value}
                    </text>
                `;
            }).join('')}
            
            <!-- Min/Max labels -->
            <text x="${padding.left - 5}" y="${padding.top + graphHeight}" text-anchor="end" font-size="10" fill="#666">
                ${minRate.toFixed(chartCurrency === "USD" ? 2 : 3)}
            </text>
            <text x="${padding.left - 5}" y="${padding.top}" text-anchor="end" font-size="10" fill="#666">
                ${maxRate.toFixed(chartCurrency === "USD" ? 2 : 3)}
            </text>
            
            <!-- X-axis labels -->
            ${data.map((item, index) => {
                // Only show some labels to avoid crowding
                // For different timeframes, adjust label density
                const shouldShow = selectedTimeFrame === 1 ? (index % 4 === 0 || index === data.length - 1) : 
                                  (data.length > 5 ? (index % 2 === 0 || index === data.length - 1) : true);
                
                if (!shouldShow) return '';
                
                const x = padding.left + (index * (graphWidth / Math.max(1, (data.length - 1))));
                return `
                    <text x="${x}" y="${padding.top + graphHeight + 15}" text-anchor="middle" font-size="10" fill="#666">
                        ${item.date}
                    </text>
                `;
            }).join('')}
            
            <!-- Line chart -->
            <polyline points="${points}" 
                      fill="none" stroke="#60A5FA" stroke-width="2" />
            
            <!-- Data points -->
            ${data.map((item, index) => {
                const x = padding.left + (index * (graphWidth / Math.max(1, (data.length - 1))));
                const y = padding.top + graphHeight - ((item.rate - minRate) / range * graphHeight);
                return `
                    <circle cx="${x}" cy="${y}" r="4" fill="#60A5FA" />
                    <circle cx="${x}" cy="${y}" r="2" fill="white" />
                `;
            }).join('')}
        </svg>
    `;
}

// Event Listeners
function setupEventListeners() {
    // Refresh button
    refreshButton.addEventListener('click', fetchAllRates);
    
    // Currency converter
    amountInput.addEventListener('input', updateConversionResult);
    fromCurrencySelect.addEventListener('change', updateConversionResult);
    toCurrencySelect.addEventListener('change', updateConversionResult);
    
    // Swap currencies
    swapButton.addEventListener('click', () => {
        const tempCurrency = fromCurrencySelect.value;
        fromCurrencySelect.value = toCurrencySelect.value;
        toCurrencySelect.value = tempCurrency;
        updateConversionResult();
    });
    
    // Chart currency buttons
    chartButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            chartButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update chart currency and regenerate chart
            chartCurrency = button.dataset.currency;
            generateChartData();
        });
    });
    
    // Timeframe buttons
    timeframeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            timeframeButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update selected timeframe and regenerate chart
            selectedTimeFrame = parseInt(button.dataset.days, 10);
            generateChartData();
        });
    });
}
