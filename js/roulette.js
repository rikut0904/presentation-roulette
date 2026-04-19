import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const state = {
    config: null,
    rotation: 0,
    spinning: false,
};

const statusElement = document.getElementById("admin-status");
const viewSelection = document.getElementById("view-selection");
const viewPlay = document.getElementById("view-play");
const roulettesList = document.getElementById("roulettes-list");
const roulettesEmpty = document.getElementById("roulettes-empty");
const logoutButton = document.getElementById("logout-button");

function setStatus(msg, type = "info") {
    statusElement.textContent = msg;
    statusElement.dataset.tone = type;
}

async function fetchFirebaseConfig() {
    const res = await fetch("/api/config/firebase", { cache: "no-store" });
    return await res.json();
}

// --- Wheel Logic ---

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

function renderPlayView() {
    const itemList = document.getElementById("item-list");
    const wheel = document.getElementById("index-wheel");
    
    if (!itemList || !wheel || !state.config) return;

    itemList.innerHTML = state.config.items.map(item => `
        <div class="legend-item">
            <span class="legend-color" style="background: ${item.color};"></span>
            <span>${item.label}</span>
        </div>
    `).join("");

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
                <p class="eyebrow" style="text-align: center;">Result</p>
                <h2 id="result-modal-title" style="font-size: 3rem; text-align: center; margin: 20px 0; font-weight: 800; border: none;"></h2>
                <button class="btn primary" style="width: 100%;" onclick="closeResultModal()">閉じる</button>
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

// --- Selection Logic ---

async function loadSelectionList(auth) {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch("/api/dashboard/roulettes", {
        headers: { "Authorization": `Bearer ${idToken}` },
        cache: "no-store"
    });
    const roulettes = await res.json();

    if (roulettes && roulettes.length > 0) {
        roulettesEmpty.style.display = "none";
        roulettesList.innerHTML = roulettes.map(r => `
            <div class="admin-user-item" onclick="window.location.href='/roulette?id=${r.id}'" style="cursor: pointer;">
                <div class="admin-user-summary">
                    <strong style="color: var(--text-main); font-size: 1.1rem;">${r.title}</strong>
                    <p style="font-size: 0.85rem;">${r.items ? r.items.length : 0} 項目</p>
                </div>
                <div class="admin-user-meta">
                    <span class="btn" style="padding: 4px 16px; font-size: 0.8rem;">Play</span>
                </div>
            </div>
        `).join("");
    } else {
        roulettesEmpty.style.display = "block";
    }
}

async function loadRouletteByID(id) {
    const res = await fetch(`/api/roulettes/${id}`);
    if (!res.ok) throw new Error("ルーレットが見つかりませんでした");
    state.config = await res.json();
    
    document.getElementById("roulette-title").textContent = state.config.title;
    document.getElementById("roulette-description").textContent = state.config.description || "";
    renderPlayView();
}

// --- Initialization ---

async function setupFirebase() {
    try {
        const response = await fetchFirebaseConfig();
        const app = initializeApp(response.config);
        const auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                setStatus("ログイン中: " + user.email);
                const urlParams = new URLSearchParams(window.location.search);
                const id = urlParams.get("id");

                if (id) {
                    viewSelection.style.display = "none";
                    viewPlay.style.display = "block";
                    try {
                        await loadRouletteByID(id);
                    } catch (err) {
                        setStatus(err.message, "error");
                    }
                } else {
                    viewSelection.style.display = "block";
                    viewPlay.style.display = "none";
                    await loadSelectionList(auth);
                }
            } else {
                window.location.href = "/login";
            }
        });

        logoutButton.onclick = async () => {
            await signOut(auth);
            window.location.href = "/login";
        };

    } catch (error) {
        setStatus(error.message, "error");
    }
}

setupFirebase();
