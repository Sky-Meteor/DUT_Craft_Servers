import { getServerId, loadServerList, toAddressList } from "./config";
import { fetchServerView } from "./api";
import type { ServerTarget, ServerViewModel } from "./types";
import { renderLoadingCard, upsertServerCard } from "./ui";

const boardNode = document.querySelector<HTMLElement>("#status-board");
const refreshButtonNode = document.querySelector<HTMLButtonElement>("#refresh-all");

if (!boardNode || !refreshButtonNode) {
  throw new Error("页面初始化失败：缺少必要 DOM 节点");
}

const board = boardNode;
const refreshButton = refreshButtonNode;
let activeServerList: ServerTarget[] = [];
let activeServerSignature = "";
let latestViews: ServerViewModel[] = [];

function serverSignature(list: ServerTarget[]): string {
  return list.map(getServerId).join("||");
}

function renderInitialLoading(list: ServerTarget[]): void {
  board.innerHTML = "";
  for (const server of list) {
    renderLoadingCard(board, getServerId(server), server.name, toAddressList(server));
  }
}

async function syncServerList(): Promise<boolean> {
  const loaded = await loadServerList();
  const nextSignature = serverSignature(loaded);
  const changed = nextSignature !== activeServerSignature;

  activeServerList = loaded;
  activeServerSignature = nextSignature;

  return changed;
}

function activityPriority(view: ServerViewModel): number {
  if (view.status === "online") {
    return view.playerNames.length > 0 ? 0 : 1;
  }

  return 2;
}

function sortViews(views: ServerViewModel[]): ServerViewModel[] {
  const indexById = new Map(activeServerList.map((item, index) => [getServerId(item), index]));

  return views.sort((left, right) => {
    const leftPriority = activityPriority(left);
    const rightPriority = activityPriority(right);
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftIndex = indexById.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = indexById.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.name.localeCompare(right.name, "zh-CN");
  });
}

function renderSortedViews(views: ServerViewModel[]): void {
  board.innerHTML = "";
  for (const view of sortViews([...views])) {
    upsertServerCard(board, view);
  }
}

async function refreshOne(serverId: string): Promise<void> {
  const targetServer = activeServerList.find((item) => getServerId(item) === serverId);
  if (!targetServer) {
    return;
  }

  const single = await fetchServerView(targetServer);
  const existingIndex = latestViews.findIndex((item) => item.id === single.id);
  if (existingIndex >= 0) {
    latestViews[existingIndex] = single;
  } else {
    latestViews.push(single);
  }

  renderSortedViews(latestViews);
}

async function refreshAll(): Promise<void> {
  refreshButton.disabled = true;
  refreshButton.textContent = "刷新中...";

  const listChanged = await syncServerList();
  if (listChanged) {
    renderInitialLoading(activeServerList);
  }

  const results = await Promise.allSettled(activeServerList.map((item) => fetchServerView(item)));
  latestViews = results
    .filter((result): result is PromiseFulfilledResult<ServerViewModel> => result.status === "fulfilled")
    .map((result) => result.value);

  renderSortedViews(latestViews);

  refreshButton.disabled = false;
  refreshButton.textContent = "刷新全部服务器";
}

refreshButton.addEventListener("click", () => {
  void refreshAll();
});

board.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest<HTMLButtonElement>(".refresh-card-btn");
  if (!button) {
    return;
  }

  const card = button.closest<HTMLElement>(".server-card");
  const serverId = card?.dataset.serverId;
  if (!serverId) {
    return;
  }

  const original = button.textContent;
  button.disabled = true;
  button.textContent = "刷新中...";

  void refreshOne(serverId).finally(() => {
    button.disabled = false;
    button.textContent = original;
  });
});

void refreshAll();
