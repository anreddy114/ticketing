import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fmtSec = (s) => {
  if (s == null) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
};

const fmtDt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = () => {
    const params = {};
    if (filter !== "all") params.user_id = filter;
    api.get("/agents/sessions", { params }).then((r) => setSessions(r.data));
  };

  useEffect(() => { api.get("/users").then((r) => setUsers(r.data)); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const totalActive = sessions.filter((s) => s.active).length;
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_sec || 0), 0);

  return (
    <div className="space-y-6" data-testid="admin-sessions-page">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">Admin</p>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Login Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">Audit trail of agent login &amp; logout events with duration.</p>
        </div>
        <div className="w-64">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger data-testid="sessions-user-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Sessions</p>
          <p className="font-display text-3xl font-black mt-1">{sessions.length}</p>
        </div>
        <div className="border border-gray-200 rounded-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Active now</p>
          <p className="font-display text-3xl font-black mt-1 text-[#16A34A]">{totalActive}</p>
        </div>
        <div className="border border-gray-200 rounded-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Total time logged</p>
          <p className="font-display text-3xl font-black mt-1">{fmtSec(totalDuration)}</p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60">
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Employee</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Login at</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Logout at</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Duration</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">State</th>
            </tr>
          </thead>
          <tbody data-testid="sessions-list">
            {sessions.length === 0 && <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500 text-sm">No sessions yet.</td></tr>}
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.user_name}</td>
                <td className="px-4 py-3 text-gray-700">{fmtDt(s.login_at)}</td>
                <td className="px-4 py-3 text-gray-700">{fmtDt(s.logout_at)}</td>
                <td className="px-4 py-3 font-mono text-xs">{fmtSec(s.duration_sec)}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm ${s.active ? "text-[#16A34A] border-[#16A34A] bg-green-50" : "text-gray-500 border-gray-300"}`}>
                    {s.active ? "Active" : "Closed"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
