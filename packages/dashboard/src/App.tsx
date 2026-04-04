import {
  Bot,
  Code2,
  DollarSign,
  LayoutDashboard,
  ListTodo,
  Menu,
  X,
} from "lucide-react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { AgentsPage } from "@/pages/agents";
import { CostsPage } from "@/pages/costs";
import { DashboardHome } from "@/pages/dashboard-home";
import { ReviewPage } from "@/pages/review";
import { TasksPage } from "@/pages/tasks";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/review", label: "Review", icon: Code2 },
  { to: "/costs", label: "Costs", icon: DollarSign },
];

type SidebarContextValue = {
  collapsed: boolean;
  mobileOpen: boolean;
  setCollapsed: (collapsed: boolean) => void;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

function MobileHeader() {
  const { toggleMobile } = useSidebar();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 lg:hidden">
      <span className="text-sm font-semibold text-sidebar-foreground">AllCLI</span>
      <button
        type="button"
        onClick={toggleMobile}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>
    </header>
  );
}

function Sidebar() {
  const { collapsed, mobileOpen, setCollapsed, setMobileOpen } = useSidebar();

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, [setMobileOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
          onKeyDown={(e) => e.key === "Escape" && closeMobile()}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-border bg-sidebar transition-transform duration-150 lg:translate-x-0",
          collapsed ? "w-[72px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                AllCLI
              </span>
              <span className="text-sm font-semibold text-sidebar-foreground">
                Agent Dashboard
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => (window.innerWidth >= 1024 ? setCollapsed(!collapsed) : setMobileOpen(false))}
            className={cn(
              "flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "lg:mx-auto"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {window.innerWidth >= 1024 ? (
              collapsed ? (
                <span className="text-xs font-medium">{">"}</span>
              ) : (
                <X className="size-4" />
              )
            ) : (
              <X className="size-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={closeMobile}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/70 hover:bg-muted hover:text-sidebar-foreground",
                    collapsed && "justify-center px-2"
                  )
                }
              >
                <Icon className="size-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Live indicator */}
        <div className={cn("border-t border-border p-4", collapsed && "flex justify-center")}>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg bg-card/50 px-3 py-2",
              collapsed && "px-2"
            )}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {!collapsed && (
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Live
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const contextValue: SidebarContextValue = {
    collapsed,
    mobileOpen,
    setCollapsed,
    setMobileOpen,
    toggleMobile,
  };

  return (
    <BrowserRouter>
      <SidebarContext.Provider value={contextValue}>
        <div className="min-h-dvh bg-background text-foreground">
          <Sidebar />
          <MobileHeader />
          <main
            className={cn(
              "min-h-dvh p-6 transition-[margin] duration-150",
              collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
            )}
          >
            <Routes>
              <Route path="/" element={<DashboardHome />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/costs" element={<CostsPage />} />
            </Routes>
          </main>
        </div>
      </SidebarContext.Provider>
    </BrowserRouter>
  );
}
