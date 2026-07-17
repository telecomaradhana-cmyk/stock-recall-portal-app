"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/stock", label: "Stock" },
  { href: "/recalls", label: "Recalls" },
  { href: "/reports", label: "Reports" },
];

export default function Shell({
  children,
  role,
  fullName,
}: {
  children: React.ReactNode;
  role: Role;
  fullName: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const links = role === "admin" ? [...NAV, { href: "/users", label: "Users" }] : NAV;

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-surface">
      <nav className="sticky top-0 z-40 border-b border-black/10 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <span className="font-display text-[15px] font-semibold text-white">
              Stock &amp; Recall Portal
            </span>
            <div className="hidden gap-6 sm:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`text-[13px] transition-colors ${
                    pathname === l.href
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-[12px] text-white/50 sm:inline">
              {fullName || "—"} · {role}
            </span>
            <button
              onClick={signOut}
              className="rounded-full border border-white/20 px-3.5 py-1 text-[12px] text-white/80 transition-colors hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="flex gap-5 overflow-x-auto border-t border-white/10 px-6 py-2 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap text-[12px] ${
                pathname === l.href ? "text-white" : "text-white/60"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1200px] px-6 py-10">{children}</main>
    </div>
  );
}
