const state = {
    config: null,
    rotation: 0,
    spinning: false,
};

function buildWheelBackground(items) {
    if (items.length === 0) return "#ccc";
    if (items.length === 1) return items[0].color;
    
    const step = 360 / items.length;
    const stops = items.map((item, index) => {
        const start = (step * index).toFixed(2);
        const end = (step * (index + 1)).toFixed(2);
        return `${item.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
}

function renderItems() {
    const container = document.getElementById("item-list");
    if (!container || !state.config) return;
    
    container.innerHTML = state.config.items.map(item => `
        <div class="legend-item">
            <span class="legend-color" style="background: ${item.color};"></span>
            <span>${item.label}</span>
        </div>
    `).join("");
    
    renderWheel();
}

function renderWheel() {
    const wheel = document.getElementById("index-wheel");
    if (!wheel || !state.config) return;
    wheel.innerHTML = `
        <div class="wheel-surface" style="background: ${buildWheelBackground(state.config.items)};"></div>
        <div class="wheel-center">GO!</div>
    `;
}

export function spin() {
    if (state.spinning || !state.config || state.config.items.length === 0) return;
    
    const wheel = document.getElementById("index-wheel");
    const spinButton = document.getElementById("spin-button");
    
    state.spinning = true;
    spinButton.disabled = true;
    spinButton.textContent = "回転中...";

    const items = state.config.items;
    const selectedIndex = Math.floor(Math.random() * items.length);
    const step = 360 / items.length;
    const targetCenter = (selectedIndex * step) + (step / 2);
    const jitter = (Math.random() * step * 0.5) - (step * 0.25);
    const degrees = 360 * (5 + Math.floor(Math.random() * 3)) + (360 - targetCenter) + jitter;

    state.rotation += degrees;
    wheel.style.transform = `rotate(${state.rotation}deg)`;

    window.setTimeout(() => {
        state.spinning = false;
        spinButton.disabled = false;
        spinButton.textContent = "ルーレットを回す";
        openResultModal(items[selectedIndex]);
    }, 4200);
}

function openResultModal(selected) {
    let modal = document.getElementById("result-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "result-modal";
        modal.className = "result-modal";
        modal.innerHTML = `
            <div class="result-modal-backdrop" onclick="closeResultModal()"></div>
            <div class="result-modal-dialog">
                <p class="eyebrow" style="text-align: center;">Selected</p>
                <h2 id="result-modal-title" style="font-size: 3rem; text-align: center; margin: 20px 0; font-weight: 800; border: none;"></h2>
                <button class="btn primary" style="width: 100%;" onclick="closeResultModal()">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.querySelector("#result-modal-title").textContent = selected.label;
    modal.classList.add("is-open");
}

window.closeResultModal = () => {
    const modal = document.getElementById("result-modal");
    if (modal) modal.classList.remove("is-open");
};

async function init() {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
        document.getElementById("roulette-title").textContent = "IDが指定されていません";
        return;
    }

    try {
        const res = await fetch(`/api/roulettes/${id}`);
        if (!res.ok) throw new Error("ルーレットが見つかりませんでした");
        state.config = await res.json();

        document.getElementById("roulette-title").textContent = state.config.title;
        document.getElementById("roulette-description").textContent = state.config.description || "このルーレットには説明がありません。";
        renderItems();
    } catch (err) {
        document.getElementById("roulette-title").textContent = "Error";
        document.getElementById("roulette-description").textContent = err.message;
    }
}

init();
