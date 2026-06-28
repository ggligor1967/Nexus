"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "login" | "sign-up";

export default function AuthForm({ mode, nextPath = "/dashboard" }: { mode: AuthMode; nextPath?: string }) {
  const router = useRouter();
  const next = nextPath;
  const supabase = createBrowserSupabaseClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setSubmitting(true);

    try {
      if (mode === "sign-up") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || undefined
            }
          }
        });

        if (signUpError) throw signUpError;

        setStatus("Sign-up succeeded. Check your email if confirmations are enabled.");
        router.push(next);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        router.push(next);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit} data-testid="auth-form">
      <h1>{mode === "login" ? "Log in" : "Create account"}</h1>

      {mode === "sign-up" ? (
        <label>
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Ada Lovelace"
          />
        </label>
      ) : null}

      <label>
        Email
        <input
          data-testid="auth-email-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="you@example.com"
        />
      </label>

      <label>
        Password
        <input
          data-testid="auth-password-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          placeholder="Minimum 8 characters"
        />
      </label>

      {status ? <p className="card success">{status}</p> : null}
      {error ? <p className="card error">{error}</p> : null}

      <button type="submit" disabled={isSubmitting} data-testid="auth-submit-button">
        {isSubmitting
          ? mode === "login"
            ? "Logging in..."
            : "Creating account..."
          : mode === "login"
            ? "Log in"
            : "Sign up"}
      </button>
    </form>
  );
}
