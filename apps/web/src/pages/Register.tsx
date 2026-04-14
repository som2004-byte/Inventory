import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await register(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto mt-8 grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden rounded-3xl bg-gradient-to-br from-cyan-800 via-teal-800 to-emerald-700 p-10 text-white shadow-xl lg:block">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-100">Get Started</p>
        <h2 className="mt-5 font-display text-4xl font-semibold leading-tight">
          Create your workspace and start organizing inventory.
        </h2>
        <p className="mt-4 max-w-md text-sm text-cyan-50/90">
          Add products, monitor stock trends, and run forecast workflows from one dashboard.
        </p>
      </section>
      <div className="panel-strong rounded-3xl p-8 lg:p-10">
      <h1 className="font-display text-3xl font-semibold text-slate-900">Create account</h1>
      <p className="mt-1 text-sm text-slate-600">Password must be at least 8 characters.</p>
      <form onSubmit={onSubmit} className="mt-7 space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-base"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full"
        >
          {pending ? "Creating…" : "Register"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-teal-700 hover:underline">
          Sign in
        </Link>
      </p>
      </div>
    </div>
  );
}
