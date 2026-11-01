import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { ApplicationCard } from './ApplicationCard';
import { Column } from './Column';
import { APPLICATION_KEYS, useMoveApplication } from './api';
import { STATUS_COLUMNS, calculateBoardMove, findColumnOfCard } from './boardUtils';
import { useToast } from '@/components/Toast';
import { Application, ApplicationStatus, BoardResponse } from '@/types';

interface BoardProps {
  board: BoardResponse;
  onAddClick: (status?: ApplicationStatus) => void;
  onOpenDetail: (app: Application) => void;
  onEdit: (app: Application) => void;
  onDelete: (app: Application) => void;
}

export function Board({
  board,
  onAddClick,
  onOpenDetail,
  onEdit,
  onDelete,
}: BoardProps) {
  const [activeCard, setActiveCard] = useState<Application | null>(null);
  const queryClient = useQueryClient();
  const moveMutation = useMoveApplication();
  const { error: toastError } = useToast();

  // Sensors: pointer with 5px threshold (to distinguish click vs drag) + keyboard sensor
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = String(event.active.id);
    const colStatus = findColumnOfCard(board, cardId);
    if (!colStatus) return;

    const card = board[colStatus]?.find((i) => i.id === cardId);
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Compute target position and new board state via pure function
    const calculation = calculateBoardMove(board, activeId, overId);
    if (!calculation) return;

    const { targetStatus, targetPosition, nextBoard } = calculation;

    // Snapshot previous board state for rollback
    const previousBoard = queryClient.getQueryData<BoardResponse>(APPLICATION_KEYS.board());

    // 1. Optimistic UI update
    queryClient.setQueryData<BoardResponse>(APPLICATION_KEYS.board(), nextBoard);

    // 2. Perform API update
    try {
      await moveMutation.mutateAsync({
        id: activeId,
        move: {
          status: targetStatus,
          position: targetPosition,
        },
      });
    } catch {
      // Rollback on error
      if (previousBoard) {
        queryClient.setQueryData<BoardResponse>(APPLICATION_KEYS.board(), previousBoard);
      }
      toastError('Failed to move application. Reverted to previous position.');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3.5 pb-4 overflow-x-auto min-h-[calc(100vh-170px)]">
        {STATUS_COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            items={board[status] || []}
            onAddClick={onAddClick}
            onOpenDetail={onOpenDetail}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Drag Overlay for smooth card visual during drag */}
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <ApplicationCard
            application={activeCard}
            onOpenDetail={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
