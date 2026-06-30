import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Bell, CircleDashed, SignIn, SignOut } from "@phosphor-icons/react";

const ICON = {
  agent_online: SignIn,
  agent_offline: SignOut,
};

const formatRel = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data);
      const u = data.filter((n) => !(n.read_by || []).includes(user?.id)).length;
      setUnread(u);
    } catch { /* not admin → ignored */ }
  };

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user || user.role !== "admin") return null;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      try { await api.post("/notifications/mark-read"); } catch { /* */ }
      setUnread(0);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        data-testid="notification-bell"
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-sm border border-gray-200 hover:bg-gray-50"
      >
        <Bell size={16} weight="bold" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full bg-[#FF2400] text-white flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-sm shadow-lg z-50" data-testid="notification-panel">
          <div className="px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
            <p className="text-xs uppercase tracking-wider font-bold">Notifications</p>
          </div>
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
              <CircleDashed size={20} weight="bold" />
              No notifications yet
            </div>
          )}
          <ul className="divide-y divide-gray-100">
            {items.map((n) => {
              const Icon = ICON[n.kind] || Bell;
              const tone = n.kind === "agent_online" ? "text-[#16A34A]" : "text-gray-500";
              return (
                <li key={n.id} className="px-4 py-3 flex gap-2">
                  <Icon size={16} weight="bold" className={`${tone} mt-0.5 shrink-0`} />
                  <div className="flex-1">
                    <p className="text-xs font-medium">{n.message}</p>
                    {n.tickets_reassigned > 0 && (
                      <p className="text-[10px] text-gray-500 mt-0.5">{n.tickets_reassigned} ticket(s) reassigned</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatRel(n.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
