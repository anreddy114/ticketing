import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { Ticket, Clock, CheckCircle, WarningCircle, Trophy, Star } from "@phosphor-icons/react";

const fmtMin = (sec) => {
  if (!sec || sec < 60) return `${sec || 0}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

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
  const [leaderboard, setLeaderboard] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    const [s, r, lb] = await Promise.all([
      api.get("/reports/summary"),
      api.get("/tickets", { params: { mine: true } }),
      api.get("/reports/today-leaderboard").catch(() => ({ data: [] })),
    ]);
    setSummary(s.data);
    setRecent(r.data.slice(0, 8));
    setLeaderboard(lb.data || []);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

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

      {/* Today's leaderboard */}
      <div className="border border-gray-200 rounded-sm" data-testid="today-leaderboard">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={18} weight="fill" className="text-[#D97706]" />
            <h2 className="font-display font-bold tracking-tight">Today&apos;s Top Performers</h2>
          </div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Closed · Rating · Online time</p>
        </div>
        {leaderboard.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            No activity yet today. Be the first to close a ticket!
          </div>
        ) : (
          <ol className="divide-y divide-gray-100">
            {leaderboard.map((p, i) => (
              <li key={p.user_id} className="px-5 py-3 flex items-center gap-4" data-testid={`leaderboard-row-${i}`}>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-sm font-display font-black text-sm ${
                    i === 0
                      ? "bg-[#D97706] text-white"
                      : i === 1
                      ? "bg-gray-300 text-gray-800"
                      : i === 2
                      ? "bg-[#B45309]/30 text-[#92400E]"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {i + 1}
                </span>
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="w-8 h-8 rounded-sm object-cover border border-gray-200" />
                ) : (
                  <div className="w-8 h-8 rounded-sm bg-gray-100 border border-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500">
                    {p.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{p.name}</p>
                    {p.online && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#16A34A] border border-[#16A34A] bg-green-50 px-1.5 py-0.5 rounded-sm">
                        Online
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider">{p.role}</p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="font-display text-lg font-black tracking-tight">{p.closed_today}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Closed</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-black tracking-tight flex items-center justify-end gap-1">
                      {p.rating_avg ? p.rating_avg.toFixed(1) : "—"}
                      {p.rating_avg && <Star size={12} weight="fill" className="text-[#F59E0B]" />}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Rating ({p.rating_count || 0})</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-black tracking-tight font-mono">{fmtMin(p.online_today_sec)}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Online</p>
                  </div>
                </div>
                <div className="sm:hidden text-right text-xs font-mono">
                  <p><b>{p.closed_today}</b> closed</p>
                  <p className="text-gray-500">{fmtMin(p.online_today_sec)} online</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
