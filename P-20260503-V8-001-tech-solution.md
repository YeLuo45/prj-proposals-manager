# Tech Solution — P-20260503-V8-001: prj-proposals-manager V8 — Dashboard 增强

---

## 1. 文件变更

```
src/pages/DashboardView.jsx   # 重构，集成三个图表组件
src/hooks/useStatsData.js      # 复用/增强已有统计计算
```

无新增文件，在现有组件上修改。

---

## 2. Chart.js 注册（DashboardView.jsx 顶部）

```javascript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend
);
```

---

## 3. 数据计算（useMemo hooks）

```javascript
const [timeRange, setTimeRange] = useState('30d'); // '7d' | '30d' | '3m' | 'all'

// 按时间范围过滤
const filteredProposals = useMemo(() => {
  if (timeRange === 'all') return flatProposals;
  const now = new Date();
  const cutoff = new Date();
  if (timeRange === '7d') cutoff.setDate(now.getDate() - 7);
  else if (timeRange === '30d') cutoff.setDate(now.getDate() - 30);
  else if (timeRange === '3m') cutoff.setMonth(now.getMonth() - 3);
  return flatProposals.filter(p => new Date(p.createdAt) >= cutoff);
}, [flatProposals, timeRange]);

// 提案趋势（近6个月折线图）
const trendData = useMemo(() => {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  const counts = months.map(month =>
    filteredProposals.filter(p => p.createdAt?.startsWith(month)).length
  );
  return {
    labels: months.map(m => {
      const [y, mo] = month.split('-');
      return `${parseInt(mo)}月`;
    }),
    datasets: [{
      label: '新增提案',
      data: counts,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.3,
    }]
  };
}, [filteredProposals]);

// 状态分布（环形饼图）
const statusData = useMemo(() => ({
  labels: ['待办', '进行中', '已完成'],
  datasets: [{
    data: [
      filteredProposals.filter(p => p.status === 'active').length,
      filteredProposals.filter(p => p.status === 'in_dev').length,
      filteredProposals.filter(p => p.status === 'archived').length,
    ],
    backgroundColor: [
      'rgba(34, 197, 94, 0.8)',   // green
      'rgba(234, 179, 8, 0.8)',    // yellow
      'rgba(107, 114, 128, 0.8)',  // gray
    ],
    borderWidth: 0,
  }]
}), [filteredProposals]);

// 项目进度（水平条形图）
const projectProgressData = useMemo(() => {
  const progress = projects.map(p => {
    const total = p.proposals?.length || 0;
    const done = p.proposals?.filter(pr => pr.status === 'archived').length || 0;
    const inProgress = p.proposals?.filter(pr => pr.status === 'in_dev').length || 0;
    return {
      name: p.name,
      total, done, inProgress,
      rate: total ? Math.round(done / total * 100) : 0
    };
  }).sort((a, b) => b.rate - a.rate);

  return {
    labels: progress.map(p => p.name),
    datasets: [
      {
        label: '已完成',
        data: progress.map(p => p.done),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
      {
        label: '进行中',
        data: progress.map(p => p.inProgress),
        backgroundColor: 'rgba(234, 179, 8, 0.8)',
      },
    ]
  };
}, [projects]);
```

---

## 4. 图表组件配置

### 提案趋势折线图（Line）

```javascript
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } }
  }
};
```

### 状态分布饼图（Doughnut）

```javascript
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { position: 'bottom', labels: { padding: 20 } },
  }
};
```

### 项目进度条形图（Bar）

```javascript
const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',  // 水平条形图
  plugins: {
    legend: { position: 'top' },
  },
  scales: {
    x: { stacked: true, max: 100 },
    y: { stacked: true }
  }
};
```

---

## 5. DashboardView.jsx UI 结构

```jsx
function DashboardView() {
  // ... existing useGitHub data loading

  return (
    <div className="p-6 space-y-6">
      {/* 时间范围筛选 */}
      <div className="flex gap-2 mb-4">
        {['7d', '30d', '3m', 'all'].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === range ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            {range === '7d' ? '近7天' : range === '30d' ? '近30天' : range === '3m' ? '近3月' : '全部'}
          </button>
        ))}
      </div>

      {/* 图表网格：2x2 布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 提案趋势 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-sm font-medium mb-4">提案趋势（近6个月）</h3>
          <div className="h-48">
            <Line data={trendData} options={lineOptions} />
          </div>
        </div>

        {/* 状态分布 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-sm font-medium mb-4">状态分布</h3>
          <div className="h-48">
            <Doughnut data={statusData} options={doughnutOptions} />
          </div>
        </div>

        {/* 项目进度 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:col-span-2">
          <h3 className="text-sm font-medium mb-4">项目进度对比</h3>
          <div className="h-64">
            <Bar data={projectProgressData} options={barOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Chart.js 深色模式适配

在 DashboardView 的 useEffect 中：

```javascript
// 监听 dark mode 变化，更新 Chart.js 全局配置
useEffect(() => {
  ChartJS.defaults.color = darkMode ? '#9ca3af' : '#374151';
  ChartJS.defaults.borderColor = darkMode ? '#374151' : '#e5e7eb';
}, [darkMode]);
```

---

## 7. 实现顺序

1. `DashboardView.jsx` — 添加 Chart.js 注册
2. 添加 `timeRange` state 和过滤逻辑
3. 添加三个 `useMemo` 数据计算
4. 添加三个图表配置对象
5. 重构 JSX 布局（2x2 网格 + 时间筛选）
6. 添加深色模式适配
7. Build 验证

---

## 8. 注意事项

- 使用 `react-chartjs-2` 提供的封装组件（Line, Doughnut, Bar）
- Chart.js 注册必须在使用组件之前
- 深色模式下 Chart.js 文字颜色需要手动适配
- 时间范围筛选只影响趋势图和状态分布饼图，不影响项目进度（项目进度用 `projects` 而非 `filteredProposals`）
