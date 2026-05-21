# Technical Solution — P-20260503-019: prj-proposals-manager V3 — 数据统计仪表板

## 1. 技术栈

- **前端框架**：React 18 + Vite 5
- **现有依赖**：Zustand（状态管理）、react-router-dom（路由）
- **新增依赖**：`chart.js` + `react-chartjs-2`
- **持久化**：GitHub API（GET proposals.json，只读）

---

## 2. 组件结构

```
src/
├── components/
│   └── Dashboard/
│       ├── Dashboard.jsx         # 主组件（布局 + 状态管理）
│       ├── MetricCard.jsx        # 单个指标卡
│       ├── TrendChart.jsx        # 折线图（提案趋势）
│       ├── ProgressChart.jsx     # 环形图（项目进度）
│       ├── MilestoneProgress.jsx  # 里程碑完成率进度条
│       └── ActivityTimeline.jsx   # 最近活动时间线
├── pages/
│   └── DashboardView.jsx        # 统计页面
└── hooks/
    └── useStatsData.js           # 数据聚合 hook（useMemo）
```

---

## 3. 指标卡实现

### 3.1 四个指标
```javascript
function useStatsData(proposals) {
  const total = proposals.length;

  const thisMonth = proposals.filter(p => {
    const created = new Date(p.createdAt);
    const now = new Date();
    return created.getFullYear() === now.getFullYear() &&
           created.getMonth() === now.getMonth();
  }).length;

  const inProgress = proposals.filter(p => p.status === 'in_dev').length;

  const completed = proposals.filter(p =>
    p.status === 'accepted' || p.status === 'delivered'
  ).length;

  return { total, thisMonth, inProgress, completed };
}
```

### 3.2 MetricCard 组件
```jsx
<div className="metric-card">
  <div className="metric-label">{label}</div>
  <div className="metric-value">{value}</div>
  <div className="metric-change">{change}</div>
</div>
```

---

## 4. 折线图（提案趋势）

### 4.1 Chart.js 配置
```javascript
// 最近 6 个月数据
const labels = getLast6Months(); // ['2025-12', '2026-01', ...]

const createdData = labels.map(month =>
  proposals.filter(p => p.createdAt.startsWith(month)).length
);

const completedData = labels.map(month =>
  proposals.filter(p => p.updatedAt?.startsWith(month) && isCompleted(p)).length
);

<Line data={{
  labels,
  datasets: [
    { label: '新增', data: createdData, borderColor: '#3b82f6' },
    { label: '完成', data: completedData, borderColor: '#22c55e' },
  ]
}} />
```

---

## 5. 环形图（项目进度）

### 5.1 数据聚合
```javascript
// 按项目分组，计算各状态数量
function getProjectStatusData(projects, proposals) {
  return projects.map(project => {
    const projectProposals = proposals.filter(p => p.projectId === project.id);
    const counts = {
      active: projectProposals.filter(p => p.status === 'active').length,
      in_dev: projectProposals.filter(p => p.status === 'in_dev').length,
      archived: projectProposals.filter(p => p.status === 'archived').length,
    };
    return { projectName: project.name, ...counts };
  });
}
```

### 5.2 环形图配置
```jsx
<Doughnut data={{
  labels: ['Active', 'In Dev', 'Archived'],
  datasets: [{
    data: [counts.active, counts.in_dev, counts.archived],
    backgroundColor: ['#22c55e', '#3b82f6', '#94a3b8'],
  }]
}} />
```

---

## 6. 里程碑完成率

### 6.1 数据结构
```typescript
interface Milestone {
  id: string
  projectId: string
  name: string
  startDate: string
  endDate: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
}
```

### 6.2 计算逻辑
```javascript
function getMilestoneCompletion(milestones) {
  const byProject = {};
  milestones.forEach(ms => {
    if (!byProject[ms.projectId]) {
      byProject[ms.projectId] = { total: 0, completed: 0 };
    }
    byProject[ms.projectId].total++;
    if (ms.status === 'completed') {
      byProject[ms.projectId].completed++;
    }
  });

  return Object.entries(byProject).map(([projectId, data]) => ({
    projectId,
    completionRate: data.total > 0
      ? Math.round((data.completed / data.total) * 100)
      : 0,
  }));
}
```

---

## 7. 最近活动时间线

### 7.1 数据提取
```javascript
function getRecentActivity(proposals, limit = 10) {
  return proposals
    .map(p => ({
      id: p.id,
      name: p.name,
      type: 'proposal',
      action: 'updated',
      date: p.updatedAt,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}
```

### 7.2 时间格式化
```javascript
function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return dateStr;
}
```

---

## 8. 路由设计

### 8.1 Tab 导航
```
/dashboard → DashboardView（统计）
/gantt     → GanttView（甘特图）
/          → KanbanBoard（看板）
```

### 8.2 Header 导航
```jsx
<nav>
  <Link to="/">看板</Link>
  <Link to="/gantt">甘特图</Link>
  <Link to="/dashboard">统计</Link>
</nav>
```

---

## 9. 安装 Chart.js

```bash
npm install chart.js react-chartjs-2
```

---

## 10. 构建与部署

- `npm run build` 生成 `dist/`
- GitHub Actions 自动部署到 `gh-pages`
- 现有 `deploy.yml` 无需修改

---

*Technical Solution 版本：v1.0*
*创建日期：2026-05-03*
