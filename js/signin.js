import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const statusElement = document.getElementById("admin-status");
const signinForm = document.getElementById("signin-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

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
                window.location.href = "/dashboard";
            } else {
                setStatus("情報を入力してアカウントを作成してください。");
            }
        });

        signinForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            setStatus("アカウントを作成しています...");
            try {
                await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
                setStatus("作成成功。リダイレクトします...");
            } catch (error) {
                setStatus("作成失敗: " + error.message, "error");
            }
        });

    } catch (error) {
        setStatus(error.message, "error");
    }
}

setupFirebase();
