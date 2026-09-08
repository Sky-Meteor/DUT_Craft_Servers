import type { ServerViewModel } from "./types";
// 默认/错误图标贴图（自带透明背景，直接作 img 使用）。
// 通过 import 让 Vite 处理路径与 base 前缀，适配 GitHub Pages 子路径部署。
import grassIconUrl from "../assets/textures/Grass_Block.png";
import barrierIconUrl from "../assets/textures/Barrier.png";

const GRASS_ICON_URL = grassIconUrl;
const BARRIER_ICON_URL = barrierIconUrl;

/** 在线玩家列表最多直接展示的人数，其余折叠进 title */
const CREW_VISIBLE_MAX = 10;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stateLabel(status: ServerViewModel["status"]): string {
  switch (status) {
    case "online":
      return "在线";
    case "offline":
      return "离线";
    case "loading":
      return "读取中";
    default:
      return "异常";
  }
}

/** 卡片图标：异常用屏障，无图标用草方块，否则用服务器图标。 */
function cardIconMarkup(view: ServerViewModel): string {
  if (view.status === "error") {
    return `<img class="card-icon" src="${BARRIER_ICON_URL}" alt="${escapeHtml(view.name)} 不可用" loading="lazy" />`;
  }

  if (view.iconDataUrl) {
    return `<img class="card-icon" src="${escapeHtml(view.iconDataUrl)}" alt="${escapeHtml(view.name)} 图标" loading="lazy" />`;
  }

  return `<img class="card-icon" src="${GRASS_ICON_URL}" alt="${escapeHtml(view.name)} 默认图标" loading="lazy" />`;
}

/** "8 / 40" → 大数字 + 暗色分母；异常态显示长破折 */
function playersMetricMarkup(view: ServerViewModel): string {
  if (view.status === "error") {
    return `<span class="metric-num">—</span>`;
  }

  const parts = view.playersText.split("/").map((item) => item.trim());
  const online = parts[0] ?? "—";
  const max = parts[1];

  if (!max) {
    return `<span class="metric-num">${escapeHtml(online)}</span>`;
  }

  return `<span class="metric-num">${escapeHtml(online)}<span class="cap"> / ${escapeHtml(max)}</span></span>`;
}

function crewMarkup(view: ServerViewModel): string {
  if (view.status !== "online") {
    return "";
  }

  const names = view.playerNames;
  const anonymous = view.anonymousPlayerCount;
  if (names.length === 0 && anonymous === 0) {
    return "";
  }

  const visible = names.slice(0, CREW_VISIBLE_MAX).map(escapeHtml).join("、");
  const more = names.length > CREW_VISIBLE_MAX ? ` 等 ${names.length} 人` : "";
  const anon = anonymous > 0 ? `、匿名 ×${anonymous}` : "";
  const fullTitle = escapeHtml(names.join(", ") + (anonymous > 0 ? `, 匿名 ×${anonymous}` : ""));

  return `<p class="card-crew" title="${fullTitle}">${visible}${more}${anon}</p>`;
}

function chipsMarkup(view: Pick<ServerViewModel, "addresses">): string {
  return view.addresses
    .map(
      (item) =>
        `<button class="chip" type="button" data-copy-address="${escapeHtml(item)}" aria-label="复制服务器地址 ${escapeHtml(item)}">${escapeHtml(item)}</button>`
    )
    .join("");
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

/** 卡片骨架（读取中） */
export function renderLoadingCard(
  parent: HTMLElement,
  id: string,
  tag: string,
  index: number,
  name: string,
  addresses: string[],
  note?: string
): void {
  const card = document.createElement("article");
  card.className = "card loading";
  card.dataset.serverId = id;
  card.style.setProperty("--i", String(index));
  card.innerHTML = `
    <header class="card-head">
      <span class="card-index">${escapeHtml(tag)}</span>
      <img class="card-icon" src="${GRASS_ICON_URL}" alt="${escapeHtml(name)} 默认图标" loading="lazy" />
      <div class="card-title">
        <h2>${escapeHtml(name)}</h2>
        ${note ? `<p class="card-note">${escapeHtml(note)}</p>` : ""}
      </div>
      <span class="pill"><span class="pill-dot"></span>${stateLabel("loading")}</span>
    </header>
    <div class="card-motd" title="${escapeHtml(addresses.join("\n"))}"></div>
    <div class="card-metrics">
      <div class="metric"><span class="metric-num">—</span><span class="metric-label">玩家</span></div>
      <div class="metric"><span class="metric-version">—</span><span class="metric-label">版本</span></div>
    </div>
    <footer class="card-foot">
      <div class="chips">${chipsMarkup({ addresses })}</div>
      <button class="card-refresh" type="button" aria-label="刷新服务器 ${escapeHtml(name)}">↻</button>
    </footer>
  `;
  parent.appendChild(card);
  bindChips(card);
}

/** 卡片内容更新（保留元素本身，避免重放入场动画） */
export function upsertServerCard(parent: HTMLElement, view: ServerViewModel, tag: string): void {
  const existing = parent.querySelector<HTMLElement>(`[data-server-id="${view.id}"]`);
  const card = existing ?? document.createElement("article");

  card.className = `card ${view.status}`;
  card.dataset.serverId = view.id;
  card.innerHTML = `
    <header class="card-head">
      <span class="card-index">${escapeHtml(tag)}</span>
      ${cardIconMarkup(view)}
      <div class="card-title">
        <h2>${escapeHtml(view.name)}</h2>
        ${view.note ? `<p class="card-note">${escapeHtml(view.note)}</p>` : ""}
      </div>
      <span class="pill"><span class="pill-dot"></span>${stateLabel(view.status)}</span>
    </header>

    <div class="card-motd" title="${escapeHtml(view.motdText)}">${view.motdHtml ?? escapeHtml(view.motdText)}</div>

    ${view.errorText ? `<p class="card-error">${escapeHtml(view.errorText)}</p>` : ""}
    ${crewMarkup(view)}

    <div class="card-metrics">
      <div class="metric">${playersMetricMarkup(view)}<span class="metric-label">玩家</span></div>
      <div class="metric"><span class="metric-version" title="${escapeHtml(view.version)}">${escapeHtml(view.version)}</span><span class="metric-label">版本</span></div>
    </div>

    <footer class="card-foot">
      <div class="chips">${chipsMarkup(view)}</div>
      <button class="card-refresh" type="button" aria-label="刷新服务器 ${escapeHtml(view.name)}">↻</button>
    </footer>
  `;

  if (!existing) {
    parent.appendChild(card);
  }

  bindChips(card);
}

function bindChips(card: HTMLElement): void {
  const buttons = card.querySelectorAll<HTMLButtonElement>(".chip");
  for (const button of buttons) {
    button.onclick = async () => {
      const value = button.dataset.copyAddress ?? "";
      if (!value) {
        return;
      }
      try {
        await navigator.clipboard.writeText(value);
        toast(`已复制 ${value}`);
      } catch {
        toast("复制失败，请手动复制");
      }
    };
  }
}
