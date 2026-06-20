import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function AdminIssueTypes() {
  const [types, setTypes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = () => api.get("/issue-types").then((r) => setTypes(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "" }); setOpen(true); };
  const openEdit = (t) => { setEditing(t); setForm({ name: t.name, description: t.description || "" }); setOpen(true); };

  const submit = async () => {
    try {
      if (editing) {
        await api.patch(`/issue-types/${editing.id}`, form);
        toast.success("Updated");
      } else {
        await api.post("/issue-types", form);
        toast.success("Created");
      }
      setOpen(false); load();
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const toggleActive = async (t) => {
    try { await api.patch(`/issue-types/${t.id}`, { active: !t.active }); load(); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete issue type "${t.name}"?`)) return;
    try { await api.delete(`/issue-types/${t.id}`); load(); toast.success("Deleted"); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="space-y-6" data-testid="admin-issue-types-page">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">Admin</p>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Issue Types</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm" data-testid="issue-type-create-button">
              <Plus size={16} weight="bold" className="mr-1" /> Add Issue Type
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm">
            <DialogHeader>
              <DialogTitle className="font-display tracking-tight">{editing ? "Edit" : "New"} Issue Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="issue-type-name-input" /></div>
              <div className="space-y-2"><Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={!form.name.trim()} className="bg-[#0047AB] hover:bg-[#0033A0] text-white rounded-sm" data-testid="issue-type-save-button">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-gray-200 rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60">
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Name</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Description</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Active</th>
              <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wider font-bold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody data-testid="issue-types-list">
            {types.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-gray-600">{t.description || "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(t)} className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm ${t.active ? "text-[#16A34A] border-[#16A34A]" : "text-gray-500 border-gray-300"}`}>
                    {t.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(t)} className="h-8 w-8"><PencilSimple size={14} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(t)} className="h-8 w-8 text-[#FF2400]"><Trash size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
