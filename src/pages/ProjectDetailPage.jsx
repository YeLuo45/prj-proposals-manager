import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMcp } from '../hooks/useMcp';
import MilestoneTimeline from '../components/MilestoneTimeline';
import MilestoneForm from '../components/MilestoneForm';
import ProposalCard from '../components/ProposalCard';

export default function ProjectDetailPage({ projectId }) {
  const [data, setData] = useState({ projects: [], proposals: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);

  const navigate = useNavigate();
  const { loadData, updateProject } = useMcp();

  const reload = useCallback(async () => {
    try {
      const loadedData = await loadData();
      setData(loadedData);
      setLoading(false);
    } catch (err) {
      setError(err.message || String(err));
      setLoading(false);
    }
  }, [loadData]);

  useEffect(() => {
    reload();
  }, [reload]);

  const project = data.projects.find(p => p.id === projectId);
  const projectProposals = data.proposals.filter(p => p.projectId === projectId);

  const handleSaveMilestone = async (milestoneData) => {
    if (!project) return;
    const newMilestones = editingMilestone
      ? project.milestones.map(m =>
          m.id === editingMilestone.id ? { ...milestoneData, id: editingMilestone.id, updatedAt: Date.now() } : m
        )
      : [
          ...(project.milestones || []),
          { ...milestoneData, id: `MS-${Date.now()}`, createdAt: Date.now(), updatedAt: Date.now() },
        ];

    try {
      await updateProject(projectId, { milestones: newMilestones });
      await reload();
      setShowMilestoneForm(false);
      setEditingMilestone(null);
    } catch (err) {
      console.error('Failed to save milestone:', err);
      alert(`保存失败: ${err.message || err}`);
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    if (!confirm('确定要删除这个里程碑吗？')) return;
    if (!project) return;
    const newMilestones = project.milestones.filter(m => m.id !== milestoneId);
    try {
      await updateProject(projectId, { milestones: newMilestones });
      await reload();
      setShowMilestoneForm(false);
      setEditingMilestone(null);
    } catch (err) {
      console.error('Failed to delete milestone:', err);
      alert(`删除失败: ${err.message || err}`);
    }
  };

  const handleEditMilestone = (milestone) => {
    setEditingMilestone(milestone);
    setShowMilestoneForm(true);
  };

  const handleAddMilestone = () => {
    setEditingMilestone(null);
    setShowMilestoneForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">项目不存在</div>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              ← 返回
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">{project.name}</h1>
              <p className="text-sm text-gray-500">{project.id}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Project Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-gray-600 mb-4">{project.description || '无描述'}</p>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>创建: {project.createdAt}</span>
            <span>更新: {project.updatedAt}</span>
            <span>提案: {projectProposals.length} 个</span>
            <span>里程碑: {project.milestones?.length || 0} 个</span>
          </div>
        </div>

        {/* Milestone Timeline */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">里程碑</h2>
            <button
              onClick={handleAddMilestone}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm"
            >
              + 添加里程碑
            </button>
          </div>
          <MilestoneTimeline
            milestones={project.milestones || []}
            proposals={projectProposals}
            onEdit={handleEditMilestone}
          />
        </div>

        {/* Proposals */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            关联提案 ({projectProposals.length})
          </h2>
          {projectProposals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectProposals.map(proposal => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onCopyUrl={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              暂无关联提案
            </div>
          )}
        </div>
      </div>

      {/* Milestone Form Modal */}
      {showMilestoneForm && (
        <MilestoneForm
          milestone={editingMilestone}
          proposals={projectProposals}
          onSave={handleSaveMilestone}
          onDelete={editingMilestone ? () => handleDeleteMilestone(editingMilestone.id) : null}
          onClose={() => {
            setShowMilestoneForm(false);
            setEditingMilestone(null);
          }}
        />
      )}
    </div>
  );
}
