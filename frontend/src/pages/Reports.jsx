import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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

  useEffect(() => {
    api.get("/reports/summary").then((r) => setData(r.data));
  }, []);

  if (!data) return <p className="text-sm text-gray-500">Loading reports…</p>;

  const maxType = Math.max(1, ...data.by_issue_type.map((x) => x.count));
  const maxAssignee = Math.max(1, ...data.by_assignee.map((x) => x.count));
  const maxPriority = Math.max(1, ...data.by_priority.map((x) => x.count));

  return (
    <div className="space-y-8" data-testid="reports-page">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">Insights</p>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Reports</h1>
      </div>

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
    </div>
  );
}
