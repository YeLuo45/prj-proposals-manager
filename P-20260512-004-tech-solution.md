# P-20260512-004: 收藏数据本地缓存 - Tech Solution

## 实现

### 修改文件
- `src/hooks/useFavorites.js`

### 缓存策略
- localStorage key: `favorites_cache`
- TTL: 5 分钟
- 读取时优先使用缓存，缓存命中则跳过网络请求
- 写入时乐观更新本地状态，失败时回滚
- 网络错误时使用过期缓存作为 fallback
