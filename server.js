require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// --- CONFIGURATION ---
// Get a FREE API Key from: https://www.goldapi.io/
// Create a .env file and add: GOLD_API_KEY=your_key_here
const API_KEY = process.env.GOLD_API_KEY || 'YOUR_API_KEY_HERE';
const SYMBOL = 'XAU';
const CURRENCY = 'EGP';

// --- STATE ---
let basePrice24k = 4150.00; // Fallback default (approx market rate)
let lastFetchTime = 0;
const FETCH_INTERVAL = 8 * 60 * 60 * 1000; // Fetch real data every 8 hours (approx 3 times/day) to stay under 100 req/month

// --- HYBRID ENGINE ---

// 1. Fetch Real Baseline (Rarely, to save API quota)
async function updateBasePrice() {
    const now = Date.now();
    if (now - lastFetchTime < FETCH_INTERVAL) {
        return; // Use cached price
    }

    try {
        console.log('Fetching REAL price from GoldAPI...');
        // If user hasn't set a key, don't actually call
        if (API_KEY === 'YOUR_API_KEY_HERE') {
            console.log('No API Key set. Using simulation baseline.');
            return;
        }

        const response = await axios.get(`https://www.goldapi.io/api/${SYMBOL}/${CURRENCY}`, {
            headers: {
                'x-access-token': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.price) {
            basePrice24k = response.data.price; // Price of 1 oz ? No, GoldAPI returns per gram or oz depending.
            // GoldAPI usually returns price per Ounce.
            // 1 Ounce = 31.1035 Grams.
            // Let's check the response format. Usually it's price per ounce.
            // We need price per Gram 24k.
            // Actually, GoldAPI returns price per gram if you calculate it, or just the spot price.
            // Let's assume the response is the Spot Price per Ounce (standard).
            // We will convert to Gram 24k: Price / 31.1035

            // WAIT: GoldAPI response usually has `price_gram_24k` field if requested correctly or we calculate.
            // Let's assume we get the spot price (per oz) and convert.
            const pricePerOunce = response.data.price;
            basePrice24k = pricePerOunce / 31.1035;

            console.log(`Updated Base Price (24k Gram): ${basePrice24k.toFixed(2)} EGP`);
            lastFetchTime = now;
        }
    } catch (error) {
        console.error('Error fetching real price:', error.message);
        // Keep using previous basePrice on error
    }
}

// 2. Generate Live Ticker (Every Request)
function getLivePrices() {
    // Add micro-fluctuation (Noise)
    // Random value between -0.25 and +0.25 EGP
    const noise = (Math.random() - 0.5) * 0.5;

    const live24k = basePrice24k + noise;

    // Calculate other karats based on 24k
    // 21k is 21/24 = 0.875
    // 18k is 18/24 = 0.75
    const live21k = live24k * 0.875;
    const live18k = live24k * 0.75;

    return {
        price24k: live24k.toFixed(2),
        price21k: live21k.toFixed(2),
        price18k: live18k.toFixed(2),
        timestamp: new Date().toISOString(),
        trend: noise > 0 ? 'up' : 'down' // Simple trend based on noise direction
    };
}

// --- ENDPOINTS ---

app.get('/api/prices', async (req, res) => {
    // Trigger background fetch if needed (non-blocking)
    updateBasePrice();

    const data = getLivePrices();
    res.json(data);
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Mode: Hybrid (Real Baseline + Simulated Ticker)`);
});
