"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SnipeAsset {
  id: number;
  name?: string;
  asset_tag?: string;
  serial?: string;
  model?: { name?: string };
  status_label?: { name?: string };
  assigned_to?: { name?: string };
}

export function AssetsView() {
  const [assets, setAssets] = useState<SnipeAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<SnipeAsset | null>(null);
  const [formName, setFormName] = useState("");
  const [formAssetTag, setFormAssetTag] = useState("");
  const [formSerial, setFormSerial] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/snipe-it/assets?limit=100");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && (data.error === "Snipe-IT not configured" || !data)) {
          setConfigured(false);
          setAssets([]);
          return;
        }
        setError(data.error || "Failed to load assets");
        setAssets([]);
        return;
      }
      setConfigured(true);
      setAssets(data.rows ?? []);
      setTotal(data.total ?? (data.rows ?? []).length);
    } catch (e) {
      setError("Failed to load assets");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleCreate = async () => {
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/integrations/snipe-it/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName || undefined,
          asset_tag: formAssetTag || undefined,
          serial: formSerial || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Create failed");
        return;
      }
      setCreateOpen(false);
      setFormName("");
      setFormAssetTag("");
      setFormSerial("");
      await fetchAssets();
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/integrations/snipe-it/assets/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName || undefined,
          asset_tag: formAssetTag || undefined,
          serial: formSerial || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Update failed");
        return;
      }
      setEditOpen(false);
      setEditing(null);
      setFormName("");
      setFormAssetTag("");
      setFormSerial("");
      await fetchAssets();
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      const res = await fetch(`/api/integrations/snipe-it/assets/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setDeleteId(null);
        await fetchAssets();
      }
    } finally {
      setDeleteId(null);
    }
  };

  const openEdit = (asset: SnipeAsset) => {
    setEditing(asset);
    setFormName(asset.name ?? "");
    setFormAssetTag(asset.asset_tag ?? "");
    setFormSerial(asset.serial ?? "");
    setEditOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading assets…</span>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="p-6 rounded-lg border bg-card max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">Assets</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect asset management in team settings to view and manage assets here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Assets
          </h2>
          <p className="text-sm text-muted-foreground">{total} item(s)</p>
        </div>
        <Button onClick={() => { setFormName(""); setFormAssetTag(""); setFormSerial(""); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add asset
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Asset tag</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No assets yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>{asset.name ?? "—"}</TableCell>
                  <TableCell>{asset.asset_tag ?? "—"}</TableCell>
                  <TableCell>{asset.serial ?? "—"}</TableCell>
                  <TableCell>{asset.model?.name ?? "—"}</TableCell>
                  <TableCell>{asset.status_label?.name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(asset)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(asset.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add asset</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Name</Label>
              <Input id="create-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-tag">Asset tag</Label>
              <Input id="create-tag" value={formAssetTag} onChange={(e) => setFormAssetTag(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-serial">Serial</Label>
              <Input id="create-serial" value={formSerial} onChange={(e) => setFormSerial(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitLoading}>
              {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditing(null); setEditOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit asset</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tag">Asset tag</Label>
              <Input id="edit-tag" value={formAssetTag} onChange={(e) => setFormAssetTag(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-serial">Serial</Label>
              <Input id="edit-serial" value={formSerial} onChange={(e) => setFormSerial(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={submitLoading}>
              {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
