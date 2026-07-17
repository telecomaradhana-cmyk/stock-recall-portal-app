"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import EmptyState from "@/components/EmptyState";

type ProductRow = { sku: string; name: string; category: string | null; current_stock: number };
type RecallRow = {
  sku: string;
  product_name: string;
  source: string;
  quantity: number;
  status: string;
  reason: string | null;
  order_id: string | null;
  return_date: string | null;
  created_at: string;
};

const PIE_COLORS = ["#d97706", "#0071e3", "#1e8e3e", "#d93025"];

export default function ReportsCharts({
  products,
  recallItems,
}: {
  products: ProductRow[];
  recallItems: RecallRow[];
}) {
  const stockByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const key = p.category?.trim() || "Uncategorized";
      map.set(key, (map.get(key) ?? 0) + p.current_stock);
    }
    return Array.from(map, ([category, stock]) => ({ category, stock }));
  }, [products]);

  const recallsOverTime = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of recallItems) {
      const day = r.created_at.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + r.quantity);
    }
    return Array.from(map, ([date, units]) => ({ date, units })).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [recallItems]);

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of recallItems) {
      map.set(r.status, (map.get(r.status) ?? 0) + 1);
    }
    return Array.from(map, ([status, count]) => ({ status, count }));
  }, [recallItems]);

  function exportCsv() {
    const header = [
      "source",
      "sku",
      "product_name",
      "quantity",
      "status",
      "reason",
      "order_id",
      "return_date",
      "created_at",
    ];
    const rows = recallItems.map((r) =>
      header.map((h) => JSON.stringify((r as any)[h] ?? "")).join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recall-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasData = products.length > 0 || recallItems.length > 0;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-ink">Reports</h1>
          <p className="mt-1 text-[15px] text-muted">Stock health and recall activity at a glance.</p>
        </div>
        <button className="btn-secondary" onClick={exportCsv} disabled={recallItems.length === 0}>
          Export recalls CSV
        </button>
      </div>

      {!hasData ? (
        <EmptyState title="Nothing to report yet" hint="Add products and import a recall CSV to see charts here." />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="card p-6">
            <p className="mb-4 text-[13px] font-medium text-muted">Stock by category</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stockByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e7" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12, fill: "#6e6e73" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6e6e73" }} />
                <Tooltip />
                <Bar dataKey="stock" fill="#0071e3" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <p className="mb-4 text-[13px] font-medium text-muted">Recall units over time</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={recallsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6e6e73" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6e6e73" }} />
                <Tooltip />
                <Line type="monotone" dataKey="units" stroke="#1d1d1f" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6 lg:col-span-2">
            <p className="mb-4 text-[13px] font-medium text-muted">Recall items by status</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {statusBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
