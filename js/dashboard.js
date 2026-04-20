import { renderHeader } from "./components.js";
import { fetchAppData } from "./api.js";
import { clearCache } from "./cache.js";
import { logoutUser } from "./auth.js";

const COLORS = ["#ef476f", "#ff9f1c", "#ffd166", "#06d6a0", "#118ab2", "#7b2cbf"];

const statusElement = document.getElementById("admin-status");
const rafflesList = document.getElementById("users-list");
const rafflesEmpty = document.getElementById("users-empty");
const raffleModal = document.getElementById("raffle-modal");
const raffleForm = document.getElementById("raffle-form");
const modalItemList = document.getElementById("modal-item-list");

function normalizeWeight(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function setStatus(message, type = "info") {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.dataset.tone = type;
}

function renderRaffles(raffles) {
    if (!rafflesList) return;
    rafflesList.innerHTML = "";

    if (!raffles || raffles.length === 0) {
        if (rafflesEmpty) {
            rafflesEmpty.style.display = "block";
            rafflesEmpty.textContent = "くじ引きはまだありません。";
        }
        return;
    }

    if (rafflesEmpty) rafflesEmpty.style.display = "none";

    raffles.forEach((raffle) => {
        const item = document.createElement("div");
        item.className = "admin-user-item";

        const summary = document.createElement("div");
        summary.className = "admin-user-summary";

        const title = document.createElement("strong");
        title.style.color = "var(--text-main)";
        title.style.fontSize = "1.1rem";
        title.textContent = raffle.title;

        const count = document.createElement("p");
        count.style.fontSize = "0.85rem";
        count.textContent = `${raffle.items ? raffle.items.length : 0} 項目`;

        summary.appendChild(title);
        summary.appendChild(count);

        const meta = document.createElement("div");
        meta.className = "admin-user-meta";

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "8px";

        const playButton = document.createElement("button");
        playButton.className = "btn primary";
        playButton.style.padding = "4px 12px";
        playButton.style.fontSize = "0.8rem";
        playButton.textContent = "実行";
        playButton.onclick = () => window.playRaffle(raffle.id);

        const editButton = document.createElement("button");
        editButton.className = "btn";
        editButton.style.padding = "4px 12px";
        editButton.style.fontSize = "0.8rem";
        editButton.textContent = "編集";
        editButton.onclick = () => window.openEditModal(raffle);

        const deleteButton = document.createElement("button");
        deleteButton.className = "btn";
        deleteButton.style.padding = "4px 12px";
        deleteButton.style.fontSize = "0.8rem";
        deleteButton.style.color = "#ef476f";
        deleteButton.textContent = "削除";
        deleteButton.onclick = () => window.deleteRaffle(raffle.id);

        actions.appendChild(playButton);
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        const updated = document.createElement("small");
        updated.style.marginTop = "4px";
        updated.textContent = `更新: ${new Date(raffle.updatedAt).toLocaleDateString()}`;

        meta.appendChild(actions);
        meta.appendChild(updated);

        item.appendChild(summary);
        item.appendChild(meta);
        rafflesList.appendChild(item);
    });
}

export function openCreateModal() {
    if (!raffleModal) return;
    document.getElementById("modal-title").textContent = "くじ引きの作成";
    document.getElementById("edit-id").value = "";
    document.getElementById("modal-raffle-title").value = "";
    document.getElementById("modal-raffle-desc").value = "";
    if (modalItemList) {
        modalItemList.innerHTML = "";
        addItemToModal();
        addItemToModal();
    }
    raffleModal.classList.add("is-open");
    document.body.classList.add("modal-open");
}

window.openEditModal = (raffle) => {
    if (!raffleModal) return;
    document.getElementById("modal-title").textContent = "くじ引きの編集";
    document.getElementById("edit-id").value = raffle.id;
    document.getElementById("modal-raffle-title").value = raffle.title;
    document.getElementById("modal-raffle-desc").value = raffle.description || "";
    
    if (modalItemList) {
        modalItemList.innerHTML = "";
        if (raffle.items) {
            raffle.items.forEach((item) => addItemToModal(item.label, item.color, item.weight));
        }
    }

    raffleModal.classList.add("is-open");
    document.body.classList.add("modal-open");
};

export function closeRaffleModal() {
    if (raffleModal) raffleModal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
}

export function addItemToModal(label = "", color = "", weight = 1) {
    if (!modalItemList) return;
    const row = document.createElement("div");
    row.className = "modal-item-row";
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.alignItems = "center";
    row.style.marginBottom = "8px";

    const resolvedColor = color || COLORS[modalItemList.children.length % COLORS.length];

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "item-color";
    colorInput.value = resolvedColor;
    colorInput.style.width = "40px";
    colorInput.style.height = "40px";
    colorInput.style.padding = "2px";
    colorInput.style.border = "1px solid var(--glass-border)";
    colorInput.style.borderRadius = "8px";
    colorInput.style.cursor = "pointer";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "item-label";
    labelInput.value = label;
    labelInput.placeholder = "項目名";
    labelInput.required = true;
    labelInput.style.flex = "1";
    labelInput.style.border = "1px solid var(--glass-border)";
    labelInput.style.borderRadius = "8px";
    labelInput.style.padding = "8px 12px";

    const weightInput = document.createElement("input");
    weightInput.type = "number";
    weightInput.className = "item-weight";
    weightInput.min = "1";
    weightInput.step = "1";
    weightInput.value = String(normalizeWeight(weight));
    weightInput.title = "抽選比重";
    weightInput.setAttribute("aria-label", "抽選比重");
    weightInput.style.width = "72px";
    weightInput.style.border = "1px solid var(--glass-border)";
    weightInput.style.borderRadius = "8px";
    weightInput.style.padding = "8px 10px";
    weightInput.style.textAlign = "center";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.innerHTML = "&times;";
    removeButton.style.background = "none";
    removeButton.style.border = "none";
    removeButton.style.color = "#ef476f";
    removeButton.style.fontSize = "1.2rem";
    removeButton.style.cursor = "pointer";
    removeButton.style.padding = "0 8px";
    removeButton.onclick = () => row.remove();

    row.appendChild(colorInput);
    row.appendChild(labelInput);
    row.appendChild(weightInput);
    row.appendChild(removeButton);
    modalItemList.appendChild(row);
}

async function initDashboard() {
    try {
        const { user, raffles } = await fetchAppData();
        const userEmailEl = document.getElementById("user-email");
        if (userEmailEl) userEmailEl.textContent = user.email;
        
        renderRaffles(raffles);
        if (statusElement) statusElement.style.display = "none";
    } catch (error) {
        if (error.code === "UNAUTHORIZED") {
            await logoutUser();
            return;
        }

        setStatus(error.message, "error");
        if (statusElement) statusElement.style.display = "block";
    }
}

async function saveRaffle(event) {
    event.preventDefault();

    if (!modalItemList) return;
    const id = document.getElementById("edit-id").value;
    const items = Array.from(modalItemList.children).map((row) => ({
        label: row.querySelector(".item-label").value,
        color: row.querySelector(".item-color").value,
        weight: normalizeWeight(row.querySelector(".item-weight").value),
    }));

    const payload = {
        id: id || "0",
        title: document.getElementById("modal-raffle-title").value,
        description: document.getElementById("modal-raffle-desc").value,
        items,
    };

    try {
        const response = await fetch("/api/dashboard/raffles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
        });

        if (response.status === 401) {
            await logoutUser();
            return;
        }

        if (!response.ok) {
            throw new Error("保存に失敗しました");
        }

        closeRaffleModal();
        clearCache();
        await initDashboard();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteRaffle(id) {
    if (!confirm("このくじ引きを削除しますか？")) {
        return;
    }

    const response = await fetch(`/api/dashboard/raffles/${id}`, {
        method: "DELETE",
        credentials: "include",
    });

    if (response.status === 401) {
        await logoutUser();
        return;
    }

    if (response.ok) {
        clearCache();
        await initDashboard();
    }
}

async function init() {
    renderHeader();

    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
        logoutButton.onclick = async () => {
            await logoutUser();
        };
    }

    if (raffleForm) {
        raffleForm.onsubmit = saveRaffle;
    }
    
    window.deleteRaffle = deleteRaffle;
    window.playRaffle = (id) => {
        window.location.href = `/raffle?id=${id}`;
    };

    await initDashboard();
}

init();
