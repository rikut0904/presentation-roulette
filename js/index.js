const COLORS = ["#ef476f", "#ff9f1c", "#ffd166", "#06d6a0", "#118ab2", "#7b2cbf"];
const DEFAULT_ITEMS = [
    { label: "参加者A", color: "#ef476f" },
    { label: "参加者B", color: "#ff9f1c" },
    { label: "参加者C", color: "#ffd166" },
    { label: "参加者D", color: "#06d6a0" },
    { label: "参加者E", color: "#118ab2" },
];

const state = {
    items: [],
    history: [],
    rotation: 0,
    spinning: false,
};

// --- Storage Logic ---

function loadFromCache() {
    const savedItems = localStorage.getItem("roulette-items");
    const savedHistory = localStorage.getItem("roulette-history");
    
    state.items = savedItems ? JSON.parse(savedItems) : [...DEFAULT_ITEMS];
    state.history = savedHistory ? JSON.parse(savedHistory) : [];
}

function saveToCache() {
    localStorage.setItem("roulette-items", JSON.stringify(state.items));
    localStorage.setItem("roulette-history", JSON.stringify(state.history));
}

// --- UI Rendering ---

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

export function renderItems() {
    const container = document.getElementById("item-list");
    if (!container) return;

    container.innerHTML = "";
    state.items.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "legend-item";

        const colorSpan = document.createElement("span");
        colorSpan.className = "legend-color";
        colorSpan.style.background = item.color;

        const contentDiv = document.createElement("div");
        contentDiv.style = "display: flex; justify-content: space-between; width: 100%; align-items: center;";

        const labelSpan = document.createElement("span");
        labelSpan.textContent = item.label;

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.innerHTML = "&times;";
        removeBtn.style = "background: none; border: none; color: #ef476f; cursor: pointer; font-size: 1.2rem; padding: 0 8px;";
        removeBtn.onclick = () => window.removeItem(index);

        contentDiv.appendChild(labelSpan);
        contentDiv.appendChild(removeBtn);
        div.appendChild(colorSpan);
        div.appendChild(contentDiv);
        container.appendChild(div);
    });

    renderWheel();
}

export function renderHistory() {
    const container = document.getElementById("history-list");
    if (!container) return;

    if (state.history.length === 0) {
        container.innerHTML = `<p style="color: var(--muted); padding: 20px; text-align: center;">履歴はありません</p>`;
        return;
    }

    container.innerHTML = "";
    state.history.forEach(item => {
        const article = document.createElement("article");
        article.className = "intro-roulette-card";

        const leftDiv = document.createElement("div");
        leftDiv.style = "display: flex; align-items: center; gap: 12px;";

        const dot = document.createElement("span");
        dot.className = "intro-color-dot";
        dot.style.background = item.color;

        const label = document.createElement("h3");
        label.style = "margin: 0; font-size: 1.1rem; font-weight: 600;";
        label.textContent = item.label;

        leftDiv.appendChild(dot);
        leftDiv.appendChild(label);

        const time = document.createElement("small");
        time.style = "color: var(--text-muted); font-weight: 500;";
        time.textContent = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        article.appendChild(leftDiv);
        article.appendChild(time);
        container.appendChild(article);
    });
}

function renderWheel() {
    const wheel = document.getElementById("index-wheel");
    if (!wheel) return;

    wheel.innerHTML = "";
    const surface = document.createElement("div");
    surface.className = "wheel-surface";
    surface.style.background = buildWheelBackground(state.items);

    const center = document.createElement("div");
    center.className = "wheel-center";
    center.textContent = state.items.length > 0 ? "GO!" : "EMPTY";

    wheel.appendChild(surface);
    wheel.appendChild(center);
}
// --- Actions ---

export function addItem() {
    const input = document.getElementById("new-item-label");
    const label = input.value.trim();
    if (!label) return;
    
    const color = COLORS[state.items.length % COLORS.length];
    state.items.push({ label, color });
    input.value = "";
    
    saveToCache();
    renderItems();
}

export function removeItem(index) {
    state.items.splice(index, 1);
    saveToCache();
    renderItems();
}

export function resetItems() {
    if (confirm("項目を初期状態に戻しますか？")) {
        state.items = [...DEFAULT_ITEMS];
        saveToCache();
        renderItems();
    }
}

export function clearHistory() {
    if (confirm("履歴を消去しますか？")) {
        state.history = [];
        saveToCache();
        renderHistory();
    }
}

function pickRandomItem() {
    if (state.items.length === 0) return null;
    
    const selectedIndex = Math.floor(Math.random() * state.items.length);
    const step = 360 / state.items.length;
    const targetCenter = (selectedIndex * step) + (step / 2);
    const jitter = (Math.random() * step * 0.5) - (step * 0.25);

    return {
        selected: state.items[selectedIndex],
        degrees: 360 * (5 + Math.floor(Math.random() * 3)) + (360 - targetCenter) + jitter,
    };
}

export function spin() {
    if (state.spinning || state.items.length === 0) return;
    
    const wheel = document.getElementById("index-wheel");
    const spinButton = document.getElementById("index-spin-button");
    
    state.spinning = true;
    spinButton.disabled = true;
    spinButton.textContent = "回転中...";

    const result = pickRandomItem();
    state.rotation += result.degrees;
    wheel.style.transform = `rotate(${state.rotation}deg)`;

    window.setTimeout(() => {
        state.spinning = false;
        spinButton.disabled = false;
        spinButton.textContent = "ルーレットを回す";
        
        // Add to history
        state.history.unshift({
            ...result.selected,
            timestamp: new Date().toISOString()
        });
        state.history = state.history.slice(0, 10);
        
        saveToCache();
        renderHistory();
        openResultModal(result.selected);
    }, 4200);
}

// --- Modal Logic ---

function ensureResultModal() {
    let modal = document.getElementById("result-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "result-modal";
    modal.className = "result-modal";
    modal.innerHTML = `
        <div class="result-modal-backdrop" data-close-modal></div>
        <div class="result-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="result-modal-title">
            <button class="result-modal-close" type="button" aria-label="閉じる" data-close-modal>×</button>
            <p class="result-label">選ばれたのは...</p>
            <h2 id="result-modal-title" style="font-size: 3rem; text-align: center; margin: 20px 0; border: none; padding: 0;"></h2>
        </div>
    `;
    modal.addEventListener("click", (event) => {
        if (event.target.closest("[data-close-modal]")) closeResultModal();
    });
    document.body.appendChild(modal);
    return modal;
}

function openResultModal(selected) {
    const modal = ensureResultModal();
    modal.querySelector("#result-modal-title").textContent = selected.label;
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
}

function closeResultModal() {
    const modal = document.getElementById("result-modal");
    if (!modal) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
}

// --- Init ---

function init() {
    loadFromCache();
    renderItems();
    renderHistory();
    
    const addButton = document.getElementById("add-item-button");
    if (addButton) addButton.onclick = addItem;

    const resetButton = document.getElementById("reset-items-button");
    if (resetButton) resetButton.onclick = resetItems;
    
    const input = document.getElementById("new-item-label");
    if (input) {
        input.onkeypress = (e) => {
            if (e.key === "Enter") addItem();
        };
    }

    const spinButton = document.getElementById("index-spin-button");
    if (spinButton) spinButton.onclick = spin;
    
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeResultModal();
    });
}

// すぐに実行（moduleなのでDOM構築を待つ必要はないが、一応DOMContentLoadedも考慮）
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
