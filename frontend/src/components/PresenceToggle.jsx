import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth, fmtDuration } from "@/lib/auth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Circle, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function PresenceToggle() {
  const { user, refresh } = useAuth();
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [strategy, setStrategy] = useState("round_robin");
  const [agents, setAgents] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [onlineFrom, setOnlineFrom] = useState(null);
  const [tick, setTick] = useState(0);
  const heartbeatRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    setOnline(Boolean(user.online));
    api.get("/settings").then((r) => setStrategy(r.data.offline_strategy));
    api.get("/agents").then((r) => setAgents(r.data.filter((u) => u.id !== user.id)));
    api.get("/agents/online-time").then((r) => {
      if (r.data?.current_session?.online_from) {
        setOnlineFrom(r.data.current_session.online_from);
      }
    });
  }, [user]);

  useEffect(() => {
    if (online) {
      const ping = () => api.post("/agents/heartbeat").catch(() => {});
      ping();
      heartbeatRef.current = setInterval(ping, 60_000);
      tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      heartbeatRef.current = null;
      tickRef.current = null;
    };
  }, [online]);

  const setPresence = useCallback(async (next, transfer_to = null) => {
    setBusy(true);
    try {
      const { data } = await api.post("/agents/presence", { online: next, transfer_to });
      setOnline(data.online);
      if (data.online) {
        setOnlineFrom(new Date().toISOString());
        toast.message("You are online", { description: "Your time is now being recorded." });
      } else {
        setOnlineFrom(null);
        setTick(0);
        const dur = data.closed_session?.duration_sec;
        if (dur != null) {
          toast.success("Went offline", { description: `You were online for ${fmtDuration(dur)}` });
        } else {
          toast.message("You are offline");
        }
        if (data.tickets_reassigned > 0) {
          toast.success(`Reassigned ${data.tickets_reassigned} open ticket(s)`);
        }
      }
      refresh && refresh();
    } catch (e) {
      const msg = e?.response?.data?.detail || "Failed to update presence";
      toast.error(typeof msg === "string" ? msg : "Failed");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const handleToggle = () => {
    const next = !online;
    if (!next && strategy === "manual_transfer") {
      setShowTransferModal(true);
      return;
    }
    setPresence(next);
  };

  const confirmTransfer = () => {
    if (!transferTo) {
      toast.error("Pick a colleague");
      return;
    }
    setShowTransferModal(false);
    setPresence(false, transferTo);
    setTransferTo("");
  };

  let liveText = null;
  if (online && onlineFrom) {
    const sec = Math.max(0, Math.floor((Date.now() - new Date(onlineFrom).getTime()) / 1000));
    liveText = fmtDuration(sec);
    void tick;
  }

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={busy}
        data-testid="presence-toggle"
        className={`inline-flex items-center gap-2 px-3 h-9 rounded-sm border text-xs font-bold uppercase tracking-wider transition-all ${
          online
            ? "border-[#16A34A] text-[#16A34A] bg-green-50 hover:bg-green-100"
            : "border-gray-300 text-gray-500 hover:bg-gray-50"
        }`}
        title={`Strategy on offline: ${strategy}`}
      >
        {busy ? (
          <CircleNotch size={12} weight="bold" className="animate-spin" />
        ) : (
          <Circle size={10} weight="fill" />
        )}
        {online ? "Online" : "Offline"}
        {online && liveText && (
          <span className="text-[10px] font-mono ml-1 px-1.5 py-0.5 bg-[#16A34A] text-white rounded-sm" data-testid="presence-elapsed">
            {liveText}
          </span>
        )}
      </button>

      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">Transfer open tickets before going offline</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Pick a colleague who will receive your <b>open</b> tickets.
          </p>
          <Select value={transferTo} onValueChange={setTransferTo}>
            <SelectTrigger data-testid="presence-transfer-select">
              <SelectValue placeholder="Select an employee" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} · {u.role} {u.online ? "· online" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" className="rounded-sm" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0a0a0a] text-white hover:bg-gray-800 rounded-sm"
              onClick={confirmTransfer}
              data-testid="presence-transfer-confirm"
            >
              Go offline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
