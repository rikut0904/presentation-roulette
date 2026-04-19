import { getCachedData, setCachedData, setRoulettes, setUser } from "./cache.js";

function buildError(response) {
    if (response.status === 401) {
        const error = new Error("ログインしてください");
        error.code = "UNAUTHORIZED";
        return error;
    }

    return new Error("データの取得に失敗しました");
}

export async function fetchAppData() {
    const cached = getCachedData();
    if (cached) {
        return cached;
    }

    const [userResponse, roulettesResponse] = await Promise.all([
        fetch("/api/dashboard/me", { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/roulettes", { credentials: "include", cache: "no-store" }),
    ]);

    if (!userResponse.ok) {
        throw buildError(userResponse);
    }

    if (!roulettesResponse.ok) {
        throw buildError(roulettesResponse);
    }

    const data = {
        user: await userResponse.json(),
        roulettes: await roulettesResponse.json(),
    };

    setUser(data.user);
    setRoulettes(data.roulettes);
    setCachedData(data);

    return data;
}
