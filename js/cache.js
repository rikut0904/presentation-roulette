function readJSON(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

const USER_KEY = "user_cache";
const RAFFLES_KEY = "raffles_cache";

export function clearCache() {
    [
        USER_KEY,
        RAFFLES_KEY,
        "raffle-items",
        "raffle-history",
    ].forEach(k => localStorage.removeItem(k));
}

export function getUser() {
    return readJSON(USER_KEY);
}

export function setUser(data) {
    localStorage.setItem(USER_KEY, JSON.stringify(data));
}

export function getRaffles() {
    const cached = readJSON(RAFFLES_KEY);
    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 5) {
        return cached.data;
    }
    localStorage.removeItem(RAFFLES_KEY);
    return null;
}

export function setRaffles(data) {
    localStorage.setItem(RAFFLES_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
    }));
}

// For compatibility / Migration
export function getCachedData() {
    return {
        user: getUser(),
        raffles: getRaffles()
    };
}

export function setCachedData(user, raffles) {
    setUser(user);
    setRaffles(raffles);
}
