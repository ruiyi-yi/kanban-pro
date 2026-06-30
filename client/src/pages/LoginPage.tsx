import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LayoutDashboard } from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { AuthResponse, LoginPayload } from '../types';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState<LoginPayload>({ email: '', password: '' });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginPayload) => {
      const res = await apiClient.post<AuthResponse>('/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast.success('登录成功！');
      navigate('/');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '登录失败');
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">登录 Kanban Pro</h1>
          <p className="text-gray-500 mt-1">团队协作，高效管理</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
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
              placeholder="输入密码"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && loginMutation.mutate(form)}
            />
          </div>
          <button
            className="btn-primary w-full"
            disabled={loginMutation.isPending}
            onClick={() => loginMutation.mutate(form)}
          >
            {loginMutation.isPending ? '登录中...' : '登录'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          还没有账号？{' '}
          <Link to="/register" className="text-primary-600 font-medium hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
