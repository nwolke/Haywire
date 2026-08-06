import { useState, useEffect } from "react";
import { Organization } from "@/types/organization";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";

interface OrganizationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (org: Omit<Organization, 'id'> | Organization) => Promise<void>;
  editingOrganization?: Organization | null;
}

export function OrganizationForm({ open, onOpenChange, onSave, editingOrganization }: OrganizationFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingOrganization) {
      setFormData({
        name: editingOrganization.name,
        description: editingOrganization.description || "",
      });
    } else {
      setFormData({ name: "", description: "" });
    }
  }, [editingOrganization, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      return;
    }

    const orgData = {
      name: trimmedName,
      description: formData.description.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editingOrganization) {
        await onSave({ ...editingOrganization, ...orgData });
      } else {
        await onSave(orgData);
      }
      onOpenChange(false);
    } catch (err) {
      console.error('[OrganizationForm] Failed to save organization:', err);
      // Keep dialog open so user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingOrganization ? "Edit Organization" : "Add Organization"}</DialogTitle>
          <DialogDescription>
            {editingOrganization
              ? "Update the details of this organization."
              : "Add a new organization to your campaign."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Name *</Label>
              <Input
                id="org-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter organization name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-description">Description</Label>
              <Textarea
                id="org-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this organization's purpose, goals, or history"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="border-sky-500/30 bg-sky-600/80 hover:bg-sky-600/70 text-white">
              {saving ? "Saving..." : `${editingOrganization ? "Update" : "Add"} Organization`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
