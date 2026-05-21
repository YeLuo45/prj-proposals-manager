# Technical Solution — P-20260503-P0-003: prj-proposals-manager V4 — 批量操作

- **Proposal ID**: `P-20260503-P0-003`
- **Parent PRD**: proposals/workspace-pm/proposals/P-20260503-P0-003-prd.md
- **Tech Stack**: React 18 + Vite 5 + Tailwind CSS（继承V3）
- **Last Update**: 2026-05-03

---

## 1. 文件结构

```
src/
  components/
    ProposalCard.jsx    # 修改：添加复选框
    BatchActionBar.jsx  # 新增：批量操作栏
    MilestoneSelectModal.jsx  # 新增：里程碑选择弹窗
  App.jsx              # 修改：selectedIds state + 批量操作逻辑
```

---

## 2. 多选机制

### 2.1 App.jsx 状态

```javascript
const [selectedIds, setSelectedIds] = useState(new Set());
const [batchActionAnchor, setBatchActionAnchor] = useState(null);
```

### 2.2 ProposalCard 复选框

```jsx
<div className="flex items-start gap-2">
  <input
    type="checkbox"
    checked={selectedIds.has(proposal.id)}
    onChange={(e) => {
      e.stopPropagation();
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(proposal.id)) next.delete(proposal.id);
        else next.add(proposal.id);
        return next;
      });
    }}
    className="mt-1"
  />
  {/* 现有卡片内容 */}
</div>
```

选中卡片背景色：
```jsx
<div className={`rounded-lg p-3 shadow-sm border ${
  selectedIds.has(proposal.id)
    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400'
    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
}`}>
```

---

## 3. 批量操作栏（BatchActionBar）

### 3.1 显示条件

`selectedIds.size > 0` 时渲染，显示在页面底部（fixed 定位）。

### 3.2 组件结构

```jsx
{selectedIds.size > 0 && (
  <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 p-4 shadow-lg z-50">
    <div className="container mx-auto flex items-center justify-between">
      <span className="text-gray-700 dark:text-gray-200">
        已选择 <strong>{selectedIds.size}</strong> 项
      </span>
      <div className="flex gap-2">
        <select onChange={(e) => handleBatchStatusChange(e.target.value)} ...>
          <option value="">批量移动到...</option>
          <option value="active">待办</option>
          <option value="in_dev">进行中</option>
          <option value="archived">已完成</option>
        </select>
        <button onClick={() => setShowMilestoneModal(true)}>关联里程碑</button>
        <button onClick={handleBatchDelete} className="bg-red-500 text-white">批量删除</button>
        <button onClick={() => setSelectedIds(new Set())}>取消选择</button>
      </div>
    </div>
  </div>
)}
```

---

## 4. 批量状态更新

```javascript
const handleBatchStatusChange = async (newStatus) => {
  if (!newStatus) return;
  const updatedProjects = projects.map(project => ({
    ...project,
    proposals: project.proposals.map(p =>
      selectedIds.has(p.id) ? { ...p, status: newStatus, updatedAt: today } : p
    )
  }));
  const updatedFlat = flatProposals.map(p =>
    selectedIds.has(p.id) ? { ...p, status: newStatus, updatedAt: today } : p
  );
  await saveProposals({ version: 3, projects: updatedProjects });
  setProjects(updatedProjects);
  setFlatProposals(updatedFlat);
  setSelectedIds(new Set());
};
```

---

## 5. 批量删除

```javascript
const handleBatchDelete = async () => {
  if (!confirm(`确定删除 ${selectedIds.size} 个提案？此操作不可恢复。`)) return;
  const updatedProjects = projects
    .map(project => ({
      ...project,
      proposals: project.proposals.filter(p => !selectedIds.has(p.id))
    }))
    .filter(project => project.proposals.length > 0);
  const updatedFlat = flatProposals.filter(p => !selectedIds.has(p.id));
  await saveProposals({ version: 3, projects: updatedProjects });
  setProjects(updatedProjects);
  setFlatProposals(updatedFlat);
  setSelectedIds(new Set());
};
```

---

## 6. 里程碑选择弹窗

从 `milestones.json` 加载里程碑列表，渲染为可搜索的下拉列表。

```jsx
const MilestoneSelectModal = ({ milestones, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const filtered = milestones.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
        <h3 className="text-lg font-bold mb-4">选择里程碑</h3>
        <input value={search} onChange={...} placeholder="搜索里程碑..." />
        <div className="max-h-60 overflow-y-auto mt-4">
          {filtered.map(m => (
            <button key={m.id} onClick={() => onSelect(m.id)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
              {m.name}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full bg-gray-200 p-2 rounded">取消</button>
      </div>
    </div>
  );
};
```
