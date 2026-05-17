import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
export default function Navbar() {
  const { user, logoutUser } = useAuthStore();
  const { darkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const confirmLogout = async () => {
    await logoutUser();
    setShowLogoutConfirm(false);
    navigate("/login");
  };

  const linkStyle = {
    textDecoration: "none",
    color: "var(--tx2)",
    fontSize: "0.875rem",
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: 8,
    transition: "all 0.2s ease",
  };

  return (
    <nav
      className="glass"
      style={{ position: "sticky", top: 0, zIndex: 50 }}
    >
      <div className="wrap">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34,
                background: "linear-gradient(135deg, var(--p), var(--acc))",
                borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, boxShadow: "0 4px 12px var(--p-glow)",
                border: "1px solid rgba(255,255,255,0.2)"
              }}>🏠</div>
              <span className="grad-text" style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.03em" }}>
                Roomie Finder
              </span>
            </Link>

            <Link to="/roommates" className="glow-pulse" style={{ 
              textDecoration: "none", marginLeft: 16, padding: "6px 14px", 
              borderRadius: 100, border: "1.5px solid transparent", 
              background: "linear-gradient(var(--sur), var(--sur)) padding-box, linear-gradient(135deg, var(--p), var(--sec)) border-box",
              color: "var(--tx)", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600,
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              Find Roommates
            </Link>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={toggleTheme}
              className="btn btn-ghost"
              style={{ width: 36, height: 36, padding: 0, borderRadius: "50%", fontSize: 16, border: "1.5px solid var(--bdr)" }}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {user ? (
              <>
                <Link to="/create" className="btn btn-o" style={{ textDecoration: "none" }}>
                  + Post
                </Link>
                <Link to="/inbox" className="btn btn-ghost" style={{ textDecoration: "none", ...linkStyle }}>
                  Inbox
                </Link>
                <Link to="/expenses" className="btn btn-ghost" style={{ textDecoration: "none", ...linkStyle }}>
                  Expenses
                </Link>
                <Link to="/profile" style={{ textDecoration: "none" }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--p), var(--sec))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    boxShadow: "0 2px 8px var(--p-glow)",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                </Link>
                <button onClick={() => setShowLogoutConfirm(true)} className="btn btn-ghost" style={{ fontSize: "0.875rem" }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost" style={{ textDecoration: "none" }}>
                  Login
                </Link>
                <Link to="/signup" className="btn btn-p" style={{ textDecoration: "none" }}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, padding: 24, animation: "fadeUp 0.2s ease"
        }}>
          <div className="auth-card fade-up" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚪</div>
            <h2 style={{ fontSize: "1.25rem", margin: "0 0 8px", color: "var(--tx)" }}>Log Out?</h2>
            <p style={{ color: "var(--tx2)", fontSize: "0.875rem", marginBottom: 24 }}>
              Are you sure you want to log out of your account?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-o" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="btn btn-p" onClick={confirmLogout}>Yes, Log out</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}