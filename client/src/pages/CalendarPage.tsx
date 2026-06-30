import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import apiClient from '../api/client';
import Loading from '../components/Loading';
import Avatar from '../components/Avatar';
import type { Board } from '../types';

export default function CalendarPage() {
  const { id } = useParams<{ id: string }>();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', id],
    queryFn: async () => {
      const res = await apiClient.get<Board>(`/boards/${id}`);
      return res.data;
    },
  });

  if (isLoading) return <Loading text="加载日历..." />;

  // Collect all cards with due dates
  const allCards = ((board as any)?.lists || [])
    .flatMap((l: any) => l.cards || [])
    .filter((c: any) => c.dueDate);

  // Group cards by date
  const cardsByDate: Record<string, any[]> = {};
  allCards.forEach((c: any) => {
    const dateKey = c.dueDate.split('T')[0];
    if (!cardsByDate[dateKey]) cardsByDate[dateKey] = [];
    cardsByDate[dateKey].push(c);
  });

  // Calendar generation
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const cells: { day: number; date: string; isToday: boolean; isCurrentMonth: boolean }[] = [];

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, date: dateStr, isToday: false, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === today.toISOString().split('T')[0];
    cells.push({ day: d, date: dateStr, isToday, isCurrentMonth: true });
  }

  // Next month days to fill the grid
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, date: dateStr, isToday: false, isCurrentMonth: false });
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">日历视图</h1>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-lg font-semibold text-gray-900 min-w-[120px] text-center">
            {year}年 {monthNames[month]}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day) => (
            <div key={day} className="px-3 py-3 text-center text-sm font-semibold text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const dayCards = cardsByDate[cell.date] || [];
            const isWeekend = idx % 7 === 0 || idx % 7 === 6;

            return (
              <div
                key={`${cell.date}-${idx}`}
                className={`min-h-[100px] border-b border-r border-gray-100 p-2 ${
                  !cell.isCurrentMonth ? 'bg-gray-50/50' : ''
                } ${isWeekend && cell.isCurrentMonth ? 'bg-gray-50/30' : ''}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                    cell.isToday
                      ? 'bg-primary-600 text-white'
                      : cell.isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-300'
                  }`}
                >
                  {cell.day}
                </span>

                {/* Cards on this day */}
                <div className="mt-1 space-y-0.5">
                  {dayCards.slice(0, 3).map((card: any) => (
                    <div
                      key={card.id}
                      className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 truncate"
                      title={card.title}
                    >
                      {card.title}
                    </div>
                  ))}
                  {dayCards.length > 3 && (
                    <p className="text-xs text-gray-400 px-1">+{dayCards.length - 3} 更多</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
