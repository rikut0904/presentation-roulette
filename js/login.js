import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { clearLogoutMarker, clearBrowserState, isLogoutInProgress, syncUserSession } from "./auth.js";

const statusElement = document.getElementById("admin-status");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
let authStateHandled = false;

function setStatus(msg, type = "info") {
    statusElement.textContent = msg;
    statusElement.dataset.tone = type;
}

async function handleAuthenticatedUser(auth, user) {
    if (isLogoutInProgress()) {
        authStateHandled = true;
        await signOut(auth);
        await clearBrowserState();
        clearLogoutMarker();
        authStateHandled = false;
        setStatus("ログアウトしました。");
        return;
    }

    authStateHandled = true;
    setStatus("セッションを確認しています...");

    try {
        const sessionResponse = await fetch("/api/dashboard/me", {
            credentials: "include",
            cache: "no-store",
        });

        if (sessionResponse.ok) {
            window.location.replace("/dashboard");
            return;
        }

        await clearBrowserState();
        await signOut(auth);
        setStatus("ログアウトしました。再度ログインしてください。");
    } catch (_error) {
        await clearBrowserState();
        await signOut(auth);
        setStatus("ログアウトしました。再度ログインしてください。", "error");
    } finally {
        authStateHandled = false;
    }
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

        if (isLogoutInProgress() && !auth.currentUser) {
            clearLogoutMarker();
            setStatus("ログアウトしました。");
        }

        onAuthStateChanged(auth, async (user) => {
            if (authStateHandled) {
                return;
            }

            if (user) {
                await handleAuthenticatedUser(auth, user);
            } else {
                if (isLogoutInProgress()) {
                    clearLogoutMarker();
                    setStatus("ログアウトしました。");
                    return;
                }
                setStatus("ログイン");
            }
        });

        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            authStateHandled = true;
            setStatus("ログインしています...");
            try {
                const credential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
                await syncUserSession(credential.user);
                setStatus("ログイン成功。リダイレクトします...");
                window.location.replace("/dashboard");
            } catch (error) {
                await clearBrowserState();
                try {
                    await signOut(auth);
                } catch (_signOutError) {
                    // Keep showing the login form even if local Firebase sign-out fails.
                }
                authStateHandled = false;
                setStatus("ログイン失敗: " + error.message, "error");
            }
        });

    } catch (error) {
        setStatus(error.message, "error");
    }
}

setupFirebase();
