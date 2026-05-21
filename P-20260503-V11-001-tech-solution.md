# Tech Solution — P-20260503-V11-001: prj-proposals-manager V11 — Markdown 渲染

---

## 1. 文件变更

```
src/components/MarkdownRenderer.jsx   # M1/M2: Markdown 渲染 + 代码高亮
src/components/ProposalForm.jsx       # M3: 编辑/预览切换 UI
src/App.jsx                          # M3: 状态管理
src/index.css                        # 样式补丁
tailwind.config.js                   # 添加 @tailwindcss/typography
```

---

## 2. 依赖安装

```bash
npm install react-markdown remark-gfm react-syntax-highlighter
npm install -D @tailwindcss/typography
```

---

## 3. M1: MarkdownRenderer.jsx

```jsx
// src/components/MarkdownRenderer.jsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function MarkdownRenderer({ content }) {
  if (!content) {
    return <span className="text-gray-400 text-sm">无内容</span>;
  }

  return (
    <div className="prose dark:prose-invert max-w-none text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 代码块语法高亮
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && language) {
              return (
                <div className="relative group my-2">
                  <div className="absolute top-0 left-0 bg-gray-600 text-white text-xs px-2 py-0.5 rounded-br z-10">
                    {language}
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={language}
                    PreTag="div"
                    className="!mt-0 !rounded-t-md !text-xs"
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code
                className={`${className} bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono`}
                {...props}
              >
                {children}
              </code>
            );
          },
          // 表格样式
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3">
                <table className="min-w-full border border-gray-300 dark:border-gray-600 text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-left font-medium text-xs">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs">
                {children}
              </td>
            );
          },
          // 任务列表样式
          li({ children, ...props }) {
            return (
              <li className="list-none" {...props}>
                {children}
              </li>
            );
          },
          // 引用块
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-blue-500 pl-4 my-2 text-gray-600 dark:text-gray-300 italic">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

---

## 4. M3: ProposalForm 编辑/预览切换

### 4.1 App.jsx 新增 state

```javascript
const [descriptionMode, setDescriptionMode] = useState('edit'); // 'edit' | 'preview'
```

### 4.2 ProposalForm 描述输入部分

在现有的描述 textarea 基础上添加切换按钮：

```jsx
<div className="mb-4">
  <div className="flex items-center justify-between mb-1">
    <label className="font-medium text-sm">描述</label>
    <div className="flex bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
      <button
        onClick={() => setDescriptionMode('edit')}
        className={`text-xs px-3 py-1 ${descriptionMode === 'edit' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300'}`}
      >
        源码
      </button>
      <button
        onClick={() => setDescriptionMode('preview')}
        className={`text-xs px-3 py-1 ${descriptionMode === 'preview' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300'}`}
      >
        预览
      </button>
    </div>
  </div>

  {descriptionMode === 'edit' ? (
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      rows={6}
      className="w-full border rounded px-3 py-2 text-sm font-mono dark:bg-gray-700 dark:border-gray-600"
      placeholder="支持 Markdown 语法（GFM）..."
    />
  ) : (
    <div className="border rounded p-3 min-h-[120px] bg-gray-50 dark:bg-gray-800">
      <MarkdownRenderer content={description} />
    </div>
  )}
  
  <p className="text-xs text-gray-400 mt-1">
    支持 Markdown 语法，可使用 GFM（表格、任务列表、代码块等）
  </p>
</div>
```

### 4.3 详情页展示

在提案详情 Modal 或详情区域内使用 MarkdownRenderer：

```jsx
<div className="mb-4">
  <h3 className="font-medium mb-2 text-sm">描述</h3>
  <div className="bg-white dark:bg-gray-800 rounded p-3">
    <MarkdownRenderer content={proposal.description} />
  </div>
</div>
```

---

## 5. Tailwind 配置

```js
// tailwind.config.js
plugins: [
  require('@tailwindcss/typography'),
],
```

---

## 6. 实现顺序

1. 安装依赖：`npm install react-markdown remark-gfm react-syntax-highlighter && npm install -D @tailwindcss/typography`
2. 创建 `MarkdownRenderer.jsx`
3. App.jsx 添加 `descriptionMode` state
4. ProposalForm 添加编辑/预览切换按钮
5. 详情页使用 MarkdownRenderer 展示描述
6. Build 验证

---

## 7. 注意事项

- Markdown 渲染完全在客户端完成，无额外 API 调用
- react-markdown 默认转义 HTML，防止 XSS
- 无 Markdown 内容时显示"无内容"提示
- 代码高亮使用 vscDarkPlus 风格（VS Code 深色主题）
- 表格在移动端可横向滚动
