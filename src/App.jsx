import { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import FilterBar from './components/FilterBar';
import ProposalCard from './components/ProposalCard';
import ProposalForm from './components/ProposalForm';
import ProjectCard from './components/ProjectCard';
import ProjectForm from './components/ProjectForm';
import { useMcp } from './hooks/useMcp';
import ProjectDetailPage from './pages/ProjectDetailPage';

const ITEMS_PER_PAGE = 12;

function HomePage() {
  const [data, setData] = useState({ projects: [], proposals: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const navigate = useNavigate();
  const {
    loadData, addProject, updateProject, deleteProject,
    addProposal, updateProposal, deleteProposal,
    loading, error, apiKey,
  } = useMcp();

  useEffect(() => {
    if (apiKey) {
      loadData().then(setData).catch((err) => console.error('Failed to load data:', err));
    } else {
      setShowSettings(true);
    }
  }, [apiKey, loadData]);

  const handleSelectProject = (projectId) => {
    navigate(`/project/${encodeURIComponent(projectId)}`);
  };

  const handleAddProject = async (newProject) => {
    try {
      const created = await addProject(newProject);
      // Reload to get the canonical server-side project (with id, timestamps)
      const fresh = await loadData();
      setData(fresh);
      setShowProjectForm(false);
      return created;
    } catch (err) {
      console.error('Failed to add project:', err);
      throw err;
    }
  };

  const handleEditProject = async (updatedProject) => {
    try {
      await updateProject(updatedProject.id, updatedProject);
      const fresh = await loadData();
      setData(fresh);
      setEditingProject(null);
      setShowProjectForm(false);
    } catch (err) {
      console.error('Failed to update project:', err);
      throw err;
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('确定要删除这个项目吗？')) return;
    try {
      await deleteProject(id);
      const fresh = await loadData();
      setData(fresh);
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert(`删除失败: ${err.message || err}`);
    }
  };

  const handleAddProposal = async (newProposal) => {
    try {
      await addProposal(newProposal);
      const fresh = await loadData();
      setData(fresh);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to add proposal:', err);
      throw err;
    }
  };

  const handleEditProposal = async (updatedProposal) => {
    try {
      await updateProposal(updatedProposal.id, updatedProposal);
      const fresh = await loadData();
      setData(fresh);
      setEditingProposal(null);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to update proposal:', err);
      throw err;
    }
  };

  const handleDeleteProposal = async (id) => {
    if (!confirm('确定要删除这个提案吗？')) return;
    try {
      await deleteProposal(id);
      const fresh = await loadData();
      setData(fresh);
    } catch (err) {
      console.error('Failed to delete proposal:', err);
      alert(`删除失败: ${err.message || err}`);
    }
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert('链接已复制到剪贴板');
  };

  // 过滤项目
  const filteredProjects = useMemo(() => {
    return data.projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [data.projects, searchQuery]);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (showSettings) {
    return <SettingsScreen onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        onAdd={() => {
          setEditingProposal(null);
          setShowForm(true);
        }}
        onSettings={() => setShowSettings(true)}
        onAddProject={() => {
          setEditingProject(null);
          setShowProjectForm(true);
        }}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <FilterBar
            filterType={filterType}
            filterStatus={filterStatus}
            viewMode={viewMode}
            onTypeChange={setFilterType}
            onStatusChange={setFilterStatus}
            onViewModeChange={setViewMode}
          />
        </div>

        {loading && <div className="text-center py-8">加载中...</div>}
        {error && <div className="text-red-500 text-center py-4">{error}</div>}

        {!loading && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">项目列表</h2>
              <button
                onClick={() => setShowProjectForm(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                + 新建项目
              </button>
            </div>

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    viewMode={viewMode}
                    onSelectProject={handleSelectProject}
                    onEditProject={(p) => {
                      setEditingProject(p);
                      setShowProjectForm(true);
                    }}
                    onDeleteProject={handleDeleteProject}
                    onAddProposal={(p) => {
                      setEditingProject(p);
                      setShowForm(true);
                    }}
                    onEditProposal={(p) => {
                      setEditingProposal(p);
                      setShowForm(true);
                    }}
                    onDeleteProposal={handleDeleteProposal}
                    onCopy={handleCopyUrl}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">提案数</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        viewMode={viewMode}
                        onSelectProject={handleSelectProject}
                        onEditProject={(p) => {
                          setEditingProject(p);
                          setShowProjectForm(true);
                        }}
                        onDeleteProject={handleDeleteProject}
                        onAddProposal={() => {}}
                        onEditProposal={() => {}}
                        onDeleteProposal={() => {}}
                        onCopy={handleCopyUrl}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="px-4 py-2">
                  第 {currentPage} / {totalPages} 页
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            )}

            {filteredProjects.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                没有找到匹配的项目
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <ProposalForm
          proposal={editingProposal}
          projectId={editingProject?.id}
          projects={data.projects}
          onSave={editingProposal ? handleEditProposal : handleAddProposal}
          onClose={() => {
            setShowForm(false);
            setEditingProposal(null);
            setEditingProject(null);
          }}
        />
      )}

      {showProjectForm && (
        <ProjectForm
          project={editingProject}
          onSave={editingProject ? handleEditProject : handleAddProject}
          onClose={() => {
            setShowProjectForm(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}

function SettingsScreen({ onClose }) {
  const { serverUrl, setServerUrl, apiKey, setApiKey, testConnection, loading, error } = useMcp();
  const [testResult, setTestResult] = useState(null);
  const [testErr, setTestErr] = useState(null);

  const handleTest = async () => {
    setTestResult(null);
    setTestErr(null);
    try {
      const r = await testConnection();
      setTestResult(r);
    } catch (e) {
      setTestErr(e && e.message ? e.message : String(e));
    }
  };

  const handleSaveAndClose = () => {
    onClose();
    // Force a reload to pick up the new apiKey / serverUrl
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">设置 — ai-superpower MCP</h1>
        <p className="text-gray-600 mb-6 text-sm">
          数据通过 MCP 协议直连 ai-superpower (HTTP Streamable)。<br />
          启动 ai-superpower 后填入 server URL 和 X-API-Key 即可。
        </p>

        <label className="block mb-1 font-semibold text-gray-700">MCP Server URL</label>
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="http://127.0.0.1:8000"
          className="w-full px-4 py-2 border rounded-lg mb-4 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mb-4 -mt-3">
          ai-superpower run 的地址（path /mcp 会自动追加）
        </p>

        <label className="block mb-1 font-semibold text-gray-700">X-API-Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="32 字符 hex"
          className="w-full px-4 py-2 border rounded-lg mb-4 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mb-4 -mt-3">
          与 ~/.ai-superpower/config.toml 的 [api].key 一致
        </p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={handleTest}
            disabled={loading}
            className="flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSaveAndClose}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            保存并继续
          </button>
        </div>

        {error && <div className="text-red-500 text-sm mb-2">错误: {error}</div>}

        {testErr && (
          <div className="text-red-500 text-sm bg-red-50 p-3 rounded mb-2">
            <strong>连接失败:</strong> {testErr}
          </div>
        )}

        {testResult && (
          <div className="text-green-700 text-sm bg-green-50 p-3 rounded">
            <strong>✓ 连接成功</strong><br />
            工具数: {testResult.toolCount}<br />
            {testResult.serverInfo && (
              <>Server: {testResult.serverInfo.name} v{testResult.serverInfo.version}<br /></>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer">工具列表</summary>
              <pre className="text-xs mt-1 whitespace-pre-wrap">
                {testResult.tools.join(', ')}
              </pre>
            </details>
          </div>
        )}

        {apiKey && onClose && (
          <button
            onClick={onClose}
            className="w-full text-gray-500 text-sm py-2 mt-2 hover:text-gray-700"
          >
            取消
          </button>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:id" element={<ProjectDetailPageWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}

function ProjectDetailPageWrapper() {
  const { id } = useParams();
  const decodedId = decodeURIComponent(id);
  return <ProjectDetailPage projectId={decodedId} />;
}

export default App;
