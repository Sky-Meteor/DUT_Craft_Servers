import type { ServerViewModel } from "./types";
// 默认/错误图标贴图（自带透明背景，直接作 img 使用）。
// 通过 import 让 Vite 处理路径与 base 前缀，适配 GitHub Pages 子路径部署。
import grassIconUrl from "../assets/textures/Grass_Block.png";
import barrierIconUrl from "../assets/textures/Barrier.png";

const GRASS_ICON_URL = grassIconUrl;
const BARRIER_ICON_URL = barrierIconUrl;

/** 值班玩家列表最多直接展示的人数，其余折叠进 title */
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
      return "自检中";
    default:
      return "故障";
  }
}

/** 单元图标：故障用屏障，无图标用草方块，否则用服务器图标。 */
function unitIconMarkup(view: ServerViewModel): string {
  if (view.status === "error") {
    return `<img class="unit-icon" src="${BARRIER_ICON_URL}" alt="${escapeHtml(view.name)} 不可用" loading="lazy" />`;
  }

  if (view.iconDataUrl) {
    return `<img class="unit-icon" src="${escapeHtml(view.iconDataUrl)}" alt="${escapeHtml(view.name)} 图标" loading="lazy" />`;
  }

  return `<img class="unit-icon" src="${GRASS_ICON_URL}" alt="${escapeHtml(view.name)} 默认图标" loading="lazy" />`;
}

function crewMarkup(view: ServerViewModel): string {
  if (view.status !== "online") {
    return "";
  }

  const names = view.playerNames;
  const anonymous = view.anonymousPlayerCount;
  if (names.length === 0 && anonymous === 0) {
    // 无玩家时不渲染整行，读数区的 0/N 已足够表达
    return "";
  }

  const visible = names.slice(0, CREW_VISIBLE_MAX).map(escapeHtml).join("、");
  const more = names.length > CREW_VISIBLE_MAX ? ` 等 ${names.length} 人` : "";
  const anon = anonymous > 0 ? `、匿名 ×${anonymous}` : "";
  const fullTitle = escapeHtml(names.join(", ") + (anonymous > 0 ? `, 匿名 ×${anonymous}` : ""));

  return `<p class="unit-crew" title="${fullTitle}"><span class="crew-head">值班</span>${visible}${more}${anon}</p>`;
}

function socketsMarkup(view: Pick<ServerViewModel, "addresses">): string {
  return view.addresses
    .map(
      (item) =>
        `<button class="socket" type="button" data-copy-address="${escapeHtml(item)}" aria-label="复制服务器地址 ${escapeHtml(item)}">${escapeHtml(item)}</button>`
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

/** 单元骨架（开机自检态） */
export function renderLoadingUnit(
  parent: HTMLElement,
  id: string,
  tag: string,
  index: number,
  name: string,
  addresses: string[],
  note?: string
): void {
  const card = document.createElement("article");
  card.className = "unit loading";
  card.dataset.serverId = id;
  card.style.setProperty("--i", String(index));
  card.innerHTML = `
    <div class="unit-rail">
      <span class="unit-tag">${escapeHtml(tag)}</span>
      <span class="lamp" aria-hidden="true"></span>
    </div>
    <div class="unit-main">
      <header class="unit-head">
        <img class="unit-icon" src="${GRASS_ICON_URL}" alt="${escapeHtml(name)} 默认图标" loading="lazy" />
        <div class="unit-title">
          <h2>${escapeHtml(name)}</h2>
          ${note ? `<p class="unit-note">${escapeHtml(note)}</p>` : ""}
        </div>
        <span class="unit-state">自检中</span>
      </header>
      <div class="unit-motd" title="${escapeHtml(addresses.join("\n"))}"></div>
      <div class="unit-foot">
        <div class="readout"><span class="readout-value">--/--</span><span class="readout-label">玩家</span></div>
        <div class="readout"><span class="readout-value">--</span><span class="readout-label">版本</span></div>
        <div class="sockets">${socketsMarkup({ addresses })}</div>
        <button class="unit-sync" type="button" aria-label="刷新服务器 ${escapeHtml(name)}">⟳</button>
      </div>
    </div>
  `;
  parent.appendChild(card);
  bindSockets(card);
}

/** 单元内容更新（保留元素本身，避免重启开机动画） */
export function upsertServerUnit(parent: HTMLElement, view: ServerViewModel, tag: string): void {
  const existing = parent.querySelector<HTMLElement>(`[data-server-id="${view.id}"]`);
  const card = existing ?? document.createElement("article");

  card.className = `unit ${view.status}`;
  card.dataset.serverId = view.id;
  card.innerHTML = `
    <div class="unit-rail">
      <span class="unit-tag">${escapeHtml(tag)}</span>
      <span class="lamp" aria-hidden="true"></span>
    </div>
    <div class="unit-main">
      <header class="unit-head">
        ${unitIconMarkup(view)}
        <div class="unit-title">
          <h2>${escapeHtml(view.name)}</h2>
          ${view.note ? `<p class="unit-note">${escapeHtml(view.note)}</p>` : ""}
        </div>
        <span class="unit-state">${stateLabel(view.status)}</span>
      </header>

      <div class="unit-motd" title="${escapeHtml(view.motdText)}">${view.motdHtml ?? escapeHtml(view.motdText)}</div>

      ${view.errorText ? `<p class="unit-error">${escapeHtml(view.errorText)}</p>` : ""}
      ${crewMarkup(view)}

      <div class="unit-foot">
        <div class="readout"><span class="readout-value">${escapeHtml(view.playersText)}</span><span class="readout-label">玩家</span></div>
        <div class="readout"><span class="readout-value" title="${escapeHtml(view.version)}">${escapeHtml(view.version)}</span><span class="readout-label">版本</span></div>
        <div class="sockets">${socketsMarkup(view)}</div>
        <button class="unit-sync" type="button" aria-label="刷新服务器 ${escapeHtml(view.name)}">⟳</button>
      </div>
    </div>
  `;

  if (!existing) {
    parent.appendChild(card);
  }

  bindSockets(card);
}

function bindSockets(card: HTMLElement): void {
  const buttons = card.querySelectorAll<HTMLButtonElement>(".socket");
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
