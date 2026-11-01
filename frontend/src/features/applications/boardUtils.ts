import { Application, ApplicationStatus, BoardResponse } from '@/types';

export const STATUS_COLUMNS: ApplicationStatus[] = [
  'wishlist',
  'applied',
  'interview',
  'offer',
  'rejected',
];

export const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; dotClass: string; borderClass: string }
> = {
  wishlist: {
    label: 'Wishlist',
    dotClass: 'bg-zinc-400 dark:bg-zinc-500',
    borderClass: 'border-zinc-300 dark:border-zinc-700',
  },
  applied: {
    label: 'Applied',
    dotClass: 'bg-sky-500 dark:bg-sky-400',
    borderClass: 'border-sky-300 dark:border-sky-800',
  },
  interview: {
    label: 'Interview',
    dotClass: 'bg-amber-500 dark:bg-amber-400',
    borderClass: 'border-amber-300 dark:border-amber-800',
  },
  offer: {
    label: 'Offer',
    dotClass: 'bg-teal-600 dark:bg-teal-400',
    borderClass: 'border-teal-300 dark:border-teal-800',
  },
  rejected: {
    label: 'Rejected',
    dotClass: 'bg-rose-500 dark:bg-rose-400',
    borderClass: 'border-rose-300 dark:border-rose-800',
  },
};

/**
 * Locate the status column containing an application.
 */
export function findColumnOfCard(
  board: BoardResponse,
  cardId: string
): ApplicationStatus | null {
  for (const status of STATUS_COLUMNS) {
    if (board[status]?.some((item) => item.id === cardId)) {
      return status;
    }
  }
  return null;
}

export interface MoveResult {
  targetStatus: ApplicationStatus;
  targetPosition: number;
  nextBoard: BoardResponse;
}

/**
 * Pure calculation for moving applications across or within Kanban columns.
 * Guarantees contiguous 0..n-1 positions in all affected columns.
 */
export function calculateBoardMove(
  board: BoardResponse,
  activeId: string,
  overId: string
): MoveResult | null {
  const sourceStatus = findColumnOfCard(board, activeId);
  if (!sourceStatus) return null;

  const sourceCard = board[sourceStatus].find((item) => item.id === activeId);
  if (!sourceCard) return null;

  // Determine target status and target index
  let targetStatus: ApplicationStatus | null = null;
  let targetIndex = 0;

  if (STATUS_COLUMNS.includes(overId as ApplicationStatus)) {
    // Dropped directly onto a column container
    targetStatus = overId as ApplicationStatus;
    targetIndex = board[targetStatus].length;
  } else {
    // Dropped onto another card
    targetStatus = findColumnOfCard(board, overId);
    if (!targetStatus) return null;

    const overCardIndex = board[targetStatus].findIndex((item) => item.id === overId);
    targetIndex = overCardIndex >= 0 ? overCardIndex : board[targetStatus].length;
  }

  // Clone board deeply for immutability
  const nextBoard: BoardResponse = {
    wishlist: [...board.wishlist],
    applied: [...board.applied],
    interview: [...board.interview],
    offer: [...board.offer],
    rejected: [...board.rejected],
  };

  if (sourceStatus === targetStatus) {
    // Case 1: Reordering within the same column
    const columnItems = [...nextBoard[sourceStatus]];
    const oldIndex = columnItems.findIndex((item) => item.id === activeId);
    if (oldIndex < 0) return null;

    const clampedIndex = Math.max(0, Math.min(targetIndex, columnItems.length - 1));

    // Remove and re-insert
    const [moved] = columnItems.splice(oldIndex, 1);
    columnItems.splice(clampedIndex, 0, moved);

    // Re-index contiguous positions
    nextBoard[sourceStatus] = columnItems.map((item, idx) => ({
      ...item,
      position: idx,
    }));

    return {
      targetStatus,
      targetPosition: clampedIndex,
      nextBoard,
    };
  } else {
    // Case 2: Moving across different columns
    const sourceItems = [...nextBoard[sourceStatus]];
    const targetItems = [...nextBoard[targetStatus]];

    const oldIndex = sourceItems.findIndex((item) => item.id === activeId);
    if (oldIndex < 0) return null;

    // Remove from source column
    const [moved] = sourceItems.splice(oldIndex, 1);
    // Re-index source column
    nextBoard[sourceStatus] = sourceItems.map((item, idx) => ({
      ...item,
      position: idx,
    }));

    // Clamp target position in target column
    const clampedIndex = Math.max(0, Math.min(targetIndex, targetItems.length));

    // Auto-set applied_at if moved to applied and unset
    const updatedCard: Application = {
      ...moved,
      status: targetStatus,
      applied_at:
        targetStatus === 'applied' && !moved.applied_at
          ? new Date().toISOString().split('T')[0]
          : moved.applied_at,
    };

    targetItems.splice(clampedIndex, 0, updatedCard);

    // Re-index target column
    nextBoard[targetStatus] = targetItems.map((item, idx) => ({
      ...item,
      position: idx,
    }));

    return {
      targetStatus,
      targetPosition: clampedIndex,
      nextBoard,
    };
  }
}
