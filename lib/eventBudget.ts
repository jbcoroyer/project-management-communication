/** Valorise une sortie de stock (change_amount &lt; 0) pour le suivi budgétaire événement. */
export function stockMovementCostEuros(movement: {
  changeAmount: number;
  unitPriceAtMovement: number | null;
  fallbackUnitPrice: number;
}): number {
  if (movement.changeAmount >= 0) return 0;
  const unit =
    movement.unitPriceAtMovement != null && Number.isFinite(movement.unitPriceAtMovement)
      ? Number(movement.unitPriceAtMovement)
      : movement.fallbackUnitPrice;
  return Math.abs(movement.changeAmount) * Math.max(0, unit);
}
