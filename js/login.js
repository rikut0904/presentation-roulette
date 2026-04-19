import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const statusElement = document.getElementById("admin-status");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const helperElement = document.getElementById("auth-helper");

function setStatus(msg, type = "info") {
    statusElement.textContent = msg;
    statusElement.dataset.tone = type;
}

async function fetchFirebaseConfig() {
    const res = await fetch("/api/config/firebase", { cache: "no-store" });
    if (!res.ok) throw new Error("Firebase 設定の取得に失敗しました。");
    return await res.json();
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
                // Already logged in, redirect to dashboard
                window.location.href = "/dashboard";
            } else {
                setStatus("ログイン");
            }
        });

        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            setStatus("ログインしています...");
            try {
                await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
                setStatus("ログイン成功。リダイレクトします...");
            } catch (error) {
                setStatus("ログイン失敗: " + error.message, "error");
            }
        });

    } catch (error) {
        setStatus(error.message, "error");
    }
}

setupFirebase();
