import { getUser } from './cache.js';

export function renderHeader() {
    if (document.querySelector(".admin-navbar")) return;
    
    const nav = document.createElement("nav");
    nav.className = "admin-navbar";
    nav.innerHTML = `
        <div class="wrap">
            <div class="nav-group">
                <a href="/dashboard" class="nav-link" data-path="/dashboard">Dashboard</a>
                <a href="/raffle" class="nav-link" data-path="/raffle">ラッフル</a>
            </div>
            <div class="nav-group">
                <span id="user-email" style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500;"></span>
                <button id="logout-button" class="btn" style="padding: 6px 12px; font-size: 0.85rem; margin-left: 12px;">ログアウト</button>
            </div>
        </div>
    `;
    document.querySelector(".admin-layout").prepend(nav);

    nav.querySelectorAll("[data-path]").forEach((link) => {
        if (link.dataset.path === window.location.pathname) {
            link.classList.add("active");
        }
    });
    
    const user = getUser();
    if (user) document.getElementById("user-email").textContent = user.email;
}
