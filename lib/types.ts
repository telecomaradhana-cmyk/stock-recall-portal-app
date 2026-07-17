export type Role = "admin" | "staff" | "viewer";

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  current_stock: number;
  reorder_level: number;
  price: number | null;
  created_at: string;
  updated_at: string;
};

export type Source = "amazon" | "flipkart";

export type RecallBatch = {
  id: string;
  source: Source;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
  total_rows: number;
};

export type RecallStatus = "pending" | "received" | "restocked" | "written_off";

export type RecallItem = {
  id: string;
  batch_id: string;
  source: Source;
  sku: string;
  product_name: string;
  quantity: number;
  reason: string | null;
  order_id: string | null;
  return_date: string | null;
  status: RecallStatus;
  created_at: string;
};

export type StockMovement = {
  id: string;
  product_id: string;
  change_type: "recall_in" | "sale_out" | "manual_adjust" | "restock";
  quantity: number;
  reference_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};
