import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StarRating from "@/components/StarRating";
import { CheckCircle, Ticket as TicketIcon, Heart } from "@phosphor-icons/react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PublicRate() {
  const { ticketNumber } = useParams();
  const [info, setInfo] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    axios.get(`${API}/public/ticket-info/${ticketNumber}`)
      .then((r) => {
        setInfo(r.data);
        if (r.data.already_rated) {
          setRating(r.data.rating || 0);
        }
      })
      .catch((e) => setErr(e?.response?.data?.detail || "Ticket not found"));
  }, [ticketNumber]);

  const submit = async () => {
    if (!rating) { toast.error("Please pick a star rating"); return; }
    setBusy(true);
    try {
      await axios.post(`${API}/public/rate/${ticketNumber}`, { rating, comment: comment.trim() });
      setDone(true);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full text-center space-y-3">
          <p className="font-display text-3xl font-black text-[#FF2400]">404</p>
          <p className="text-sm text-gray-600">{err}</p>
        </div>
      </div>
    );
  }

  if (!info) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading…</div>;
  }

  if (done || (info.already_rated && rating === info.rating)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-white to-blue-50">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-sm p-8 text-center space-y-4 shadow-sm">
          <CheckCircle size={64} weight="duotone" className="mx-auto text-[#16A34A]" />
          <p className="font-display text-3xl font-black tracking-tight">Thank you!</p>
          <StarRating value={rating || info.rating} readOnly size={28} />
          <p className="text-sm text-gray-600">
            Your feedback for ticket <b>{ticketNumber}</b> has been recorded.
          </p>
          <p className="text-xs text-gray-400">You can safely close this page.</p>
          <div className="flex items-center justify-center gap-1 text-xs text-gray-400 pt-3 border-t border-gray-100">
            <Heart size={12} weight="fill" className="text-[#FF2400]" />
            Smartplay TV Support
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center p-6" data-testid="public-rate-page">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-sm p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-[#0047AB]">
          <TicketIcon size={20} weight="duotone" />
          <span className="font-display font-black tracking-tight">HelpDesk OS</span>
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">How was your experience?</p>
          <h1 className="font-display text-3xl font-black tracking-tight">
            Rate ticket {info.ticket_number}
          </h1>
          <p className="text-sm text-gray-500">
            Hi {info.customer_name || "there"}, your issue was handled by <b>{info.assigned_to_name}</b>. Your one-tap rating helps us improve.
          </p>
        </div>

        {info.already_rated && (
          <div className="text-xs px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-sm">
            You rated this <b>{info.rating}★</b> earlier. Submitting again will update your previous rating.
          </div>
        )}

        <div className="flex flex-col items-center gap-2 py-4">
          <StarRating value={rating} onChange={setRating} size={42} data-testid="rate-stars" />
          <p className="text-xs text-gray-400">
            {rating === 5 ? "Excellent — thanks!" :
              rating === 4 ? "Pretty good" :
              rating === 3 ? "Just okay" :
              rating === 2 ? "Below expectations" :
              rating === 1 ? "We can do better — sorry" :
              "Tap a star"}
          </p>
        </div>

        <Textarea
          placeholder="Add a quick comment (optional)…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          data-testid="rate-comment"
        />

        <Button
          onClick={submit}
          disabled={busy || !rating}
          className="w-full bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm h-11"
          data-testid="rate-submit"
        >
          {busy ? "Submitting…" : "Submit feedback"}
        </Button>

        <p className="text-[10px] text-gray-400 text-center pt-3 border-t border-gray-100">
          Issue: {info.issue_type_name} · Smartplay TV Support
        </p>
      </div>
    </div>
  );
}
