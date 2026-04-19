import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const COLORS = ["#ef476f", "#ff9f1c", "#ffd166", "#06d6a0", "#118ab2", "#7b2cbf"];

const statusElement = document.getElementById("admin-status");
const logoutButton = document.getElementById("logout-button");
const reloadRoulettesButton = document.getElementById("reload-users");
const roulettesList = document.getElementById("users-list");
const roulettesEmpty = document.getElementById("users-empty");

const rouletteModal = document.getElementById("roulette-modal");
const rouletteForm = document.getElementById("roulette-form");
const modalItemList = document.getElementById("modal-item-list");

let firebaseAuth = null;

function setStatus(msg, type = "info") {
    statusElement.textContent = msg;
    statusElement.dataset.tone = type;
}

async function fetchFirebaseConfig() {
    const res = await fetch("/api/config/firebase", { cache: "no-store" });
    if (!res.ok) throw new Error("Firebase 設定の取得に失敗しました。");
    return await res.json();
}

async function syncUserSession(user) {
    const idToken = await user.getIdToken();
    const res = await fetch("/api/dashboard/session", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
        },
    });
    if (!res.ok) throw new Error("セッションの同期に失敗しました。");
}

async function loadRoulettes() {
    if (!firebaseAuth.currentUser) return;

    const idToken = await firebaseAuth.currentUser.getIdToken();
    const res = await fetch("/api/dashboard/roulettes", {
        headers: { "Authorization": `Bearer ${idToken}` },
        cache: "no-store"
    });
    
    if (!res.ok) throw new Error("ルーレット一覧の取得に失敗しました。");
    const roulettes = await res.json();

    roulettesList.innerHTML = "";
    if (roulettes && roulettes.length > 0) {
        roulettesEmpty.style.display = "none";
        roulettes.forEach(r => {
            const item = document.createElement("div");
            item.className = "admin-user-item";

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

            const meta = document.createElement("div");
            meta.className = "admin-user-meta";

            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.gap = "8px";

            const playBtn = document.createElement("button");
            playBtn.className = "btn primary";
            playBtn.style.padding = "4px 12px";
            playBtn.style.fontSize = "0.8rem";
            playBtn.textContent = "Play";
            playBtn.onclick = () => window.playRoulette(r.id);

            const editBtn = document.createElement("button");
            editBtn.className = "btn";
            editBtn.style.padding = "4px 12px";
            editBtn.style.fontSize = "0.8rem";
            editBtn.textContent = "編集";
            editBtn.onclick = () => window.openEditModal(r);

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "btn";
            deleteBtn.style.padding = "4px 12px";
            deleteBtn.style.fontSize = "0.8rem";
            deleteBtn.style.color = "#ef476f";
            deleteBtn.textContent = "削除";
            deleteBtn.onclick = () => window.deleteRoulette(r.id);

            actions.appendChild(playBtn);
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            const updated = document.createElement("small");
            updated.style.marginTop = "4px";
            updated.textContent = `更新: ${new Date(r.updatedAt).toLocaleDateString()}`;

            meta.appendChild(actions);
            meta.appendChild(updated);

            item.appendChild(summary);
            item.appendChild(meta);
            roulettesList.appendChild(item);
        });
    } else {
        roulettesEmpty.style.display = "block";
    }
}

// --- Modal Functions ---

export function openCreateModal() {
    document.getElementById("modal-title").textContent = "ルーレットの作成";
    document.getElementById("edit-id").value = "";
    document.getElementById("modal-roulette-title").value = "";
    document.getElementById("modal-roulette-desc").value = "";
    modalItemList.innerHTML = "";
    addItemToModal(); // Add one default item
    addItemToModal();
    rouletteModal.classList.add("is-open");
}

window.openEditModal = (roulette) => {
    document.getElementById("modal-title").textContent = "ルーレットの編集";
    document.getElementById("edit-id").value = roulette.id;
    document.getElementById("modal-roulette-title").value = roulette.title;
    document.getElementById("modal-roulette-desc").value = roulette.description;
    modalItemList.innerHTML = "";
    if (roulette.items) {
        roulette.items.forEach(item => addItemToModal(item.label, item.color));
    }
    rouletteModal.classList.add("is-open");
};

export function closeRouletteModal() {
    rouletteModal.classList.remove("is-open");
}

export function addItemToModal(label = "", color = null) {
    const div = document.createElement("div");
    div.className = "modal-item-row";
    div.style = "display: flex; gap: 8px; align-items: center; margin-bottom: 8px;";
    
    if (!color) {
        color = COLORS[modalItemList.children.length % COLORS.length];
    }

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "item-color";
    colorInput.value = color;
    colorInput.style = "width: 40px; height: 40px; padding: 2px; border: 1px solid var(--glass-border); border-radius: 8px; cursor: pointer;";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "item-label";
    labelInput.value = label;
    labelInput.placeholder = "項目名";
    labelInput.style = "flex: 1; border: 1px solid var(--glass-border); border-radius: 8px; padding: 8px 12px;";
    labelInput.required = true;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.innerHTML = "&times;";
    removeBtn.style = "background: none; border: none; color: #ef476f; font-size: 1.2rem; cursor: pointer; padding: 0 8px;";
    removeBtn.onclick = function() {
        div.remove();
    };

    div.appendChild(colorInput);
    div.appendChild(labelInput);
    div.appendChild(removeBtn);
    modalItemList.appendChild(div);
}

export function removeItemFromModal(btn) {
    btn.parentElement.remove();
}

async function setupFirebase() {
    try {
        const response = await fetchFirebaseConfig();
        const app = initializeApp(response.config);
        firebaseAuth = getAuth(app);

        onAuthStateChanged(firebaseAuth, async (user) => {
            if (user) {
                setStatus("ログイン中: " + user.email);
                try {
                    await syncUserSession(user);
                    await loadRoulettes();
                } catch (err) {
                    setStatus(err.message, "error");
                }
            } else {
                window.location.href = "/login";
            }
        });

        logoutButton.onclick = async () => {
            await signOut(firebaseAuth);
            window.location.href = "/login";
        };

        reloadRoulettesButton.onclick = loadRoulettes;

        rouletteForm.onsubmit = async (e) => {
            e.preventDefault();
            const idToken = await firebaseAuth.currentUser.getIdToken();
            const id = document.getElementById("edit-id").value;
            
            const items = Array.from(modalItemList.children).map(row => ({
                label: row.querySelector(".item-label").value,
                color: row.querySelector(".item-color").value,
                weight: 1
            }));

            const data = {
                id: id || "0",
                title: document.getElementById("modal-roulette-title").value,
                description: document.getElementById("modal-roulette-desc").value,
                items: items
            };

            try {
                const res = await fetch("/api/dashboard/roulettes", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${idToken}`
                    },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    closeRouletteModal();
                    loadRoulettes();
                } else {
                    alert("保存に失敗しました");
                }
            } catch (err) {
                alert(err.message);
            }
        };

        window.deleteRoulette = async (id) => {
            if (!confirm("このルーレットを削除しますか？")) return;
            const idToken = await firebaseAuth.currentUser.getIdToken();
            const res = await fetch(`/api/dashboard/roulettes/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${idToken}` }
            });
            if (res.ok) {
                loadRoulettes();
            }
        };

        window.playRoulette = (id) => {
            window.location.href = `/roulette?id=${id}`;
        };

    } catch (error) {
        setStatus(error.message, "error");
    }
}

setupFirebase();
