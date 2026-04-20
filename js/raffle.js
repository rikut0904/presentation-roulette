import { getRaffles, setRaffles } from "./cache.js";
import { renderHeader } from "./components.js";
import { logoutUser } from "./auth.js";

const state = {
    config: null,
    spinning: false,
};

const statusElement = document.getElementById("admin-status");
const viewSelection = document.getElementById("view-selection");
const viewPlay = document.getElementById("view-play");
const rafflesList = document.getElementById("raffles-list");
const rafflesEmpty = document.getElementById("raffles-empty");
const box = document.getElementById("raffle-box");
const ticket = document.getElementById("raffle-ticket");
const ticketLabel = document.getElementById("ticket-label");
const spinButton = document.getElementById("spin-button");
const itemList = document.getElementById("item-list");

function unauthorizedError() {
    const error = new Error("Unauthorized");
    error.code = "UNAUTHORIZED";
    return error;
}

function getItemWeight(item) {
    const parsed = Number.parseInt(item.weight, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function renderItemList() {
    itemList.innerHTML = "";
    state.config.items.forEach(item => {
        const div = document.createElement("div");
        div.className = "legend-item";
        div.innerHTML = `
            <span class="legend-color" style="background: ${item.color}"></span>
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <span>${item.label}</span>
            </div>
        `;
        itemList.appendChild(div);
    });
}

// --- Actions ---

export function spin() {
    if (state.spinning || !state.config || state.config.items.length === 0) return;
    
    state.spinning = true;
    if (spinButton) {
        spinButton.disabled = true;
        spinButton.textContent = "抽選中...";
    }

    // Animation
    ticket.classList.remove("showing");
    box.classList.add("shaking");

    const items = state.config.items;
    const selectedIndex = pickWeightedIndex(items);
    const selected = items[selectedIndex];

    window.setTimeout(() => {
        box.classList.remove("shaking");
        
        // Show ticket
        ticketLabel.textContent = selected.label;
        ticket.style.borderLeft = `8px solid ${selected.color}`;
        ticket.classList.add("showing");

        window.setTimeout(() => {
            state.spinning = false;
            if (spinButton) {
                spinButton.disabled = false;
                spinButton.textContent = "抽選する";
            }
            
            openResultModal(selected);
        }, 800);
    }, 1500);
}

function pickWeightedIndex(items) {
    const totalWeight = items.reduce((sum, item) => sum + getItemWeight(item), 0);
    if (totalWeight <= 0) {
        return Math.floor(Math.random() * items.length);
    }

    let threshold = Math.random() * totalWeight;
    for (let index = 0; index < items.length; index += 1) {
        threshold -= getItemWeight(items[index]);
        if (threshold < 0) {
            return index;
        }
    }

    return items.length - 1;
}

function openResultModal(selected) {
    let modal = document.getElementById("result-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "result-modal";
        modal.className = "result-modal";
        modal.innerHTML = `
            <div class="result-modal-backdrop" data-close-modal></div>
            <div class="result-modal-dialog">
                <button class="result-modal-close" type="button" data-close-modal>×</button>
                <p class="result-label">選ばれたのは...</p>
                <h2 id="result-modal-title" style="font-size: 3rem; text-align: center; margin: 20px 0; border: none; padding: 0;"></h2>
            </div>
        `;
        modal.addEventListener("click", (e) => {
            if (e.target.closest("[data-close-modal]")) closeModal();
        });
        document.body.appendChild(modal);
    }

    modal.querySelector("#result-modal-title").textContent = selected.label;
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
}

function closeModal() {
    const modal = document.getElementById("result-modal");
    if (modal) {
        modal.classList.remove("is-open");
        document.body.classList.remove("modal-open");
    }
}

function setStatus(message, type = "info") {
    statusElement.textContent = message;
    statusElement.dataset.tone = type;
    statusElement.style.display = message ? "block" : "none";
}

window.toggleFullscreen = async (enable) => {
    const exitBtn = document.querySelector(".exit-presentation");
    const enterBtn = document.getElementById("fullscreen-button");
    if (enable) {
        document.body.classList.add("presentation-mode");
        if (exitBtn) exitBtn.style.display = "block";
        if (enterBtn) enterBtn.style.display = "none";
        
        if (document.documentElement.requestFullscreen) {
            try {
                await document.documentElement.requestFullscreen();
                // Try to lock the Escape key to prevent browser's default exit
                if (navigator.keyboard && navigator.keyboard.lock) {
                    await navigator.keyboard.lock(["Escape"]);
                }
            } catch (err) {
                console.warn("Fullscreen or Keyboard Lock failed:", err);
            }
        }
    } else {
        document.body.classList.remove("presentation-mode");
        if (exitBtn) exitBtn.style.display = "none";
        if (enterBtn) enterBtn.style.display = "block";
        
        // Unlock keyboard and exit fullscreen
        if (navigator.keyboard && navigator.keyboard.unlock) {
            navigator.keyboard.unlock();
        }
        if (document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen().catch(() => {});
        }
    }
};

// --- Data ---

function renderSelectionList(raffles) {
    rafflesList.innerHTML = "";
    if (raffles && raffles.length > 0) {
        rafflesEmpty.style.display = "none";
        raffles.forEach(r => {
            const item = document.createElement("div");
            item.className = "admin-user-item";
            item.style.cursor = "pointer";
            item.onclick = () => { window.location.href = `/raffle?id=${r.id}`; };
            item.innerHTML = `
                <div class="user-info">
                    <strong>${r.title}</strong>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${r.items ? r.items.length : 0} 項目</div>
                </div>
                <div class="user-actions">
                    <button class="btn primary">実行</button>
                </div>
            `;
            rafflesList.appendChild(item);
        });
    } else {
        rafflesEmpty.style.display = "block";
    }
}

async function init() {
    renderHeader();

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    // Sync presentation mode with browser fullscreen state
    document.addEventListener("fullscreenchange", () => {
        // If user exits fullscreen via browser menu/other means, ensure we cleanup
        if (!document.fullscreenElement) {
            if (!document.body.classList.contains("modal-open") && document.body.classList.contains("presentation-mode")) {
                window.toggleFullscreen(false);
            }
            // Always unlock keyboard when not in fullscreen
            if (navigator.keyboard && navigator.keyboard.unlock) {
                navigator.keyboard.unlock();
            }
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            // 1. If modal is open, close it. Keyboard Lock prevents browser from exiting fullscreen.
            if (document.body.classList.contains("modal-open")) {
                closeModal();
                e.preventDefault();
                return;
            }

            // 2. If in presentation mode and no modal, manually trigger exit
            if (document.body.classList.contains("presentation-mode")) {
                window.toggleFullscreen(false);
                e.preventDefault();
            }
        }
    }, true);

    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
        logoutButton.onclick = async () => {
            await logoutUser();
        };
    }

    try {
        let targetData = null;
        if (id) {
            setStatus("設定を読み込んでいます...");
            const res = await fetch(`/api/dashboard/raffles/${id}`, { credentials: 'include' });
            if (res.status === 401) throw unauthorizedError();
            if (!res.ok) throw new Error("設定が見つかりませんでした");
            targetData = await res.json();
        } else {
            targetData = getRaffles();
            if (!targetData) {
                const res = await fetch("/api/dashboard/raffles", { credentials: 'include', cache: "no-store" });
                if (res.status === 401) throw unauthorizedError();
                targetData = await res.json();
                setRaffles(targetData);
            }
        }

        if (id) {
            state.config = targetData;
            viewPlay.style.display = "block";
            document.getElementById("raffle-title").textContent = state.config.title;
            document.getElementById("raffle-description").textContent = state.config.description || "";
            renderItemList();
            setStatus("");

            // Auto-fullscreen check after rendering is ready
            if (params.get("mode") === "fullscreen") {
                window.toggleFullscreen(true);
            }
        } else {
            renderSelectionList(targetData);
            viewSelection.style.display = "block";
            setStatus("");
        }

    } catch (err) {
        if (err.code === "UNAUTHORIZED") {
            window.location.href = "/login";
            return;
        }
        setStatus(err.message, "error");
    }
}

init();
