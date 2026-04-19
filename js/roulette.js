import { renderHeader } from "./components.js";
import { getUser, setUser, getRoulettes, setRoulettes } from "./cache.js";
import { logoutUser } from "./auth.js";

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

function setStatus(msg, type = "info") {
    statusElement.textContent = msg;
    statusElement.dataset.tone = type;
}

function unauthorizedError() {
    const error = new Error("ログインしてください");
    error.code = "UNAUTHORIZED";
    return error;
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

    itemList.innerHTML = "";
    state.config.items.forEach(item => {
        const div = document.createElement("div");
        div.className = "legend-item";

        const colorSpan = document.createElement("span");
        colorSpan.className = "legend-color";
        colorSpan.style.background = item.color;

        const labelSpan = document.createElement("span");
        labelSpan.textContent = item.label;

        div.appendChild(colorSpan);
        div.appendChild(labelSpan);
        itemList.appendChild(div);
    });

    wheel.innerHTML = "";
    const surface = document.createElement("div");
    surface.className = "wheel-surface";
    surface.style.background = buildWheelBackground(state.config.items);

    const center = document.createElement("div");
    center.className = "wheel-center";
    center.textContent = "GO!";

    wheel.appendChild(surface);
    wheel.appendChild(center);
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
    document.body.classList.add("modal-open");
}

window.closeResultModal = () => {
    const modal = document.getElementById("result-modal");
    if (modal) {
        modal.classList.remove("is-open");
        document.body.classList.remove("modal-open");
    }
};

// --- Selection Logic ---
function renderSelectionList(roulettes) {
    roulettesList.innerHTML = "";
    if (roulettes && roulettes.length > 0) {
        roulettesEmpty.style.display = "none";
        roulettes.forEach(r => {
            const item = document.createElement("div");
            item.className = "admin-user-item";
            item.style.cursor = "pointer";
            item.onclick = () => { window.location.href = `/roulette?id=${r.id}`; };

            const summary = document.createElement("div");
            summary.className = "admin-user-summary";

            const title = document.createElement("strong");
            title.style.color = "var(--text-main)";
            title.style.fontSize = "1.1rem";
            title.textContent = r.title;

            const count = document.createElement("p");
            count.style.fontSize = "0.85rem";
            count.textContent = `${r.items ? r.items.length : 0} 項目`;

            summary.appendChild(title);
            summary.appendChild(count);
            item.appendChild(summary);
            roulettesList.appendChild(item);
        });
    } else {
        roulettesEmpty.style.display = "block";
    }
}

// --- Initialization ---

async function init() {
    renderHeader();
    const logoutBtn = document.getElementById("logout-button");
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await logoutUser();
        };
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get("id");
        
        let userData = getUser();
        let targetData;

        if (id) {
            const res = await fetch(`/api/dashboard/roulettes/${id}`, { credentials: 'include' });
            if (res.status === 401) throw unauthorizedError();
            if (!res.ok) throw new Error("ルーレットが見つかりませんでした");
            targetData = await res.json();
        } else {
            targetData = getRoulettes();
            if (!targetData) {
                const res = await fetch("/api/dashboard/roulettes", { credentials: 'include', cache: "no-store" });
                if (res.status === 401) throw unauthorizedError();
                if (!res.ok) throw new Error("ルーレット一覧の取得に失敗しました");
                targetData = await res.json();
                setRoulettes(targetData);
            }
        }

        if (!userData) {
            const userRes = await fetch("/api/dashboard/me", { credentials: 'include' });
            if (userRes.status === 401) throw unauthorizedError();
            if (!userRes.ok) throw new Error("ユーザー情報の取得に失敗しました");
            userData = await userRes.json();
            setUser(userData);
        }

        document.getElementById("user-email").textContent = userData.email;

        if (id) {
            state.config = targetData;
            document.getElementById("roulette-title").textContent = state.config.title;
            document.getElementById("roulette-description").textContent = state.config.description || "";
            renderPlayView();
            viewSelection.style.display = "none";
            viewPlay.style.display = "block";
        } else {
            renderSelectionList(targetData);
            viewSelection.style.display = "block";
            viewPlay.style.display = "none";
        }
        statusElement.style.display = "none";
    } catch (err) {
        if (err.code === "UNAUTHORIZED") {
            await logoutUser();
            return;
        }

        setStatus(err.message, "error");
        statusElement.style.display = "block";
    }
}

init();
