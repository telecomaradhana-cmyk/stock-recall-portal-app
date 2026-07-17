export default function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[17px] font-medium text-ink">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-[14px] text-muted">{hint}</p>}
    </div>
  );
}
