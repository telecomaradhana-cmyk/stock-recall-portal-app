"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import type { RecallItem, RecallStatus, Source } from "@/lib/types";
import EmptyState from "@/components/EmptyState";

const FIELD_DEFS: { key: keyof MappedRow; label: string; required: boolean }[] = [
  { key: "sku", label: "SKU", required: true },
  { key: "product_name", label: "Product name", required: true },
  { key: "quantity", label: "Quantity", required: true },
  { key: "reason", label: "Return reason", required: false },
  { key: "order_id", label: "Order ID", required: false },
  { key: "return_date", label: "Return date", required: false },
];

type MappedRow = {
  sku: string;
  product_name: string;
  quantity: string;
  reason: string;
  order_id: string;
  return_date: string;
};

type MiniProduct = { id: string; sku: string; current_stock: number };

const STATUS_LABEL: Record<RecallStatus, string> = {
  pending: "Pending",
  received: "Received",
  restocked: "Restocked",
  written_off: "Written off",
};

const STATUS_TONE: Record<RecallStatus, string> = {
  pending: "bg-warn/10 text-warn",
  received: "bg-accent/10 text-accent",
  restocked: "bg-good/10 text-good",
  written_off: "bg-bad/10 text-bad",
};

export default function RecallManager({
  initialItems,
  products,
  canEdit,
}: {
  initialItems: RecallItem[];
  products: MiniProduct[];
  canEdit: boolean;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<RecallItem[]>(initialItems);
  const [source, setSource] = useState<Source>("amazon");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<RecallStatus | "all">("all");

  const filtered = useMemo(
    () => (filterStatus === "all" ? items : items.filter((i) => i.status === filterStatus)),
    [items, filterStatus]
  );

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cols = result.meta.fields ?? [];
        setHeaders(cols);
        setRawRows(result.data);

        // Best-effort auto-mapping by fuzzy header name match
        const guess = (candidates: string[]) =>
          cols.find((c) => candidates.some((cand) => c.toLowerCase().includes(cand))) ?? "";

        setMapping({
          sku: guess(["sku", "asin", "fsn", "product id"]),
          product_name: guess(["product name", "item name", "title", "description"]),
          quantity: guess(["qty", "quantity", "units"]),
          reason: guess(["reason", "return reason", "sub-reason"]),
          order_id: guess(["order id", "order-id", "order number"]),
          return_date: guess(["return date", "returned date", "date"]),
        });
      },
      error: (err) => setError(err.message),
    });
  }

  function resetUpload() {
    setFileName(null);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function confirmImport() {
    if (!mapping.sku || !mapping.product_name || !mapping.quantity) {
      setError("Map at least SKU, product name and quantity before importing.");
      return;
    }
    setUploading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: batch, error: batchError } = await supabase
      .from("recall_batches")
      .insert({
        source,
        file_name: fileName ?? "upload.csv",
        uploaded_by: user?.id,
        total_rows: rawRows.length,
      })
      .select()
      .single();

    if (batchError || !batch) {
      setUploading(false);
      return setError(batchError?.message ?? "Could not create batch");
    }

    const rows = rawRows
      .map((r) => ({
        batch_id: batch.id,
        source,
        sku: (r[mapping.sku] ?? "").trim(),
        product_name: (r[mapping.product_name] ?? "").trim(),
        quantity: Number(r[mapping.quantity]) || 1,
        reason: mapping.reason ? (r[mapping.reason] ?? "").trim() || null : null,
        order_id: mapping.order_id ? (r[mapping.order_id] ?? "").trim() || null : null,
        return_date: mapping.return_date ? parseDate(r[mapping.return_date]) : null,
        status: "pending" as RecallStatus,
      }))
      .filter((r) => r.sku && r.product_name);

    if (rows.length === 0) {
      setUploading(false);
      return setError("No valid rows found — check your column mapping.");
    }

    const { data: inserted, error: insertError } = await supabase
      .from("recall_items")
      .insert(rows)
      .select();

    setUploading(false);
    if (insertError) return setError(insertError.message);

    setItems((prev) => [...(inserted as RecallItem[]), ...prev]);
    resetUpload();
  }

  async function updateStatus(item: RecallItem, status: RecallStatus) {
    const { error } = await supabase.from("recall_items").update({ status }).eq("id", item.id);
    if (error) return alert(error.message);

    // Restocking bumps matching product's current_stock and logs a movement.
    if (status === "restocked") {
      const product = products.find((p) => p.sku.toLowerCase() === item.sku.toLowerCase());
      if (product) {
        await supabase
          .from("products")
          .update({ current_stock: product.current_stock + item.quantity })
          .eq("id", product.id);
        await supabase.from("stock_movements").insert({
          product_id: product.id,
          change_type: "recall_in",
          quantity: item.quantity,
          reference_id: item.id,
          note: `Restocked from ${item.source} recall — ${item.order_id ?? "no order id"}`,
        });
      }
    }

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-ink">Recalls &amp; Returns</h1>
        <p className="mt-1 text-[15px] text-muted">
          Upload return/recall exports from Amazon Seller Central or Flipkart Seller Hub.
        </p>
      </div>

      {canEdit && (
        <div className="card mb-8 p-6">
          {!fileName ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex rounded-full border border-hairline p-1">
                {(["amazon", "flipkart"] as Source[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className={`rounded-full px-4 py-1.5 text-[13px] font-medium capitalize transition-colors ${
                      source === s ? "bg-ink text-white" : "text-muted hover:text-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <label className="btn-secondary cursor-pointer">
                Choose CSV / Excel file
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={onFileSelected}
                />
              </label>
              <span className="text-[13px] text-muted">
                Export your returns report as CSV first, then upload it here.
              </span>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-medium text-ink">{fileName}</p>
                  <p className="text-[13px] text-muted">
                    {rawRows.length} rows detected · match each column below
                  </p>
                </div>
                <button className="btn-secondary" onClick={resetUpload}>
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {FIELD_DEFS.map((f) => (
                  <div key={f.key}>
                    <label className="label">
                      {f.label} {f.required && <span className="text-bad">*</span>}
                    </label>
                    <select
                      className="input-field"
                      value={mapping[f.key] ?? ""}
                      onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                    >
                      <option value="">— Not mapped —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {error && <p className="mt-4 text-[13px] text-bad">{error}</p>}

              <div className="mt-5">
                <button className="btn-primary" onClick={confirmImport} disabled={uploading}>
                  {uploading ? "Importing…" : `Import ${rawRows.length} rows`}
                </button>
              </div>
            </div>
          )}
          {error && !fileName && <p className="mt-4 text-[13px] text-bad">{error}</p>}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        {(["all", "pending", "received", "restocked", "written_off"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              filterStatus === s ? "bg-ink text-white" : "bg-surface text-muted hover:text-ink"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No recall items"
          hint={canEdit ? "Upload a CSV export above to get started." : "Nothing to show yet."}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-hairline bg-surface text-[12px] uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Qty</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium">Order ID</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {canEdit && <th className="px-5 py-3 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-3 capitalize text-muted">{item.source}</td>
                  <td className="px-5 py-3 font-mono text-[13px] text-muted">{item.sku}</td>
                  <td className="px-5 py-3 font-medium text-ink">{item.product_name}</td>
                  <td className="px-5 py-3">{item.quantity}</td>
                  <td className="px-5 py-3 text-muted">{item.reason ?? "—"}</td>
                  <td className="px-5 py-3 text-muted">{item.order_id ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${STATUS_TONE[item.status]}`}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-5 py-3">
                      <select
                        className="input-field !py-1.5 text-[13px]"
                        value={item.status}
                        onChange={(e) => updateStatus(item, e.target.value as RecallStatus)}
                      >
                        {Object.entries(STATUS_LABEL).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
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

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
