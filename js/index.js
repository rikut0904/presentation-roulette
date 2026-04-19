const state = {
    config: null,
    rotation: 0,
    spinning: false,
};

const view = () => document.getElementById("view");

function navigate(path) {
    if (location.pathname !== path) {
        history.pushState({}, "", path);
    }
    renderRoulette();
}

window.addEventListener("popstate", renderRoulette);

document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-link]");
    if (!link) return;
    event.preventDefault();
    navigate(new URL(link.href).pathname);
});

async function fetchRoulette() {
    const res = await fetch("/api/roulette", { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}

async function spinRoulette() {
    const res = await fetch("/api/roulette/spin", { method: "POST" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}

function buildWheelBackground(items) {
    const step = 360 / items.length;
    const stops = items.map((item, index) => {
        const start = (step * index).toFixed(2);
        const end = (step * (index + 1)).toFixed(2);
        return `${item.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
}

function renderRouletteShell(config) {
    const wheel = document.querySelector(".wheel");
    wheel.innerHTML = `
        <div class="wheel-surface" style="background: ${buildWheelBackground(config.items)};"></div>
        <div class="wheel-center">START</div>
    `;
}

function ensureResultModal() {
    let modal = document.getElementById("result-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "result-modal";
    modal.className = "result-modal";
    modal.innerHTML = `
        <div class="result-modal-backdrop" data-close-modal></div>
        <div class="result-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="result-modal-title">
            <button class="result-modal-close" type="button" aria-label="閉じる" data-close-modal>×</button>
            <p class="result-label">選ばれたテーマ</p>
            <h2 id="result-modal-title"></h2>
            <p id="result-modal-description"></p>
        </div>
    `;
    modal.addEventListener("click", (event) => {
        if (event.target.closest("[data-close-modal]")) {
            closeResultModal();
        }
    });
    document.body.appendChild(modal);
    return modal;
}

function openResultModal(selected) {
    const modal = ensureResultModal();
    modal.querySelector("#result-modal-title").textContent = selected.label;
    modal.querySelector("#result-modal-description").textContent = selected.description;
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
}

function closeResultModal() {
    const modal = document.getElementById("result-modal");
    if (!modal) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
}

async function renderRoulette() {
    view().innerHTML = `
        <div class="roulette-layout">
            <section>
                <div class="wheel-stage">
                    <div class="pointer" aria-hidden="true"></div>
                    <div class="wheel" id="wheel"></div>
                </div>
                <div class="action-row">
                    <button class="btn primary" id="spin-button" disabled>読み込み中...</button>
                </div>
            </section>
            <aside class="side-panel">
                <div class="legend-card">
                    <p class="legend-title">候補一覧</p>
                    <div class="legend-list"></div>
                </div>
            </aside>
        </div>
    `;

    try {
        const config = await fetchRoulette();
        state.config = config;

        renderRouletteShell(config);

        document.querySelector(".legend-list").innerHTML = config.items.map((item) => `
            <div class="legend-item">
                <span class="legend-color" style="background:${item.color};"></span>
                <span class="legend-text">${item.label}</span>
            </div>
        `).join("");

        const spinButton = document.getElementById("spin-button");
        spinButton.textContent = config.spinText;
        spinButton.disabled = false;
        spinButton.addEventListener("click", onSpin);
    } catch (error) {
        view().innerHTML = `
            <h1>ルーレット</h1>
            <div class="result-card error-card">
                <p>設定の取得に失敗しました。</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

async function onSpin() {
    if (state.spinning) return;
    state.spinning = true;

    const button = document.getElementById("spin-button");
    const wheel = document.getElementById("wheel");
    closeResultModal();

    button.disabled = true;
    button.textContent = "回転中...";

    try {
        const result = await spinRoulette();
        state.rotation += result.degrees;
        wheel.style.transform = `rotate(${state.rotation}deg)`;

        window.setTimeout(() => {
            openResultModal(result.selected);
        }, 4200);
    } catch (error) {
        view().insertAdjacentHTML("beforeend", `
            <div class="inline-error-card">
                <p class="result-label">エラー</p>
                <h2>抽選に失敗しました</h2>
                <p>${error.message}</p>
            </div>
        `);
    } finally {
        window.setTimeout(() => {
            state.spinning = false;
            button.disabled = false;
            button.textContent = state.config?.spinText || "もう一度回す";
        }, 4300);
    }
}

function boot() {
    const year = document.getElementById("y");
    if (year) year.textContent = new Date().getFullYear();
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeResultModal();
        }
    });
    if (location.pathname !== "/") {
        navigate("/");
        return;
    }
    renderRoulette();
}

document.addEventListener("DOMContentLoaded", boot);
