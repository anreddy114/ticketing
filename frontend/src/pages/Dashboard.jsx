import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { Ticket, Clock, CheckCircle, WarningCircle } from "@phosphor-icons/react";

const StatCard = ({ label, value, icon: Icon, tone, testId, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    className="text-left border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-sm hover:border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB] focus:ring-offset-1"
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">{label}</p>
      <Icon size={20} weight="bold" className={tone} />
    </div>
    <p className="font-display text-4xl sm:text-5xl font-black tracking-tight">{value}</p>
  </button>
);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    const [s, r] = await Promise.all([
      api.get("/reports/summary"),
      api.get("/tickets", { params: { mine: true } }),
    ]);
    setSummary(s.data);
    setRecent(r.data.slice(0, 8));
  };

  useEffect(() => { load(); }, []);

  const goTo = (status) => () => navigate(status ? `/tickets?status=${status}` : "/tickets");

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">Overview</p>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Click any tile to drill into the filtered list.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-in-stagger">
        <StatCard label="Total Tickets" value={summary?.totals.total ?? "—"} icon={Ticket} tone="text-[#0047AB]" testId="stat-total" onClick={goTo(null)} />
        <StatCard label="Open" value={summary?.totals.open ?? "—"} icon={WarningCircle} tone="text-[#FF2400]" testId="stat-open" onClick={goTo("open")} />
        <StatCard label="In Progress" value={summary?.totals.in_progress ?? "—"} icon={Clock} tone="text-[#0EA5E9]" testId="stat-in-progress" onClick={goTo("in_progress")} />
        <StatCard label="Closed" value={summary?.totals.closed ?? "—"} icon={CheckCircle} tone="text-[#16A34A]" testId="stat-closed" onClick={goTo("closed")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-gray-200 rounded-sm">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-display font-bold tracking-tight">My Recent Tickets</h2>
            <Link to="/tickets" className="text-xs font-bold uppercase tracking-wider text-[#0047AB] hover:underline">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="text-left px-5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-bold">#</th>
                  <th className="text-left px-5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-bold">Title</th>
                  <th className="text-left px-5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-bold">Status</th>
                  <th className="text-left px-5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-bold">Priority</th>
                </tr>
              </thead>
              <tbody data-testid="dashboard-recent-tickets">
                {recent.length === 0 && (
                  <tr><td colSpan="4" className="px-5 py-8 text-center text-gray-500 text-sm">No tickets assigned to you yet.</td></tr>
                )}
                {recent.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{t.ticket_number}</td>
                    <td className="px-5 py-3">
                      <Link to={`/tickets/${t.id}`} className="font-medium hover:text-[#0047AB]">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-gray-200 rounded-sm p-5">
          <h2 className="font-display font-bold tracking-tight mb-4">By Issue Type</h2>
          <ul className="space-y-2">
            {(summary?.by_issue_type ?? []).slice(0, 8).map((row) => (
              <li key={row.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{row.name}</span>
                <span className="font-mono text-xs px-1.5 py-0.5 border border-gray-200 rounded-sm">{row.count}</span>
              </li>
            ))}
            {(summary?.by_issue_type ?? []).length === 0 && (
              <li className="text-sm text-gray-500">No data yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
