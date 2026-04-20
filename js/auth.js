import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import { clearCache } from "./cache.js";

let firebaseConfigPromise = null;
let authPromise = null;
const LOGOUT_MARKER_KEY = "logout_in_progress";
const FIREBASE_INDEXED_DB_NAMES = ["firebaseLocalStorageDb"];

async function fetchFirebaseConfig() {
    if (!firebaseConfigPromise) {
        firebaseConfigPromise = fetch("/api/config/firebase", { cache: "no-store" })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error("Firebase 設定の取得に失敗しました。");
                }

                const payload = await response.json();
                if (!payload.enabled) {
                    throw new Error(payload.reason || "Firebase は現在利用できません。");
                }

                return payload.config;
            });
    }

    return firebaseConfigPromise;
}

export async function getFirebaseAuth() {
    if (!authPromise) {
        authPromise = fetchFirebaseConfig().then((config) => {
            const app = getApps().length > 0 ? getApp() : initializeApp(config);
            return getAuth(app);
        });
    }

    return authPromise;
}

export async function syncUserSession(user) {
    const idToken = await user.getIdToken();
    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
        throw new Error("セッションの同期に失敗しました。");
    }

    return response.json();
}

export async function logoutUser() {
    sessionStorage.setItem(LOGOUT_MARKER_KEY, "1");

    try {
        const auth = await getFirebaseAuth();
        if (auth.currentUser) {
            await signOut(auth);
        }
    } catch (_error) {
        // The server session still needs to be cleared even if Firebase is unavailable.
    }

    try {
        await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
        });
    } catch (_error) {
        // Local cleanup and redirect should still happen.
    }

    await clearBrowserState({ preserveLogoutMarker: true });
    window.location.replace("/login");
}

export function isLogoutInProgress() {
    return sessionStorage.getItem(LOGOUT_MARKER_KEY) === "1";
}

export function clearLogoutMarker() {
    sessionStorage.removeItem(LOGOUT_MARKER_KEY);
}

async function clearFirebaseIndexedDB() {
    if (typeof indexedDB === "undefined") {
        return;
    }

    await Promise.all(FIREBASE_INDEXED_DB_NAMES.map((name) => new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
    })));
}

export async function clearBrowserState({ preserveLogoutMarker = false } = {}) {
    const marker = preserveLogoutMarker ? sessionStorage.getItem(LOGOUT_MARKER_KEY) : null;

    clearCache();
    await clearFirebaseIndexedDB();

    if (preserveLogoutMarker && marker) {
        sessionStorage.setItem(LOGOUT_MARKER_KEY, marker);
    }
}
