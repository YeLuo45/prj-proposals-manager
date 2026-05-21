# Tech Solution — P-20260503-V5-001: prj-proposals-manager V5 — 数据校验与操作历史

---

## 1. 文件结构

```
src/
  utils/
    dataValidator.js       # 提案 Schema 校验
    operationHistory.js     # 操作历史 CRUD（localStorage）
    dataIntegrity.js        # 完整性检查
  hooks/
    useOperationHistory.js  # 操作历史 React hook
    useDataValidator.js     # 校验 hook
  components/
    DataHealthIndicator.jsx    # Header 右侧健康指示器
    OperationHistoryDrawer.jsx  # 操作历史侧边抽屉
    ValidationAlert.jsx        # 校验失败警告条
    UndoToast.jsx             # 临时撤销提示（3秒）
```

---

## 2. 核心函数签名

### dataValidator.js

```javascript
/**
 * 校验单个提案
 * @param {object} proposal - 提案对象
 * @param {object[]} projects - 所有项目（用于 projectId 引用校验）
 * @param {object[]} milestones - 所有里程碑（用于 milestoneId 引用校验）
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProposal(proposal, projects, milestones) {
  const errors = [];

  // id 格式校验
  if (!proposal.id || !/^P-\d{8}-\d{3}$/.test(proposal.id)) {
    errors.push(`ID 格式错误：${proposal.id}，期望 P-YYYYMMDD-XXX`);
  }

  // name 必填
  if (!proposal.name || typeof proposal.name !== 'string' || proposal.name.trim() === '') {
    errors.push('name 必填');
  } else if (proposal.name.length > 100) {
    errors.push('name 不能超过 100 字符');
  }

  // status 枚举
  if (!['active', 'in_dev', 'archived'].includes(proposal.status)) {
    errors.push(`status 枚举值错误：${proposal.status}`);
  }

  // type 枚举
  if (!['web', 'app', 'package'].includes(proposal.type)) {
    errors.push(`type 枚举值错误：${proposal.type}`);
  }

  // tags 数组校验
  if (proposal.tags) {
    if (!Array.isArray(proposal.tags)) {
      errors.push('tags 必须是数组');
    } else if (proposal.tags.some(t => typeof t !== 'string' || t.length > 30)) {
      errors.push('tags 每项最大 30 字符');
    }
  }

  // 日期格式
  if (!/^\d{4}-\d{2}-\d{2}$/.test(proposal.createdAt)) {
    errors.push(`createdAt 格式错误：${proposal.createdAt}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(proposal.updatedAt)) {
    errors.push(`updatedAt 格式错误：${proposal.updatedAt}`);
  }

  // URL 格式
  if (proposal.url && proposal.url !== '' && !/^https?:\/\/.+/.test(proposal.url)) {
    errors.push(`url 格式错误：${proposal.url}`);
  }
  if (proposal.gitRepo && proposal.gitRepo !== '' && !/^https?:\/\/.+/.test(proposal.gitRepo)) {
    errors.push(`gitRepo 格式错误：${proposal.gitRepo}`);
  }

  // milestoneId 引用校验
  if (proposal.milestoneId) {
    const exists = milestones.some(m => m.id === proposal.milestoneId);
    if (!exists) {
      errors.push(`milestoneId 不存在：${proposal.milestoneId}`);
    }
  }

  // projectId 引用校验
  if (proposal.projectId) {
    const exists = projects.some(p => p.id === proposal.projectId);
    if (!exists) {
      errors.push(`projectId 不存在：${proposal.projectId}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 校验所有项目中的提案
 * @returns {{ valid: boolean, errors: ProposalError[], warnings: string[] }}
 */
export function validateProjects(projects, milestones) {
  const errors = [];
  const warnings = [];
  const seenIds = new Map();

  projects.forEach(project => {
    project.proposals?.forEach(proposal => {
      // 重复 ID 检测
      if (seenIds.has(proposal.id)) {
        errors.push({ proposalId: proposal.id, field: 'id', message: `ID 重复：${proposal.id}，出现在项目 ${seenIds.get(proposal.id)} 和 ${project.id}` });
      } else {
        seenIds.set(proposal.id, project.id);
      }

      // 单条校验
      const result = validateProposal(proposal, projects, milestones);
      if (!result.valid) {
        result.errors.forEach(err => errors.push({ proposalId: proposal.id, message: err }));
      }

      // 过期 active 警告
      if (proposal.status === 'active') {
        const updated = new Date(proposal.updatedAt);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (updated < oneYearAgo) {
          warnings.push({ proposalId: proposal.id, message: `提案超过一年未更新，建议归档` });
        }
      }
    });
  });

  return { valid: errors.length === 0, errors, warnings };
}
```

### operationHistory.js

```javascript
const HISTORY_KEY = 'proposals_history';
const MAX_HISTORY = 100;

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function pushHistory(record) {
  const history = getHistory();
  history.unshift({ ...record, id: `hist_${Date.now()}`, undone: false });
  if (history.length > MAX_HISTORY) {
    history.splice(MAX_HISTORY);
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function updateHistoryRecord(recordId, updates) {
  const history = getHistory();
  const idx = history.findIndex(r => r.id === recordId);
  if (idx !== -1) {
    history[idx] = { ...history[idx], ...updates };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
```

### dataIntegrity.js

```javascript
export function checkIntegrity(projects, milestones) {
  const issues = {
    orphanProposals: [],    // projectId 不存在
    invalidMilestones: [],   // milestoneId 不存在
    duplicateIds: [],        // 重复 ID
    expiredActive: [],       // 过期 active
  };

  const projectIds = new Set(projects.map(p => p.id));
  const milestoneIds = new Set(milestones.map(m => m.id));
  const seenIds = new Map();

  projects.forEach(project => {
    project.proposals?.forEach(proposal => {
      if (!projectIds.has(proposal.projectId)) {
        issues.orphanProposals.push(proposal.id);
      }
      if (proposal.milestoneId && !milestoneIds.has(proposal.milestoneId)) {
        issues.invalidMilestones.push(proposal.id);
      }
      if (seenIds.has(proposal.id)) {
        issues.duplicateIds.push(proposal.id);
      } else {
        seenIds.set(proposal.id, project.id);
      }
      if (proposal.status === 'active') {
        const updated = new Date(proposal.updatedAt);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (updated < oneYearAgo) {
          issues.expiredActive.push(proposal.id);
        }
      }
    });
  });

  return issues;
}
```

---

## 3. App.jsx 集成点

### 3.1 校验调用时机

**加载后校验**（useEffect after fetchProposals）：
```javascript
useEffect(() => {
  if (projects.length > 0) {
    const { errors, warnings } = validateProjects(projects, milestones);
    if (errors.length > 0) setValidationErrors(errors);
    if (warnings.length > 0) setValidationWarnings(warnings);
  }
}, [projects, milestones]);
```

**保存前校验**（handleSave / handleBatch* 开头）：
```javascript
const handleSave = async (updatedProjects) => {
  const { errors } = validateProjects(updatedProjects, milestones);
  if (errors.length > 0) {
    setValidationErrors(errors);
    // 阻止保存，除非强制
    if (!forceSave) return;
  }
  await saveProposals(updatedProjects);
};
```

### 3.2 操作历史记录

每个 handle* 函数中，操作成功后 pushHistory：
```javascript
// 例：handleUpdateProposal 中
await saveProposals(updatedProjects);
pushHistory({
  timestamp: new Date().toISOString(),
  action: 'update',
  target: 'proposal',
  targetId: proposal.id,
  description: `将 ${proposal.name} 状态改为 ${newStatus}`,
  before: originalProposal,
  after: updatedProposal,
});
```

批量操作记录：
```javascript
pushHistory({
  timestamp: new Date().toISOString(),
  action: 'batch_update',
  target: 'proposal',
  targetId: `${selectedIds.size} 个提案`,
  description: `批量修改 ${selectedIds.size} 个提案状态为 ${newStatus}`,
  before: selectedProposals,
  after: updatedSelectedProposals,
});
```

### 3.3 撤销逻辑

```javascript
const handleUndo = useCallback(async () => {
  const history = getHistory();
  const lastRecord = history.find(r => !r.undone);
  if (!lastRecord) return;

  if (lastRecord.action === 'create') {
    // 撤销创建 = 删除
    const updated = projects.map(p => ({
      ...p,
      proposals: p.proposals.filter(proposal => proposal.id !== lastRecord.targetId)
    }));
    await saveProposals(updated);
  } else if (lastRecord.action === 'update' || lastRecord.action === 'batch_update') {
    // 撤销修改 = 恢复 before
    const updated = projects.map(p => ({
      ...p,
      proposals: p.proposals.map(proposal =>
        proposal.id === lastRecord.targetId ? lastRecord.before : proposal
      )
    }));
    await saveProposals(updated);
  } else if (lastRecord.action === 'delete' || lastRecord.action === 'batch_delete') {
    // 撤销删除 = 恢复 after
    // ... 需要追踪被删提案
  }

  updateHistoryRecord(lastRecord.id, { undone: true });
  setShowUndoToast(false);
}, [projects, milestones]);
```

### 3.4 Ctrl+Z 监听

```javascript
useEffect(() => {
  const handler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [handleUndo]);
```

### 3.5 UndoToast 临时提示

操作完成后 3 秒内显示撤销提示：
```javascript
const [showUndoToast, setShowUndoToast] = useState(false);

useEffect(() => {
  if (showUndoToast) {
    const timer = setTimeout(() => setShowUndoToast(false), 3000);
    return () => clearTimeout(timer);
  }
}, [showUndoToast]);
```

---

## 4. localStorage Schema

```javascript
// key: 'proposals_history'
[
  {
    id: 'hist_1746283200000',
    timestamp: '2026-05-03T12:00:00.000Z',
    action: 'update',           // 'create' | 'update' | 'delete' | 'batch_update' | 'batch_delete'
    target: 'proposal',         // 'proposal' | 'project' | 'milestone'
    targetId: 'P-20260503-001',
    description: '将 P-20260503-001 状态改为已完成',
    before: { status: 'active', ... },
    after: { status: 'archived', ... },
    undone: false
  }
]
```

---

## 5. 健康指示器状态

| 状态 | 条件 | 颜色 | 图标 |
|------|------|------|------|
| 健康 | errors.length === 0 | green | ✓ |
| 警告 | errors.length > 0 但 < 5 | yellow | ⚠ |
| 错误 | errors.length >= 5 | red | ✗ |

---

## 6. 实现顺序

1. `dataValidator.js` + `operationHistory.js` + `dataIntegrity.js`（纯函数，无依赖）
2. `useOperationHistory.js` + `useDataValidator.js`（React hook）
3. `ValidationAlert.jsx` + `DataHealthIndicator.jsx`（UI 组件）
4. `UndoToast.jsx`（撤销提示）
5. App.jsx 集成（校验时机、历史记录、撤销入口）
6. `OperationHistoryDrawer.jsx`（设置页 Tab）

---

## 7. 注意事项

- 校验不破坏现有 GitHub 数据格式（version 字段不变）
- history localStorage 最多 100 条，FIFO
- 校验失败可选择"强制保存"（不过渡阻断用户）
- 批量操作一次性 push 一条记录（不逐条 push）
- 撤销按钮在 UndoToast 3 秒内可用，超时消失但历史记录保留
