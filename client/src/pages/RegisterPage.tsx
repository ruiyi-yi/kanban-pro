import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LayoutDashboard } from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { AuthResponse, RegisterPayload } from '../types';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState<RegisterPayload>({
    email: '',
    password: '',
    name: '',
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterPayload) => {
      const res = await apiClient.post<AuthResponse>('/auth/register', data);
      return res.data;
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast.success('注册成功！');
      navigate('/');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '注册失败');
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">注册 Kanban Pro</h1>
          <p className="text-gray-500 mt-1">开始你的团队协作之旅</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              className="input"
              placeholder="你的名字"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              className="input"
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              className="input"
              placeholder="至少6位密码"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && registerMutation.mutate(form)}
            />
          </div>
          <button
            className="btn-primary w-full"
            disabled={registerMutation.isPending}
            onClick={() => registerMutation.mutate(form)}
          >
            {registerMutation.isPending ? '注册中...' : '注册'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          已有账号？{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
