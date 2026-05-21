# Tech Solution — P-20260503-V9-001: prj-proposals-manager V9 — 高级筛选增强

---

## 1. 文件变更

```
src/components/FilterBar.jsx     # M1/M2/M3/M4: 筛选模板UI + 日期范围 + 标签AND/OR + 导出按钮
src/utils/filterTemplateStore.js  # M1: 模板 localStorage CRUD
src/hooks/useFilterTemplate.js    # M1: 模板 React hook
src/App.jsx                     # M2/M3: 日期范围过滤 + 标签AND/OR逻辑
```

---

## 2. M1: 筛选模板

### 2.1 filterTemplateStore.js（纯函数）

```javascript
const TEMPLATE_KEY = 'filter_templates';
const MAX_TEMPLATES = 10;

export const getTemplates = () => {
  try { return JSON.parse(localStorage.getItem(TEMPLATEATE_KEY) || '[]'); }
  catch { return []; }
};

export const saveTemplate = (name, filters) => {
  const templates = getTemplates();
  if (templates.length >= MAX_TEMPLATES) {
    return { error: '最多保存10个模板' };
  }
  if (templates.some(t => t.name === name)) {
    return { error: '模板名称已存在' };
  }
  const updated = [...templates, { id: Date.now().toString(), name, filters }];
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(updated));
  return { templates: updated };
};

export const deleteTemplate = (id) => {
  const templates = getTemplates().filter(t => t.id !== id);
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
  return { templates };
};
```

### 2.2 useFilterTemplate.js

```javascript
import { useState, useCallback } from 'react';
import { getTemplates, saveTemplate, deleteTemplate } from '../utils/filterTemplateStore';

export function useFilterTemplate() {
  const [templates, setTemplates] = useState(getTemplates);

  const save = useCallback((name, filters) => {
    const result = saveTemplate(name, filters);
    if (!result.error) setTemplates(result.templates);
    return result;
  }, []);

  const remove = useCallback((id) => {
    const result = deleteTemplate(id);
    setTemplates(result.templates);
  }, []);

  return { templates, save, remove };
}
```

### 2.3 FilterBar.jsx 模板 UI

```jsx
const { templates, save, remove } = useFilterTemplate();
const [showSaveModal, setShowSaveModal] = useState(false);
const [templateName, setTemplateName] = useState('');

const handleSaveTemplate = () => {
  const result = save(templateName, { query, status, type, projectId, tags, tagLogic, dateRange });
  if (result.error) { alert(result.error); return; }
  setShowSaveModal(false);
  setTemplateName('');
};

<select
  value={selectedTemplateId || ''}
  onChange={(e) => {
    const id = e.target.value;
    if (!id) { setSelectedTemplateId(null); return; }
    const t = templates.find(t => t.id === id);
    if (t) {
      setSelectedTemplateId(id);
      setFiltersFromTemplate(t.filters);
    }
  }}
  className="text-sm border rounded px-2 py-1"
>
  <option value="">当前筛选</option>
  {templates.map(t => (
    <option key={t.id} value={t.id}>{t.name}</option>
  ))}
</select>

<button onClick={() => setShowSaveModal(true)} className="text-xs text-blue-500 px-2">💾 保存</button>

{showSaveModal && (
  <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 shadow-lg rounded p-3 z-50">
    <input
      value={templateName}
      onChange={(e) => setTemplateName(e.target.value)}
      placeholder="模板名称"
      className="border rounded px-2 py-1 text-sm mb-2 w-40"
    />
    <div className="flex gap-2">
      <button onClick={handleSaveTemplate} className="text-xs bg-blue-500 text-white px-3 py-1 rounded">保存</button>
      <button onClick={() => setShowSaveModal(false)} className="text-xs text-gray-400">取消</button>
    </div>
  </div>
)}
```

---

## 3. M2: 日期范围筛选

### 3.1 App.jsx 新增 state

```javascript
const [dateRange, setDateRange] = useState({ field: 'createdAt', start: '', end: '' });
```

### 3.2 日期过滤 useMemo

```javascript
const dateFilteredProposals = useMemo(() => {
  if (!dateRange.start && !dateRange.end) return flatProposals;
  return flatProposals.filter(p => {
    const dateStr = p[dateRange.field];
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const start = dateRange.start ? new Date(dateRange.start) : null;
    const end = dateRange.end ? new Date(dateRange.end) : null;
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });
}, [flatProposals, dateRange]);
```

### 3.3 FilterBar 日期 UI

```jsx
<div className="flex items-center gap-2 text-xs">
  <select
    value={dateRange.field}
    onChange={(e) => setDateRange(f => ({ ...f, field: e.target.value }))}
    className="border rounded px-1 py-0.5"
  >
    <option value="createdAt">创建时间</option>
    <option value="updatedAt">更新时间</option>
  </select>
  <input
    type="date"
    value={dateRange.start}
    onChange={(e) => setDateRange(f => ({ ...f, start: e.target.value }))}
    className="border rounded px-1 py-0.5"
  />
  <span className="text-gray-400">至</span>
  <input
    type="date"
    value={dateRange.end}
    onChange={(e) => setDateRange(f => ({ ...f, end: e.target.value }))}
    className="border rounded px-1 py-0.5"
  />
  {/* 快捷按钮 */}
  <button onClick={() => setDateRangeQuick('7d')} className="text-blue-500">近7天</button>
  <button onClick={() => setDateRangeQuick('30d')} className="text-blue-500">近30天</button>
  <button onClick={() => setDateRangeQuick('month')} className="text-blue-500">本月</button>
  <button onClick={() => setDateRangeQuick('lastMonth')} className="text-blue-500">上月</button>
  {(dateRange.start || dateRange.end) && (
    <button onClick={() => setDateRange({ field: 'createdAt', start: '', end: '' })} className="text-gray-400">清除</button>
  )}
</div>
```

### 3.4 setDateRangeQuick 辅助函数

```javascript
const setDateRangeQuick = (preset) => {
  const now = new Date();
  const toDateStr = (d) => d.toISOString().split('T')[0];
  const start = new Date();
  if (preset === '7d') { start.setDate(now.getDate() - 7); setDateRange({ field: dateRange.field, start: toDateStr(start), end: toDateStr(now) }); }
  else if (preset === '30d') { start.setDate(now.getDate() - 30); setDateRange({ field: dateRange.field, start: toDateStr(start), end: toDateStr(now) }); }
  else if (preset === 'month') { start.setDate(1); setDateRange({ field: dateRange.field, start: toDateStr(start), end: toDateStr(now) }); }
  else if (preset === 'lastMonth') {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    setDateRange({ field: dateRange.field, start: toDateStr(last), end: toDateStr(lastEnd) });
  }
};
```

---

## 4. M3: 多标签 AND/OR 逻辑

### 4.1 App.jsx 新增 state

```javascript
const [tagLogic, setTagLogic] = useState('OR'); // 'AND' | 'OR'
```

### 4.2 标签过滤 useMemo（改造现有逻辑）

```javascript
const tagFiltered = useMemo(() => {
  if (!tags.length) return proposals;
  if (tagLogic === 'AND') {
    return proposals.filter(p => tags.every(tag => p.tags?.includes(tag)));
  } else {
    return proposals.filter(p => tags.some(tag => p.tags?.includes(tag)));
  }
}, [proposals, tags, tagLogic]);
```

### 4.3 FilterBar 标签 UI

```jsx
<div className="flex items-center gap-2 flex-wrap">
  {tags.map(tag => (
    <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs">
      {tag}
      <button onClick={() => setTags(ts => ts.filter(t => t !== tag))} className="text-blue-400 hover:text-blue-600">×</button>
    </span>
  ))}
  <select
    value={tagLogic}
    onChange={(e) => setTagLogic(e.target.value)}
    className="text-xs border rounded px-1 py-0.5"
  >
    <option value="OR">任意匹配</option>
    <option value="AND">全部匹配</option>
  </select>
</div>
```

---

## 5. M4: 筛选结果导出

### 5.1 FilterBar 结果计数 + 导出按钮

```jsx
<div className="flex items-center justify-between text-xs text-gray-500 mt-2">
  <span>当前筛选结果：{filteredCount} 条</span>
  <button
    onClick={handleExportFiltered}
    className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
  >
    📥 导出 CSV
  </button>
</div>
```

### 5.2 handleExportFiltered

```javascript
import { exportProjectsToCSV, downloadFile } from '../utils/csvExporter';

const handleExportFiltered = () => {
  // filteredProjects 是当前筛选后的数据
  const csv = exportProjectsToCSV(filteredProjects);
  downloadFile(csv, `filtered-proposals-${Date.now()}.csv`, 'text/csv');
};
```

---

## 6. 实现顺序

1. `filterTemplateStore.js` — 模板 localStorage CRUD
2. `useFilterTemplate.js` — React hook
3. `FilterBar.jsx` — 模板 UI（保存按钮 + 下拉选择 + 删除）
4. `App.jsx` — 日期范围 state + 过滤 useMemo
5. `FilterBar.jsx` — 日期范围 UI + 快捷按钮
6. `App.jsx` — 标签 AND/OR state + 过滤 useMemo
7. `FilterBar.jsx` — 标签 AND/OR UI
8. `FilterBar.jsx` — 结果计数 + 导出按钮
9. Build 验证

---

## 7. 注意事项

- 筛选模板存在 localStorage，不与 URL 或 GitHub 同步
- 模板保存时保存的是 filter state快照，不保存 filteredProjects 结果
- 日期范围使用 `YYYY-MM-DD` 格式，与 GitHub 数据格式一致
- 标签 AND/OR 切换不影响已有标签选择
- 导出的是当前筛选结果（已应用所有筛选条件后的数据）
