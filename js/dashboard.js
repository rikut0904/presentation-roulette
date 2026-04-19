import { renderHeader } from "./components.js";
import { fetchAppData } from "./api.js";
import { clearCache } from "./cache.js";
import { logoutUser } from "./auth.js";

const COLORS = ["#ef476f", "#ff9f1c", "#ffd166", "#06d6a0", "#118ab2", "#7b2cbf"];

const statusElement = document.getElementById("admin-status");
const reloadRoulettesButton = document.getElementById("reload-users");
const roulettesList = document.getElementById("users-list");
const roulettesEmpty = document.getElementById("users-empty");
const rouletteModal = document.getElementById("roulette-modal");
const rouletteForm = document.getElementById("roulette-form");
const modalItemList = document.getElementById("modal-item-list");

function setStatus(message, type = "info") {
    statusElement.textContent = message;
    statusElement.dataset.tone = type;
}

function renderRoulettes(roulettes) {
    roulettesList.innerHTML = "";

    if (!roulettes || roulettes.length === 0) {
        roulettesEmpty.style.display = "block";
        return;
    }

    roulettesEmpty.style.display = "none";

    roulettes.forEach((roulette) => {
        const item = document.createElement("div");
        item.className = "admin-user-item";

        const summary = document.createElement("div");
        summary.className = "admin-user-summary";

        const title = document.createElement("strong");
        title.style.color = "var(--text-main)";
        title.style.fontSize = "1.1rem";
        title.textContent = roulette.title;

        const count = document.createElement("p");
        count.style.fontSize = "0.85rem";
        count.textContent = `${roulette.items ? roulette.items.length : 0} 項目`;

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
        playButton.textContent = "Play";
        playButton.onclick = () => window.playRoulette(roulette.id);

        const editButton = document.createElement("button");
        editButton.className = "btn";
        editButton.style.padding = "4px 12px";
        editButton.style.fontSize = "0.8rem";
        editButton.textContent = "編集";
        editButton.onclick = () => window.openEditModal(roulette);

        const deleteButton = document.createElement("button");
        deleteButton.className = "btn";
        deleteButton.style.padding = "4px 12px";
        deleteButton.style.fontSize = "0.8rem";
        deleteButton.style.color = "#ef476f";
        deleteButton.textContent = "削除";
        deleteButton.onclick = () => window.deleteRoulette(roulette.id);

        actions.appendChild(playButton);
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        const updated = document.createElement("small");
        updated.style.marginTop = "4px";
        updated.textContent = `更新: ${new Date(roulette.updatedAt).toLocaleDateString()}`;

        meta.appendChild(actions);
        meta.appendChild(updated);

        item.appendChild(summary);
        item.appendChild(meta);
        roulettesList.appendChild(item);
    });
}

export function openCreateModal() {
    document.getElementById("modal-title").textContent = "ルーレットの作成";
    document.getElementById("edit-id").value = "";
    document.getElementById("modal-roulette-title").value = "";
    document.getElementById("modal-roulette-desc").value = "";
    modalItemList.innerHTML = "";
    addItemToModal();
    addItemToModal();
    rouletteModal.classList.add("is-open");
    document.body.classList.add("modal-open");
}

window.openEditModal = (roulette) => {
    document.getElementById("modal-title").textContent = "ルーレットの編集";
    document.getElementById("edit-id").value = roulette.id;
    document.getElementById("modal-roulette-title").value = roulette.title;
    document.getElementById("modal-roulette-desc").value = roulette.description || "";
    modalItemList.innerHTML = "";

    if (roulette.items) {
        roulette.items.forEach((item) => addItemToModal(item.label, item.color));
    }

    rouletteModal.classList.add("is-open");
    document.body.classList.add("modal-open");
};

export function closeRouletteModal() {
    rouletteModal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
}

export function addItemToModal(label = "", color = "") {
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
    row.appendChild(removeButton);
    modalItemList.appendChild(row);
}

export function removeItemFromModal(button) {
    if (button?.parentElement) {
        button.parentElement.remove();
    }
}

async function initDashboard() {
    try {
        const { user, roulettes } = await fetchAppData();
        document.getElementById("user-email").textContent = user.email;
        renderRoulettes(roulettes);
        statusElement.style.display = "none";
    } catch (error) {
        if (error.code === "UNAUTHORIZED") {
            await logoutUser();
            return;
        }

        setStatus(error.message, "error");
        statusElement.style.display = "block";
    }
}

async function loadRoulettes() {
    clearCache();
    await initDashboard();
}

async function saveRoulette(event) {
    event.preventDefault();

    const id = document.getElementById("edit-id").value;
    const items = Array.from(modalItemList.children).map((row) => ({
        label: row.querySelector(".item-label").value,
        color: row.querySelector(".item-color").value,
        weight: 1,
    }));

    const payload = {
        id: id || "0",
        title: document.getElementById("modal-roulette-title").value,
        description: document.getElementById("modal-roulette-desc").value,
        items,
    };

    try {
        const response = await fetch("/api/dashboard/roulettes", {
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

        closeRouletteModal();
        await loadRoulettes();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteRoulette(id) {
    if (!confirm("このルーレットを削除しますか？")) {
        return;
    }

    const response = await fetch(`/api/dashboard/roulettes/${id}`, {
        method: "DELETE",
        credentials: "include",
    });

    if (response.status === 401) {
        await logoutUser();
        return;
    }

    if (response.ok) {
        await loadRoulettes();
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

    reloadRoulettesButton.onclick = () => {
        loadRoulettes();
    };

    rouletteForm.onsubmit = saveRoulette;
    window.deleteRoulette = deleteRoulette;
    window.playRoulette = (id) => {
        window.location.href = `/roulette?id=${id}`;
    };

    await initDashboard();
}

init();
