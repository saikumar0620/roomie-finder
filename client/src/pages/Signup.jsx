import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const signupUser = useAuthStore(s => s.signupUser);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signupUser(email, password, name);
      toast.success("Account created!");
      navigate("/");
    } catch (err) {
      toast.error(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="auth-card fade-up">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52,
            background: "linear-gradient(135deg, var(--p), var(--sec))",
            borderRadius: 14, margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, boxShadow: "0 4px 16px var(--p-glow)",
          }}>✨</div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Create account</h1>
          <p style={{ color: "var(--tx2)", fontSize: "0.875rem", marginTop: 6 }}>Find your perfect roommate</p>
        </div>

        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="lbl">Full Name</label>
            <input className="inp" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="lbl">Email</label>
            <input type="email" className="inp" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="lbl">Password</label>
            <input type="password" className="inp" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-p" disabled={loading} style={{ marginTop: 8, width: "100%", padding: "12px" }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.875rem", color: "var(--tx2)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--p)", fontWeight: 500, textDecoration: "none" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}