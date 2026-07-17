import { createClient } from "@/lib/supabase/server";
import ReportsCharts from "@/components/ReportsCharts";

export default async function ReportsPage() {
  const supabase = createClient();

  const [{ data: products }, { data: recallItems }] = await Promise.all([
    supabase.from("products").select("sku, name, category, current_stock"),
    supabase
      .from("recall_items")
      .select("sku, product_name, source, quantity, status, reason, order_id, return_date, created_at")
      .order("created_at", { ascending: true }),
  ]);

  return <ReportsCharts products={products ?? []} recallItems={recallItems ?? []} />;
}
