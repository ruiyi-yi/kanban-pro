import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Shield, Trash2, Settings as SettingsIcon, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import Loading from '../components/Loading';
import Avatar from '../components/Avatar';
import type { Board, BoardMember, AutomationRule } from '../types';

const roleLabels: Record<string, { label: string; color: string }> = {
  OWNER: { label: '拥有者', color: 'bg-purple-100 text-purple-700' },
  ADMIN: { label: '管理员', color: 'bg-blue-100 text-blue-700' },
  MEMBER: { label: '成员', color: 'bg-green-100 text-green-700' },
  VIEWER: { label: '访客', color: 'bg-gray-100 text-gray-600' },
};

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [tab, setTab] = useState<'members' | 'automations'>('members');

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', id],
    queryFn: async () => {
      const res = await apiClient.get<Board>(`/boards/${id}`);
      return res.data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await apiClient.post(`/boards/${id}/members`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', id] });
      setInviteEmail('');
      toast.success('邀请已发送');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '邀请失败');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/boards/${id}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', id] });
      toast.success('已移除成员');
    },
    onError: () => toast.error('移除失败'),
  });

  if (isLoading) return <Loading />;

  const members = (board as any)?.members || [];

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">看板设置</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('members')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'members' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4" /> 成员管理
        </button>
        <button
          onClick={() => setTab('automations')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'automations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Zap className="w-4 h-4" /> 自动化规则
        </button>
      </div>

      {tab === 'members' ? (
        <div className="space-y-6">
          {/* Invite member */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> 邀请成员
            </h3>
            <div className="flex gap-3">
              <input
                className="input flex-1"
                placeholder="输入邮箱地址..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inviteEmail && inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
              />
              <select
                className="input w-28"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="ADMIN">管理员</option>
                <option value="MEMBER">成员</option>
                <option value="VIEWER">访客</option>
              </select>
              <button
                className="btn-primary"
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
              >
                邀请
              </button>
            </div>
          </div>

          {/* Member list */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                成员 ({members.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {members.map((m: any) => (
                <div key={m.userId} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.user?.name || '?'} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.user?.name}</p>
                      <p className="text-xs text-gray-400">{m.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleLabels[m.role]?.color}`}>
                      {roleLabels[m.role]?.label}
                    </span>
                    {m.role !== 'OWNER' && (
                      <button
                        onClick={() => {
                          if (confirm(`确定移除 ${m.user?.name}？`)) {
                            removeMemberMutation.mutate(m.userId);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Automations tab */
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5" /> 自动化规则
            </h3>
            <button className="btn-secondary text-sm">
              <UserPlus className="w-4 h-4" /> 添加规则
            </button>
          </div>
          <div className="text-center py-10">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">自动化规则可以帮你：</p>
            <ul className="text-sm text-gray-400 mt-2 space-y-1">
              <li>• 卡片移到"已完成"时自动归档</li>
              <li>• 截止日期前24小时自动提醒</li>
              <li>• 新卡片自动分配给指定成员</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
