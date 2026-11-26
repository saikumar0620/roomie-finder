import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { useUnreadCount } from "../hooks/useChatPresence";

export default function Navbar() {
  const { user, loading, logoutUser } = useAuthStore();
  const { darkMode, toggleTheme } = useThemeStore();
  const unreadCount = useUnreadCount(!!user);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const confirmLogout = async () => {
    await logoutUser();
    setShowLogoutConfirm(false);
    setMobileMenuOpen(false);
    navigate("/login");
  };

  const navItems = [
    { to: "/", label: "Explore" },
    { to: "/roommates", label: "Find Roommates" },
    ...(user
      ? [
          { to: "/inbox", label: "Inbox" },
          { to: "/expenses", label: "Expenses" },
        ]
      : []),
  ];

  const isActive = (to) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <nav
      className="glass sticky top-0 z-50 w-full"
      style={{ borderBottom: "1px solid var(--bdr)" }}
    >
      <div className="wrap">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Brand */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 shrink-0 no-underline"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--p), var(--acc))",
                boxShadow: "0 4px 12px var(--p-glow)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              🏠
            </div>
            <span
              className="grad-text font-bold text-base tracking-tight whitespace-nowrap"
            >
              Roomie Finder
            </span>
          </Link>

          {/* Center: Desktop Navigation Pills */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl" style={{ background: "var(--sur2)", border: "1px solid var(--bdr)" }}>
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="no-underline text-sm font-medium px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap inline-flex items-center gap-1.5"
                  style={{
                    background: active ? "var(--sur)" : "transparent",
                    color: active ? "var(--p)" : "var(--tx2)",
                    boxShadow: active ? "var(--sh1)" : "none",
                  }}
                >
                  {item.label}
                  {item.to === "/inbox" && unreadCount > 0 && (
                    <span
                      className="text-[11px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none"
                      style={{ background: "var(--p)" }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right: Desktop Actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
              style={{
                background: "var(--sur2)",
                border: "1px solid var(--bdr)",
                fontSize: 15,
              }}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {loading ? (
              <div className="flex items-center gap-2">
                <div className="skel w-24 h-9 rounded-xl" />
                <div className="skel w-9 h-9 rounded-full" />
              </div>
            ) : user ? (
              <>
                <Link
                  to="/create"
                  className="btn btn-p no-underline text-sm"
                  style={{ padding: "8px 16px" }}
                >
                  + Post Room
                </Link>
                <Link
                  to="/profile"
                  title={user.name || "Profile"}
                  className="no-underline"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-transform hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, var(--p), var(--sec))",
                      boxShadow: "0 2px 8px var(--p-glow)",
                    }}
                  >
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                </Link>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="btn btn-ghost text-sm"
                  style={{ padding: "8px 10px" }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn btn-ghost no-underline text-sm"
                  style={{ padding: "8px 14px" }}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="btn btn-p no-underline text-sm"
                  style={{ padding: "8px 16px" }}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
              style={{
                background: "var(--sur2)",
                border: "1px solid var(--bdr)",
                fontSize: 15,
              }}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
              style={{
                background: "var(--sur2)",
                border: "1px solid var(--bdr)",
                color: "var(--tx)",
                fontSize: "1.05rem",
              }}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden pb-4 pt-3 flex flex-col gap-2 border-t"
            style={{ borderColor: "var(--bdr)" }}
          >
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="no-underline text-sm font-medium px-3 py-2.5 rounded-xl text-center inline-flex items-center justify-center gap-1.5"
                    style={{
                      background: active ? "var(--p-l)" : "var(--sur2)",
                      color: active ? "var(--p)" : "var(--tx)",
                      border: `1px solid ${active ? "var(--p)" : "var(--bdr)"}`,
                    }}
                  >
                    {item.label}
                    {item.to === "/inbox" && unreadCount > 0 && (
                      <span
                        className="text-[11px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none"
                        style={{ background: "var(--p)" }}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {user ? (
              <div className="flex flex-col gap-2 mt-1">
                <Link
                  to="/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-p w-full justify-center no-underline"
                  style={{ padding: "10px 16px" }}
                >
                  + Post a Room
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn btn-o justify-center no-underline"
                    style={{ padding: "9px 12px" }}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="btn btn-o justify-center"
                    style={{ padding: "9px 12px", color: "var(--p)" }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-o justify-center no-underline"
                  style={{ padding: "9px 12px" }}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-p justify-center no-underline"
                  style={{ padding: "9px 12px" }}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 24,
            animation: "fadeUp 0.2s ease",
          }}
        >
          <div className="auth-card fade-up" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚪</div>
            <h2 style={{ fontSize: "1.25rem", margin: "0 0 8px", color: "var(--tx)" }}>
              Log Out?
            </h2>
            <p style={{ color: "var(--tx2)", fontSize: "0.875rem", marginBottom: 24 }}>
              Are you sure you want to log out of your account?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-o" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-p" onClick={confirmLogout}>
                Yes, Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
