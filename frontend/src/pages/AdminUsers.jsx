import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "agent" });

  const load = () => api.get("/users").then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      await api.post("/auth/register", form);
      toast.success("Employee created");
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "agent" });
      load();
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const toggleActive = async (u) => {
    try { await api.patch(`/users/${u.id}`, { active: !u.active }); load(); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  const setRole = async (u, role) => {
    try { await api.patch(`/users/${u.id}`, { role }); load(); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete employee "${u.name}"?`)) return;
    try { await api.delete(`/users/${u.id}`); load(); toast.success("Deleted"); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="space-y-6" data-testid="admin-users-page">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">Admin</p>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Employees</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm" data-testid="user-create-button">
              <UserPlus size={16} weight="bold" className="mr-1" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm">
            <DialogHeader><DialogTitle className="font-display tracking-tight">New Employee</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="user-name-input" /></div>
              <div className="space-y-2"><Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="user-email-input" /></div>
              <div className="space-y-2"><Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="user-password-input" /></div>
              <div className="space-y-2"><Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="user-role-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={!form.name || !form.email || !form.password} className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm" data-testid="user-save-button">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-gray-200 rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60">
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Name</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Email</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Role</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Status</th>
              <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody data-testid="users-list">
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <Select value={u.role} onValueChange={(v) => setRole(u, v)}>
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u)} className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm ${u.active ? "text-[#16A34A] border-[#16A34A]" : "text-gray-500 border-gray-300"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => remove(u)} className="h-8 w-8 text-[#FF2400]"><Trash size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
