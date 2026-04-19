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

    if (roulettes && roulettes.length > 0) {
        roulettesEmpty.style.display = "none";
        roulettesList.innerHTML = roulettes.map(r => `
            <div class="admin-user-item">
                <div class="admin-user-summary">
                    <strong style="color: var(--text-main); font-size: 1.1rem;">${r.title}</strong>
                    <p style="font-size: 0.85rem;">${r.items ? r.items.length : 0} 項目</p>
                </div>
                <div class="admin-user-meta">
                    <div style="display: flex; gap: 8px;">
                        <button onclick="playRoulette('${r.id}')" class="btn primary" style="padding: 4px 12px; font-size: 0.8rem;">Play</button>
                        <button onclick="openEditModal(${JSON.stringify(r).replace(/"/g, '&quot;')})" class="btn" style="padding: 4px 12px; font-size: 0.8rem;">編集</button>
                        <button onclick="deleteRoulette('${r.id}')" class="btn" style="padding: 4px 12px; font-size: 0.8rem; color: #ef476f;">削除</button>
                    </div>
                    <small style="margin-top: 4px;">更新: ${new Date(r.updatedAt).toLocaleDateString()}</small>
                </div>
            </div>
        `).join("");
    } else {
        roulettesEmpty.style.display = "block";
        roulettesList.innerHTML = "";
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
    div.style = "display: flex; gap: 8px; align-items: center;";
    
    if (!color) {
        color = COLORS[modalItemList.children.length % COLORS.length];
    }

    div.innerHTML = `
        <input type="color" class="item-color" value="${color}" style="width: 40px; height: 40px; padding: 2px; border: 1px solid var(--glass-border); border-radius: 8px; cursor: pointer;">
        <input type="text" class="item-label" value="${label}" placeholder="項目名" style="flex: 1; border: 1px solid var(--glass-border); border-radius: 8px; padding: 8px 12px;" required>
        <button type="button" onclick="removeItemFromModal(this)" style="background: none; border: none; color: #ef476f; font-size: 1.2rem; cursor: pointer; padding: 0 8px;">&times;</button>
    `;
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
