/**
 * Fractional ordering helpers for Kanban items
 * Avoids O(N) bulk updates when inserting or reordering items.
 */

export const INITIAL_ORDER_SPACING = 1000;
export const MIN_FRACTION_GAP = 0.0001;

/**
 * Calculates a new order between two existing order values.
 * - If neither exists: returns 1000
 * - If only prev exists: returns prev + 1000
 * - If only next exists: returns next / 2
 * - If both exist: returns midpoint (prev + next) / 2
 */
export function calculateMidpointOrder(
  prevOrder?: number | null,
  nextOrder?: number | null
): number {
  if (prevOrder == null && nextOrder == null) {
    return INITIAL_ORDER_SPACING;
  }
  if (prevOrder == null && nextOrder != null) {
    return Math.max(0.1, nextOrder / 2);
  }
  if (prevOrder != null && nextOrder == null) {
    return prevOrder + INITIAL_ORDER_SPACING;
  }
  if (prevOrder != null && nextOrder != null) {
    return (prevOrder + nextOrder) / 2;
  }
  return INITIAL_ORDER_SPACING;
}

/**
 * Checks if the space between two fractional orders has become too narrow,
 * signaling that column items should be renormalized.
 */
export function isRebalanceNeeded(prevOrder: number, nextOrder: number): boolean {
  return Math.abs(nextOrder - prevOrder) < MIN_FRACTION_GAP;
}

/**
 * Produces normalized order numbers spaced by 1000
 */
export function rebalanceSequence<T extends { _id: string | any }>(
  items: T[]
): Array<{ _id: string; order: number }> {
  return items.map((item, index) => ({
    _id: item._id.toString(),
    order: (index + 1) * INITIAL_ORDER_SPACING,
  }));
}
