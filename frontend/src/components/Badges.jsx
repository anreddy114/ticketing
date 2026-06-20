export const STATUS_STYLES = {
  open: "text-[#FF2400] border-[#FF2400]",
  in_progress: "text-[#0EA5E9] border-[#0EA5E9]",
  closed: "text-[#16A34A] border-[#16A34A]",
};

export const STATUS_LABEL = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
};

export const PRIORITY_STYLES = {
  low: "text-gray-600 border-gray-300",
  medium: "text-[#0047AB] border-[#0047AB]",
  high: "text-orange-600 border-orange-500",
  urgent: "text-[#FF2400] border-[#FF2400] bg-red-50",
};

export function StatusBadge({ status, "data-testid": testId }) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-sm ${STATUS_STYLES[status] || "text-gray-600 border-gray-300"}`}
    >
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-sm ${PRIORITY_STYLES[priority] || "text-gray-600 border-gray-300"}`}
    >
      {priority}
    </span>
  );
}
