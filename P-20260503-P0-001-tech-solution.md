# Technical Solution — P-20260503-P0-001: prj-proposals-manager V4 — 看板泳道（Swimlanes）

- **Proposal ID**: `P-20260503-P0-001`
- **Parent PRD**: proposals/workspace-pm/proposals/P-20260503-P0-001-prd.md
- **Tech Stack**: React 18 + Vite 5 + @dnd-kit + Tailwind CSS + React Router（继承V3）
- **Last Update**: 2026-05-03

---

## 1. 文件结构

```
src/
  pages/
    KanbanSwimlanes.jsx      # 新增：主泳道视图页面
  components/
    SwimlaneRow.jsx          # 新增：泳道行组件
    SwimlaneCard.jsx         # 新增：泳道内提案卡片
    Header.jsx               # 修改：添加看板Tab
  App.jsx                    # 修改：添加路由 /kanban
```

---

## 2. KanbanSwimlanes.jsx 实现

### 2.1 数据结构

从 proposals.json 加载后，构建泳道矩阵：

```javascript
// 按项目分组
const projects = data.projects || [];
const lanes = projects.map(project => ({
  project,
  columns: {
    todo: project.proposals.filter(p => p.status === 'active'),
    in_dev: project.proposals.filter(p => p.status === 'in_dev'),
    done: project.proposals.filter(p => p.status === 'archived' || p.status === 'completed')
  }
}));
```

### 2.2 拖拽实现

使用 @dnd-kit（同现有 KanbanBoard），拖拽时跨列移动会更新对应提案的 status 字段。

```javascript
const handleDragEnd = async (event, laneProjectId) => {
  const { active, over } = event;
  if (!over) return;
  // over.id 格式: `${laneProjectId}:${status}`
  const [targetProjectId, targetStatus] = over.id.split(':');
  // 更新 proposals 状态并保存
};
```

---

## 3. SwimlaneRow.jsx 实现

泳道行结构：
```
┌─ [项目名称] [折叠按钮] ────────────────────────────┐
│ ┌─待办─┐ ┌─进行中─┐ ┌─已完成─┐ │
│ │ card │ │ card │ │ card │ │
│ └─────┘ └───────┘ └───────┘ │
└─────────────────────────────────────────────────────┘
```

折叠状态用 `collapsedLaneIds` Set state 管理。

---

## 4. Header 修改

```jsx
<Link to="/kanban" className={`tab ${location.pathname === '/kanban' ? 'active' : ''}`}>
  看板
</Link>
```

---

## 5. App.jsx 路由

```jsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/project/:projectId" element={<ProjectPage />} />
  <Route path="/kanban" element={<KanbanSwimlanes />} />
  {/* 其他路由... */}
</Routes>
```

---

## 6. 状态保存

拖拽结束后调用 `saveProposals({ version: 3, projects: updatedProjects })`，与现有 App.jsx 模式一致。
