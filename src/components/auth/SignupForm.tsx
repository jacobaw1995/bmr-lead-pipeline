"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/field");
      router.refresh();
      return;
    }

    setSuccess(
      "Account created! Check your email for a confirmation link, then sign in."
    );
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-field-cream/90 mb-1">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded-lg border border-field-line/30 bg-field-dark/50 px-4 py-2.5 text-field-cream placeholder:text-field-cream/40 focus:outline-none focus:ring-2 focus:ring-field-gold/50"
          placeholder="John Smith"
        />
      </div>

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
          minLength={6}
          className="w-full rounded-lg border border-field-line/30 bg-field-dark/50 px-4 py-2.5 text-field-cream placeholder:text-field-cream/40 focus:outline-none focus:ring-2 focus:ring-field-gold/50"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-field-gold px-4 py-2.5 font-semibold text-field-dark transition hover:bg-field-gold/90 disabled:opacity-50"
      >
        {loading ? "Creating account…" : "Create Account"}
      </button>

      <p className="text-center text-sm text-field-cream/60">
        Already have an account?{" "}
        <Link href="/login" className="text-field-gold hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}