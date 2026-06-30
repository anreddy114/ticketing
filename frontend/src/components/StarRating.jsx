import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "@phosphor-icons/react";

export default function StarRating({ value = 0, onChange, size = 18, readOnly = false, "data-testid": testId }) {
  const [hover, setHover] = useState(0);
  const display = hover || value || 0;
  return (
    <div className="inline-flex items-center gap-0.5" data-testid={testId}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(i)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange && onChange(i)}
          className={`p-0.5 ${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}`}
        >
          <Star
            size={size}
            weight={i <= display ? "fill" : "regular"}
            className={i <= display ? "text-[#f59e0b]" : "text-gray-300"}
          />
        </button>
      ))}
    </div>
  );
}

export function FeedbackDisplay({ rating, comment, source, "data-testid": testId }) {
  if (rating == null) return null;
  return (
    <div className="inline-flex flex-col gap-0.5" data-testid={testId}>
      <StarRating value={rating} readOnly size={12} />
      {comment && <p className="text-[11px] text-gray-600 italic max-w-[200px] truncate">&ldquo;{comment}&rdquo;</p>}
      {source && <span className="text-[9px] uppercase tracking-wider text-gray-400">via {source}</span>}
    </div>
  );
}
