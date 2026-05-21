# Technical Solution — prj-proposals-manager V4

## 概述

三项功能在同一版本迭代中实现，共享数据层和部分组件。

---

## Feature 1：看板泳道（Swimlanes）

### 实现方案

**新增文件**
- `src/components/Board/SwimlaneHeader.jsx` — 泳道头部（折叠/展开控制）
- `src/components/Board/SwimlaneSelector.jsx` — 泳道模式切换下拉菜单
- `src/hooks/useSwimlanes.js` — 泳道分组逻辑 hook

**修改文件**
- `src/pages/Board.jsx` — 增加泳道分组逻辑，渲染 SwimlaneHeader

**核心逻辑**
```javascript
// useSwimlanes.js
const groupBySwimlane = (cards, mode) => {
  const groups = {};
  cards.forEach(card => {
    const key = mode === 'status' ? card.status
               : mode === 'project' ? card.projectId
               : card.assignee || '未分配';
    if (!groups[key]) groups[key] = [];
    groups[key].push(card);
  });
  return groups;
};
```

**泳道折叠状态**
```javascript
// 存储在组件内部 state + localStorage 持久化
const [collapsedLanes, setCollapsedLanes] = useState(() => {
  return JSON.parse(localStorage.getItem('swimlanes_collapsed') || '{}');
});
```

---

## Feature 2：全局搜索 + 高级筛选

### 实现方案

**新增依赖**
- `fuse.js` — 轻量级模糊搜索（CDN 或 npm）

**新增文件**
- `src/components/Search/SearchBar.jsx` — 搜索输入框
- `src/components/Search/AdvancedFilters.jsx` — 高级筛选面板
- `src/hooks/useSearch.js` — 搜索和筛选逻辑 hook

**修改文件**
- `src/components/Layout/Header.jsx` — 集成 SearchBar
- `src/pages/Board.jsx` — 应用筛选逻辑

**搜索配置**
```javascript
const fuse = new Fuse(cards, {
  keys: ['title', 'description', 'tags', 'projectName', 'assignee'],
  threshold: 0.3,
  ignoreLocation: true,
  includeMatches: true, // 用于高亮
});
```

**URL 同步**
```javascript
// useSearch hook 中
const updateURL = (filters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v && v.length > 0) params.set(k, JSON.stringify(v));
  });
  navigate(`?${params.toString()}`, { replace: true });
};
```

**防抖实现**
```javascript
const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};
```

---

## Feature 3：批量操作

### 实现方案

**新增文件**
- `src/components/Batch/BatchToolbar.jsx` — 底部浮动工具栏
- `src/components/Batch/BatchConfirmModal.jsx` — 确认弹窗
- `src/hooks/useBatchOperations.js` — 批量操作逻辑 hook

**修改文件**
- `src/components/Board/Card.jsx` — 添加 checkbox
- `src/pages/Board.jsx` — 集成 BatchToolbar，添加多选状态

**数据流**
```javascript
// Board.jsx 状态
const [selectedIds, setSelectedIds] = useState(new Set());

// 全选
const selectAll = () => setSelectedIds(new Set(filteredCards.map(c => c.id)));

// 批量更新 GitHub
const batchUpdate = async (ids, updates) => {
  const token = localStorage.getItem('gh_token');
  // 读取 → 修改 → 写入
  const data = await fetchTodos(token);
  const updated = data.map(item =>
    ids.includes(item.id) ? { ...item, ...updates } : item
  );
  await saveTodos(token, updated);
};
```

**UI 状态**
```javascript
// Card 组件增加选中态
<div className={selectedIds.has(card.id) ? 'ring-2 ring-blue-500' : ''}>
  <input type="checkbox" checked={selectedIds.has(card.id)} onChange={...} />
</div>
```

---

## 组件结构

```
src/
├── components/
│   ├── Board/
│   │   ├── Card.jsx           (修改：添加 checkbox)
│   │   ├── SwimlaneHeader.jsx (新增)
│   │   └── SwimlaneSelector.jsx (新增)
│   ├── Search/
│   │   ├── SearchBar.jsx      (新增)
│   │   └── AdvancedFilters.jsx (新增)
│   └── Batch/
│       ├── BatchToolbar.jsx    (新增)
│       └── BatchConfirmModal.jsx (新增)
├── hooks/
│   ├── useSwimlanes.js        (新增)
│   ├── useSearch.js            (新增)
│   └── useBatchOperations.js   (新增)
└── pages/
    └── Board.jsx              (修改：集成所有新功能)
```

---

## Git 分支

```
feature/v4-swimlanes-search-batch
```

---

## 依赖变更

```diff
+ fuse.js  (搜索)
```

---

## 构建验证

- [ ] `npm run build` 成功
- [ ] 泳道切换正常
- [ ] 搜索防抖 300ms 正常
- [ ] 批量操作后数据持久化正常
