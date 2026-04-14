import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const googleRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const canUseGoogle = useMemo(() => Boolean(googleClientId), [googleClientId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (!canUseGoogle || !googleRef.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId!,
      callback: async (response) => {
        try {
          await loginWithGoogle(response.credential);
          navigate(from, { replace: true });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Google login failed");
        }
      },
      auto_select: false,
    });
    googleRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(googleRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
    });
  }, [canUseGoogle, from, googleClientId, loginWithGoogle, navigate]);

  return (
    <div className="mx-auto mt-10 max-w-md panel-strong p-8">
      <div className="mb-4 flex justify-center">
        <img
          src="/Images/Logo.png"
            alt="Inventra AI logo"
          className="h-16 w-16 rounded-2xl bg-white/70 object-cover object-top shadow-sm ring-1 ring-white/90"
        />
      </div>
      <h1 className="text-center font-display text-3xl font-semibold text-slate-900">Welcome Back</h1>
      <p className="mt-1 text-center text-sm text-slate-500">Sign in to manage your inventory</p>
      {canUseGoogle ? (
        <div className="mt-5 flex justify-center">
          <div ref={googleRef} />
        </div>
      ) : (
        <button disabled className="btn-secondary mt-5 w-full cursor-not-allowed opacity-60">
          Continue with Google (set VITE_GOOGLE_CLIENT_ID)
        </button>
      )}
      <p className="mt-4 text-center text-xs text-slate-400">OR CONTINUE WITH EMAIL</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        )}
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-base"
            title="Email address"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-base"
            title="Password"
            placeholder="Enter your password"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        Don't have an account?{" "}
        <Link to="/register" className="font-medium text-[#118a9d] hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
