export default function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "warn" | "bad" | "good";
}) {
  const toneClass =
    tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : tone === "good" ? "text-good" : "text-ink";

  return (
    <div className="card p-6">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className={`mt-2 font-display text-[34px] font-semibold leading-none ${toneClass}`}>{value}</p>
      {sub && <p className="mt-2 text-[13px] text-muted">{sub}</p>}
    </div>
  );
}
