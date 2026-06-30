import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { Plus, MagnifyingGlass } from "@phosphor-icons/react";
import { FeedbackDisplay } from "@/components/StarRating";

export default function Tickets() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === "admin";

  const initStatus = searchParams.get("status") || "all";
  const [tickets, setTickets] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [filters, setFilters] = useState({
    status: initStatus,
    mine: false,
    issue_type_id: "all",
    search: "",
  });

  // keep URL search param in sync (so deep-links work)
  useEffect(() => {
    const p = new URLSearchParams();
    if (filters.status !== "all") p.set("status", filters.status);
    setSearchParams(p, { replace: true });
    // eslint-disable-next-line
  }, [filters.status]);

  const load = async () => {
    const params = {};
    if (filters.status && filters.status !== "all") params.status = filters.status;
    if (filters.issue_type_id && filters.issue_type_id !== "all") params.issue_type_id = filters.issue_type_id;
    if (isAdmin && filters.mine) params.mine = true;
    if (filters.search) params.search = filters.search;
    const { data } = await api.get("/tickets", { params });
    setTickets(data);
  };

  useEffect(() => {
    api.get("/issue-types").then((r) => setIssueTypes(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [filters]);

  return (
    <div className="space-y-6" data-testid="tickets-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">
            {isAdmin ? "All Tickets" : "My Tickets"}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Tickets</h1>
          {!isAdmin && (
            <p className="text-xs text-gray-500 mt-1">Showing tickets assigned to you.</p>
          )}
        </div>
        <Button asChild className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm">
          <Link to="/tickets/new" data-testid="tickets-new-button"><Plus size={16} weight="bold" className="mr-1" /> New Ticket</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border border-gray-200 p-4 rounded-sm">
        <div className="md:col-span-2 relative">
          <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by ticket #, title, customer name or mobile…"
            className="pl-9"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            data-testid="tickets-search-input"
          />
        </div>
        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
          <SelectTrigger data-testid="tickets-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.issue_type_id} onValueChange={(v) => setFilters({ ...filters, issue_type_id: v })}>
          <SelectTrigger data-testid="tickets-issue-type-filter"><SelectValue placeholder="Issue Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All issue types</SelectItem>
            {issueTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdmin && (
          <label className="md:col-span-4 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.mine}
              onChange={(e) => setFilters({ ...filters, mine: e.target.checked })}
              data-testid="tickets-mine-checkbox"
              className="accent-[#0047AB]"
            />
            Show only my assigned tickets
          </label>
        )}
      </div>

      <div className="border border-gray-200 rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60">
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">#</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Title</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Customer</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Issue</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Assigned</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Status</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Priority</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Rating</th>
            </tr>
          </thead>
          <tbody data-testid="tickets-list">
            {tickets.length === 0 && (
              <tr><td colSpan="8" className="px-4 py-12 text-center text-gray-500 text-sm">No tickets match your filters.</td></tr>
            )}
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link to={`/tickets/${t.id}`} className="text-[#0047AB] hover:underline" data-testid={`ticket-link-${t.ticket_number}`}>
                    {t.ticket_number}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">{t.title}</td>
                <td className="px-4 py-3 text-gray-600">
                  {t.source === "customer" ? (
                    <>
                      <div>{t.customer_name}</div>
                      <div className="text-xs text-gray-400">{t.customer_mobile}</div>
                    </>
                  ) : (
                    <span className="text-xs uppercase tracking-wider text-gray-400">Internal / Self</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{t.issue_type_name}</td>
                <td className="px-4 py-3 text-gray-700">{t.assigned_to_name}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-3">
                  <FeedbackDisplay rating={t.feedback_rating} comment={t.feedback_comment} source={t.feedback_source} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
