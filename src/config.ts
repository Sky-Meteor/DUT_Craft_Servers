import type { ServerAddressTarget, ServerTarget } from "./types";

const SERVERS_CONFIG_PATH = "./servers.json";

const DEFAULT_SERVER_LIST: ServerTarget[] = [
  {
    name: "主城生存服",
    address: [{ host: "play.hypixel.net" }]
  },
  {
    name: "小游戏大厅",
    address: [{ host: "mc.hypixel.net" }]
  },
  {
    name: "示例离线服",
    address: [{ host: "example.invalid", port: 25565 }]
  }
];

function normalizePort(value: unknown): number | undefined {
  return Number.isInteger(value) ? Number(value) : undefined;
}

/** 解析 "host" / "host:port" 字符串简写。端口需为 1–65535 的整数，否则整体视为 host。 */
function parseAddressString(value: string): ServerAddressTarget | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  let host = trimmed;
  let port: number | undefined;

  const lastColon = trimmed.lastIndexOf(":");
  if (lastColon > 0 && lastColon < trimmed.length - 1) {
    const maybePort = Number(trimmed.slice(lastColon + 1));
    if (Number.isInteger(maybePort) && maybePort >= 1 && maybePort <= 65535) {
      host = trimmed.slice(0, lastColon);
      port = maybePort;
    }
  }

  if (host.length === 0) {
    return undefined;
  }

  return { host, port };
}

function normalizeAddress(value: unknown): ServerAddressTarget | undefined {
  if (typeof value === "string") {
    return parseAddressString(value);
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<ServerAddressTarget>;
  if (typeof candidate.host !== "string" || candidate.host.trim().length === 0) {
    return undefined;
  }

  const normalizedId =
    typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id.trim() : undefined;

  return {
    id: normalizedId,
    host: candidate.host.trim(),
    port: normalizePort(candidate.port)
  };
}

function normalizeServer(value: unknown): ServerTarget | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as {
    name?: unknown;
    address?: unknown;
    host?: unknown;
    port?: unknown;
    note?: unknown;
  };

  if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) {
    return undefined;
  }

  const note =
    typeof candidate.note === "string" && candidate.note.trim().length > 0 ? candidate.note.trim() : undefined;

  // address 支持："host:port" 字符串、字符串数组、对象数组，可混用
  const normalizedAddresses = (
    typeof candidate.address === "string" ? [candidate.address] : Array.isArray(candidate.address) ? candidate.address : []
  )
    .map(normalizeAddress)
    .filter((item): item is ServerAddressTarget => Boolean(item));

  if (normalizedAddresses.length > 0) {
    return {
      name: candidate.name.trim(),
      address: normalizedAddresses,
      note
    };
  }

  const legacyAddress = normalizeAddress({
    host: candidate.host,
    port: candidate.port
  });

  if (!legacyAddress) {
    return undefined;
  }

  return {
    name: candidate.name.trim(),
    address: [legacyAddress],
    note
  };
}

export interface ServerListResult {
  servers: ServerTarget[];
  /** true 表示加载失败，当前是内置示例列表 */
  usedFallback: boolean;
  /** 需要向用户展示的配置问题（加载失败原因或被忽略的条目数） */
  problemText?: string;
}

export async function loadServerList(): Promise<ServerListResult> {
  try {
    const response = await fetch(SERVERS_CONFIG_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new Error("顶层必须是数组");
    }

    const parsed: ServerTarget[] = [];
    let droppedCount = 0;
    for (const item of payload) {
      const normalized = normalizeServer(item);
      if (normalized) {
        parsed.push(normalized);
      } else {
        droppedCount += 1;
      }
    }

    if (parsed.length === 0) {
      throw new Error("没有有效的服务器条目");
    }

    return {
      servers: parsed,
      usedFallback: false,
      problemText: droppedCount > 0 ? `服务器列表中有 ${droppedCount} 条格式无效的条目被忽略` : undefined
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "未知错误";
    console.warn(`[config] servers.json 加载失败：${reason}`);
    return {
      servers: DEFAULT_SERVER_LIST,
      usedFallback: true,
      problemText: `服务器列表加载失败（${reason}），当前显示的是内置示例列表，请检查 public/servers.json`
    };
  }
}

export function toAddress(target: ServerAddressTarget): string {
  if (!target.port || target.port === 25565) {
    return target.host;
  }

  return `${target.host}:${target.port}`;
}

export function toAddressList(server: ServerTarget): string[] {
  return server.address.map(toAddress);
}

export function getPrimaryAddress(server: ServerTarget): string {
  return toAddress(server.address[0]);
}

export function getServerId(server: ServerTarget): string {
  const parts = [
    encodeURIComponent(server.name),
    ...server.address.map((item) => encodeURIComponent(item.id ?? toAddress(item)))
  ];

  return parts.join("::");
}
