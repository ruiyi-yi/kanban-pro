import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactEChartsCore from 'echarts-for-react';
import { TrendingUp, CheckCircle2, AlertTriangle, ListTodo } from 'lucide-react';
import apiClient from '../api/client';
import Loading from '../components/Loading';
import type { BoardStats } from '../types';

export default function StatsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['board-stats', id],
    queryFn: async () => {
      const res = await apiClient.get<BoardStats>(`/boards/${id}/stats`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) return <Loading text="加载统计数据..." />;
  if (!stats) return null;

  // Pie chart for card distribution by list
  const pieOption = {
    tooltip: { trigger: 'item' as const },
    legend: { bottom: '0%' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
      label: { show: true, position: 'outside' as const, formatter: '{b}\n{d}%' },
      data: stats.cardsByList.map((item) => ({
        name: item.title,
        value: item.count,
      })),
    }],
  };

  // Bar chart for cards by member
  const barOption = {
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: stats.cardsByMember.map((m) => m.name),
    },
    yAxis: { type: 'value' as const },
    series: [{
      type: 'bar',
      data: stats.cardsByMember.map((m) => m.count),
      itemStyle: {
        color: '#3b82f6',
        borderRadius: [6, 6, 0, 0],
      },
      barWidth: '40%',
    }],
  };

  // Priority distribution
  const priorityOption = {
    tooltip: { trigger: 'axis' as const },
    radar: {
      indicator: [
        { name: '紧急', max: Math.max(...stats.cardsByPriority.map(p => p.count), 1) },
        { name: '高', max: Math.max(...stats.cardsByPriority.map(p => p.count), 1) },
        { name: '中', max: Math.max(...stats.cardsByPriority.map(p => p.count), 1) },
        { name: '低', max: Math.max(...stats.cardsByPriority.map(p => p.count), 1) },
        { name: '无', max: Math.max(...stats.cardsByPriority.map(p => p.count), 1) },
      ],
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          stats.cardsByPriority.find(p => p.priority === 'URGENT')?.count || 0,
          stats.cardsByPriority.find(p => p.priority === 'HIGH')?.count || 0,
          stats.cardsByPriority.find(p => p.priority === 'MEDIUM')?.count || 0,
          stats.cardsByPriority.find(p => p.priority === 'LOW')?.count || 0,
          stats.cardsByPriority.find(p => p.priority === 'NONE')?.count || 0,
        ],
        name: '优先级分布',
      }],
      areaStyle: { opacity: 0.3 },
    }],
  };

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">数据统计</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCards}</p>
              <p className="text-xs text-gray-500">总卡片数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
              <p className="text-xs text-gray-500">完成率</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.overdueCards}</p>
              <p className="text-xs text-gray-500">已过期</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.cardsByMember.length}</p>
              <p className="text-xs text-gray-500">参与人数</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">卡片分布</h3>
          <ReactEChartsCore option={pieOption} style={{ height: 300 }} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">成员工作量</h3>
          {stats.cardsByMember.length > 0 ? (
            <ReactEChartsCore option={barOption} style={{ height: 300 }} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-20">暂无数据</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">优先级分布</h3>
          <ReactEChartsCore option={priorityOption} style={{ height: 300 }} />
        </div>
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">最近动态</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {stats.recentActivity?.length > 0 ? (
              stats.recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700">
                      <span className="font-medium">{activity.user?.name}</span>
                      {' '}{activity.detail}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(activity.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">暂无动态</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
