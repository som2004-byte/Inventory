export declare function mapItem<T extends {
    currentQuantity: unknown;
    unitCost: unknown;
}>(row: T): T & {
    currentQuantity: number;
    unitCost: number | null;
};
