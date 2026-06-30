import { useEffect, useState } from "react";
import { api, API, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DownloadSimple, FileXls } from "@phosphor-icons/react";
import { toast } from "sonner";

const Bar = ({ name, count, max }) => {
  const w = max ? Math.max(4, (count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs text-gray-700 truncate">{name}</div>
      <div className="flex-1 h-2 bg-gray-100 rounded-sm overflow-hidden">
        <div className="h-full bg-[#0047AB]" style={{ width: `${w}%` }} />
      </div>
      <div className="w-10 text-right font-mono text-xs">{count}</div>
    </div>
  );
};

export default function Reports() {
  const [data, setData] = useState(null);
  const [issueTypes, setIssueTypes] = useState([]);
  const [users, setUsers] = useState([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [issueTypeF, setIssueTypeF] = useState("all");
  const [assigneeF, setAssigneeF] = useState("all");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get("/reports/summary").then((r) => setData(r.data));
    api.get("/issue-types").then((r) => setIssueTypes(r.data));
    api.get("/users").then((r) => setUsers(r.data));
  }, []);

  const buildParams = () => {
    const p = new URLSearchParams();
    if (dateFrom) p.set("date_from", new Date(dateFrom).toISOString());
    if (dateTo) p.set("date_to", new Date(`${dateTo}T23:59:59`).toISOString());
    if (statusF !== "all") p.set("status", statusF);
    if (issueTypeF !== "all") p.set("issue_type_id", issueTypeF);
    if (assigneeF !== "all") p.set("assigned_to", assigneeF);
    return p;
  };

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const params = buildParams();
      const url = `${API}/reports/tickets.xlsx?${params.toString()}`;
      const token = getToken();
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      const dl = URL.createObjectURL(blob);
      a.href = dl;
      a.download = `tickets_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dl);
      toast.success("Excel downloaded");
    } catch (e) {
      toast.error(e.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (!data) return <p className="text-sm text-gray-500">Loading reports…</p>;

  const maxType = Math.max(1, ...data.by_issue_type.map((x) => x.count));
  const maxAssignee = Math.max(1, ...data.by_assignee.map((x) => x.count));
  const maxPriority = Math.max(1, ...data.by_priority.map((x) => x.count));

  return (
    <div className="space-y-8" data-testid="reports-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">Insights</p>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Reports</h1>
        </div>
        <Button
          onClick={downloadExcel}
          disabled={downloading}
          className="bg-[#0a0a0a] text-white hover:bg-gray-800 rounded-sm"
          data-testid="reports-download-excel"
        >
          <FileXls size={16} weight="bold" className="mr-1" />
          {downloading ? "Preparing…" : "Download Excel"}
        </Button>
      </div>

      <section className="border border-gray-200 rounded-sm p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wider">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-testid="reports-date-from" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wider">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-testid="reports-date-to" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wider">Status</Label>
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger data-testid="reports-status-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wider">Issue Type</Label>
          <Select value={issueTypeF} onValueChange={setIssueTypeF}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {issueTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wider">Assignee</Label>
          <Select value={assigneeF} onValueChange={setAssigneeF}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(data.totals).map(([k, v]) => (
          <div key={k} className="border border-gray-200 rounded-sm p-5">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">{k.replace("_", " ")}</p>
            <p className="font-display text-4xl font-black mt-1">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="border border-gray-200 rounded-sm p-5 space-y-3">
          <p className="font-display font-bold tracking-tight">By Issue Type</p>
          {data.by_issue_type.length === 0 && <p className="text-xs text-gray-500">No data.</p>}
          {data.by_issue_type.map((row) => <Bar key={row.name} {...row} max={maxType} />)}
        </div>
        <div className="border border-gray-200 rounded-sm p-5 space-y-3">
          <p className="font-display font-bold tracking-tight">By Assignee</p>
          {data.by_assignee.length === 0 && <p className="text-xs text-gray-500">No data.</p>}
          {data.by_assignee.map((row) => <Bar key={row.name} {...row} max={maxAssignee} />)}
        </div>
        <div className="border border-gray-200 rounded-sm p-5 space-y-3">
          <p className="font-display font-bold tracking-tight">By Priority</p>
          {data.by_priority.length === 0 && <p className="text-xs text-gray-500">No data.</p>}
          {data.by_priority.map((row) => <Bar key={row.name} {...row} max={maxPriority} />)}
        </div>
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <DownloadSimple size={12} weight="bold" />
        Agents export only their own tickets · Admins export everything · Filters apply to the Excel export.
      </p>
    </div>
  );
}
