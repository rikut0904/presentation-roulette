import { getRaffles, setRaffles, setUser, getUser } from "./cache.js";

async function buildError(res) {
    let message = "API Error";
    try {
        const data = await res.json();
        if (data && data.error && data.error.message) {
            message = data.error.message;
        } else if (data && data.message) {
            message = data.message;
        }
    } catch (_) {
        // ignore
    }
    const error = new Error(`${message} (${res.status})`);
    error.status = res.status;
    if (res.status === 401) {
        error.code = "UNAUTHORIZED";
    }
    return error;
}

export async function fetchAppData() {
    const cachedUser = getUser();
    const cachedRaffles = getRaffles();

    if (cachedUser && cachedRaffles) {
        return { user: cachedUser, raffles: cachedRaffles };
    }

    const [userResponse, rafflesResponse] = await Promise.all([
        fetch("/api/dashboard/me", { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/raffles", { credentials: "include", cache: "no-store" }),
    ]);

    if (!userResponse.ok) {
        throw await buildError(userResponse);
    }
    if (!rafflesResponse.ok) {
        throw await buildError(rafflesResponse);
    }

    const data = {
        user: await userResponse.json(),
        raffles: await rafflesResponse.json(),
    };

    setUser(data.user);
    setRaffles(data.raffles);

    return data;
}
