import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { resetPassword } from "../services/auth.service";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Missing reset token");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success("Password updated! Please sign in.");
      navigate("/login");
    } catch (err) {
      toast.error(err?.message || "Invalid or expired reset link");
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
          }}>🔑</div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Set New Password</h1>
          <p style={{ color: "var(--tx2)", fontSize: "0.875rem", marginTop: 6 }}>
            Choose a strong password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="lbl">New Password</label>
            <input
              type="password"
              className="inp"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="lbl">Confirm Password</label>
            <input
              type="password"
              className="inp"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-p w-full py-3">
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.875rem", color: "var(--tx2)" }}>
          <Link to="/login" style={{ color: "var(--p)", fontWeight: 500, textDecoration: "none" }}>
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
