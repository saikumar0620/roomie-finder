import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { forgotPassword } from "../services/auth.service";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
      toast.success("If that email exists, a reset link has been sent!");
    } catch (err) {
      toast.error(err?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="auth-card fade-up">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52,
            background: "linear-gradient(135deg, var(--p), var(--sec))",
            borderRadius: 14, margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, boxShadow: "0 4px 16px var(--p-glow)",
          }}>🔐</div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Forgot Password</h1>
          <p style={{ color: "var(--tx2)", fontSize: "0.875rem", marginTop: 6 }}>
            Enter your email and we&apos;ll send a 15-minute reset link.
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-sm" style={{ color: "var(--tx2)" }}>
              Check your inbox (and Spam folder) for the password reset link.
            </p>
            <Link to="/login" className="btn btn-p w-full justify-center no-underline">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="lbl">Email</label>
              <input
                type="email"
                className="inp"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-p w-full py-3">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.875rem", color: "var(--tx2)" }}>
          Remembered it?{" "}
          <Link to="/login" style={{ color: "var(--p)", fontWeight: 500, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
