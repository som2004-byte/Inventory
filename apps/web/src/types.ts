export type UserRole = "admin" | "user";

export type User = {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: string;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  createdAt?: string;
};

export type WarehouseZone = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt?: string;
  itemCount?: number;
};

export type Item = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: Category | null;
  zoneId: string | null;
  zone: WarehouseZone | null;
  binCode: string | null;
  unit: string;
  reorderLevel: number;
  currentQuantity: number;
  unitCost: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SmartOverview = {
  pendingReorderCount: number;
  iotEvents24h: number;
  atRiskSkuCount: number;
  warehouseZoneCount: number;
};

export type RiskSignal = {
  severity: "high" | "medium" | "low";
  type: string;
  title: string;
  detail: string;
  itemId: string;
  sku: string;
  name: string;
};

export type RiskResponse = {
  summary: { high: number; medium: number; total: number };
  signals: RiskSignal[];
};

export type IotEventRow = {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  binCode: string | null;
  source: string;
  eventType: string;
  message: string | null;
  quantityDelta: number | null;
  metadata: unknown;
  occurredAt: string;
};

export type ReorderRow = {
  id: string;
  itemId: string;
  sku: string;
  name: string;
  categoryName: string | null;
  suggestedQty: number;
  reason: string;
  status: string;
  updatedAt: string;
};

export type PaginatedItems = {
  data: Item[];
  total: number;
  page: number;
  pageSize: number;
};

export type DashboardSummary = {
  itemCount: number;
  categoryCount: number;
  lowStockCount: number;
  lowStockItems: {
    id: string;
    name: string;
    sku: string;
    currentQuantity: number;
    reorderLevel: number;
    categoryName: string | null;
  }[];
  movementTrend: { date: string; netDelta: number }[];
  stockByCategory: {
    categoryId: string | null;
    categoryName: string;
    quantity: number;
  }[];
};
