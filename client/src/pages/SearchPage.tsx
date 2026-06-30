import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Clock, ArrowRight } from 'lucide-react';
import apiClient from '../api/client';
import Loading from '../components/Loading';
import Avatar from '../components/Avatar';
import type { Card, Board } from '../types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return { cards: [], boards: [] };
      const res = await apiClient.get<{ cards: Card[]; boards: Board[] }>('/search', {
        params: { q: searchTerm },
      });
      return res.data;
    },
    enabled: searchTerm.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query.trim());
  };

  const cards = data?.cards || [];
  const boards = data?.boards || [];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            className="input pl-12 pr-4 py-3 text-lg"
            placeholder="搜索卡片、看板..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 btn-primary text-sm py-1.5">
            {isFetching ? '搜索中...' : '搜索'}
          </button>
        </div>
      </form>

      {!searchTerm ? (
        <div className="text-center py-20">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">输入关键词，搜索所有看板和卡片</p>
        </div>
      ) : isLoading ? (
        <Loading text="搜索中..." />
      ) : (
        <div className="space-y-8">
          {/* Cards Results */}
          {cards.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                卡片 ({cards.length})
              </h3>
              <div className="space-y-2">
                {cards.map((card: any) => (
                  <Link
                    key={card.id}
                    to={`/board/${card.list?.boardId}`}
                    className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-primary-200 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">{card.title}</h4>
                        {card.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{card.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>列表：{card.list?.title}</span>
                          {card.dueDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(card.dueDate).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>
                      </div>
                      {card.assignee && <Avatar name={card.assignee.name} size="sm" />}
                      <ArrowRight className="w-4 h-4 text-gray-300 ml-3 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Boards Results */}
          {boards.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                看板 ({boards.length})
              </h3>
              <div className="space-y-2">
                {boards.map((board) => (
                  <Link
                    key={board.id}
                    to={`/board/${board.id}`}
                    className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-primary-200 transition-all"
                  >
                    <h4 className="font-medium text-gray-900">{board.title}</h4>
                    {board.description && (
                      <p className="text-sm text-gray-500 mt-1">{board.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {!isLoading && cards.length === 0 && boards.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500">未找到匹配结果</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
