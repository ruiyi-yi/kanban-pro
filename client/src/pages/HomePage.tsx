import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Layers, Clock, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import Modal from '../components/Modal';
import Loading from '../components/Loading';
import Avatar from '../components/Avatar';
import type { Board, BoardTemplate } from '../types';

export default function HomePage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [newBoard, setNewBoard] = useState({ title: '', description: '' });

  // Fetch boards
  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const res = await apiClient.get<Board[]>('/boards');
      return res.data;
    },
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await apiClient.get<BoardTemplate[]>('/templates');
      return res.data;
    },
  });

  // Create board mutation
  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      const res = await apiClient.post('/boards', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setShowCreate(false);
      setNewBoard({ title: '', description: '' });
      toast.success('看板创建成功！');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '创建失败');
    },
  });

  if (isLoading) return <Loading text="加载看板中..." />;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的看板</h1>
          <p className="text-gray-500 mt-1">
            {boards?.length ? `共 ${boards.length} 个看板` : '创建你的第一个看板吧'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTemplate(true)}
            className="btn-secondary"
          >
            <Layers className="w-4 h-4" />
            模板
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            创建看板
          </button>
        </div>
      </div>

      {/* Board Grid */}
      {boards?.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有看板</h3>
          <p className="text-gray-500 mb-6">创建你的第一个项目看板，开始团队协作</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            创建看板
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards?.map((board) => (
            <Link
              key={board.id}
              to={`/board/${board.id}`}
              className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200 overflow-hidden"
            >
              {/* Cover */}
              <div
                className="h-24 bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 relative overflow-hidden"
                style={
                  board.cover
                    ? { backgroundImage: `url(${board.cover})`, backgroundSize: 'cover' }
                    : undefined
                }
              >
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors truncate">
                  {board.title}
                </h3>
                {board.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{board.description}</p>
                )}

                <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Avatar name={board.owner?.name || '?'} size="sm" />
                    {board.owner?.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {board._count?.members || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {board._count?.lists || 0}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="创建新看板">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">看板名称 *</label>
            <input
              className="input"
              placeholder="例如：数据库大作业、Sprint 23"
              value={newBoard.title}
              onChange={(e) => setNewBoard({ ...newBoard, title: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="简单描述这个看板的用途..."
              value={newBoard.description}
              onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">取消</button>
            <button
              className="btn-primary"
              disabled={!newBoard.title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(newBoard)}
            >
              {createMutation.isPending ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Templates Modal */}
      <Modal open={showTemplate} onClose={() => setShowTemplate(false)} title="选择看板模板" size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(templates || []).map((tmpl) => (
            <button
              key={tmpl.id}
              className="text-left p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all"
              onClick={() => {
                setNewBoard({
                  title: tmpl.name,
                  description: tmpl.description,
                });
                setShowTemplate(false);
                setShowCreate(true);
              }}
            >
              <h4 className="font-medium text-gray-900">{tmpl.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{tmpl.description}</p>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
