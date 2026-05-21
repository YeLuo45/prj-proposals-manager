# P-20250417-001 Technical Solution

## 提案包与访问链接管理系统

---

## 1. 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | React 18 + Vite 5 |
| 样式方案 | Tailwind CSS |
| 状态管理 | React useState/useReducer |
| 数据层 | GitHub REST API (直接操作仓库文件) |
| 认证 | GitHub Personal Access Token (PAT)，用户配置后存 localStorage |
| 部署目标 | 独立仓库 `proposals-manager`，GitHub Pages |

---

## 2. 数据结构

**文件路径**: `data/proposals.json`

```json
{
  "proposals": [
    {
      "id": "P-YYYYMMDD-XXX",
      "name": "项目名称",
      "description": "项目描述",
      "type": "web | app | package",
      "status": "active | archived",
      "url": "https://example.com",
      "packageUrl": "https://github.com/user/repo/releases/download/v1.0.0/app.apk",
      "tags": ["react", "pwa"],
      "createdAt": "2026-04-17",
      "updatedAt": "2026-04-17"
    }
  ]
}
```

---

## 3. 功能列表

### 3.1 列表展示
- 卡片/表格双视图切换
- 分页（每页 12 条）
- 显示字段：id、name、description、type、status、url、packageUrl

### 3.2 搜索
- 实时搜索（debounce 300ms）
- 搜索范围：name + description + tags

### 3.3 筛选
- 按 type 筛选：web / app / package / 全部
- 按 status 筛选：active / archived / 全部

### 3.4 分类导航
- 侧边栏或顶部 Tab 显示 type 分类
- 点击快速筛选

### 3.5 新增提案
- Modal 表单
- 必填：name、type
- 选填：description、url、packageUrl、tags
- id 自动生成（格式：P-YYYYMMDD-XXX）
- 提交后通过 GitHub API 写入 `data/proposals.json`

### 3.6 编辑提案
- 点击卡片进入编辑模式
- 可修改所有字段（除 id）
- 保存后通过 GitHub API 更新文件

### 3.7 上传包文件
- 支持上传 APK、ZIP 等文件
- 上传到 GitHub Release Assets 或仓库 `releases/` 目录
- 生成下载链接回填到 packageUrl

### 3.8 一键复制
- 复制 url / packageUrl 到剪贴板

---

## 4. 页面结构

```
/ (首页)
├── Header (Logo + Token 配置入口)
├── Sidebar / FilterBar (分类筛选)
├── SearchBar (搜索)
├── ProposalList (卡片列表)
└── Modal (新增/编辑表单)
```

---

## 5. GitHub API 操作

| 操作 | API |
|------|-----|
| 读取数据 | `GET /repos/{owner}/{repo}/contents/data/proposals.json` |
| 写入数据 | `PUT /repos/{owner}/{repo}/contents/data/proposals.json` |
| 上传文件 | `POST /repos/{owner}/{repo}/releases/{release_id}/assets` |

---

## 6. 项目结构

```
proposals-manager/
├── public/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── ProposalCard.jsx
│   │   ├── ProposalForm.jsx
│   │   ├── FilterBar.jsx
│   │   └── SearchBar.jsx
│   ├── hooks/
│   │   └── useGitHub.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── data/
│   └── proposals.json
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 7. 部署流程

1. dev 创建 `proposals-manager` 仓库，初始化 `gh-pages` 分支
2. 开发完成后构建 `dist/`
3. 设置 GitHub Pages 指向 `gh-pages` 分支
4. 提供访问地址

---

## 8. 交付物

- 完整 React + Vite 项目代码
- `data/proposals.json` 初始化数据（包含现有 game-1024、todo-app 等）
- 部署完成后的 GitHub Pages 访问地址
- README.md（含功能说明、配置方法）

---

*Coordinator: 小墨*
*Date: 2026-04-17*
