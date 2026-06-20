import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  House, Ticket as TicketIcon, ChartBar, Tag, UsersThree, SignOut, Plus,
} from "@phosphor-icons/react";

const navItem = ({ isActive }) =>
  `flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-all ${
    isActive
      ? "bg-[#0a0a0a] text-white font-semibold"
      : "text-gray-700 hover:bg-gray-100"
  }`;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="px-6 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
              <TicketIcon size={24} weight="duotone" className="text-[#0047AB]" />
              <span className="font-display font-black text-lg tracking-tight">HelpDesk OS</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" end className={navItem} data-testid="nav-dashboard">
                <House size={16} weight="bold" /> Dashboard
              </NavLink>
              <NavLink to="/tickets" className={navItem} data-testid="nav-tickets">
                <TicketIcon size={16} weight="bold" /> Tickets
              </NavLink>
              <NavLink to="/reports" className={navItem} data-testid="nav-reports">
                <ChartBar size={16} weight="bold" /> Reports
              </NavLink>
              {user?.role === "admin" && (
                <>
                  <NavLink to="/admin/issue-types" className={navItem} data-testid="nav-issue-types">
                    <Tag size={16} weight="bold" /> Issue Types
                  </NavLink>
                  <NavLink to="/admin/users" className={navItem} data-testid="nav-users">
                    <UsersThree size={16} weight="bold" /> Employees
                  </NavLink>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button
              asChild
              className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm h-9"
              data-testid="header-new-ticket-button"
            >
              <Link to="/tickets/new"><Plus size={16} weight="bold" className="mr-1" /> New Ticket</Link>
            </Button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-sm">
              <div className="w-7 h-7 rounded-full bg-[#0047AB] text-white flex items-center justify-center text-xs font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold" data-testid="header-user-name">{user?.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">{user?.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              data-testid="header-logout-button"
              className="rounded-sm h-9"
            >
              <SignOut size={16} weight="bold" />
            </Button>
          </div>
        </div>
        {/* mobile nav */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          <NavLink to="/" end className={navItem}>Dashboard</NavLink>
          <NavLink to="/tickets" className={navItem}>Tickets</NavLink>
          <NavLink to="/reports" className={navItem}>Reports</NavLink>
          {user?.role === "admin" && (
            <>
              <NavLink to="/admin/issue-types" className={navItem}>Issue Types</NavLink>
              <NavLink to="/admin/users" className={navItem}>Employees</NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="flex-1 px-6 md:px-8 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 px-6 md:px-8 py-4 text-xs text-gray-500 flex items-center justify-between">
        <span>© HelpDesk OS · internal tool</span>
        <span className="font-bold uppercase tracking-wider">v0.1</span>
      </footer>
    </div>
  );
}
