import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const statusElement = document.getElementById("admin-status");
const recordsList = document.getElementById("records-list");
const recordsEmpty = document.getElementById("records-empty");
const logoutButton = document.getElementById("logout-button");
const clearRecordsButton = document.getElementById("clear-records");

function setStatus(msg, type = "info") {
    statusElement.textContent = msg;
    statusElement.dataset.tone = type;
}

async function fetchFirebaseConfig() {
    const res = await fetch("/api/config/firebase", { cache: "no-store" });
    if (!res.ok) throw new Error("Firebase 設定の取得に失敗しました。");
    return await res.json();
}

function loadRecords() {
    const savedHistory = localStorage.getItem("roulette-history");
    const history = savedHistory ? JSON.parse(savedHistory) : [];

    if (history && history.length > 0) {
        recordsEmpty.style.display = "none";
        recordsList.innerHTML = history.map(item => `
            <div class="admin-user-item">
                <div class="admin-user-summary">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="intro-color-dot" style="background: ${item.color};"></span>
                        <strong style="color: var(--text-main); font-size: 1.1rem;">${item.label}</strong>
                    </div>
                </div>
                <div class="admin-user-meta">
                    <small style="color: var(--text-muted);">${new Date(item.timestamp).toLocaleString()}</small>
                </div>
            </div>
        `).join("");
    } else {
        recordsEmpty.style.display = "block";
        recordsList.innerHTML = "";
    }
}

async function setupFirebase() {
    try {
        const response = await fetchFirebaseConfig();
        if (!response.enabled) {
            setStatus("Firebase は現在利用できません: " + response.reason, "error");
            return;
        }
        const app = initializeApp(response.config);
        const auth = getAuth(app);

        onAuthStateChanged(auth, (user) => {
            if (user) {
                setStatus("ログイン中: " + user.email);
                loadRecords();
            } else {
                window.location.href = "/login";
            }
        });

        logoutButton.onclick = async () => {
            await signOut(auth);
            window.location.href = "/login";
        };

        clearRecordsButton.onclick = () => {
            if (confirm("すべての履歴を消去しますか？")) {
                localStorage.removeItem("roulette-history");
                loadRecords();
            }
        };

    } catch (error) {
        setStatus(error.message, "error");
    }
}

setupFirebase();
