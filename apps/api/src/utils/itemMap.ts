export function mapItem<T extends { currentQuantity: unknown; unitCost: unknown }>(row: T) {
  return {
    ...row,
    currentQuantity: Number(row.currentQuantity),
    unitCost: row.unitCost == null ? null : Number(row.unitCost),
  };
}
