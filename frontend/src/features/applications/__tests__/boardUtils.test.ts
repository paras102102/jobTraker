import { describe, expect, it } from 'vitest';
import { Application, BoardResponse } from '@/types';
import { calculateBoardMove, findColumnOfCard } from '../boardUtils';

function createMockApp(id: string, status: Application['status'], position: number): Application {
  return {
    id,
    user_id: 'user-1',
    company: `Company ${id}`,
    role_title: 'Engineer',
    status,
    position,
    job_url: null,
    location: 'Remote',
    salary: 100000,
    currency: 'INR',
    notes: null,
    job_description: null,
    deadline: null,
    applied_at: '2025-01-01',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };
}

describe('boardUtils - calculateBoardMove', () => {
  const initialBoard: BoardResponse = {
    wishlist: [
      createMockApp('w0', 'wishlist', 0),
      createMockApp('w1', 'wishlist', 1),
      createMockApp('w2', 'wishlist', 2),
    ],
    applied: [
      createMockApp('a0', 'applied', 0),
      createMockApp('a1', 'applied', 1),
    ],
    interview: [],
    offer: [],
    rejected: [],
  };

  it('finds column of card correctly', () => {
    expect(findColumnOfCard(initialBoard, 'w1')).toBe('wishlist');
    expect(findColumnOfCard(initialBoard, 'a0')).toBe('applied');
    expect(findColumnOfCard(initialBoard, 'nonexistent')).toBeNull();
  });

  it('reorders within the same column moving downwards by dropping onto card w2', () => {
    // Drop w0 onto w2
    const result = calculateBoardMove(initialBoard, 'w0', 'w2');
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.targetStatus).toBe('wishlist');
    expect(result.targetPosition).toBe(2);

    const wishlistIds = result.nextBoard.wishlist.map((c) => c.id);
    expect(wishlistIds).toEqual(['w1', 'w2', 'w0']);

    // Check positions are contiguous 0, 1, 2
    expect(result.nextBoard.wishlist.map((c) => c.position)).toEqual([0, 1, 2]);
  });

  it('reorders within the same column moving upwards by dropping onto card w0', () => {
    // Drop w2 onto w0
    const result = calculateBoardMove(initialBoard, 'w2', 'w0');
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.targetStatus).toBe('wishlist');
    expect(result.targetPosition).toBe(0);

    const wishlistIds = result.nextBoard.wishlist.map((c) => c.id);
    expect(wishlistIds).toEqual(['w2', 'w0', 'w1']);
    expect(result.nextBoard.wishlist.map((c) => c.position)).toEqual([0, 1, 2]);
  });

  it('moves card across columns by dropping onto card a1', () => {
    // Drop w1 onto a1 (position 1)
    const result = calculateBoardMove(initialBoard, 'w1', 'a1');
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.targetStatus).toBe('applied');
    expect(result.targetPosition).toBe(1);

    // Source column: w0, w2 (w1 removed, gap closed)
    expect(result.nextBoard.wishlist.map((c) => c.id)).toEqual(['w0', 'w2']);
    expect(result.nextBoard.wishlist.map((c) => c.position)).toEqual([0, 1]);

    // Target column: a0, w1, a1
    expect(result.nextBoard.applied.map((c) => c.id)).toEqual(['a0', 'w1', 'a1']);
    expect(result.nextBoard.applied.map((c) => c.position)).toEqual([0, 1, 2]);
    expect(result.nextBoard.applied[1].status).toBe('applied');
  });

  it('moves card into an empty column container', () => {
    // Drop w0 into interview container
    const result = calculateBoardMove(initialBoard, 'w0', 'interview');
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.targetStatus).toBe('interview');
    expect(result.targetPosition).toBe(0);

    expect(result.nextBoard.wishlist.map((c) => c.id)).toEqual(['w1', 'w2']);
    expect(result.nextBoard.wishlist.map((c) => c.position)).toEqual([0, 1]);

    expect(result.nextBoard.interview.map((c) => c.id)).toEqual(['w0']);
    expect(result.nextBoard.interview[0].position).toBe(0);
    expect(result.nextBoard.interview[0].status).toBe('interview');
  });

  it('appends card to column when dropped directly onto column container', () => {
    // Drop w0 onto applied column container (currently 2 items: a0, a1)
    const result = calculateBoardMove(initialBoard, 'w0', 'applied');
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.targetStatus).toBe('applied');
    expect(result.targetPosition).toBe(2);
    expect(result.nextBoard.applied.map((c) => c.id)).toEqual(['a0', 'a1', 'w0']);
    expect(result.nextBoard.applied.map((c) => c.position)).toEqual([0, 1, 2]);
  });
});
