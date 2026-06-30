import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FloppyDisk, Copy } from "@phosphor-icons/react";

const STRATEGY_DESCRIPTIONS = {
  stay: "Do nothing. Tickets stay assigned to the offline agent.",
  round_robin: "Open tickets auto-redistribute to other online agents, one by one.",
  fallback: "All open tickets move to a single fallback employee (configurable below).",
  manual_transfer: "Agent must pick a colleague before they can go offline.",
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [strategy, setStrategy] = useState("round_robin");
  const [fallbackId, setFallbackId] = useState("");
  const [busy, setBusy] = useState(false);

  const backend = process.env.REACT_APP_BACKEND_URL || "";

  useEffect(() => {
    api.get("/settings").then((r) => {
      setSettings(r.data);
      setStrategy(r.data.offline_strategy || "round_robin");
      setFallbackId(r.data.fallback_assignee_id || "");
    });
    api.get("/users").then((r) => setUsers(r.data.filter((u) => u.active)));
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const payload = { offline_strategy: strategy };
      if (strategy === "fallback") payload.fallback_assignee_id = fallbackId || null;
      const { data } = await api.patch("/settings", payload);
      setSettings({ ...settings, ...data });
      toast.success("Settings saved");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = (txt) => {
    navigator.clipboard.writeText(txt);
    toast.message("Copied to clipboard");
  };

  if (!settings) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-8" data-testid="admin-settings-page">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">Admin</p>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">System Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Telephony hooks &amp; agent offline behavior.</p>
      </div>

      <section className="border border-gray-200 rounded-sm p-6 space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">When an agent goes offline</h2>
        <div className="space-y-2">
          <Label>Offline strategy</Label>
          <Select value={strategy} onValueChange={setStrategy}>
            <SelectTrigger data-testid="settings-strategy-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="stay">Stay assigned (no redistribution)</SelectItem>
              <SelectItem value="round_robin">Auto round-robin to online agents</SelectItem>
              <SelectItem value="fallback">Move everything to a fallback employee</SelectItem>
              <SelectItem value="manual_transfer">Force agent to pick a colleague</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">{STRATEGY_DESCRIPTIONS[strategy]}</p>
        </div>

        {strategy === "fallback" && (
          <div className="space-y-2">
            <Label>Fallback employee</Label>
            <Select value={fallbackId} onValueChange={setFallbackId}>
              <SelectTrigger data-testid="settings-fallback-select"><SelectValue placeholder="Select fallback employee" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} · {u.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={save} disabled={busy} className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm" data-testid="settings-save-button">
            <FloppyDisk size={16} weight="bold" className="mr-1" /> {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </section>

      <section className="border border-gray-200 rounded-sm p-6 space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">Telephony Webhooks</h2>
        <p className="text-xs text-gray-500">
          Point your Asterisk dialplan (or IVR) to these endpoints. Include the secret in the <code className="px-1 bg-gray-100 rounded">X-Sip-Secret</code> header.
        </p>

        <Endpoint
          label="Inbound call → auto-create ticket"
          method="POST"
          url={`${backend}${settings.sip_webhook_url}`}
          payload='{ "caller_mobile": "9866334450", "call_id": "abc-123", "did": "04035239999", "agent_busy": true }'
          onCopy={copy}
        />

        <Endpoint
          label="IVR event logger"
          method="POST"
          url={`${backend}${settings.ivr_webhook_url}`}
          payload='{ "caller_mobile": "9866334450", "event": "menu_selected", "payload": {"option": "2"}, "call_id": "abc-123" }'
          onCopy={copy}
        />

        <Endpoint
          label="IVR: check if any agent is online"
          method="GET"
          url={`${backend}/api/ivr/agent-availability`}
          payload=""
          onCopy={copy}
        />

        <div className="border-t border-gray-100 pt-3">
          <Label>SIP webhook secret (use in <code>X-Sip-Secret</code> header)</Label>
          <p className="text-xs text-gray-500 mb-1">Configure this in backend <code>.env</code> as <code>SIP_WEBHOOK_SECRET</code>.</p>
          <p className="text-xs">Heartbeat timeout: <b>{settings.heartbeat_timeout_sec}s</b> (an agent without a ping for longer is treated as offline).</p>
        </div>
      </section>

      <section className="border border-gray-200 rounded-sm p-6 space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">Public Website API</h2>
        <p className="text-xs text-gray-500">
          Use these endpoints from your customer-facing website. Include your public API key in the <code className="px-1 bg-gray-100 rounded">X-Public-Api-Key</code> header.
        </p>

        <Endpoint
          label="Lookup customer by mobile (from website form)"
          method="GET"
          url={`${backend}/api/public/customers/lookup?mobile=9866334450`}
          payload=""
          onCopy={copy}
        />

        <Endpoint
          label="Active issue types (for dropdown)"
          method="GET"
          url={`${backend}/api/public/issue-types`}
          payload=""
          onCopy={copy}
        />

        <Endpoint
          label="Create ticket from website"
          method="POST"
          url={`${backend}/api/public/tickets`}
          payload={`{
  "customer_mobile": "9866334450",
  "customer_name": "Anand Reddy",
  "issue_type_name": "Technical",
  "title": "Signal not working",
  "description": "No signal since morning",
  "priority": "high"
}`}
          onCopy={copy}
        />

        <Endpoint
          label="Submit customer feedback (rating 1-5)"
          method="POST"
          url={`${backend}/api/public/feedback`}
          payload={`{
  "ticket_number": "TKT-00012",
  "rating": 5,
  "comment": "Resolved quickly, great support!",
  "source": "website",
  "customer_mobile": "9866334450"
}`}
          onCopy={copy}
        />

        <p className="text-[11px] text-gray-500">
          Auto-assigns to an online agent (agents first, admins as fallback). Triggers WhatsApp ticket-created template.
          Returns <b>409 duplicate_ticket</b> if an open ticket already exists for the same mobile.
          Set <code>PUBLIC_API_KEY</code> in backend <code>.env</code> to enable.
        </p>
      </section>
    </div>
  );
}

function Endpoint({ label, method, url, payload, onCopy }) {
  return (
    <div className="border border-gray-200 rounded-sm p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-[#0047AB] text-[#0047AB] rounded-sm">{method}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Input readOnly value={url} className="font-mono text-xs h-8" />
        <Button size="icon" variant="outline" className="h-8 w-8 rounded-sm" onClick={() => onCopy(url)}>
          <Copy size={14} />
        </Button>
      </div>
      {payload && (
        <pre className="text-[11px] bg-gray-50 border border-gray-100 p-2 rounded-sm font-mono overflow-x-auto">{payload}</pre>
      )}
    </div>
  );
}
