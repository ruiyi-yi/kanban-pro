import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, MoreHorizontal, Calendar, BarChart3, Settings, Users, GripVertical, MessageSquare, Paperclip, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { useBoardStore } from '../stores/boardStore';
import { useSocket } from '../hooks/useSocket';
import Loading from '../components/Loading';
import Avatar from '../components/Avatar';
import CardDetail from '../components/CardDetail';
import type { Board, List, Card as CardType } from '../types';

// ==================== Sortable Card Component ====================
function SortableCard({ card, onClick }: { card: CardType; onClick: () => void }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: card.id, data: { type: 'card', card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priorityColors: Record<string, string> = {
    URGENT: 'border-l-red-500',
    HIGH: 'border-l-orange-500',
    MEDIUM: 'border-l-yellow-500',
    LOW: 'border-l-blue-500',
    NONE: 'border-l-transparent',
  };

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group bg-white rounded-lg border border-gray-200 border-l-4 ${priorityColors[card.priority]} shadow-sm hover:shadow-md hover:border-primary-300 cursor-pointer transition-all duration-150 mb-2`}
    >
      {/* Labels */}
      {card.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2">
          {card.labels.map((label) => (
            <span
              key={label.id}
              className="px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.text}
            </span>
          ))}
        </div>
      )}

      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{card.title}</p>

        {/* Badges row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          {card.dueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
              <Clock className="w-3 h-3" />
              {new Date(card.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {(card._count?.comments ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {card._count?.comments}
            </span>
          )}
          {(card._count?.attachments ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {card._count?.attachments}
            </span>
          )}
          <div className="flex-1" />
          {card.assignee && (
            <Avatar name={card.assignee.name} size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== List Column Component ====================
function ListColumn({
  list,
  onCardClick,
  onAddCard,
}: {
  list: List;
  onCardClick: (cardId: string) => void;
  onAddCard: (listId: string) => void;
}) {
  return (
    <div className="flex flex-col w-72 shrink-0 bg-gray-100/80 rounded-xl">
      {/* List header */}
      <div className="flex items-center justify-between px-3 py-3">
        <h3 className="font-semibold text-sm text-gray-700">{list.title}</h3>
        <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
          {list.cards?.length || 0}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-2 min-h-[60px] overflow-y-auto max-h-[calc(100vh-280px)]">
        <SortableContext
          items={list.cards?.map((c) => c.id) || []}
          strategy={verticalListSortingStrategy}
        >
          {list.cards?.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card.id)}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {(!list.cards || list.cards.length === 0) && (
          <div className="text-center py-6">
            <p className="text-xs text-gray-400">拖拽卡片到这里</p>
          </div>
        )}
      </div>

      {/* Add card button */}
      <div className="px-2 pb-2">
        <button
          onClick={() => onAddCard(list.id)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200/80 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加卡片
        </button>
      </div>
    </div>
  );
}

// ==================== Main Board Page ====================
export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { lists, setLists, moveCard, addCard, updateCard, removeCard } = useBoardStore();
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  // Init socket for real-time
  useSocket(id);

  // Sensors for drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Fetch board
  const { data: board, isLoading } = useQuery({
    queryKey: ['board', id],
    queryFn: async () => {
      const res = await apiClient.get<Board>(`/boards/${id}`);
      setLists(res.data.lists as any);
      return res.data;
    },
    enabled: !!id,
  });

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const card = event.active.data.current?.card as CardType;
    setActiveCard(card);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source and destination lists
    const sourceList = lists.find((l) => l.cards?.some((c) => c.id === activeId));
    if (!sourceList) return;

    // Check if dropping on a card or on empty list area
    let destList = lists.find((l) => l.id === overId);
    if (!destList) {
      destList = lists.find((l) => l.cards?.some((c) => c.id === overId));
    }
    if (!destList) return;

    const card = sourceList.cards?.find((c) => c.id === activeId);
    if (!card) return;

    // Find new index in destination list
    const destCards = destList.cards || [];
    const overIndex = destCards.findIndex((c) => c.id === overId);
    const newIndex = overIndex >= 0 ? overIndex : destCards.length;

    // Update local state
    moveCard(activeId, sourceList.id, destList.id, newIndex);

    // Call API
    try {
      await apiClient.put('/cards/reorder', {
        cardId: activeId,
        fromListId: sourceList.id,
        toListId: destList.id,
        position: newIndex,
      });
    } catch {
      toast.error('移动失败');
      queryClient.invalidateQueries({ queryKey: ['board', id] });
    }
  }, [lists, moveCard, id, queryClient]);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Could add visual feedback here
  }, []);

  // Create card
  const handleAddCard = async () => {
    if (!newCardTitle.trim() || !addingToListId) return;
    try {
      const res = await apiClient.post('/cards', {
        title: newCardTitle.trim(),
        listId: addingToListId,
      });
      addCard(addingToListId, res.data.card);
      setNewCardTitle('');
      setAddingToListId(null);
      toast.success('卡片已添加');
    } catch {
      toast.error('添加失败');
    }
  };

  // Update card (from detail modal)
  const handleCardUpdate = (updated: CardType) => {
    updateCard(updated.id, updated);
  };

  // Delete card (from detail modal)
  const handleCardDelete = (cardId: string) => {
    removeCard(cardId);
  };

  // Create list
  const handleAddList = async () => {
    const title = prompt('列表名称：');
    if (!title?.trim()) return;
    try {
      const res = await apiClient.post('/lists', { title: title.trim(), boardId: id });
      useBoardStore.getState().addList(res.data);
      toast.success('列表已添加');
    } catch {
      toast.error('添加列表失败');
    }
  };

  if (isLoading) return <Loading text="加载看板中..." />;

  const members = (board as any)?.members || [];

  return (
    <div className="h-screen flex flex-col">
      {/* Board Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              ←
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{board?.title}</h1>
            </div>
            {/* Member avatars */}
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((m: any) => (
                <Avatar key={m.userId} name={m.user?.name || '?'} size="sm" />
              ))}
              {members.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 ring-2 ring-white">
                  +{members.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Link
              to={`/board/${id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-white text-gray-900 shadow-sm"
            >
              <GripVertical className="w-4 h-4" /> 看板
            </Link>
            <Link
              to={`/board/${id}/calendar`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <Calendar className="w-4 h-4" /> 日历
            </Link>
            <Link
              to={`/board/${id}/stats`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <BarChart3 className="w-4 h-4" /> 统计
            </Link>
            <Link
              to={`/board/${id}/settings`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <Settings className="w-4 h-4" /> 设置
            </Link>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 board-scroll">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="flex gap-4 items-start h-full">
            {lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                onCardClick={setSelectedCardId}
                onAddCard={setAddingToListId}
              />
            ))}

            {/* Add list button */}
            <div className="w-72 shrink-0">
              <button
                onClick={handleAddList}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-white/60 border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-medium">添加列表</span>
              </button>
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeCard ? (
              <div className="w-72 bg-white rounded-lg border-2 border-primary-400 shadow-xl rotate-2 p-3">
                <p className="text-sm font-medium text-gray-900">{activeCard.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Quick add card input (inline in list) */}
      {addingToListId && (
        <div className="fixed inset-0 z-40" onClick={() => setAddingToListId(null)}>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="input text-sm"
              placeholder="输入卡片标题..."
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCard();
                if (e.key === 'Escape') setAddingToListId(null);
              }}
            />
            <div className="flex gap-2 mt-3">
              <button className="btn-primary text-sm flex-1" onClick={handleAddCard}>
                添加
              </button>
              <button className="btn-secondary text-sm" onClick={() => setAddingToListId(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Detail Modal */}
      <CardDetail
        cardId={selectedCardId}
        boardId={id!}
        members={members}
        onClose={() => setSelectedCardId(null)}
        onUpdate={handleCardUpdate}
        onDelete={handleCardDelete}
      />
    </div>
  );
}
