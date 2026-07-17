"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      router.push("/dashboard");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      setLoading(false);
      if (error) return setError(error.message);
      setNotice("Account created. Check your email to confirm, then sign in.");
      setMode("signin");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink">
            <span className="font-display text-xl font-semibold text-white">S</span>
          </div>
          <h1 className="text-[32px] font-semibold leading-tight text-ink">
            {mode === "signin" ? "Sign in" : "Create an account"}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            Stock &amp; Recall Portal for your Amazon &amp; Flipkart inventory.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          {mode === "signup" && (
            <div className="mb-4">
              <label className="label" htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
          )}

          <div className="mb-4">
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-bad/10 px-4 py-2.5 text-[13px] text-bad">{error}</p>
          )}
          {notice && (
            <p className="mb-4 rounded-lg bg-good/10 px-4 py-2.5 text-[13px] text-good">{notice}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <p className="mt-5 text-center text-[13px] text-muted">
            {mode === "signin" ? (
              <>
                First time here?{" "}
                <button
                  type="button"
                  className="font-medium text-accent hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-accent hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>

        <p className="mt-6 text-center text-[12px] text-muted">
          The first account created becomes the workspace admin.
        </p>
      </div>
    </main>
  );
}
