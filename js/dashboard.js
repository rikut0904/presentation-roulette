import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const statusElement = document.getElementById("admin-status");
const currentUserElement = document.getElementById("current-user");
const logoutButton = document.getElementById("logout-button");
const reloadRoulettesButton = document.getElementById("reload-users"); // Reuse existing ID for now
const roulettesList = document.getElementById("users-list"); // Reuse existing ID for now
const roulettesEmpty = document.getElementById("users-empty"); // Reuse existing ID for now

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

async function loadRoulettes(auth) {
    const user = auth.currentUser;
    if (!user) return;

    const idToken = await user.getIdToken();
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
                    <p style="font-size: 0.85rem;">${r.items.length} 項目</p>
                </div>
                <div class="admin-user-meta">
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editRoulette(${r.id})" class="btn" style="padding: 4px 12px; font-size: 0.8rem;">編集</button>
                        <button onclick="deleteRoulette(${r.id})" class="btn" style="padding: 4px 12px; font-size: 0.8rem; color: #ef476f;">削除</button>
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

async function setupFirebase() {
    try {
        const response = await fetchFirebaseConfig();
        if (!response.enabled) {
            setStatus("Firebase は無効です", "error");
            return;
        }
        const app = initializeApp(response.config);
        const auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                setStatus("ログイン中: " + user.email);
                currentUserElement.textContent = `${user.displayName || "No Name"} (${user.email})`;
                try {
                    await syncUserSession(user);
                    await loadRoulettes(auth);
                } catch (err) {
                    setStatus(err.message, "error");
                }
            } else {
                window.location.href = "/login";
            }
        });

        logoutButton.onclick = async () => {
            await signOut(auth);
            window.location.href = "/login";
        };

        if (reloadRoulettesButton) {
            reloadRoulettesButton.onclick = async () => {
                setStatus("更新中...");
                try {
                    await loadRoulettes(auth);
                    setStatus("更新完了");
                } catch (err) {
                    setStatus(err.message, "error");
                }
            };
        }

        window.deleteRoulette = async (id) => {
            if (!confirm("このルーレットを削除しますか？")) return;
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch(`/api/dashboard/roulettes/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${idToken}` }
            });
            if (res.ok) {
                loadRoulettes(auth);
            } else {
                alert("削除に失敗しました");
            }
        };

        window.editRoulette = (id) => {
            // Future feature: Redirect to editor
            alert("編集機能は準備中です (ID: " + id + ")");
        };

    } catch (error) {
        setStatus(error.message, "error");
    }
}

setupFirebase();
