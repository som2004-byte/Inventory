export declare function toolListLowStock(args: Record<string, unknown>): Promise<{
    count: number;
    items: {
        sku: string;
        name: string;
        quantity: number;
        reorderLevel: number;
        category: string | null;
    }[];
}>;
export declare function toolSearchItems(args: Record<string, unknown>): Promise<{
    items: {
        sku: string;
        name: string;
        quantity: number;
    }[];
}>;
export declare function toolGetItemBySku(args: Record<string, unknown>): Promise<{
    found: false;
    message: string;
    sku?: undefined;
    name?: undefined;
    description?: undefined;
    quantity?: undefined;
    unit?: undefined;
    reorderLevel?: undefined;
    unitCost?: undefined;
    category?: undefined;
} | {
    found: false;
    sku: string;
    message?: undefined;
    name?: undefined;
    description?: undefined;
    quantity?: undefined;
    unit?: undefined;
    reorderLevel?: undefined;
    unitCost?: undefined;
    category?: undefined;
} | {
    found: true;
    sku: string;
    name: string;
    description: string | null;
    quantity: number;
    unit: string;
    reorderLevel: number;
    unitCost: number | null;
    category: string | null;
    message?: undefined;
}>;
export declare function toolGetCatalogStats(_args: Record<string, unknown>): Promise<{
    itemCount: number;
    categoryCount: number;
    lowStockCount: number;
    totalUnitsRounded: number;
}>;
export declare function toolListCategories(_args: Record<string, unknown>): Promise<{
    categories: {
        name: string;
        description: string | null;
        itemCount: number;
    }[];
}>;
export declare function dispatchInventoryTool(name: string, args: Record<string, unknown>): Promise<{
    items: {
        sku: string;
        name: string;
        quantity: number;
    }[];
} | {
    found: false;
    message: string;
    sku?: undefined;
    name?: undefined;
    description?: undefined;
    quantity?: undefined;
    unit?: undefined;
    reorderLevel?: undefined;
    unitCost?: undefined;
    category?: undefined;
} | {
    found: false;
    sku: string;
    message?: undefined;
    name?: undefined;
    description?: undefined;
    quantity?: undefined;
    unit?: undefined;
    reorderLevel?: undefined;
    unitCost?: undefined;
    category?: undefined;
} | {
    found: true;
    sku: string;
    name: string;
    description: string | null;
    quantity: number;
    unit: string;
    reorderLevel: number;
    unitCost: number | null;
    category: string | null;
    message?: undefined;
} | {
    itemCount: number;
    categoryCount: number;
    lowStockCount: number;
    totalUnitsRounded: number;
} | {
    categories: {
        name: string;
        description: string | null;
        itemCount: number;
    }[];
} | {
    error: string;
    name: string;
}>;
