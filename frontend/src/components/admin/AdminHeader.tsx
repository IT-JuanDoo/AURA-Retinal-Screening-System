import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminAuthStore } from "../../store/adminAuthStore";

type NavItem = {
  label: string;
  path: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/admin/dashboard" },
  { label: "Analytics", path: "/admin/analytics" },
  { label: "Accounts", path: "/admin/accounts" },
  { label: "RBAC", path: "/admin/rbac" },
  { label: "AI Config", path: "/admin/ai-config" },
  { label: "Packages", path: "/admin/packages" },
  { label: "Audit Logs", path: "/admin/audit-logs" },
  { label: "Compliance", path: "/admin/compliance" },
];

export default function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logoutAdmin } = useAdminAuthStore();

  const activePath = useMemo(() => {
    // Tìm item có path khớp đầu chuỗi
    const match = navItems.find((item) =>
      location.pathname.startsWith(item.path)
    );
    return match?.path ?? "";
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="size-8 text-blue-500 flex items-center justify-center bg-blue-500/10 rounded-lg">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
            </div>
            <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">
              AURA Admin
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2">
              {navItems.map((item) => {
                const active = activePath === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-blue-600 text-white shadow-md scale-105"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Xin chào,{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {admin?.firstName || admin?.email || "Admin"}
                </span>
              </div>
            </div>
            <button
              onClick={logoutAdmin}
              className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium border border-red-600"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
