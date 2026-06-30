import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { toast } from "sonner";
import {
  ArrowsLeftRight, ChatCircleText, CheckCircle, ClockClockwise, Phone, WhatsappLogo, ArrowLeft,
} from "@phosphor-icons/react";
import StarRating from "@/components/StarRating";

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
};

const eventStyles = {
  created: { icon: ClockClockwise, color: "text-[#0047AB]" },
  transferred: { icon: ArrowsLeftRight, color: "text-orange-500" },
  comment: { icon: ChatCircleText, color: "text-gray-500" },
  status_change: { icon: CheckCircle, color: "text-[#16A34A]" },
};

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [comment, setComment] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [whatsapp, setWhatsapp] = useState([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get(`/tickets/${id}`);
    setTicket(data.ticket);
    setEvents(data.events);
    const wa = await api.get(`/whatsapp/messages`, { params: { ticket_id: id } });
    setWhatsapp(wa.data);
    try {
      const fb = await api.get(`/tickets/${id}/feedback`);
      setFeedback(fb.data);
    } catch { /* no feedback */ }
  }, [id]);

  useEffect(() => {
    load();
    api.get("/agents").then((r) => setUsers(r.data.filter((x) => x.active)));
  }, [load]);

  const changeStatus = async (status, extra = {}) => {
    try {
      await api.post(`/tickets/${id}/status`, { status, ...extra });
      toast.success(`Status updated to ${status}`);
      if (status === "closed" && ticket?.source === "customer") {
        toast.message("WhatsApp closure message sent", { description: ticket?.customer_mobile });
      }
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`/tickets/${id}/comment`, { message: comment.trim() });
      setComment("");
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const submitTransfer = async () => {
    if (!transferTo) return;
    try {
      await api.post(`/tickets/${id}/transfer`, { to_user_id: transferTo, note: transferNote });
      toast.success("Ticket transferred");
      setTransferTo(""); setTransferNote(""); setTransferOpen(false);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  if (!ticket) {
    return <div className="text-sm text-gray-500" data-testid="ticket-loading">Loading ticket…</div>;
  }

  const isClosed = ticket.status === "closed";

  return (
    <div className="space-y-6" data-testid="ticket-detail-page">
      <Link to="/tickets" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#0047AB]">
        <ArrowLeft size={14} weight="bold" /> Back to tickets
      </Link>

      <div className="border border-gray-200 rounded-sm p-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-gray-500" data-testid="ticket-number">{ticket.ticket_number}</p>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mt-1">{ticket.title}</h1>
            <div className="flex items-center gap-2 mt-3">
              <StatusBadge status={ticket.status} data-testid="ticket-status-badge" />
              <PriorityBadge priority={ticket.priority} />
              <span className="text-xs text-gray-500">{ticket.issue_type_name}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isClosed && ticket.status === "open" && (
              <Button onClick={() => changeStatus("in_progress")} variant="outline" className="rounded-sm" data-testid="status-in-progress-button">
                Mark In Progress
              </Button>
            )}
            {!isClosed && (
              <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-sm" data-testid="transfer-open-button">
                    <ArrowsLeftRight size={16} weight="bold" className="mr-1" /> Transfer
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-sm">
                  <DialogHeader>
                    <DialogTitle className="font-display tracking-tight">Transfer Ticket</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                      Currently assigned to <b>{ticket.assigned_to_name}</b>. Only <b>online</b> employees can receive transfers.
                    </p>
                    <Select value={transferTo} onValueChange={setTransferTo}>
                      <SelectTrigger data-testid="transfer-user-select"><SelectValue placeholder="Select online employee" /></SelectTrigger>
                      <SelectContent>
                        {users.filter((u) => u.id !== ticket.assigned_to && u.online).length === 0 && (
                          <div className="px-3 py-4 text-xs text-gray-500">No other employees are online right now.</div>
                        )}
                        {users.filter((u) => u.id !== ticket.assigned_to && u.online).map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            <span className="inline-flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                              {u.name} · {u.role}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Add a transfer note (optional)…"
                      value={transferNote}
                      onChange={(e) => setTransferNote(e.target.value)}
                      data-testid="transfer-note-input"
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={submitTransfer} disabled={!transferTo} className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm" data-testid="transfer-submit-button">
                      Transfer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {!isClosed && (
              <Dialog open={closeOpen} onOpenChange={(o) => { setCloseOpen(o); if (!o) setResolution(""); }}>
                <DialogTrigger asChild>
                  <Button className="bg-[#16A34A] hover:bg-green-700 text-white rounded-sm" data-testid="close-ticket-button">
                    <CheckCircle size={16} weight="bold" className="mr-1" /> Close Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-sm">
                  <DialogHeader>
                    <DialogTitle className="font-display tracking-tight">Close ticket — add resolution</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                      Briefly describe how the issue was resolved. This is saved on the ticket and shown in the activity log.
                    </p>
                    <Textarea
                      placeholder="e.g. Reset customer's STB, signal restored. Confirmed with customer over call."
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      rows={5}
                      data-testid="close-resolution-input"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" className="rounded-sm" onClick={() => setCloseOpen(false)}>Cancel</Button>
                    <Button
                      onClick={async () => {
                        if (!resolution.trim()) { toast.error("Resolution is required"); return; }
                        await changeStatus("closed", { resolution: resolution.trim() });
                        setCloseOpen(false);
                        setResolution("");
                      }}
                      className="bg-[#16A34A] hover:bg-green-700 text-white rounded-sm"
                      data-testid="close-confirm-button"
                    >
                      <CheckCircle size={16} weight="bold" className="mr-1" /> Confirm &amp; close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {isClosed && (
              <Dialog open={reopenOpen} onOpenChange={(o) => { setReopenOpen(o); if (!o) setReopenReason(""); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-sm" data-testid="reopen-ticket-button">
                    Reopen
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-sm">
                  <DialogHeader>
                    <DialogTitle className="font-display tracking-tight">Reopen ticket — reason required</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                      Tell us why this ticket needs to be reopened. The original resolution will be preserved in the activity log.
                    </p>
                    <Textarea
                      placeholder="e.g. Customer reported the issue happened again, signal lost after 2 days."
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      rows={4}
                      data-testid="reopen-reason-input"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" className="rounded-sm" onClick={() => setReopenOpen(false)}>Cancel</Button>
                    <Button
                      onClick={async () => {
                        if (!reopenReason.trim()) { toast.error("Reason is required"); return; }
                        await changeStatus("open", { reopen_reason: reopenReason.trim() });
                        setReopenOpen(false);
                        setReopenReason("");
                      }}
                      className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm"
                      data-testid="reopen-confirm-button"
                    >
                      Reopen ticket
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-gray-200 rounded-sm p-6">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Description</p>
            <p className="text-sm whitespace-pre-wrap text-gray-800">{ticket.description}</p>
          </div>

          <div className="border border-gray-200 rounded-sm">
            <div className="px-5 py-4 border-b border-gray-200">
              <p className="font-display font-bold tracking-tight">Activity</p>
            </div>
            <ul className="divide-y divide-gray-100" data-testid="ticket-events">
              {events.map((ev) => {
                const E = eventStyles[ev.event_type] || eventStyles.comment;
                const Icon = E.icon;
                return (
                  <li key={ev.id} className="px-5 py-4 flex gap-3">
                    <Icon size={18} weight="duotone" className={`${E.color} mt-0.5 shrink-0`} />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">{ev.actor_name}</span>{" "}
                        <span className="text-gray-600">— {ev.message}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(ev.created_at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-gray-200 p-4 space-y-2">
              {isClosed ? (
                <p className="text-xs text-gray-500 italic text-center" data-testid="closed-comment-disabled">
                  Comments are disabled on closed tickets. Reopen the ticket to add a comment.
                </p>
              ) : (
                <>
                  <Textarea
                    placeholder="Add a comment to the activity log…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    data-testid="comment-input"
                  />
                  <div className="flex justify-end">
                    <Button onClick={submitComment} disabled={!comment.trim()} className="bg-[#0a0a0a] text-white hover:bg-gray-800 rounded-sm" data-testid="comment-submit-button">
                      <ChatCircleText size={16} weight="bold" className="mr-1" /> Add Comment
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 rounded-sm p-5 space-y-3">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Details</p>
            <div>
              <p className="text-[11px] uppercase text-gray-400 tracking-wider">Source</p>
              <p className="text-sm font-medium capitalize">{ticket.source}</p>
            </div>
            {ticket.source === "customer" && (
              <div>
                <p className="text-[11px] uppercase text-gray-400 tracking-wider">Customer</p>
                <p className="text-sm font-medium">{ticket.customer_name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone size={12} weight="bold" /> {ticket.customer_mobile}
                </p>
                {ticket.customer_email && (
                  <p className="text-xs text-gray-500 mt-0.5">{ticket.customer_email}</p>
                )}
                {ticket.customer_acc_id && (
                  <p className="text-[11px] text-gray-400 mt-0.5">Acc #{ticket.customer_acc_id}</p>
                )}
              </div>
            )}
            {ticket.source === "customer" && (ticket.customer_package || ticket.customer_expiry || ticket.customer_partner) && (
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="text-[11px] uppercase text-gray-400 tracking-wider font-bold">SmartPlay</p>
                {ticket.customer_package && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Package</p>
                    <p className="text-xs font-medium">{ticket.customer_package}</p>
                  </div>
                )}
                {ticket.customer_expiry && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Expiry</p>
                    <p className="text-xs font-medium">{ticket.customer_expiry}</p>
                  </div>
                )}
                {ticket.customer_partner && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Partner</p>
                    <p className="text-xs font-medium">{ticket.customer_partner}</p>
                  </div>
                )}
              </div>
            )}
            <div>
              <p className="text-[11px] uppercase text-gray-400 tracking-wider">Created by</p>
              <p className="text-sm font-medium">{ticket.created_by_name}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-400 tracking-wider">Assigned to</p>
              <p className="text-sm font-medium" data-testid="ticket-assignee">{ticket.assigned_to_name}</p>
              {ticket.assigned_to === user?.id && (
                <p className="text-[11px] text-[#0047AB] font-bold uppercase tracking-wider mt-0.5">You</p>
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-400 tracking-wider">Created</p>
              <p className="text-xs text-gray-700">{formatDate(ticket.created_at)}</p>
            </div>
            {ticket.closed_at && (
              <div>
                <p className="text-[11px] uppercase text-gray-400 tracking-wider">Closed</p>
                <p className="text-xs text-gray-700">{formatDate(ticket.closed_at)}</p>
              </div>
            )}
            {ticket.resolution && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[11px] uppercase text-gray-400 tracking-wider font-bold">Resolution</p>
                <p className="text-xs text-gray-800 whitespace-pre-wrap mt-1" data-testid="ticket-resolution">{ticket.resolution}</p>
                {ticket.closed_by_name && (
                  <p className="text-[10px] text-gray-400 mt-1">Closed by {ticket.closed_by_name}</p>
                )}
              </div>
            )}
          </div>

          {feedback && (
            <div className="border border-gray-200 rounded-sm p-5 space-y-3" data-testid="feedback-panel">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Customer Feedback</p>
              <StarRating value={feedback.rating} readOnly size={20} />
              {feedback.comment && <p className="text-sm text-gray-800 italic">&ldquo;{feedback.comment}&rdquo;</p>}
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Source: {feedback.source} · {new Date(feedback.created_at).toLocaleString()}</p>
            </div>
          )}

          {ticket.source === "customer" && (
            <div className="border border-gray-200 rounded-sm p-5 space-y-3" data-testid="whatsapp-log">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                <WhatsappLogo size={14} weight="fill" className="text-[#16A34A]" /> WhatsApp Log
              </p>
              {whatsapp.length === 0 && <p className="text-xs text-gray-500">No messages sent yet.</p>}
              <ul className="space-y-3">
                {whatsapp.map((m) => (
                  <li key={m.id} className="border-l-2 border-[#16A34A] pl-3">
                    <p className="text-xs text-gray-800 whitespace-pre-wrap">{m.message}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400">
                        {m.kind} · {formatDate(m.created_at)}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border rounded-sm ${
                        m.status === "sent" ? "text-[#16A34A] border-[#16A34A]" :
                        m.status === "failed" ? "text-[#FF2400] border-[#FF2400]" :
                        "text-gray-500 border-gray-300"
                      }`}>{m.status}</span>
                    </div>
                    {m.error && <p className="text-[10px] text-[#FF2400] mt-1">{m.error}</p>}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-gray-400 italic">Powered by Meta WhatsApp Cloud API.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
