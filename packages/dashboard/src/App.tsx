import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router-dom";
import { IdeWorkbench } from "@/pages/ide-workbench";
import { DashboardHome } from "@/pages/dashboard-home";
import { AgentsPage } from "@/pages/agents";
import { TasksPage } from "@/pages/tasks";
import { CostsPage } from "@/pages/costs";
import { ReviewPage } from "@/pages/review";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}

function Layout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <nav className="flex items-center gap-1 border-b border-border bg-card px-4 py-2">
        <span className="mr-3 text-sm font-bold tracking-tight">AllCLI</span>
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/agents">Agents</NavLink>
        <NavLink to="/tasks">Tasks</NavLink>
        <NavLink to="/review">Review</NavLink>
        <NavLink to="/costs">Costs</NavLink>
        <NavLink to="/ide">IDE</NavLink>
      </nav>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/costs" element={<CostsPage />} />
          <Route path="/ide" element={<IdeWorkbench />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
