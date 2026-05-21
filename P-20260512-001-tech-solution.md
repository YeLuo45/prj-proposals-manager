# Tech Solution: 收藏项目功能

## 概述
在项目卡片上添加星标收藏按钮，收藏数据存储到 `data/favorites.json`，通过 GitHub REST API 同步。

## 文件变更

### 1. 新建 `src/hooks/useFavorites.js`
- 管理收藏状态的读取和写入
- 从 GitHub 读取远程收藏列表
- 通过 GitHub REST API 写入收藏变更
- 提供 `toggleFavorite(projectId)` 方法

### 2. 修改 `src/App.jsx`
- 引入 `useFavorites` hook
- 将 `favorites` 和 `toggleFavorite` 传入 ProjectCard

### 3. 修改 `src/components/ProjectCard.jsx`
- 在右上角添加收藏按钮（星标图标）
- 点击调用 `toggleFavorite(project.id)`

### 4. 新建 `data/favorites.json`（GitHub仓库）
```json
{"favorites":[],"updatedAt":"2026-05-12T00:00:00Z"}
```

## 实现顺序

1. 创建 `data/favorites.json`（GitHub REST API创建）
2. 创建 `useFavorites` hook
3. 修改 `App.jsx`
4. 修改 `ProjectCard.jsx`
5. 构建验证

## 关键代码

### useFavorites.js
```javascript
import { useState, useEffect } from 'react';

const FAVORITES_URL = 'https://raw.githubusercontent.com/YeLuo45/prj-proposals-manager/master/data/favorites.json';
const API_BASE = 'https://api.github.com/repos/YeLuo45/prj-proposals-manager/contents/data/favorites.json';

export function useFavorites() {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    fetch(FAVORITES_URL)
      .then(r => r.json())
      .then(d => setFavorites(d.favorites || []))
      .catch(() => setFavorites([]));
  }, []);

  const toggleFavorite = async (projectId) => {
    const isFav = favorites.includes(projectId);
    const newFavs = isFav
      ? favorites.filter(id => id !== projectId)
      : [...favorites, projectId];
    
    setFavorites(newFavs); // 乐观更新

    // 写入 GitHub
    try {
      const shaRes = await fetch(API_BASE);
      const shaData = await shaRes.json();
      const sha = shaData.sha;

      const content = btoa(JSON.stringify({ favorites: newFavs, updatedAt: new Date().toISOString() }));
      await fetch(API_BASE, {
        method: 'PUT',
        headers: { 'Authorization': 'token ' + import.meta.env.VITE_GH_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'chore: update favorites', content, sha })
      });
    } catch (e) {
      console.error('Failed to sync favorites', e);
    }
  };

  return { favorites, toggleFavorite };
}
```

## 环境变量
需要添加 `VITE_GH_TOKEN` 到 `.env` 文件（GitHub PAT）。

## GitHub PAT 权限
需要 `repo` 权限才能读写仓库文件。
