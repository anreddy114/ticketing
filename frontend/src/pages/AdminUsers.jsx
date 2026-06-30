import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Trash, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "agent" });
  const [editForm, setEditForm] = useState({ name: "", role: "agent", password: "", active: true });

  const load = () => api.get("/agents").then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      await api.post("/auth/register", form);
      toast.success("Employee created");
      setCreateOpen(false);
      setForm({ name: "", email: "", password: "", role: "agent" });
      load();
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const openEdit = (u) => {
    setEditing(u);
    setEditForm({ name: u.name, role: u.role, password: "", active: u.active });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      const patch = { name: editForm.name, role: editForm.role, active: editForm.active };
      if (editForm.password) patch.password = editForm.password;
      await api.patch(`/users/${editing.id}`, patch);
      toast.success("Employee updated");
      setEditOpen(false);
      setEditing(null);
      load();
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const toggleActive = async (u) => {
    try { await api.patch(`/users/${u.id}`, { active: !u.active }); load(); }
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
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Presence</th>
              <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody data-testid="users-list">
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3"><span className="text-xs uppercase tracking-wider font-bold">{u.role}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u)} className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm ${u.active ? "text-[#16A34A] border-[#16A34A]" : "text-gray-500 border-gray-300"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm ${u.online ? "text-[#16A34A] border-[#16A34A] bg-green-50" : "text-gray-500 border-gray-300"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.online ? "bg-[#16A34A]" : "bg-gray-400"}`} />
                    {u.online ? "Online" : "Offline"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(u)} className="h-8 w-8" data-testid={`user-edit-${u.email}`}>
                    <PencilSimple size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(u)} className="h-8 w-8 text-[#FF2400]">
                    <Trash size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">Edit Employee</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Email cannot be changed. Leave password blank to keep current.</p>
              <div className="space-y-2"><Label>Email</Label>
                <Input value={editing.email} readOnly className="bg-gray-50" /></div>
              <div className="space-y-2"><Label>Name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="user-edit-name-input" /></div>
              <div className="space-y-2"><Label>Role</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                  <SelectTrigger data-testid="user-edit-role-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>New password (optional)</Label>
                <Input type="password" placeholder="Leave blank to keep" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} data-testid="user-edit-password-input" /></div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  className="accent-[#0047AB]"
                />
                Active
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-sm">Cancel</Button>
            <Button onClick={submitEdit} className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm" data-testid="user-edit-save-button">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
