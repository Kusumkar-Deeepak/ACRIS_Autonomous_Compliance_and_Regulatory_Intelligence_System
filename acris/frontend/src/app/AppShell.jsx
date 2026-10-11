import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

const navigation = [
  { label: "Dashboard", to: "/dashboard", end: true },
];

function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-slate-950/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div>
            <NavLink
              to="/dashboard"
              className="font-display text-xl font-semibold text-white hover:text-white"
            >
              ACRIS
            </NavLink>
            <p className="text-xs text-slate-500">
              Compliance intelligence workspace
            </p>
          </div>

          <nav aria-label="Primary navigation" className="flex items-center gap-2">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-accent-300 text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">
              {user?.name || "Compliance Admin"}
            </span>
            <button className="acris-button-secondary" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
