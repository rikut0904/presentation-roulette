const USER_KEY = "user_info";
const ROULETTES_KEY = "roulettes_cache";
const APP_DATA_KEY = "app_data_cache";
const APP_DATA_TTL_MS = 30 * 60 * 1000;
const APP_STORAGE_KEYS = [
    USER_KEY,
    ROULETTES_KEY,
    APP_DATA_KEY,
    "roulette-items",
    "roulette-history",
];

function readJSON(key) {
    const raw = localStorage.getItem(key);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (_error) {
        localStorage.removeItem(key);
        return null;
    }
}

export function getUser() {
    return readJSON(USER_KEY);
}

export function setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getRoulettes() {
    const cached = readJSON(ROULETTES_KEY);
    if (!cached) {
        return null;
    }

    if (Date.now() - cached.timestamp >= APP_DATA_TTL_MS) {
        localStorage.removeItem(ROULETTES_KEY);
        return null;
    }

    return cached.data;
}

export function setRoulettes(data) {
    localStorage.setItem(ROULETTES_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
    }));
}

export function getCachedData() {
    const cached = readJSON(APP_DATA_KEY);
    if (!cached) {
        return null;
    }

    if (Date.now() - cached.timestamp >= APP_DATA_TTL_MS) {
        localStorage.removeItem(APP_DATA_KEY);
        return null;
    }

    return cached.data;
}

export function setCachedData(data) {
    localStorage.setItem(APP_DATA_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
    }));
}

export function clearCache() {
    APP_STORAGE_KEYS.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
}
