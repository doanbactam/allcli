import {
  Bot,
  Code2,
  DollarSign,
  LayoutDashboard,
  ListTodo,
  Menu,
  ChevronRight,
  Terminal,
  Wifi,
} from "lucide-react";
import { BrowserRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { createContext, useCallback, useContext, useState } from "react";
import { Agentation } from "agentation";
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
  { to: "/", label: "Explorer", icon: LayoutDashboard },
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

/** Breadcrumb-style title bar above content area */
function TitleBar() {
  const location = useLocation();
  const currentNav = navItems.find((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to),
  );

  const segments = [
    { label: "AllCLI", active: false },
    { label: currentNav?.label ?? "Dashboard", active: true },
  ];

  return (
    <div className="flex h-[35px] items-center border-b border-border bg-card px-4">
      <div className="flex items-center gap-1 text-xs">
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
            <span
              className={cn(
                seg.active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground cursor-default",
              )}
            >
              {seg.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Mobile header for small screens */
function MobileHeader() {
  const { toggleMobile } = useSidebar();

  return (
    <header className="flex h-10 items-center justify-between border-b border-border bg-surface-1 px-3 lg:hidden">
      <div className="flex items-center gap-2">
        <Terminal className="size-4 text-primary" />
        <span className="text-xs font-medium text-foreground">AllCLI</span>
      </div>
      <button
        type="button"
        onClick={toggleMobile}
        className="flex size-7 items-center justify-center rounded text-subtext hover:bg-surface-2 hover:text-foreground"
        aria-label="Open menu"
      >
        <Menu className="size-4" />
      </button>
    </header>
  );
}

/** Status bar at the bottom — IDE style */
function StatusBar() {
  const location = useLocation();
  const currentNav = navItems.find((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to),
  );

  return (
    <footer className="flex h-[22px] items-center border-t border-[#313244] bg-[#181825] px-2 text-[11px]">
      <div className="flex items-center gap-3">
        {/* Branch indicator */}
        <span className="flex items-center gap-1 text-subtext">
          <Terminal className="size-3" />
          main
        </span>

        {/* Current view */}
        <span className="text-subtext">{currentNav?.label ?? "Explorer"}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Live indicator */}
        <span className="flex items-center gap-1 text-success">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
          </span>
          Live
        </span>

        {/* Connection status placeholder */}
        <span className="flex items-center gap-1 text-subtext">
          <Wifi className="size-3" />
          Connected
        </span>

        {/* Line/col style info */}
        <span className="text-subtext">v0.1.0</span>
      </div>
    </footer>
  );
}

/** Activity bar — icon-only vertical strip, VS Code style */
function ActivityBar() {
  const location = useLocation();

  return (
    <nav className="flex w-12 flex-col items-center border-r border-border bg-sidebar pt-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.to);

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={cn(
              "group relative flex size-12 items-center justify-center transition-colors",
              isActive
                ? "text-foreground"
                : "text-subtext hover:text-foreground",
            )}
            title={item.label}
          >
            {/* Active indicator — left border accent */}
            {isActive && (
              <span className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 bg-primary" />
            )}
            <Icon className="size-5" />
          </NavLink>
        );
      })}
    </nav>
  );
}

/** Sidebar panel — file-tree style, collapsible */
function SidebarPanel() {
  const { collapsed, mobileOpen, setCollapsed, setMobileOpen } = useSidebar();

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, [setMobileOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
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
          "flex flex-col border-r border-border bg-surface-1 transition-[width] duration-100",
          collapsed ? "w-0 overflow-hidden lg:w-0" : "w-56",
          mobileOpen && "fixed left-12 top-0 z-50 h-dvh w-56 lg:static lg:h-auto lg:z-auto",
        )}
      >
        {/* Panel header */}
        <div className="flex h-[35px] shrink-0 items-center justify-between border-b border-border px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-subtext">
            Explorer
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex size-5 items-center justify-center rounded text-subtext hover:bg-surface-2 hover:text-foreground"
            aria-label="Collapse sidebar"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {/* Navigation items — file-tree style */}
        <nav className="flex flex-1 flex-col py-1">
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
                    "flex items-center gap-2 px-3 py-1 text-xs transition-colors",
                    isActive
                      ? "bg-surface-2 text-foreground"
                      : "text-subtext hover:bg-surface-2/50 hover:text-foreground",
                  )
                }
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

/** Expand sidebar button — shows when collapsed */
function ExpandButton() {
  const { collapsed, setCollapsed, setMobileOpen } = useSidebar();

  if (!collapsed) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (window.innerWidth >= 1024) {
          setCollapsed(false);
        } else {
          setMobileOpen(true);
        }
      }}
      className="flex size-12 items-center justify-center text-subtext hover:text-foreground lg:flex"
      aria-label="Expand sidebar"
      title="Show Explorer"
    >
      <ChevronRight className="size-4" />
    </button>
  );
}

export function App() {
  const [collapsed, setCollapsed] = useState(true);
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
        <div className="flex h-dvh flex-col bg-background text-foreground">
          {/* Main IDE area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Activity bar — always visible */}
            <div className="hidden lg:flex">
              <ActivityBar />
            </div>

            {/* Mobile: activity bar + sidebar combined */}
            <MobileHeader />

            {/* Sidebar panel — collapsible */}
            <div className="hidden lg:flex">
              <SidebarPanel />
            </div>

            {/* Expand button when sidebar is collapsed */}
            <div className="hidden lg:flex flex-col">
              <ExpandButton />
            </div>

            {/* Content area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Title bar */}
              <div className="hidden lg:flex">
                <TitleBar />
              </div>

              {/* Tab bar — IDE style */}
              <TabBar />

              {/* Scrollable content */}
              <main className="flex-1 overflow-y-auto p-4">
                <Routes>
                  <Route path="/" element={<DashboardHome />} />
                  <Route path="/agents" element={<AgentsPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/review" element={<ReviewPage />} />
                  <Route path="/costs" element={<CostsPage />} />
                </Routes>
              </main>
            </div>
          </div>

          {/* Status bar */}
          <StatusBar />

          {/* Agentation — dev-only annotation tool */}
          {import.meta.env.DEV && <Agentation />}
        </div>
      </SidebarContext.Provider>
    </BrowserRouter>
  );
}

/** IDE-style tab bar showing open views */
function TabBar() {
  const location = useLocation();

  const activeTab = navItems.find((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to),
  );

  // Show current tab + always show "welcome" style tab for current view
  const tabs = [
    { to: activeTab?.to ?? "/", label: activeTab?.label ?? "Dashboard", active: true },
  ];

  return (
    <div className="flex h-[35px] items-end border-b border-border bg-surface-1">
      {tabs.map((tab) => (
        <div
          key={tab.to}
          className={cn(
            "flex h-[34px] items-center gap-1.5 border-r border-border px-3 text-xs",
            tab.active
              ? "border-t-2 border-t-primary bg-background text-foreground"
              : "bg-surface-1 text-subtext hover:text-foreground",
          )}
        >
          <span>{tab.label}</span>
        </div>
      ))}
      {/* Fade edge */}
      <div className="flex-1 border-b border-border" />
    </div>
  );
}
