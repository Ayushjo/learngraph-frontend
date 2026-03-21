import {
  createRootRoute,
  Outlet,
  Link,
  useLocation,
} from "@tanstack/react-router";
import { useStudentStore } from "../store/student.store";
import { BookOpen, Brain, LogOut, Sprout } from "lucide-react";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const student = useStudentStore((s) => s.student);
  const clearStudent = useStudentStore((s) => s.clearStudent);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* ── Navbar ── */}
      <nav
        style={{
          height: "52px",
          background: "var(--navbar)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              background: "var(--accent)",
              borderRadius: "7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sprout size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "15px",
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "-0.2px",
            }}
          >
            Learn<span style={{ color: "var(--accent)" }}>Graph</span>
          </span>
        </Link>

        {/* Right side */}
        {student && (
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <NavLink
              to="/learn"
              active={isActive("/learn")}
              icon={<BookOpen size={13} strokeWidth={2} />}
              label="Learn"
            />
            <NavLink
              to="/graph"
              active={isActive("/graph")}
              icon={<Brain size={13} strokeWidth={2} />}
              label="My Graph"
            />

            {/* Divider */}
            <div
              style={{
                width: "1px",
                height: "18px",
                background: "rgba(255,255,255,0.1)",
                margin: "0 8px",
              }}
            />

            {/* Avatar + name */}
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#fff",
                    textTransform: "uppercase",
                  }}
                >
                  {student.name.charAt(0)}
                </span>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.75)",
                  textTransform: "capitalize",
                  maxWidth: "100px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {student.name}
              </span>
            </div>

            {/* Sign out */}
            <button
              onClick={clearStudent}
              title="Sign out"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#F87171";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.35)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "7px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.35)",
                marginLeft: "6px",
                transition: "all 0.15s",
              }}
            >
              <LogOut size={13} strokeWidth={2} />
            </button>
          </div>
        )}
      </nav>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({
  to,
  active,
  icon,
  label,
}: {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to as any}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "5px 10px",
        borderRadius: "7px",
        textDecoration: "none",
        fontSize: "12px",
        fontWeight: 500,
        color: active ? "#fff" : "rgba(255,255,255,0.5)",
        background: active ? "rgba(232,68,106,0.2)" : "transparent",
        transition: "all 0.15s",
      }}
    >
      {icon}
      {label}
    </Link>
  );
}
