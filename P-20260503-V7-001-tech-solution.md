# Tech Solution — P-20260503-V7-001: prj-proposals-manager V7 — 看板增强

---

## 1. 文件变更

```
src/pages/KanbanSwimlanes.jsx   # M1: 泳道列折叠状态 + localStorage
src/components/SwimlaneRow.jsx  # M1: 单元格折叠按钮 + M2: 泳道内筛选
src/components/KanbanColumn.jsx   # M4: 列宽拖拽
src/components/FilterBar.jsx     # M3: 专注模式按钮
src/App.jsx                     # M3: 专注模式 state + 数据过滤
```

无新增文件，在现有组件上修改。

---

## 2. M1: 泳道列折叠增强

### 2.1 localStorage 结构

```javascript
// key: 'kanban_column_collapsed'
// 结构: { "PRJ-001:active": true, "PRJ-001:in_dev": false }
const getColumnCollapsed = () => {
  try { return JSON.parse(localStorage.getItem('kanban_column_collapsed') || '{}'); }
  catch { return {}; }
};
const setColumnCollapsed = (map) => localStorage.setItem('kanban_column_collapsed', JSON.stringify(map));
```

### 2.2 KanbanSwimlanes.jsx 修改

```javascript
// 新增 state
const [collapsedColumns, setCollapsedColumns] = useState(() => getColumnCollapsed());

// 切换单个单元格的折叠
const toggleColumnCollapse = (projectId, status) => {
  const key = `${projectId}:${status}`;
  const updated = { ...collapsedColumns, [key]: !collapsedColumns[key] };
  setCollapsedColumns(updated);
  setColumnCollapsed(updated);
};

// 判断是否折叠
const isColumnCollapsed = (projectId, status) => !!collapsedColumns[`${projectId}:${status}`];
```

### 2.3 SwimlaneRow.jsx 修改

每个单元格（DroppableColumn）右上角增加折叠按钮：

```jsx
<div className="relative">
  {/* 折叠按钮 */}
  <button
    onClick={() => onToggleColumnCollapse(projectId, status)}
    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs bg-white/80 rounded"
    title={isCollapsed ? '展开' : '折叠'}
  >
    {isCollapsed ? '▶' : '▼'}
  </button>

  {/* 单元格内容 - 折叠时只显示数量 */}
  {isCollapsed ? (
    <div className="text-center text-gray-400 py-4">
      {cards.length} 项
    </div>
  ) : (
    cards.map(card => <SwimlaneCard key={card.id} proposal={card} ... />)
  )}
</div>
```

---

## 3. M2: 泳道内独立筛选

### 3.1 SwimlaneRow.jsx 修改

```javascript
// 新增 state
const [laneFilter, setLaneFilter] = useState({ query: '', type: '' });
const [showLaneFilter, setShowLaneFilter] = useState(false);

// 筛选逻辑
const filteredProposals = useMemo(() => {
  if (!laneFilter.query && !laneFilter.type) return proposals;
  return proposals.filter(p => {
    const matchQuery = !laneFilter.query || p.name.toLowerCase().includes(laneFilter.query.toLowerCase());
    const matchType = !laneFilter.type || p.type === laneFilter.type;
    return matchQuery && matchType;
  });
}, [proposals, laneFilter]);
```

### 3.2 SwimlaneRow.jsx UI

泳道行顶部增加筛选控件：

```jsx
<div className="flex items-center gap-2 mb-2">
  {/* 泳道名称 */}
  <span className="font-medium text-sm">{projectName}</span>

  {/* 筛选触发按钮 */}
  <button
    onClick={() => setShowLaneFilter(!showLaneFilter)}
    className={`text-xs px-2 py-0.5 rounded ${laneFilter.query || laneFilter.type ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}
  >
    🔍 {laneFilter.query || laneFilter.type ? '已筛选' : '筛选'}
  </button>

  {/* 微型筛选面板 */}
  {showLaneFilter && (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        placeholder="搜索该泳道..."
        value={laneFilter.query}
        onChange={(e) => setLaneFilter(f => ({ ...f, query: e.target.value }))}
        className="text-xs border rounded px-2 py-1"
      />
      <select
        value={laneFilter.type}
        onChange={(e) => setLaneFilter(f => ({ ...f, type: e.target.value }))}
        className="text-xs border rounded px-2 py-1"
      >
        <option value="">全部类型</option>
        <option value="web">Web</option>
        <option value="app">App</option>
        <option value="package">Package</option>
      </select>
      <button onClick={() => setLaneFilter({ query: '', type: '' })} className="text-xs text-gray-400">清除</button>
    </div>
  )}
</div>
```

---

## 4. M3: 看板专注模式

### 4.1 FilterBar.jsx 新增专注模式入口

```jsx
// FilterBar.jsx 在视图切换按钮旁增加
<button
  onClick={() => setShowFocusMode(true)}
  className={`px-3 py-1.5 rounded text-sm ${focusModeActive ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}
>
  👁 专注
</button>
```

### 4.2 App.jsx 新增 state

```javascript
const [focusMode, setFocusMode] = useState({ projectId: null, status: null });
const [showFocusMode, setShowFocusMode] = useState(false);
```

### 4.3 专注模式弹窗/下拉

```jsx
// 在 FilterBar 或 App 中渲染
{showFocusMode && (
  <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 z-50 w-64">
    <div className="mb-3">
      <label className="text-xs text-gray-500 mb-1 block">按项目专注</label>
      <select
        value={focusMode.projectId || ''}
        onChange={(e) => setFocusMode(f => ({ ...f, projectId: e.target.value || null }))}
        className="w-full text-sm border rounded px-2 py-1"
      >
        <option value="">全部项目</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
    <div className="mb-3">
      <label className="text-xs text-gray-500 mb-1 block">按状态专注</label>
      <select
        value={focusMode.status || ''}
        onChange={(e) => setFocusMode(f => ({ ...f, status: e.target.value || null }))}
        className="w-full text-sm border rounded px-2 py-1"
      >
        <option value="">全部状态</option>
        <option value="active">待办</option>
        <option value="in_dev">进行中</option>
        <option value="archived">已完成</option>
      </select>
    </div>
    <div className="flex justify-between">
      <button onClick={() => { setFocusMode({ projectId: null, status: null }); setShowFocusMode(false); }}
        className="text-xs text-gray-400">清除</button>
      <button onClick={() => setShowFocusMode(false)} className="text-xs bg-blue-500 text-white px-3 py-1 rounded">确定</button>
    </div>
  </div>
)}
```

### 4.4 专注标签显示

```jsx
// Header 或 FilterBar 中，专注模式激活时显示
{focusMode.projectId || focusMode.status ? (
  <div className="flex items-center gap-1 text-xs text-purple-600">
    <span>👁</span>
    <span>{projects.find(p => p.id === focusMode.projectId)?.name || ''}</span>
    <span>{focusMode.status === 'active' ? '待办' : focusMode.status === 'in_dev' ? '进行中' : focusMode.status === 'archived' ? '已完成' : ''}</span>
    <button onClick={() => setFocusMode({ projectId: null, status: null })} className="ml-1 text-gray-400">×</button>
  </div>
) : null}
```

### 4.5 专注模式数据过滤

泳道视图接收 `filteredProjects` 时，追加专注过滤：

```javascript
// App.jsx 中计算传给 KanbanSwimlanes 的数据
const focusFiltered = useMemo(() => {
  if (!focusMode.projectId && !focusMode.status) return filteredProjects;
  return filteredProjects.map(project => ({
    ...project,
    proposals: project.proposals.filter(p =>
      (!focusMode.projectId || p.projectId === focusMode.projectId) &&
      (!focusMode.status || p.status === focusMode.status)
    )
  })).filter(p => p.proposals.length > 0);
}, [filteredProjects, focusMode]);
```

---

## 5. M4: 列宽拖拽

### 5.1 KanbanColumn.jsx 修改

```javascript
const COL_WIDTH_KEY = 'kanban_column_widths';

// 初始化列宽
const [colWidths, setColWidths] = useState(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(COL_WIDTH_KEY) || '{}');
    return { active: saved.active || 250, in_dev: saved.in_dev || 250, archived: saved.archived || 250 };
  } catch { return { active: 250, in_dev: 250, archived: 250 }; }
});

// 拖拽处理
const handleDragStart = (e) => {
  e.preventDefault();
  const startX = e.clientX;
  const colId = column.id;  // 'active' | 'in_dev' | 'archived'
  const startWidth = colWidths[colId];

  const handleDrag = (moveEvent) => {
    const diff = moveEvent.clientX - startX;
    const newWidth = Math.max(150, Math.min(500, startWidth + diff));
    setColWidths(prev => ({ ...prev, [colId]: newWidth }));
  };

  const handleDragEnd = () => {
    // 保存到 localStorage
    const updated = { ...colWidths, [colId]: colWidths[colId] };
    localStorage.setItem(COL_WIDTH_KEY, JSON.stringify(updated));
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', handleDragEnd);
};
```

### 5.2 列宽拖拽手柄 UI

```jsx
// KanbanColumn.jsx 中，在列的右侧边缘添加拖拽手柄
<div
  className="absolute top-0 right-0 w-3 h-full cursor-col-resize hover:bg-blue-100/50"
  onMouseDown={handleDragStart}
>
  <div className="absolute top-1/2 right-0 w-1 h-4 bg-gray-300 rounded-full transform -translate-y-1/2" />
</div>
```

---

## 6. 实现顺序

1. M1 泳道列折叠：KanbanSwimlanes.jsx + SwimlaneRow.jsx
2. M2 泳道内筛选：SwimlaneRow.jsx
3. M3 专注模式：FilterBar.jsx + App.jsx
4. M4 列宽拖拽：KanbanColumn.jsx
5. Build 验证

---

## 7. 注意事项

- 泳道内筛选不与 URL 同步（避免污染全局筛选的 URL state）
- 折叠状态 localStorage key 与泳道整体折叠（`swimlanes_collapsed`）区分开
- 列宽拖拽使用原生 mousedown/mousemove/mouseup，不引入库
- 专注模式叠加在全局筛选之上（AND 关系）
