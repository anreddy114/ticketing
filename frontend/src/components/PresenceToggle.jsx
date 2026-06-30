import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
  const heartbeatRef = useRef(null);

  // Initial: read my user state
  useEffect(() => {
    if (!user) return;
    setOnline(Boolean(user.online));
    api.get("/settings").then((r) => setStrategy(r.data.offline_strategy));
    api.get("/agents").then((r) => setAgents(r.data.filter((u) => u.id !== user.id)));
  }, [user]);

  // Heartbeat while online
  useEffect(() => {
    if (online) {
      const ping = () => api.post("/agents/heartbeat").catch(() => {});
      ping();
      heartbeatRef.current = setInterval(ping, 60_000);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    };
  }, [online]);

  const setPresence = useCallback(async (next, transfer_to = null) => {
    setBusy(true);
    try {
      const { data } = await api.post("/agents/presence", { online: next, transfer_to });
      setOnline(data.online);
      if (data.tickets_reassigned > 0) {
        toast.success(`Reassigned ${data.tickets_reassigned} open ticket(s)`);
      } else {
        toast.message(next ? "You are online" : "You are offline");
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
