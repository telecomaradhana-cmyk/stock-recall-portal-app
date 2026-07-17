"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import EmptyState from "@/components/EmptyState";

export default function StockManager({
  initialProducts,
  canEdit,
}: {
  initialProducts: Product[];
  canEdit: boolean;
}) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "",
    current_stock: 0,
    reorder_level: 5,
    price: "",
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, query]);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("products")
      .insert({
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category.trim() || null,
        current_stock: Number(form.current_stock) || 0,
        reorder_level: Number(form.reorder_level) || 0,
        price: form.price ? Number(form.price) : null,
      })
      .select()
      .single();

    setSaving(false);
    if (error) return setError(error.message);

    setProducts((prev) => [...prev, data as Product].sort((a, b) => a.name.localeCompare(b.name)));
    setForm({ sku: "", name: "", category: "", current_stock: 0, reorder_level: 5, price: "" });
    setShowForm(false);
  }

  async function adjustStock(product: Product, delta: number) {
    const newStock = Math.max(0, product.current_stock + delta);
    const { error } = await supabase
      .from("products")
      .update({ current_stock: newStock })
      .eq("id", product.id);
    if (error) return alert(error.message);

    await supabase.from("stock_movements").insert({
      product_id: product.id,
      change_type: "manual_adjust",
      quantity: delta,
      note: "Manual adjustment from Stock page",
    });

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, current_stock: newStock } : p))
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-ink">Stock</h1>
          <p className="mt-1 text-[15px] text-muted">Current inventory levels across all products.</p>
        </div>
        <div className="flex gap-3">
          <input
            className="input-field w-56"
            placeholder="Search SKU or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {canEdit && (
            <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
              {showForm ? "Cancel" : "Add product"}
            </button>
          )}
        </div>
      </div>

      {showForm && canEdit && (
        <form onSubmit={addProduct} className="card mb-6 grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
          <div>
            <label className="label">SKU</label>
            <input
              required
              className="input-field"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Product name</label>
            <input
              required
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Category</label>
            <input
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Opening stock</label>
            <input
              type="number"
              className="input-field"
              value={form.current_stock}
              onChange={(e) => setForm({ ...form, current_stock: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Reorder level</label>
            <input
              type="number"
              className="input-field"
              value={form.reorder_level}
              onChange={(e) => setForm({ ...form, reorder_level: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Price (₹)</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          {error && <p className="sm:col-span-3 text-[13px] text-bad">{error}</p>}
          <div className="sm:col-span-3">
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save product"}
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No products yet"
          hint={canEdit ? "Add your first product to start tracking stock." : "Ask an admin to add products."}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-hairline bg-surface text-[12px] uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium">Reorder at</th>
                {canEdit && <th className="px-5 py-3 font-medium">Adjust</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-3 font-mono text-[13px] text-muted">{p.sku}</td>
                  <td className="px-5 py-3 font-medium text-ink">{p.name}</td>
                  <td className="px-5 py-3 text-muted">{p.category ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        p.current_stock <= p.reorder_level
                          ? "font-medium text-warn"
                          : "font-medium text-ink"
                      }
                    >
                      {p.current_stock}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted">{p.reorder_level}</td>
                  {canEdit && (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-secondary !px-2.5 !py-1 text-[13px]"
                          onClick={() => adjustStock(p, -1)}
                        >
                          −1
                        </button>
                        <button
                          className="btn-secondary !px-2.5 !py-1 text-[13px]"
                          onClick={() => adjustStock(p, 1)}
                        >
                          +1
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
