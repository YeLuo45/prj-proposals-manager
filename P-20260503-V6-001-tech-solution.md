# Tech Solution — P-20260503-V6-001: prj-proposals-manager V6 — 导入导出

---

## 1. 文件结构

```
src/
  utils/
    csvExporter.js       # proposals → CSV 字符串
    csvImporter.js       # CSV 字符串 → proposals 对象 + 校验
    jsonBackup.js        # JSON 导出/恢复逻辑
  components/
    ImportExportPanel.jsx   # 设置页导入导出面板（主入口）
    CsvPreviewTable.jsx    # CSV 导入预览表格
    ImportResultModal.jsx  # 导入结果报告（成功/失败）
```

---

## 2. csvExporter.js

```javascript
/**
 * 将 projects 数据导出为 CSV 字符串
 * @param {object[]} projects - projects 数组
 * @returns {string} CSV 格式字符串
 */
export function exportProjectsToCSV(projects) {
  const headers = [
    'id', 'name', 'description', 'type', 'status',
    'projectId', 'projectName',
    'tags', 'milestoneId', 'milestoneName',
    'url', 'gitRepo',
    'createdAt', 'updatedAt'
  ];

  const rows = [];
  projects.forEach(project => {
    project.proposals?.forEach(proposal => {
      const tags = Array.isArray(proposal.tags) ? proposal.tags.join(',') : (proposal.tags || '');
      const milestone = project.milestones?.find(m => m.id === proposal.milestoneId);
      rows.push([
        proposal.id,
        proposal.name,
        `"${(proposal.description || '').replace(/"/g, '""')}"`,  // CSV escaping
        proposal.type,
        proposal.status,
        project.id,
        `"${project.name.replace(/"/g, '""')}"`,
        `"${tags.replace(/"/g, '""')}"`,
        proposal.milestoneId || '',
        milestone ? `"${milestone.name.replace(/"/g, '""')}"` : '',
        proposal.url || '',
        proposal.gitRepo || '',
        proposal.createdAt || '',
        proposal.updatedAt || ''
      ].join(','));
    });
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * 触发浏览器下载文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME 类型
 */
export function downloadFile(content, filename, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

---

## 3. csvImporter.js

```javascript
/**
 * 解析 CSV 文本为对象数组（无外部依赖）
 * @param {string} text - CSV 原始文本
 * @returns {{ headers: string[], rows: object[] }}
 */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  // 简单 CSV 解析（处理带引号的字段）
  const headers = parseCSVLine(lines[0]);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(obj);
  }
  return { headers, rows };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * 校验 CSV 行数据
 * @param {object[]} rows - 解析后的行对象
 * @param {object[]} existingProjects - 当前 projects（用于检测重复 ID）
 * @returns {{ errors: string[], validRows: object[], existingIds: Set<string>, newIds: string[] }}
 */
export function validateCSVImport(rows, existingProjects) {
  const errors = [];
  const validRows = [];
  const existingIds = new Set();

  // 收集所有已有提案 ID
  const allProposalIds = new Set();
  existingProjects.forEach(p => {
    p.proposals?.forEach(proposal => allProposalIds.add(proposal.id));
  });

  rows.forEach((row, idx) => {
    const lineNum = idx + 2;  // +2 because of header row and 0-index

    // 必填字段
    if (!row.id) errors.push(`第 ${lineNum} 行：缺少 id`);
    if (!row.name) errors.push(`第 ${lineNum} 行：缺少 name`);
    if (!row.status) errors.push(`第 ${lineNum} 行：缺少 status`);
    if (!row.type) errors.push(`第 ${lineNum} 行：缺少 type`);

    if (errors.length === 0 || errors[errors.length - 1].startsWith(`第 ${lineNum}`)) {
      // 枚举校验
      if (row.status && !['active', 'in_dev', 'archived'].includes(row.status)) {
        errors.push(`第 ${lineNum} 行：status 值无效「${row.status}」`);
      }
      if (row.type && !['web', 'app', 'package'].includes(row.type)) {
        errors.push(`第 ${lineNum} 行：type 值无效「${row.type}」`);
      }
    }

    if (errors.filter(e => e.startsWith(`第 ${lineNum}`)).length === 0) {
      // 解析 tags（逗号分隔）
      const tags = row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const proposal = {
        id: row.id,
        name: row.name,
        description: row.description || '',
        type: row.type,
        status: row.status,
        projectId: row.projectId || '',
        tags,
        milestoneId: row.milestoneId || null,
        url: row.url || '',
        gitRepo: row.gitRepo || '',
        createdAt: row.createdAt || new Date().toISOString().split('T')[0],
        updatedAt: row.updatedAt || new Date().toISOString().split('T')[0]
      };
      validRows.push(proposal);

      if (allProposalIds.has(row.id)) {
        existingIds.add(row.id);
      }
    }
  });

  const newIds = validRows.filter(r => !existingIds.has(r.id)).map(r => r.id);

  return { errors, validRows, existingIds: Array.from(existingIds), newIds };
}

/**
 * 执行 CSV 导入
 * @param {object[]} validRows - 校验通过的提案
 * @param {object[]} existingProjects - 当前 projects
 * @param {'skip' | 'overwrite' | 'new_only'} mode - 导入模式
 * @returns {{ projects: object[], imported: number, skipped: number, updated: number }}
 */
export function executeCSVImport(validRows, existingProjects, mode = 'skip') {
  let imported = 0, skipped = 0, updated = 0;

  const projectsMap = new Map(existingProjects.map(p => [p.id, { ...p, proposals: [...(p.proposals || [])] }]));

  validRows.forEach(proposal => {
    const project = projectsMap.get(proposal.projectId);
    if (!project) {
      // project 不存在则跳过（不自动创建项目）
      skipped++;
      return;
    }

    const existingIdx = project.proposals.findIndex(p => p.id === proposal.id);

    if (existingIdx !== -1) {
      if (mode === 'skip') {
        skipped++;
      } else if (mode === 'overwrite') {
        project.proposals[existingIdx] = { ...proposal, updatedAt: new Date().toISOString().split('T')[0] };
        updated++;
      } else if (mode === 'new_only') {
        // 生成新 ID
        proposal.id = generateNewId();
        project.proposals.push({ ...proposal, createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0] });
        imported++;
      }
    } else {
      project.proposals.push({ ...proposal, createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0] });
      imported++;
    }
  });

  return {
    projects: Array.from(projectsMap.values()),
    imported,
    skipped,
    updated
  };
}

function generateNewId() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `P-${dateStr}-${seq}`;
}
```

---

## 4. jsonBackup.js

```javascript
/**
 * 生成 JSON 备份
 * @param {object[]} projects
 * @param {object[]} milestones
 * @returns {object}
 */
export function generateBackup(projects, milestones) {
  const allProposals = projects.flatMap(p => p.proposals || []);
  return {
    version: 3,
    projects,
    backupAt: new Date().toISOString(),
    recordCount: {
      projects: projects.length,
      proposals: allProposals.length,
      milestones: milestones.length
    }
  };
}

/**
 * 从备份文件恢复
 * @param {object} backupData - 解析后的 JSON 备份
 * @returns {{ projects: object[], error?: string }}
 */
export function restoreFromBackup(backupData) {
  if (!backupData.version) {
    return { projects: [], error: '无效的备份文件：缺少 version 字段' };
  }
  if (!Array.isArray(backupData.projects)) {
    return { projects: [], error: '无效的备份文件：projects 必须是数组' };
  }
  return { projects: backupData.projects };
}

/**
 * 下载 JSON 备份文件
 * @param {object[]} projects
 * @param {object[]} milestones
 */
export function downloadJSONBackup(projects, milestones) {
  const backup = generateBackup(projects, milestones);
  const filename = `proposals-backup-${new Date().toISOString().split('T')[0]}.json`;
  const content = JSON.stringify(backup, null, 2);
  downloadFile(content, filename, 'application/json');
}
```

---

## 5. ImportExportPanel.jsx（主面板）

```jsx
// 放在设置页或 Header 更多菜单中
function ImportExportPanel({ projects, milestones, onImport, onRestore }) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const handleExportCSV = () => {
    const csv = exportProjectsToCSV(projects);
    downloadFile(csv, `proposals-${Date.now()}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    downloadJSONBackup(projects, milestones);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      <h3 className="text-lg font-semibold mb-4">导入 / 导出</h3>

      <div className="space-y-3">
        {/* CSV Export */}
        <button onClick={handleExportCSV} className="w-full btn-primary">
          导出 CSV
        </button>

        {/* JSON Backup */}
        <button onClick={handleExportJSON} className="w-full btn-secondary">
          导出 JSON 备份
        </button>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* CSV Import */}
        <button onClick={() => setShowImportModal(true)} className="w-full btn-secondary">
          导入 CSV
        </button>

        {/* JSON Restore */}
        <button onClick={() => setShowRestoreModal(true)} className="w-full btn-warning">
          从备份恢复
        </button>
      </div>
    </div>
  );
}
```

---

## 6. App.jsx 集成点

**新增状态**：
```javascript
const [importMode, setImportMode] = useState('skip'); // 'skip' | 'overwrite' | 'new_only'
const [parsedCSV, setParsedCSV] = useState(null);
const [showImportPreview, setShowImportPreview] = useState(false);
```

**新增处理函数**：
```javascript
const handleCSVExport = () => {
  const csv = exportProjectsToCSV(projects);
  downloadFile(csv, `proposals-${Date.now()}.csv`, 'text/csv');
};

const handleJSONExport = () => {
  downloadJSONBackup(projects, milestones);
};

const handleCSVFileSelect = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const { rows } = parseCSV(e.target.result);
    const result = validateCSVImport(rows, projects);
    setParsedCSV({ rows, ...result });
    setShowImportPreview(true);
  };
  reader.readAsText(file);
};

const handleCSVImportConfirm = async () => {
  const { projects: updated } = executeCSVImport(parsedCSV.validRows, projects, importMode);
  setProjects(updated);
  setFlatProposals(flattenProposals(updated));
  await saveProposals(updated);
  setShowImportPreview(false);
  setParsedCSV(null);
};

const handleJSONRestore = async (file) => {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = JSON.parse(e.target.result);
    const { projects: restored, error } = restoreFromBackup(data);
    if (error) { alert(error); return; }
    // 自动备份当前数据
    await handleJSONExport();
    setProjects(restored);
    setFlatProposals(flattenProposals(restored));
    await saveProposals(restored);
  };
  reader.readAsText(file);
};
```

---

## 7. 导入选项

| 模式 | 说明 |
|------|------|
| `skip`（默认） | 跳过已存在的提案 |
| `overwrite` | 用 CSV 数据覆盖已存在的提案 |
| `new_only` | 已存在的提案分配新 ID |

---

## 8. 实现顺序

1. `csvExporter.js` + `csvImporter.js` + `jsonBackup.js`（纯函数）
2. `ImportExportPanel.jsx`（主面板，放在设置页）
3. `CsvPreviewTable.jsx` + `ImportResultModal.jsx`（预览 + 结果）
4. App.jsx 集成（导入/导出函数 + 文件选择器）
5. Build 验证

---

## 9. 注意事项

- CSV 解析用原生 JS，不引入 papaparse
- 导入大文件时直接 readAsText（文件通常 < 1MB，足够快）
- JSON 恢复前自动触发一次 JSON 导出（防止误覆盖）
- 导入 CSV 不自动创建新项目（如果 projectId 对应项目不存在则跳过）
