import type { ServerViewModel } from "./types";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusLabel(status: ServerViewModel["status"]): string {
  if (status === "online") {
    return "在线";
  }

  if (status === "offline") {
    return "离线";
  }

  if (status === "loading") {
    return "加载中";
  }

  return "错误";
}

function playerNamesLabel(view: ServerViewModel): string {
  if (view.status !== "online") {
    return "无";
  }

  if (view.playerNames.length === 0) {
    return "暂无在线玩家";
  }

  return view.playerNames.join(", ");
}

function playerNamesMarkup(view: ServerViewModel): string {
  if (view.status !== "online") {
    return '<span class="player-chip muted">无</span>';
  }

  if (view.playerNames.length === 0 && view.anonymousPlayerCount === 0) {
    return '<span class="player-chip muted">暂无在线玩家</span>';
  }

  const namedChips = view.playerNames.map((name) => `<span class="player-chip">${escapeHtml(name)}</span>`);
  const anonymousChip =
    view.anonymousPlayerCount > 0
      ? `<span class="player-chip muted">匿名玩家 x${view.anonymousPlayerCount}</span>`
      : "";

  return [...namedChips, anonymousChip].join("");
}

function toast(message: string): void {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);

  window.setTimeout(() => {
    node.classList.add("toast-out");
    window.setTimeout(() => node.remove(), 250);
  }, 1400);
}

export function renderLoadingCard(parent: HTMLElement, id: string, name: string, address: string): void {
  const card = document.createElement("article");
  card.className = "server-card loading";
  card.dataset.serverId = id;
  card.innerHTML = `
    <header class="card-head">
      <div class="title-wrap">
        <span class="server-icon placeholder" aria-hidden="true"></span>
        <h2>${escapeHtml(name)}</h2>
      </div>
      <span class="status-pill loading">加载中</span>
    </header>
    <p class="address">${escapeHtml(address)}</p>
    <div class="line shimmer"></div>
    <div class="line shimmer short"></div>
  `;
  parent.appendChild(card);
}

export function upsertServerCard(parent: HTMLElement, view: ServerViewModel): void {
  const existing = parent.querySelector<HTMLElement>(`[data-server-id="${view.id}"]`);
  const card = existing ?? document.createElement("article");

  card.className = `server-card ${view.status}`;
  card.dataset.serverId = view.id;
  card.innerHTML = `
    <header class="card-head">
      <div class="title-wrap">
        ${
          view.iconDataUrl
            ? `<img class="server-icon" src="${escapeHtml(view.iconDataUrl)}" alt="${escapeHtml(view.name)} 图标" loading="lazy" />`
            : '<span class="server-icon placeholder" aria-hidden="true"></span>'
        }
        <h2>${escapeHtml(view.name)}</h2>
      </div>
      <span class="status-pill ${view.status}">${statusLabel(view.status)}</span>
    </header>

    <div class="data-row">
      <span class="label">在线人数</span>
      <span class="value">${escapeHtml(view.playersText)}</span>
    </div>

    <div class="data-row">
      <span class="label">版本</span>
      <span class="value">${escapeHtml(view.version)}</span>
    </div>

    <div class="data-row players-row">
      <span class="label">在线玩家</span>
      <span class="value" title="${escapeHtml(playerNamesLabel(view))}">${playerNamesMarkup(view)}</span>
    </div>

    <div class="motd" title="${escapeHtml(view.motdText)}">${view.motdHtml ?? escapeHtml(view.motdText)}</div>

    <div class="copy-row">
      <span class="address">${escapeHtml(view.address)}</span>
      <div class="button-row">
        <button class="copy-btn" type="button" aria-label="复制服务器地址 ${escapeHtml(view.address)}">复制地址</button>
        <button class="refresh-card-btn" type="button" aria-label="刷新服务器 ${escapeHtml(view.name)}">刷新</button>
      </div>
    </div>

    ${view.errorText ? `<p class="error-text">${escapeHtml(view.errorText)}</p>` : ""}
  `;

  if (!existing) {
    parent.appendChild(card);
  }

  const copyBtn = card.querySelector<HTMLButtonElement>(".copy-btn");
  if (copyBtn) {
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(view.address);
        toast(`已复制: ${view.address}`);
      } catch {
        toast("复制失败，请手动复制");
      }
    };
  }
}
