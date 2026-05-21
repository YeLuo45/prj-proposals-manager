# Tech Solution: 收藏列表独立视图

## 概述
在项目提案管理网站添加"收藏"视图，快速访问已收藏项目。

## 文件变更

### 1. 修改 `src/App.jsx`
- 添加"我的收藏"视图切换
- 当激活收藏视图时，只显示收藏的项目
- 在视图切换栏添加"收藏"按钮（带星标图标和数量badge）

### 2. 修改 `src/components/Header.jsx` 或 `ViewTabs`
- 添加收藏视图入口
- 显示收藏数量 badge

## 实现顺序
1. 修改 Header/ViewTabs 添加收藏按钮
2. 修改 App.jsx 添加收藏视图逻辑
3. 构建验证

## 关键代码

### Header/ViewTabs 变更
在现有的视图切换栏（项目/卡片/泳道/列表）旁边添加：
```jsx
<button 
  className={`收藏-btn ${showFavoritesOnly ? 'active' : ''}`}
  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
>
  ⭐ 我的收藏 {favorites.length > 0 && <span className="badge">{favorites.length}</span>}
</button>
```

### App.jsx 变更
```jsx
const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

// Filter projects when in favorites view
const displayProjects = showFavoritesOnly 
  ? projects.filter(p => favorites.includes(p.id))
  : projects;
```
