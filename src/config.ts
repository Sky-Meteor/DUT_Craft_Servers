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

function normalizeAddress(value: unknown): ServerAddressTarget | undefined {
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
  };

  if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) {
    return undefined;
  }

  const normalizedAddresses = Array.isArray(candidate.address)
    ? candidate.address.map(normalizeAddress).filter((item): item is ServerAddressTarget => Boolean(item))
    : [];

  if (normalizedAddresses.length > 0) {
    return {
      name: candidate.name.trim(),
      address: normalizedAddresses
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
    address: [legacyAddress]
  };
}

export async function loadServerList(): Promise<ServerTarget[]> {
  try {
    const response = await fetch(SERVERS_CONFIG_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new Error("Invalid server list format");
    }

    const parsed = payload.map(normalizeServer).filter((item): item is ServerTarget => Boolean(item));
    if (parsed.length === 0) {
      throw new Error("No valid server entries");
    }

    return parsed;
  } catch {
    return DEFAULT_SERVER_LIST;
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
