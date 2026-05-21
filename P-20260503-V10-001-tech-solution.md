# Tech Solution — P-20260503-V10-001: prj-proposals-manager V10 — AI 增强

---

## 1. 文件变更

```
src/utils/aiService.js           # M1/M2: MiniMax API 调用
src/utils/duplicateDetector.js    # M4: 纯前端重复检测
src/components/AISettings.jsx     # M1: 设置页 API Key 配置面板
src/components/ProposalForm.jsx   # M1/M2/M3: 表单 AI 集成
src/App.jsx                      # M1/M2/M4: AI 功能调用和状态管理
```

---

## 2. M1: aiService.js

```javascript
// src/utils/aiService.js
const API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

export async function classifyProposal(description, apiKey) {
  if (!apiKey || !description) return { type: 'web', tags: [] };

  const prompt = `分析以下提案描述，判断：
1. 项目类型（type）：web（网站）、app（移动应用）、package（工具/库）
2. 推荐标签（tags）：从以下列表中选择最相关的标签（最多3个）
可选标签：Web, React, Vue, Angular, Node.js, Python, Java, Go, Rust, Mobile, iOS, Android, API, Database, DevOps, AI, ML, Frontend, Backend, Fullstack, UI/UX, Security, Performance, Testing, CI/CD, Docker, Kubernetes, Cloud, SaaS, B2B, B2C, Consumer, Enterprise, Open Source

只返回 JSON 格式：{"type": "web", "tags": ["React", "Frontend"]}
描述：${description}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '{"type":"web","tags":[]}';
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch (err) {
    console.error('AI classify failed:', err);
    return { type: 'web', tags: [] };
  }
}

export async function generateSummary(description, apiKey) {
  if (!apiKey || description.length <= 50) return '';

  const prompt = `将以下提案描述压缩为一句话摘要（不超过 30 字）：
${description}
只返回摘要文字，不要解释。`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.error('AI summary failed:', err);
    return '';
  }
}

export function getAPIKey() {
  return localStorage.getItem('ai_api_key') || '';
}

export function setAPIKey(key) {
  localStorage.setItem('ai_api_key', key);
}
```

---

## 3. M4: duplicateDetector.js

```javascript
// src/utils/duplicateDetector.js

const STOP_WORDS = new Set([
  '的', '了', '和', '与', '或', '在', '是', '我', '你', '他', '这', '那',
  '个', '为', '以', '及', '等', '于', '上', '下', '中', '可', '能', '需要',
  '实现', '功能', '支持', '提供', '用户', '使用', '进行', '一个', '可以',
  '通过', '根据', '对于', '这些', '那些', '相关', '不同', '各种', '主要',
]);

function extractKeywords(text) {
  const words = text.match(/[\u4e00-\u9fa5a-zA-Z0-9]+/g) || [];
  return words.filter(w => w.length > 1 && !STOP_WORDS.has(w)).slice(0, 20);
}

function cosineSimilarity(a, b) {
  if (!a.length || !b.length) return 0;
  const set = new Set([...a, ...b]);
  const vec = (arr) => Array.from(set).map(w => arr.includes(w) ? 1 : 0);
  const v1 = vec(a), v2 = vec(b);
  const dot = v1.reduce((s, v, i) => s + v * v2[i], 0);
  const mag = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return dot / (mag(v1) * mag(v2));
}

export function findDuplicates(proposal, existingProposals, threshold = 0.6) {
  if (!proposal.description) return [];

  const keywords = extractKeywords(proposal.description);
  const results = [];

  existingProposals.forEach(existing => {
    if (existing.id === proposal.id) return;
    if (!existing.description) return;
    const existingKeywords = extractKeywords(existing.description);
    const sim = cosineSimilarity(keywords, existingKeywords);
    if (sim >= threshold) {
      results.push({
        proposal: existing,
        similarity: Math.round(sim * 100),
      });
    }
  });

  return results.sort((a, b) => b.similarity - a.similarity);
}
```

---

## 4. M1: AISettings.jsx

```jsx
// src/components/AISettings.jsx
import { useState } from 'react';
import { getAPIKey, setAPIKey } from '../utils/aiService';

export default function AISettings() {
  const [key, setKey] = useState(getAPIKey());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setAPIKey(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
      <h3 className="font-medium mb-2">🤖 AI 功能设置</h3>
      <p className="text-xs text-gray-500 mb-3">
        使用 MiniMax API Key 启用 AI 功能。Key 仅存储在本地浏览器，不会上传任何服务器。
      </p>
      <div className="flex gap-2 items-center">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="输入 MiniMax API Key"
          className="flex-1 border rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600"
        />
        <button
          onClick={handleSave}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded text-sm"
        >
          保存
        </button>
        {saved && <span className="text-xs text-green-500">✓ 已保存</span>}
        {key && !saved && <span className="text-xs text-green-500">✓ 已配置</span>}
      </div>
    </div>
  );
}
```

---

## 5. M1/M2/M3: ProposalForm AI 集成

### 5.1 App.jsx 新增 state

```javascript
const [aiRecommendations, setAiRecommendations] = useState({ type: null, tags: [] });
const [duplicateWarnings, setDuplicateWarnings] = useState([]);
const [aiSummary, setAiSummary] = useState('');
const apiKey = getAPIKey();
```

### 5.2 App.jsx 新增 handlers

```javascript
const handleAIClassify = async (description) => {
  if (!apiKey || !description) return;
  setLoadingAI(true);
  try {
    const result = await classifyProposal(description, apiKey);
    setAiRecommendations({ type: result.type, tags: result.tags || [] });
  } finally {
    setLoadingAI(false);
  }
};

const handleDuplicateCheck = (proposal) => {
  const dupes = findDuplicates(proposal, flatProposals);
  setDuplicateWarnings(dupes);
  return dupes;
};

const handleSave = async (updated) => {
  // 重复检测
  const dupes = handleDuplicateCheck(updated);
  if (dupes.length > 0) return; // 阻止保存，显示警告

  await saveProposals(updated);

  // AI 摘要（描述超过50字）
  if (updated.description?.length > 50 && apiKey) {
    setLoadingAI(true);
    try {
      const summary = await generateSummary(updated.description, apiKey);
      if (summary) {
        setAiSummary(summary);
        // 更新提案的 aiSummary 字段
        const updatedWithSummary = {
          ...updated,
          aiSummary: summary,
        };
        await saveProposals(updatedWithSummary);
      }
    } finally {
      setLoadingAI(false);
    }
  }
};
```

### 5.3 ProposalForm 修改（AI UI）

在描述输入框下方添加：

```jsx
{apiKey && (
  <div className="mt-2">
    <button
      onClick={() => handleAIClassify(description)}
      disabled={loadingAI || !description}
      className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
    >
      {loadingAI ? '🤖 分析中...' : '🤖 AI 推荐分类'}
    </button>
  </div>
)}

{aiRecommendations.type && (
  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
    <div className="flex items-center gap-2 mb-1">
      <span>推荐类型：</span>
      <button
        onClick={() => setFormData(f => ({ ...f, type: aiRecommendations.type }))}
        className="bg-blue-500 text-white px-2 py-0.5 rounded"
      >
        {aiRecommendations.type}
      </button>
      <span className="text-gray-400">（点击采纳）</span>
    </div>
    {aiRecommendations.tags.length > 0 && (
      <div className="flex items-center gap-2 flex-wrap">
        <span>推荐标签：</span>
        {aiRecommendations.tags.map(tag => (
          <button
            key={tag}
            onClick={() => setFormData(f => ({ ...f, tags: [...new Set([...f.tags, tag])] }))}
            className="bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200"
          >
            {tag}
          </button>
        ))}
      </div>
    )}
  </div>
)}

{duplicateWarnings.length > 0 && (
  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded text-xs">
    <div className="font-medium text-yellow-700 mb-2">⚠️ 检测到相似提案</div>
    {duplicateWarnings.slice(0, 3).map(d => (
      <div key={d.proposal.id} className="mb-1">
        <span className="font-mono">{d.proposal.id}</span>
        <span className="mx-1">"</span>
        <span>{d.proposal.name}</span>
        <span className="ml-1 text-yellow-600">（相似度 {d.similarity}%）</span>
      </div>
    ))}
    <div className="flex gap-2 mt-2">
      <button onClick={() => { setDuplicateWarnings([]); forceSave(); }}
        className="text-xs bg-yellow-500 text-white px-3 py-1 rounded">
        仍然保存
      </button>
      <button onClick={() => setDuplicateWarnings([])}
        className="text-xs text-gray-500">取消</button>
    </div>
  </div>
)}
```

---

## 6. 智能建议（M3）

基于项目历史统计：

```javascript
// ProposalForm 中，当选择项目时
const projectTagFreq = useMemo(() => {
  if (!selectedProjectId) return [];
  const project = projects.find(p => p.id === selectedProjectId);
  if (!project) return [];
  const freq = {};
  project.proposals?.forEach(p => {
    p.tags?.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
}, [selectedProjectId, projects]);
```

UI：
```jsx
{projectTagFreq.length > 0 && (
  <div className="mt-2 text-xs text-gray-500">
    <span>💡 基于项目历史推荐：</span>
    {projectTagFreq.map(tag => (
      <button key={tag} onClick={() => setFormData(f => ({ ...f, tags: [...new Set([...f.tags, tag])] }))}
        className="ml-1 text-blue-500 hover:underline">
        {tag}
      </button>
    ))}
  </div>
)}
```

---

## 7. 实现顺序

1. `aiService.js` — API 调用函数
2. `duplicateDetector.js` — 重复检测
3. `AISettings.jsx` — 设置面板
4. `App.jsx` — state + handlers 集成
5. `ProposalForm.jsx` — AI UI 集成（描述框下方）
6. Build 验证

---

## 8. 注意事项

- AI 功能完全可选，无 API Key 时降级显示「未配置」
- 重复检测纯前端，不依赖 API
- API 调用有 try-catch 包裹，失败不影响用户操作
- AI 摘要只在描述超过 50 字时触发
- API Key 存储在 localStorage，不上传任何服务器
