import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, FloppyDisk, ArrowLeft, Timer, SignIn } from "@phosphor-icons/react";

const SENIORITY_LABEL = { junior: "Junior Engineer", mid: "Engineer", senior: "Senior Engineer" };

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
const shortUA = (ua) => {
  if (!ua) return "—";
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE)[/ ]([\d.]+)/);
  const browser = m ? `${m[1]} ${m[2].split(".")[0]}` : "Other";
  let os = "Unknown OS";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return `${browser} · ${os}`;
};

function Stars({ value, size = 14 }) {
  if (value == null) return <span className="text-xs text-gray-400">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          weight={i <= Math.round(value) ? "fill" : "regular"}
          className={i <= Math.round(value) ? "text-[#f59e0b]" : "text-gray-300"}
        />
      ))}
      <span className="text-xs font-mono text-gray-600 ml-1">{value.toFixed(2)}</span>
    </span>
  );
}

export default function AgentProfile() {
  const { id } = useParams();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ name: "", photo_url: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [timeStats, setTimeStats] = useState(null);
  const [presenceSessions, setPresenceSessions] = useState([]);
  const [loginSessions, setLoginSessions] = useState([]);

  const targetId = id || user?.id;
  const isOwnProfile = targetId === user?.id;

  const load = useCallback(async () => {
    if (!targetId) return;
    const { data } = await api.get(`/users/${targetId}/profile`);
    setData(data);
    setForm({ name: data.user.name, photo_url: data.user.photo_url || "", password: "" });
  }, [targetId]);

  const loadMyTime = useCallback(async () => {
    if (!isOwnProfile) return;
    try {
      const [t, ps, ls] = await Promise.all([
        api.get("/agents/online-time"),
        api.get("/agents/presence-sessions", { params: { limit: 20 } }),
        api.get("/agents/sessions"),
      ]);
      setTimeStats(t.data);
      setPresenceSessions(ps.data);
      setLoginSessions(ls.data);
    } catch {
      /* non-fatal */
    }
  }, [isOwnProfile]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    loadMyTime();
    if (!isOwnProfile) return;
    const t = setInterval(loadMyTime, 30_000);
    return () => clearInterval(t);
  }, [loadMyTime, isOwnProfile]);

  const saveSelf = async () => {
    setBusy(true);
    try {
      const patch = { name: form.name, photo_url: form.photo_url };
      if (form.password) patch.password = form.password;
      await api.patch("/users/me", patch);
      toast.success("Profile updated");
      setForm({ ...form, password: "" });
      refresh && refresh();
      load();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setBusy(false); }
  };

  if (!data) return <p className="text-sm text-gray-500">Loading profile…</p>;

  const u = data.user;
  const initials = (u.name || "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-4xl space-y-6" data-testid="profile-page">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#0047AB]">
        <ArrowLeft size={14} weight="bold" /> Back
      </button>

      <div className="border border-gray-200 rounded-sm p-6 flex flex-col sm:flex-row gap-6 items-start">
        <div className="w-28 h-28 rounded-sm border border-gray-200 bg-gray-50 flex items-center justify-center text-3xl font-display font-black text-[#0047AB] overflow-hidden shrink-0">
          {u.photo_url ? (
            <img src={u.photo_url} alt={u.name} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">Profile</p>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">{u.name}</h1>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 border border-gray-300 rounded-sm">
              {u.role}
            </span>
            {u.seniority && (
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 border border-[#0047AB] text-[#0047AB] rounded-sm">
                {SENIORITY_LABEL[u.seniority] || u.seniority}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm ${u.online ? "text-[#16A34A] border-[#16A34A] bg-green-50" : "text-gray-500 border-gray-300"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${u.online ? "bg-[#16A34A]" : "bg-gray-400"}`} />
              {u.online ? "Online" : "Offline"}
            </span>
          </div>
          <p className="text-sm text-gray-500">{u.email}</p>

          <div className="border-t border-gray-100 pt-3 mt-3 flex flex-wrap gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Customer rating</p>
              <Stars value={u.rating_avg} size={16} />
              <p className="text-[10px] text-gray-400 mt-0.5">{u.rating_count || 0} feedback</p>
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <div className="border border-gray-200 rounded-sm p-6 space-y-3" data-testid="profile-edit-self">
          <h2 className="font-display text-lg font-bold tracking-tight">Edit my profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="profile-name-input" />
            </div>
            <div className="space-y-2">
              <Label>Photo URL</Label>
              <Input
                placeholder="https://…"
                value={form.photo_url}
                onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                data-testid="profile-photo-input"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>New password (optional)</Label>
              <Input type="password" placeholder="Leave blank to keep" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="profile-password-input" />
            </div>
          </div>
          <p className="text-[11px] text-gray-500">Role &amp; seniority can only be set by an admin.</p>
          <div className="flex justify-end">
            <Button onClick={saveSelf} disabled={busy} className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm" data-testid="profile-save-button">
              <FloppyDisk size={16} weight="bold" className="mr-1" /> {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {isOwnProfile && (
        <section className="space-y-4" data-testid="my-time-sessions">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Timer size={14} weight="bold" className="text-[#16A34A]" />
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Today online</p>
              </div>
              <p className="font-display text-3xl font-black tracking-tight" data-testid="my-today-online">{fmtSec(timeStats?.today_sec)}</p>
            </div>
            <div className="border border-gray-200 rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Timer size={14} weight="bold" className="text-[#0047AB]" />
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Total online</p>
              </div>
              <p className="font-display text-3xl font-black tracking-tight" data-testid="my-total-online">{fmtSec(timeStats?.total_sec)}</p>
            </div>
            <div className="border border-gray-200 rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Timer size={14} weight="bold" className="text-gray-500" />
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Online sessions</p>
              </div>
              <p className="font-display text-3xl font-black tracking-tight" data-testid="my-online-sessions-count">{timeStats?.sessions_count ?? 0}</p>
            </div>
            <div className="border border-gray-200 rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <SignIn size={14} weight="bold" className="text-gray-500" />
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Login sessions</p>
              </div>
              <p className="font-display text-3xl font-black tracking-tight" data-testid="my-login-sessions-count">{loginSessions.length}</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/60">
              <h2 className="font-display font-bold tracking-tight">My online sessions</h2>
              <p className="text-[11px] text-gray-500">Time spent in Online state. Auto-refreshes every 30s.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">From</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Until</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Duration</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">State</th>
                  </tr>
                </thead>
                <tbody data-testid="my-presence-rows">
                  {presenceSessions.length === 0 && (
                    <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-500 text-sm">You haven&apos;t gone online yet.</td></tr>
                  )}
                  {presenceSessions.map((s, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{fmtDt(s.online_from)}</td>
                      <td className="px-4 py-3 text-gray-700">{fmtDt(s.online_until)}</td>
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

          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/60">
              <h2 className="font-display font-bold tracking-tight">My login sessions</h2>
              <p className="text-[11px] text-gray-500">Platform login audit — IP, browser &amp; duration.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Login at</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Logout at</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Duration</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">IP</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Browser · OS</th>
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">State</th>
                  </tr>
                </thead>
                <tbody data-testid="my-login-rows">
                  {loginSessions.length === 0 && (
                    <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">No login sessions yet.</td></tr>
                  )}
                  {loginSessions.slice(0, 20).map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{fmtDt(s.login_at)}</td>
                      <td className="px-4 py-3 text-gray-700">{fmtDt(s.logout_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{fmtSec(s.duration_sec)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{s.ip_address || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600" title={s.user_agent}>{shortUA(s.user_agent)}</td>
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
        </section>
      )}

      <div className="border border-gray-200 rounded-sm">
        <div className="px-5 py-4 border-b border-gray-200">
          <p className="font-display font-bold tracking-tight">Recent customer feedback</p>
        </div>
        {(data.recent_feedback || []).length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">No feedback yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.recent_feedback.map((f) => (
              <li key={f.id} className="px-5 py-4 space-y-1">
                <div className="flex items-center justify-between">
                  <Stars value={f.rating} />
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">{f.source} · {f.ticket_number}</span>
                </div>
                {f.comment && <p className="text-sm text-gray-700">{f.comment}</p>}
                <p className="text-[10px] text-gray-400">{new Date(f.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
