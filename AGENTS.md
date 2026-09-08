# AGENTS.md — DUT_Craft_Servers 工作说明

静态页面：展示 DUT_Craft Minecraft 服务器状态。无框架，纯 TypeScript + Vite + 手写 DOM 操作。UI 文案与代码注释全部使用中文，新代码保持一致。

## 常用命令

```bash
npm run dev       # Vite 开发服务器（端口 5173）
npm run build     # tsc -b && vite build —— 唯一的类型检查/构建门禁
npm run preview   # 预览 dist/
```

- 没有独立的 lint / test；`tsc -b` 在 build 中执行，且 tsconfig 开启 `noUnusedLocals` / `noUnusedParameters`，未使用的变量会导致构建失败。
- 推送到 `main` 会触发 GitHub Pages 自动部署（`.github/workflows/deploy-pages.yml`，Node 24）。

## 架构与数据流

`public/servers.json` → `config.ts`（加载+规范化）→ `api.ts`（查询 `https://api.mcsrvstat.us/2`）→ `ServerViewModel` → `ui.ts`（渲染卡片）。

- `src/main.ts` — 入口；全部/单卡刷新逻辑；卡片排序（在线有玩家 > 在线无玩家 > 其他，同优先级按配置顺序）；配置问题横幅（`#config-banner`）。
- `src/config.ts` — 解析 servers.json（`address` 支持字符串简写 `"host:port"`、字符串/对象混合数组；兼容旧版 `host`/`port` 平铺格式；`note` 字段会显示在卡片上）；加载失败时返回内置 `DEFAULT_SERVER_LIST` 并附带 `problemText` 供横幅展示，不再静默吞错。
- `src/api.ts` — API 请求（8s 超时）、MOTD/图标/玩家数据规范化。只有每个服务器的第一个地址（primary）会被查询，其余地址仅展示和复制。
- `src/ui.ts` — innerHTML 模板渲染、地址点击复制、toast。
- `src/theme.ts` — 明暗主题切换（`data-theme` 属性 + localStorage key `dutcraft-theme`）、流星动画。
- `src/types.ts` — 共享类型。

## 关键约定（改动前必读）

- **XSS 防护是手动的**：所有渲染进 innerHTML 的 API 派生数据必须经过 `escapeHtml()`；MOTD 的 HTML 只能通过 `api.ts` 的 `sanitizeMotdNode` / `sanitizeStyle` 白名单处理后再用（`motdHtml` 已是安全产物，可直接插入）。
- **静态资源必须用 ESM import 引入**（如 `import url from "../assets/textures/xxx.png"`），让 Vite 处理路径与 `base: "./"` 前缀，否则 GitHub Pages 子路径部署时资源 404。`vite.config.ts` 的 `base: "./"` 是为 Pages 部署设置的，勿改。
- **图标回退规则**：查询错误用 `Barrier.png`，服务器无图标用 `Grass_Block.png`。
- **主题防 FOUC**：`index.html` `<head>` 中的内联脚本与 `theme.ts` 逻辑需保持同步（读取同一 localStorage key、设置同一 `data-theme` 属性）。
- 服务器列表数据维护在 `public/servers.json`（推荐 `address` 字符串简写），格式约定见 `public/servers.schema.json`（`.vscode/settings.json` 已关联，供编辑器校验）。
