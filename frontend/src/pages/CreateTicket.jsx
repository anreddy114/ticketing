import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MagnifyingGlass, CheckCircle, User, Buildings, FloppyDisk } from "@phosphor-icons/react";

export default function CreateTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [source, setSource] = useState("customer");
  const [mobile, setMobile] = useState("");
  const [customer, setCustomer] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [issueTypes, setIssueTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [issueTypeId, setIssueTypeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("self");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/issue-types").then((r) => setIssueTypes(r.data.filter((x) => x.active)));
    api.get("/users").then((r) => setUsers(r.data.filter((x) => x.active)));
  }, []);

  const lookup = async () => {
    if (!mobile.trim()) return;
    setLookupBusy(true);
    setCustomer(null);
    setConfirmed(false);
    try {
      const { data } = await api.get("/customers/lookup", { params: { mobile: mobile.trim() } });
      setCustomer(data);
    } catch (e) {
      toast.error(errorMessage(e, "Customer not found"));
    } finally {
      setLookupBusy(false);
    }
  };

  const canSubmit = () => {
    if (!issueTypeId || !title.trim() || !description.trim()) return false;
    if (source === "customer" && !confirmed) return false;
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        source,
        issue_type_id: issueTypeId,
        title: title.trim(),
        description: description.trim(),
        priority,
        assigned_to: assignedTo === "self" ? null : assignedTo,
      };
      if (source === "customer") {
        payload.customer_mobile = customer.mobile;
        payload.customer_name = customer.name;
        payload.customer_email = customer.email;
        payload.customer_package = customer.package;
        payload.customer_expiry = customer.expiry_date;
        payload.customer_partner = customer.partner;
        payload.customer_acc_id = customer.acc_id;
      }
      const { data } = await api.post("/tickets", payload);
      toast.success(`Ticket ${data.ticket_number} created`);
      if (source === "customer") {
        toast.message("WhatsApp notification sent to customer", { description: data.customer_mobile });
      }
      navigate(`/tickets/${data.id}`);
    } catch (e) {
      toast.error(errorMessage(e, "Failed to create ticket"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8" data-testid="create-ticket-page">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">New</p>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Create Ticket</h1>
        <p className="text-sm text-gray-500 mt-1">Log a customer issue or a self-ticket for internal tracking.</p>
      </div>

      <div className="border border-gray-200 rounded-sm p-6 space-y-2">
        <Label>Ticket Source</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            type="button"
            onClick={() => { setSource("customer"); }}
            data-testid="source-customer-button"
            className={`text-left p-4 border rounded-sm transition-all ${source === "customer" ? "border-[#0047AB] bg-blue-50/40" : "border-gray-200 hover:border-gray-400"}`}
          >
            <User size={20} weight="duotone" className="text-[#0047AB] mb-2" />
            <p className="font-bold">Customer</p>
            <p className="text-xs text-gray-500">Search customer DB, confirm identity, send WhatsApp.</p>
          </button>
          <button
            type="button"
            onClick={() => { setSource("self"); setConfirmed(false); setCustomer(null); }}
            data-testid="source-self-button"
            className={`text-left p-4 border rounded-sm transition-all ${source === "self" ? "border-[#0047AB] bg-blue-50/40" : "border-gray-200 hover:border-gray-400"}`}
          >
            <Buildings size={20} weight="duotone" className="text-[#0047AB] mb-2" />
            <p className="font-bold">Self / Internal</p>
            <p className="text-xs text-gray-500">Track an issue for yourself or a colleague.</p>
          </button>
        </div>
      </div>

      {source === "customer" && (
        <div className="border border-gray-200 rounded-sm p-6 space-y-4">
          <Label htmlFor="mobile">Customer Mobile Number</Label>
          <div className="flex gap-2">
            <Input
              id="mobile"
              placeholder="e.g. 9999900001"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              data-testid="customer-mobile-input"
            />
            <Button
              type="button"
              onClick={lookup}
              disabled={lookupBusy || !mobile.trim()}
              className="bg-[#0a0a0a] text-white hover:bg-gray-800 rounded-sm"
              data-testid="customer-lookup-button"
            >
              <MagnifyingGlass size={16} weight="bold" className="mr-1" />
              {lookupBusy ? "Searching…" : "Search"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Enter the customer's mobile number to fetch live subscriber details from SmartPlay portal.
          </p>

          {customer && (
            <div className="border border-gray-200 rounded-sm p-4 bg-gray-50/60 space-y-3" data-testid="customer-confirm-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Found in SmartPlay DB</p>
                  <p className="font-display text-2xl font-black">{customer.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {customer.mobile}{customer.email ? ` · ${customer.email}` : ""}{customer.acc_id ? ` · Acc #${customer.acc_id}` : ""}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    {customer.package && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Package</p>
                        <p className="text-xs font-medium">{customer.package}</p>
                      </div>
                    )}
                    {customer.expiry_date && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Expiry</p>
                        <p className="text-xs font-medium">{customer.expiry_date}</p>
                      </div>
                    )}
                    {customer.partner && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Partner</p>
                        <p className="text-xs font-medium">{customer.partner}{customer.partner_code ? ` (${customer.partner_code})` : ""}</p>
                      </div>
                    )}
                  </div>
                </div>
                {confirmed ? (
                  <span className="inline-flex items-center gap-1 text-[#16A34A] text-xs font-bold uppercase tracking-wider shrink-0">
                    <CheckCircle size={16} weight="fill" /> Confirmed
                  </span>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setConfirmed(true)}
                    data-testid="customer-confirm-button"
                    className="bg-[#16A34A] hover:bg-green-700 text-white rounded-sm shrink-0"
                  >
                    <CheckCircle size={16} weight="bold" className="mr-1" /> Confirm name &amp; proceed
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border border-gray-200 rounded-sm p-6 space-y-4">
        <h2 className="font-display font-bold tracking-tight">Ticket Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Issue Type</Label>
            <Select value={issueTypeId} onValueChange={setIssueTypeId}>
              <SelectTrigger data-testid="issue-type-select"><SelectValue placeholder="Select issue type" /></SelectTrigger>
              <SelectContent>
                {issueTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="priority-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Title</Label>
            <Input
              placeholder="Short summary of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="ticket-title-input"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea
              placeholder="What is the customer experiencing? Steps to reproduce, expected outcome…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              data-testid="ticket-description-input"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Assign To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger data-testid="assignee-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Myself ({user?.name})</SelectItem>
                {users.filter((u) => u.id !== user?.id).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} · {u.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)} className="rounded-sm">Cancel</Button>
        <Button
          onClick={submit}
          disabled={!canSubmit() || submitting}
          className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm"
          data-testid="ticket-submit-button"
        >
          <FloppyDisk size={16} weight="bold" className="mr-1" />
          {submitting ? "Creating…" : "Create Ticket"}
        </Button>
      </div>
    </div>
  );
}
