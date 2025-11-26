const price21kEl = document.getElementById('price-21k');
const price24kEl = document.getElementById('price-24k');
const price18kEl = document.getElementById('price-18k');
const trend21kEl = document.getElementById('trend-21k');

let previousPrice21k = 0;

function formatPrice(price) {
    return parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function updateTrend(currentPrice) {
    const diff = currentPrice - previousPrice21k;
    const arrow = trend21kEl.querySelector('.arrow');
    const text = trend21kEl.querySelector('.text');

    if (previousPrice21k === 0) {
        // First load
        previousPrice21k = currentPrice;
        return;
    }

    if (diff > 0) {
        trend21kEl.className = 'trend-indicator trend-up';
        arrow.textContent = '▲';
        text.textContent = `+${diff.toFixed(2)} EGP`;
    } else if (diff < 0) {
        trend21kEl.className = 'trend-indicator trend-down';
        arrow.textContent = '▼';
        text.textContent = `${diff.toFixed(2)} EGP`;
    } else {
        trend21kEl.className = 'trend-indicator';
        arrow.textContent = '⬌';
        text.textContent = 'Stable';
    }

    previousPrice21k = currentPrice;
}

async function fetchPrices() {
    try {
        const response = await fetch('/api/prices');
        const data = await response.json();

        // Update Values
        price21kEl.textContent = formatPrice(data.price21k);
        price24kEl.textContent = formatPrice(data.price24k);
        price18kEl.textContent = formatPrice(data.price18k);

        // Update Trend (based on 21k)
        updateTrend(parseFloat(data.price21k));

        // Add visual "flash" effect to cards
        const cards = document.querySelectorAll('.price-card');
        cards.forEach(card => {
            card.style.borderColor = 'rgba(255, 215, 0, 0.5)';
            setTimeout(() => {
                card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }, 300);
        });

    } catch (error) {
        console.error('Error fetching prices:', error);
    }
}

// Initial Fetch
fetchPrices();

// Poll every second
setInterval(fetchPrices, 1000);
