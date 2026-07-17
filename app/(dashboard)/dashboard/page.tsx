import { createClient } from "@/lib/supabase/server";
import StatCard from "@/components/StatCard";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: products }, { data: recallItems }, { data: recentBatches }] = await Promise.all([
    supabase.from("products").select("id, current_stock, reorder_level"),
    supabase.from("recall_items").select("id, status, source, quantity, created_at"),
    supabase
      .from("recall_batches")
      .select("id, source, file_name, uploaded_at, total_rows")
      .order("uploaded_at", { ascending: false })
      .limit(5),
  ]);

  const totalStock = (products ?? []).reduce((s, p) => s + p.current_stock, 0);
  const lowStock = (products ?? []).filter((p) => p.current_stock <= p.reorder_level).length;
  const pendingRecalls = (recallItems ?? []).filter((r) => r.status === "pending").length;
  const amazonCount = (recallItems ?? []).filter((r) => r.source === "amazon").length;
  const flipkartCount = (recallItems ?? []).filter((r) => r.source === "flipkart").length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-ink">Overview</h1>
        <p className="mt-1 text-[15px] text-muted">
          A snapshot of your stock and marketplace recalls.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products tracked" value={products?.length ?? 0} />
        <StatCard label="Units in stock" value={totalStock} />
        <StatCard
          label="Low stock items"
          value={lowStock}
          tone={lowStock > 0 ? "warn" : "good"}
          sub={lowStock > 0 ? "At or below reorder level" : "All healthy"}
        />
        <StatCard
          label="Pending recall items"
          value={pendingRecalls}
          tone={pendingRecalls > 0 ? "bad" : "good"}
          sub="Awaiting receipt / restock"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <p className="text-[13px] font-medium text-muted">Recall items by marketplace</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-ink">Amazon</span>
              <span className="text-[14px] font-medium text-ink">{amazonCount}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${
                    amazonCount + flipkartCount === 0
                      ? 0
                      : (amazonCount / (amazonCount + flipkartCount)) * 100
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-ink">Flipkart</span>
              <span className="text-[14px] font-medium text-ink">{flipkartCount}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-ink"
                style={{
                  width: `${
                    amazonCount + flipkartCount === 0
                      ? 0
                      : (flipkartCount / (amazonCount + flipkartCount)) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted">Recent uploads</p>
            <Link href="/recalls" className="text-[13px] font-medium text-accent hover:underline">
              Upload new →
            </Link>
          </div>
          <div className="mt-4 divide-y divide-hairline">
            {(recentBatches ?? []).length === 0 && (
              <p className="py-6 text-center text-[14px] text-muted">
                No recall files uploaded yet.
              </p>
            )}
            {(recentBatches ?? []).map((b) => (
              <div key={b.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-[14px] font-medium text-ink">{b.file_name}</p>
                  <p className="text-[12px] text-muted">
                    {b.source === "amazon" ? "Amazon" : "Flipkart"} ·{" "}
                    {new Date(b.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-[13px] text-muted">{b.total_rows} rows</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
