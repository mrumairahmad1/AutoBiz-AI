export enum Screen {
  Splash = 'splash',
  Login = 'login',
  Dashboard = 'dashboard',
  AIChat = 'ai-chat',
  Inventory = 'inventory',
  SalesRecords = 'sales-records',
  PurchaseOrders = 'purchase-orders',
  Settings = 'settings',
}

export interface SaleRecord {
  id: number;
  product: string;
  sku: string;
  quantity: number;
  amount: number;
  category: string;
  sale_date: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  reorder_point: number;
  reorder_quantity: number;
  unit_cost: number;
  holding_cost: number;
  ordering_cost: number;
  supplier: string;
  supplier_lead_days: number;
}

export interface PurchaseOrder {
  id: number;
  product: string;
  sku: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}