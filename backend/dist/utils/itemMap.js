export function mapItem(row) {
    return {
        ...row,
        currentQuantity: Number(row.currentQuantity),
        unitCost: row.unitCost == null ? null : Number(row.unitCost),
    };
}
//# sourceMappingURL=itemMap.js.map