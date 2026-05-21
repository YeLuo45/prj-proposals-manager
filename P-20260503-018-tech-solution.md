# Technical Solution — P-20260503-018: prj-proposals-manager V3 — 甘特图视图

## 1. 技术栈

- **前端框架**：React 18 + Vite 5
- **现有依赖**：Zustand（状态管理）、react-router-dom（路由）
- **新增依赖**：无（自研实现）
- **持久化**：GitHub API（PUT milestones.json）

---

## 2. 组件结构

```
src/
├── components/
│   └── GanttChart/
│       ├── GanttChart.jsx       # 主组件（状态管理 + 布局）
│       ├── GanttHeader.jsx       # 时间轴 Header（日期标签）
│       ├── GanttRow.jsx          # 单行（一个项目的里程碑组）
│       ├── GanttBar.jsx          # 单个里程碑条形图（含拖拽）
│       ├── GanttTodayLine.jsx    # 今日红色竖线
│       └── GanttTooltip.jsx      # 悬停详情气泡
├── pages/
│   └── GanttView.jsx             # 甘特图页面（替代现有 KanbanBoard）
└── hooks/
    └── useGanttData.js           # 数据转换 hook
```

---

## 3. 甘特图渲染原理

### 3.1 时间轴计算
```
START_DATE     = 月初 - 7天
END_DATE       = 月末 + 7天
TOTAL_DAYS     = END_DATE - START_DATE
PIXELS_PER_DAY = CONTAINER_WIDTH / TOTAL_DAYS

bar.left  = (milestone.startDate - START_DATE) * PIXELS_PER_DAY
bar.width = (milestone.endDate - milestone.startDate) * PIXELS_PER_DAY
```

### 3.2 CSS Grid 布局
```css
.gantt-container {
  display: grid;
  grid-template-columns: 150px 1fr;  /* 左侧项目名 + 甘特图区域 */
  position: relative;
}
.gantt-timeline {
  display: grid;
  grid-template-columns: repeat(TOTAL_DAYS, 1fr);
}
```

---

## 4. 拖拽实现

### 4.1 三种拖拽模式
使用 `onMouseDown` + `onMouseMove` + `onMouseUp` 实现：

```javascript
// 拖拽左边缘：调整开始日期
// 拖拽右边缘：调整结束日期
// 拖拽中间：移动整条（保持时长不变）

function handleDragStart(e, milestone, mode) {
  e.preventDefault();
  const startX = e.clientX;
  const originalStart = milestone.startDate;
  const originalEnd = milestone.endDate;
  const duration = daysBetween(originalStart, originalEnd);

  function onMouseMove(e) {
    const deltaX = e.clientX - startX;
    const deltaDays = Math.round(deltaX / PIXELS_PER_DAY);

    if (mode === 'left') {
      updateMilestoneDate(milestone.id, {
        startDate: addDays(originalStart, deltaDays),
      });
    } else if (mode === 'right') {
      updateMilestoneDate(milestone.id, {
        endDate: addDays(originalEnd, deltaDays),
      });
    } else if (mode === 'move') {
      updateMilestoneDate(milestone.id, {
        startDate: addDays(originalStart, deltaDays),
        endDate: addDays(originalStart + duration, deltaDays),
      });
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    saveToGitHub(); // 释放后保存
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}
```

### 4.2 拖拽手柄
- 条形图左右各 8px 作为拖拽手柄（`cursor: ew-resize`）
- 中间区域 `cursor: grab`，拖拽时变为 `cursor: grabbing`

---

## 5. 数据模型

### 5.1 milestones.json 结构
```json
{
  "milestones": [
    {
      "id": "ms-001",
      "projectId": "PRJ-20260417-001",
      "name": "V3 甘特图上线",
      "startDate": "2026-05-01",
      "endDate": "2026-05-15",
      "status": "in_progress",
      "proposalIds": ["P-20260503-018"],
      "createdAt": "2026-05-03",
      "updatedAt": "2026-05-03"
    }
  ]
}
```

### 5.2 状态计算逻辑
```javascript
function getMilestoneStatus(milestone) {
  const today = new Date().toISOString().split('T')[0];
  if (milestone.status === 'completed') return 'completed';
  if (milestone.endDate < today) return 'overdue';
  if (milestone.startDate > today) return 'pending';
  return 'in_progress';
}
```

---

## 6. GitHub API 保存

### 6.1 复用现有 hook
扩展 `useGitHub.js` 添加 `saveMilestones()` 方法。

### 6.2 保存流程
```javascript
async function saveMilestones(milestones) {
  // 1. GET 获取当前 SHA
  // 2. PUT 更新内容（含新 SHA）
}
```

---

## 7. 视图切换

### 7.1 路由设计
```
/                  → KanbanBoard（看板视图）
/gantt             → GanttView（甘特图视图）
```

### 7.2 Header Tab 切换
```jsx
<nav>
  <Link to="/">看板</Link>
  <Link to="/gantt">甘特图</Link>
</nav>
```

---

## 8. 筛选功能

### 8.1 项目筛选
- 从 `milestones.json` 提取所有 `projectId` 去重
- Checkbox 多选
- 筛选条件：`visibleProjects.includes(milestone.projectId)`

### 8.2 状态筛选
- Checkbox：pending / in_progress / completed / overdue
- 筛选条件：`visibleStatuses.includes(status)`

---

## 9. 构建与部署

- `npm run build` 生成 `dist/`
- GitHub Actions 自动部署到 `gh-pages`
- 现有 `deploy.yml` 无需修改

---

*Technical Solution 版本：v1.0*
*创建日期：2026-05-03*
