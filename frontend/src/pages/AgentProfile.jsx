import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, FloppyDisk, ArrowLeft } from "@phosphor-icons/react";

const SENIORITY_LABEL = { junior: "Junior Engineer", mid: "Engineer", senior: "Senior Engineer" };

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

  const targetId = id || user?.id;
  const isOwnProfile = targetId === user?.id;

  const load = useCallback(async () => {
    if (!targetId) return;
    const { data } = await api.get(`/users/${targetId}/profile`);
    setData(data);
    setForm({ name: data.user.name, photo_url: data.user.photo_url || "", password: "" });
  }, [targetId]);

  useEffect(() => { load(); }, [load]);

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
