"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronRight, Folder, File, Server, Users, HardDrive, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DriveItem {
  id: string;
  name: string;
  folder?: any;
  type?: string; // category or file/folder
  parentReference?: { driveId: string };
  driveId?: string; // Explicit driveId if known
}

interface MicrosoftBrowserProps {
  teamId: string;
  /** When provided, dialog is controlled by parent (e.g. open from dropdown). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MicrosoftBrowser({ teamId, open: controlledOpen, onOpenChange: controlledOnOpenChange }: MicrosoftBrowserProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Browse & Sync</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Microsoft Browser</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 relative">
            <MicrosoftBrowserContent teamId={teamId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MicrosoftBrowserContent({ teamId }: { teamId: string }) {
  const [path, setPath] = useState<{ id: string; name: string; type: string; driveId?: string }[]>([
    { id: "root", name: "Microsoft", type: "root" }
  ]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  const currentLevel = path[path.length - 1];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", currentLevel.type);
      if (currentLevel.id !== 'root') params.set("id", currentLevel.id);
      if (currentLevel.driveId) params.set("driveId", currentLevel.driveId);
      
      const res = await fetch(`/api/integrations/microsoft/list?${params.toString()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.value || []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [currentLevel]);

  const handleNavigate = (item: DriveItem) => {
    let nextType = "folder";
    if (currentLevel.type === "root") {
        nextType = item.id;
    } else if (currentLevel.type === "sites") {
        nextType = "site";
    } else if (currentLevel.type === "site") {
        nextType = "drive";
    } else if (currentLevel.type === "teams") {
        nextType = "team";
    } else if (currentLevel.type === "team") {
        nextType = "channel";
    } else if (currentLevel.type === "channel") {
        nextType = "folder";
    }
    
    const driveId = item.parentReference?.driveId || item.driveId || (currentLevel.driveId);
    setPath([...path, { id: item.id, name: item.name, type: nextType, driveId }]);
  };

  const handleBreadcrumb = (index: number) => {
    setPath(path.slice(0, index + 1));
  };

  const toggleSelection = (item: DriveItem) => {
    const next = new Set(selected);
    if (next.has(item.id)) next.delete(item.id);
    else next.add(item.id);
    setSelected(next);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
        const toSync = items.filter(i => selected.has(i.id));
        const res = await fetch("/api/integrations/microsoft/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: toSync.map(i => ({
                    id: i.id,
                    name: i.name,
                    driveId: i.parentReference?.driveId || i.driveId || currentLevel.driveId,
                    type: i.folder ? 'folder' : 'file'
                }))
            })
        });
        await res.json();
        alert("Sync started! Files will appear shortly.");
        setSelected(new Set());
    } catch (e) {
        alert("Sync failed");
    } finally {
        setSyncing(false);
    }
  };

  const getIcon = (item: DriveItem) => {
    if (currentLevel.type === "root") {
        if (item.id === "onedrive") return <CloudIcon className="w-5 h-5 text-blue-500" />;
        if (item.id === "sites") return <Server className="w-5 h-5 text-teal-500" />;
        if (item.id === "teams") return <Users className="w-5 h-5 text-indigo-500" />;
    }
    if (item.folder) return <Folder className="w-5 h-5 text-yellow-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="flex flex-col h-full absolute inset-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto px-6 py-2 border-b bg-muted/5 shrink-0">
          {path.map((p, i) => (
            <div key={i} className="flex items-center whitespace-nowrap">
              {i > 0 && <ChevronRight className="w-4 h-4 mx-1" />}
              <button 
                onClick={() => handleBreadcrumb(i)}
                className={cn("hover:text-foreground", i === path.length - 1 && "font-semibold text-foreground")}
              >
                {p.name}
              </button>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2">
            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
                <div className="text-center text-muted-foreground p-8">No items found</div>
            ) : (
                <div className="space-y-1">
                    {items.map(item => (
                        <div key={item.id} className="flex items-center p-2 hover:bg-muted/50 rounded-lg group">
                             {(item.folder || ['root', 'sites', 'teams', 'site', 'team'].includes(currentLevel.type)) ? (
                                <div className="w-8" /> 
                             ) : (
                                <input 
                                    type="checkbox" 
                                    checked={selected.has(item.id)}
                                    onChange={() => toggleSelection(item)}
                                    className="mr-3 w-4 h-4"
                                />
                             )}
                             
                             <button 
                                className="flex-1 flex items-center gap-3 text-left"
                                onClick={() => (item.folder || ['root', 'sites', 'teams', 'site', 'team'].includes(currentLevel.type)) ? handleNavigate(item) : toggleSelection(item)}
                             >
                                {getIcon(item)}
                                <span>{item.name}</span>
                             </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-between items-center bg-background shrink-0">
            <div className="text-sm text-muted-foreground">
                {selected.size} items selected
            </div>
            <Button onClick={handleSync} disabled={selected.size === 0 || syncing}>
                {syncing ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                    </>
                ) : (
                    "Sync Selected"
                )}
            </Button>
        </div>
    </div>
  );
}

function CloudIcon({className}: {className?: string}) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;
}
