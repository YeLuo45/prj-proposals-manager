# Tech Solution: 收藏项目按最近收藏排序

## 概述
收藏视图中的项目按最近收藏时间倒序排列，最新收藏的项目排在最前面。

## 变更
修改 `src/App.jsx` 中的 `favoritesFilteredProjects` useMemo，按最近收藏时间排序。

## 实现
需要追踪每个项目的收藏时间。在 `useFavorites.js` 中，`favorites.json` 已有 `updatedAt` 字段但只记录全局更新时间。

方案：扩展 `favorites.json` 格式为对象形式，记录每个项目的收藏时间：
```json
{
  "favorites": {
    "PRJ-20260412-009": "2026-05-12T10:30:00Z",
    "PRJ-20260502-001": "2026-05-12T09:15:00Z"
  }
}
```

修改 `useFavorites.js` 支持对象格式，App.jsx 按收藏时间排序。
