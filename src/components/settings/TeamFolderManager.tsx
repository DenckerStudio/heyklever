"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FolderPlus, ExternalLink, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Image from "next/image";

interface TeamFolder {
  id: string;
  team_id: string;
  provider: string;
  folder_id: string;
  folder_name: string;
  folder_url: string;
  created_at: string;
}

interface TeamFolderManagerProps {
  teamId: string;
  teamName: string;
}

export function TeamFolderManager({ teamId, teamName }: TeamFolderManagerProps) {
  const [folders, setFolders] = useState<TeamFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [memberEmails, setMemberEmails] = useState("");

  useEffect(() => {
    fetchFolders();
  }, [teamId]);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/teams/folders");
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (err) {
      console.error("Error fetching folders:", err);
    } finally {
      setLoading(false);
    }
  };

  const createTeamFolder = async (provider: "google_drive" | "onedrive") => {
    try {
      setCreating(true);
      setError(null);

      const emails = memberEmails
        .split(",")
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const response = await fetch("/api/teams/folders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          teamName,
          teamMemberEmails: emails,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFolders(prev => [data.folder, ...prev]);
        setShowCreateForm(false);
        setMemberEmails("");
      } else {
        setError(data.error || "Failed to create team folder");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team folder");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Team Folders</h3>
          <p className="text-sm text-muted-foreground">
            Manage shared folders for your team
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={creating}
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          Create Team Folder
        </Button>
      </div>

      {showCreateForm && (
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Team Member Emails (comma-separated)
            </label>
            <textarea
              value={memberEmails}
              onChange={(e) => setMemberEmails(e.target.value)}
              placeholder="user1@example.com, user2@example.com"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              These users will get access to the team folder
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => createTeamFolder("google_drive")}
              disabled={creating}
              className="flex-1"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Image src="/google-drive.png" alt="Google Drive" width={16} height={16} className="mr-2" />
              )}
              Create in Google Drive
            </Button>
            <Button
              onClick={() => createTeamFolder("onedrive")}
              disabled={creating}
              variant="outline"
              className="flex-1"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Image src="/onedrive.png" alt="OneDrive" width={16} height={16} className="mr-2" />
              )}
              Create in OneDrive
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      )}

      {folders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FolderPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No team folders created yet</p>
          <p className="text-sm">Create a team folder to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {folders.map((folder) => (
            <TeamFolderCard key={folder.id} folder={folder} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamFolderCard({ folder }: { folder: TeamFolder }) {
  const provider = folder.provider;
  const src = provider === "google_drive" ? "/google-drive.png" : "/onedrive.png";
  const label = provider === "google_drive" ? "Google Drive" : "OneDrive";

  return (
    <div className={cn(
      "border rounded-lg p-4 hover:bg-muted/50 transition-colors",
      "flex items-center justify-between"
    )}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center">
          <FolderPlus className="h-5 w-5" />
        </div>
        <div>
          <div className="font-medium">{folder.folder_name}</div>
          <div className="text-sm text-muted-foreground">
            Created {new Date(folder.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-muted-foreground">
          <Image src={src} alt={label} width={12} height={12} className="rounded-[2px]" />
          {label}
        </span>
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <a
            href={folder.folder_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </a>
        </Button>
      </div>
    </div>
  );
}
