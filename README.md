# 提案管理系统 (Proposals Manager)

## 访问 URL
**https://yeluo45.github.io/proposals-manager/**

## 项目描述
提案包与访问链接管理系统 — 支持项目管理、提案管理和里程碑追踪。

## 功能特性

### 项目管理
- ✅ **项目列表**：卡片/表格视图，分页显示
- ✅ **项目详情页**：`/project/:id` 独立路由
- ✅ **新建项目**：自动生成项目 ID (PRJ-YYYYMMDD-XXX)
- ✅ **编辑/删除项目**

### 提案管理
- ✅ **提案列表视图**：卡片/表格切换，分页显示（每页12条）
- ✅ **实时搜索**：300ms防抖，搜索名称、描述和标签
- ✅ **类型筛选**：按 Web/App/Package 类型筛选
- ✅ **状态筛选**：按 Active/In Dev/Archived 状态筛选
- ✅ **添加提案**：弹窗表单，自动生成 ID (P-YYYYMMDD-XXX 格式)
- ✅ **编辑提案**：所有字段可编辑（ID 除外）
- ✅ **提案归属项目**：可将提案关联到项目

### 里程碑管理
- ✅ **里程碑时间线**：可视化展示项目进度
- ✅ **添加/编辑/删除里程碑**
- ✅ **里程碑状态**：待开始/进行中/已完成
- ✅ **关联提案**：可将提案关联到里程碑

### 技术功能
- 🔍 **实时搜索**：300ms防抖，搜索名称、描述和标签
- 📋 **一键复制链接**：复制 URL 或包下载链接到剪贴板
- 🔌 **ai-superpower MCP**：数据通过 MCP 协议直连 ai-superpower（替代 GitHub API，2026-06-08 Phase 2 完成）

## 目录结构
```
proposals-manager/
├── public/
├── src/
│   ├── components/
│   │   ├── Header.jsx          # 顶部导航栏
│   │   ├── SearchBar.jsx       # 搜索栏组件
│   │   ├── FilterBar.jsx       # 筛选栏组件
│   │   ├── ProposalCard.jsx    # 提案卡片组件
│   │   ├── ProposalForm.jsx    # 提案表单组件
│   │   ├── ProjectCard.jsx     # 项目卡片组件
│   │   ├── ProjectForm.jsx     # 项目表单组件
│   │   ├── MilestoneTimeline.jsx  # 里程碑时间线
│   │   ├── MilestoneForm.jsx      # 里程碑表单
│   │   └── pages/
│   │       └── ProjectDetailPage.jsx  # 项目详情页
│   ├── hooks/
│   │   └── useMcp.js           # ai-superpower MCP 客户端钩子（替换旧 useGitHub.js）
│   ├── __tests__/
│   │   └── useMcp.test.js      # 14 vitest tests @ 100% mock coverage
│   ├── App.jsx                 # 主应用组件（含路由 + SettingsScreen）
│   ├── index.css               # 全局样式
│   └── main.jsx                # 入口文件
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages 部署
├── index.html
├── package.json
├── vite.config.js              # dev /mcp 代理
├── vitest.config.js
└── tailwind.config.js
```

## 数据结构（v3）— 现在由 ai-superpower 管理
数据存储在 **ai-superpower**（`~/.ai-superpower/proposals.csv` + `projects.csv`），通过 MCP 协议暴露。SPA 不再直接管理本地 JSON 文件。如需查看原始数据结构，请参考 ai-superpower 的 [`models.py`](https://github.com/YeLuo45/ai-superpower) 或运行：

```bash
aisp project list
aisp proposal list
```

## 本地运行
```bash
# 安装依赖
NODE_ENV=development npm install

# 启动 ai-superpower server（MCP 数据源）
cd ../ai-superpower
aisp run --port 8000
# 确认 /mcp 端点可用：curl http://127.0.0.1:8000/mcp/

# 启动 prj-proposals-manager（开发模式，会通过 vite proxy 转发 /mcp → 8000）
cd ../prj-proposals-manager
NODE_ENV=development npm run dev
# 打开 http://localhost:5173

# 首次打开会弹出 Settings 界面，填入：
#   MCP Server URL: http://127.0.0.1:8000
#   X-API-Key: <~/.ai-superpower/config.toml 的 [api].key>
# 点击"测试连接"会列出 ai-superpower 的 20 个工具

# 构建生产版本
NODE_ENV=development npm run build

# 跑测试
NODE_ENV=development npx vitest run
```

## 配置说明

### 设置 ai-superpower MCP
1. 首次使用时会弹出 Settings 界面（或点击顶栏"设置"）
2. 填入：
   - **MCP Server URL** — ai-superpower 运行的地址（默认 `http://127.0.0.1:8000`）
   - **X-API-Key** — 与 `~/.ai-superpower/config.toml` 的 `[api].key` 一致
3. 点击"测试连接"验证（应显示 20 个工具 + serverInfo）
4. 配置存于浏览器 localStorage（key: `mcp_server_url` + `mcp_api_key`）

### dev 模式 CORS
`vite.config.js` 把 `/mcp` 代理到 `http://127.0.0.1:8000/mcp/`，避免浏览器 CORS。生产部署同源或反代。

## 部署说明
- 部署方式：GitHub Actions 自动部署到 GitHub Pages
- 触发条件：push 到 main 分支
- 构建产物：dist/ 目录（不包含 data/proposals.json — 数据从 ai-superpower MCP 实时拉取）
- 生产环境需保证 `https://<site>/mcp` 可访问 ai-superpower（同源部署或反代）
