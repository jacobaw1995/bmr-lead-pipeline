"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/field");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-field-cream/90 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-field-line/30 bg-field-dark/50 px-4 py-2.5 text-field-cream placeholder:text-field-cream/40 focus:outline-none focus:ring-2 focus:ring-field-gold/50"
          placeholder="you@brothersmetalroofing.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-field-cream/90 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-field-line/30 bg-field-dark/50 px-4 py-2.5 text-field-cream placeholder:text-field-cream/40 focus:outline-none focus:ring-2 focus:ring-field-gold/50"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-field-gold px-4 py-2.5 font-semibold text-field-dark transition hover:bg-field-gold/90 disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <p className="text-center text-sm text-field-cream/60">
        No account?{" "}
        <Link href="/signup" className="text-field-gold hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}