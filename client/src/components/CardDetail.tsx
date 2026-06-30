import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, Flag, User, Paperclip, MessageSquare, Tag, Trash2, Save, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import Modal from './Modal';
import Avatar from './Avatar';
import type { Card } from '../types';

interface CardDetailProps {
  cardId: string | null;
  boardId: string;
  members: { userId: string; role: string; user: { id: string; name: string; avatar: string } }[];
  onClose: () => void;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  NONE: { label: '无', color: 'bg-gray-100 text-gray-600' },
  LOW: { label: '低', color: 'bg-blue-100 text-blue-700' },
  MEDIUM: { label: '中', color: 'bg-yellow-100 text-yellow-700' },
  HIGH: { label: '高', color: 'bg-orange-100 text-orange-700' },
  URGENT: { label: '紧急', color: 'bg-red-100 text-red-700' },
};

export default function CardDetail({ cardId, boardId, members, onClose, onUpdate, onDelete }: CardDetailProps) {
  const queryClient = useQueryClient();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'NONE', dueDate: '', assigneeId: '' });
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!cardId) return;
    setLoading(true);
    apiClient.get(`/cards/${cardId}`)
      .then((res) => {
        setCard(res.data);
        setForm({
          title: res.data.title,
          description: res.data.description || '',
          priority: res.data.priority,
          dueDate: res.data.dueDate ? res.data.dueDate.split('T')[0] : '',
          assigneeId: res.data.assigneeId || '',
        });
      })
      .catch(() => toast.error('加载卡片详情失败'))
      .finally(() => setLoading(false));
  }, [cardId]);

  // Save card
  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiClient.put(`/cards/${cardId}`, data);
      return res.data;
    },
    onSuccess: (data) => {
      setCard((prev) => prev ? { ...prev, ...data.card } : prev);
      onUpdate(data.card);
      setEditing(false);
      toast.success('已保存');
    },
  });

  // Delete card
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/cards/${cardId}`);
    },
    onSuccess: () => {
      onDelete(cardId!);
      onClose();
      toast.success('卡片已删除');
    },
  });

  // Add comment
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post(`/cards/${cardId}/comments`, { content });
      return res.data;
    },
    onSuccess: (data) => {
      setCard((prev) => prev ? {
        ...prev,
        comments: [...(prev as any).comments || [], data.comment],
        _count: { ...prev._count, comments: (prev._count?.comments || 0) + 1 } as any,
      } as Card : prev);
      setComment('');
    },
  });

  if (!cardId) return null;

  return (
    <Modal open={!!cardId} onClose={onClose} title={editing ? '编辑卡片' : (card?.title || '加载中...')} size="lg">
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : card ? (
        <div className="space-y-6">
          {editing ? (
            /* Edit Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea className="input resize-none" rows={4} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                  <select className="input" value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="NONE">无</option><option value="LOW">低</option>
                    <option value="MEDIUM">中</option><option value="HIGH">高</option>
                    <option value="URGENT">紧急</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
                  <input type="date" className="input" value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                <select className="input" value={form.assigneeId}
                  onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                  <option value="">未指派</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.user.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between pt-2">
                <button className="btn-danger text-sm" onClick={() => deleteMutation.mutate()}>
                  <Trash2 className="w-4 h-4" /> 删除
                </button>
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => setEditing(false)}>取消</button>
                  <button className="btn-primary" onClick={() => saveMutation.mutate(form)}>
                    <Save className="w-4 h-4" /> 保存
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              {/* Info badges */}
              <div className="flex flex-wrap gap-2">
                {card.priority !== 'NONE' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${priorityLabels[card.priority].color}`}>
                    <Flag className="w-3 h-3" /> {priorityLabels[card.priority].label}优先级
                  </span>
                )}
                {card.dueDate && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    new Date(card.dueDate) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    <Calendar className="w-3 h-3" />
                    {new Date(card.dueDate).toLocaleDateString('zh-CN')}
                    {new Date(card.dueDate) < new Date() && ' (已过期)'}
                  </span>
                )}
                {card.assignee && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    <User className="w-3 h-3" /> {card.assignee.name}
                  </span>
                )}
              </div>

              {/* Description */}
              {card.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">描述</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{card.description}</p>
                </div>
              )}

              {/* Attachments */}
              {((card as any).attachments?.length > 0) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Paperclip className="w-4 h-4" /> 附件
                  </h4>
                  <div className="space-y-2">
                    {(card as any).attachments.map((att: any) => (
                      <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener"
                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <span className="flex-1 truncate">{att.fileName}</span>
                        <span className="text-gray-400 text-xs">{(att.fileSize / 1024).toFixed(1)} KB</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" /> 评论 ({(card as any).comments?.length || 0})
                </h4>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {(card as any).comments?.map((c: any) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar name={c.user?.name || '?'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{c.user?.name}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(c.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="input flex-1 text-sm" placeholder="添加评论..."
                    value={comment} onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && comment.trim() && commentMutation.mutate(comment)} />
                  <button className="btn-primary text-sm" disabled={!comment.trim()}
                    onClick={() => commentMutation.mutate(comment)}>
                    发送
                  </button>
                </div>
              </div>

              {/* Edit button */}
              <button className="btn-secondary w-full" onClick={() => setEditing(true)}>
                编辑卡片
              </button>
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
