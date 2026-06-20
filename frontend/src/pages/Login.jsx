import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket as TicketIcon, SignIn } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success("Welcome back");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Login failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden md:block grain"
           style={{
             backgroundImage: "url(https://images.pexels.com/photos/3137038/pexels-photo-3137038.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900)",
             backgroundSize: "cover",
             backgroundPosition: "center",
           }}>
        <div className="absolute inset-0 bg-[#0a0a0a]/70" />
        <div className="relative h-full p-12 flex flex-col justify-between text-white">
          <div className="flex items-center gap-2">
            <TicketIcon size={28} weight="duotone" />
            <span className="font-display font-black text-xl tracking-tight">HelpDesk OS</span>
          </div>
          <div className="space-y-3 max-w-md">
            <p className="font-display text-4xl sm:text-5xl font-black leading-[1.05] tracking-tight">
              The control room for every customer ticket.
            </p>
            <p className="text-sm text-white/70">
              Track, transfer, and close issues — with WhatsApp confirmations on every step.
            </p>
          </div>
          <p className="text-xs text-white/50 uppercase tracking-[0.3em]">Internal · Restricted Access</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <div className="md:hidden flex items-center gap-2 mb-4">
              <TicketIcon size={24} weight="duotone" className="text-[#0047AB]" />
              <span className="font-display font-black text-lg">HelpDesk OS</span>
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">Sign in</p>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Welcome back.</h1>
            <p className="text-sm text-gray-500">Use your employee credentials to continue.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="login-password-input"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={busy}
            data-testid="login-submit-button"
            className="w-full bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm h-11 transition-all"
          >
            <SignIn size={18} weight="bold" className="mr-2" />
            {busy ? "Signing in…" : "Sign in"}
          </Button>

          <div className="border border-dashed border-gray-200 rounded-sm p-3 text-xs text-gray-500">
            <p className="font-bold uppercase tracking-wider text-gray-600 mb-1">Demo</p>
            <p>admin@ticketing.com / admin123</p>
            <p>agent@ticketing.com / agent123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
