export interface ServerTarget {
  name: string;
  host: string;
  port?: number;
}

export interface ApiServerResponse {
  online: boolean;
  ip?: string;
  port?: number;
  icon?: string;
  version?: string;
  players?: {
    online?: number;
    max?: number;
    list?: string[];
  };
  motd?: {
    clean?: string[];
    html?: string[];
  };
}

export type ServerUiStatus = "loading" | "online" | "offline" | "error";

export interface ServerViewModel {
  id: string;
  name: string;
  address: string;
  iconDataUrl?: string;
  status: ServerUiStatus;
  version: string;
  playersText: string;
  playerNames: string[];
  anonymousPlayerCount: number;
  motdText: string;
  motdHtml?: string;
  errorText?: string;
}
