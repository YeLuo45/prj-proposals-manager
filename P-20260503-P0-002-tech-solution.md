# Technical Solution — P-20260503-P0-002: prj-proposals-manager V4 — 全局搜索 + 高级筛选

- **Proposal ID**: `P-20260503-P0-002`
- **Parent PRD**: proposals/workspace-pm/proposals/P-20260503-P0-002-prd.md
- **Tech Stack**: React 18 + Vite 5 + Tailwind CSS + React Router（继承V3）
- **Last Update**: 2026-05-03

---

## 1. 文件结构

```
src/
  components/
    SearchBar.jsx         # 修改：添加历史记录下拉
    AdvancedFilter.jsx    # 新增：高级筛选面板
    FilterBar.jsx         # 修改：集成高级筛选按钮
    ProposalCard.jsx      # 修改：搜索高亮
  App.jsx                # 修改：filterState + URL sync
```

---

## 2. 搜索增强（SearchBar）

### 2.1 搜索范围扩展

```javascript
const matchesSearch =
  p.id.toLowerCase().includes(q) ||                          // 提案ID
  p.name.toLowerCase().includes(q) ||
  (p.description && p.description.toLowerCase().includes(q)) ||
  (p.tags && p.tags.some((tag) => tag.toLowerCase().includes(q))) ||
  (p.projectName && p.projectName.toLowerCase().includes(q)) ||
  (p.gitRepo && p.gitRepo.toLowerCase().includes(q)) ||       // GitHub仓库URL
  (p.url && p.url.toLowerCase().includes(q)) ||               // 部署URL
  (p.owner && p.owner.toLowerCase().includes(q));             // 负责人
```

### 2.2 搜索历史

本地存储 key: `proposal_search_history`（最多5条，JSON数组）。

---

## 3. 高级筛选面板（AdvancedFilter）

### 3.1 筛选状态结构

```javascript
const [advancedFilters, setAdvancedFilters] = useState({
  statuses: [],      // ['active', 'in_dev']
  types: [],         // ['web', 'app']
  tags: [],          // ['React', 'Vite']
  projectId: '',     // 项目ID
  dateFrom: '',     // 创建日期起
  dateTo: '',       // 创建日期止
});
```

### 3.2 URL 同步

```javascript
const [searchParams, setSearchParams] = useSearchParams();

useEffect(() => {
  const statuses = searchParams.get('status')?.split(',').filter(Boolean) || [];
  const types = searchParams.get('type')?.split(',').filter(Boolean) || [];
  // 同步到 advancedFilters state
}, [searchParams]);

const updateUrl = (filters) => {
  const params = new URLSearchParams();
  if (filters.statuses.length) params.set('status', filters.statuses.join(','));
  if (filters.types.length) params.set('type', filters.types.join(','));
  // ...
  setSearchParams(params);
};
```

---

## 4. 筛选逻辑（App.jsx filteredProposals）

```javascript
const filteredProposals = useMemo(() => {
  return flatProposals.filter((p) => {
    // 1. 搜索匹配（已扩展范围）
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch = !q || (
      p.id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      ...
    );

    // 2. 高级筛选
    const matchesStatus = advancedFilters.statuses.length === 0 ||
      advancedFilters.statuses.includes(p.status);
    const matchesType = advancedFilters.types.length === 0 ||
      advancedFilters.types.includes(p.type);
    const matchesTags = advancedFilters.tags.length === 0 ||
      advancedFilters.tags.some(t => p.tags?.includes(t));
    const matchesProject = !advancedFilters.projectId ||
      p.projectId === advancedFilters.projectId;
    const matchesDate = (!advancedFilters.dateFrom ||
      p.createdAt >= advancedFilters.dateFrom) &&
      (!advancedFilters.dateTo || p.createdAt <= advancedFilters.dateTo);

    return matchesSearch && matchesStatus && matchesType &&
           matchesTags && matchesProject && matchesDate;
  });
}, [flatProposals, searchQuery, advancedFilters]);
```

---

## 5. 搜索高亮（ProposalCard）

在卡片标题中用正则替换匹配文字，包裹 `<mark>` 标签：

```jsx
const highlightText = (text, query) => {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.split(regex).map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-yellow-200">{part}</mark> : part
  );
};
```
