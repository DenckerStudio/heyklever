"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  FolderOpen, 
  AlertTriangle, 
  Loader2, 
  CheckCircle, 
  RefreshCw,
  ExternalLink
} from "lucide-react";

interface TeamFolderStatusProps {
  teamId: string;
  teamName: string;
  teamFolder?: any;
}

export function TeamFolderStatus({ teamId, teamName, teamFolder }: TeamFolderStatusProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<'missing' | 'creating' | 'created' | 'error'>(
    teamFolder ? 'created' : 'missing'
  );
  const [error, setError] = useState<string | null>(null);

  const handleCreateFolder = async () => {
    setIsCreating(true);
    setError(null);
    setStatus('creating');

    try {
      const response = await fetch('/api/teams/folders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'supabase_storage',
          teamName,
          teamMemberEmails: [], // Will be shared with creator
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('created');
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        setStatus('error');
        setError(data.error || 'Failed to create team folder');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to create team folder');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSyncAI = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/rag/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          action: 'sync'
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show success briefly
        setTimeout(() => setIsSyncing(false), 2000);
      } else {
        setError(data.error || 'Failed to sync AI');
        setIsSyncing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync AI');
      setIsSyncing(false);
    }
  };

  if (status === 'created' && teamFolder) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-green-200/30 to-green-300/20 text-green-800 dark:text-green-200 dark:from-green-400/20 dark:to-green-200/20 p-4 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-medium">Team Storage Ready</h3>
              <p className="text-sm">
                Your team folder is set up with AI knowledge base integration
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSyncAI}
              disabled={isSyncing}
              variant="outline"
              size="sm"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync AI
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <a
                href={teamFolder.folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Storage
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl p-4 shadow-md",
      status === 'error' 
        ? "bg-gradient-to-r from-red-200/30 to-red-300/20 text-red-800 dark:text-red-200 dark:from-red-400/20 dark:to-red-200/20"
        : "bg-gradient-to-r from-amber-200/30 to-amber-300/20 text-amber-800 dark:text-amber-200 dark:from-amber-400/20 dark:to-amber-200/20"
    )}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {status === 'creating' ? (
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          )}
          <div>
            <h3 className="font-medium">
              {status === 'creating' ? 'Creating Team Storage...' : 'Team Storage Missing'}
            </h3>
            <p className="text-sm">
              {status === 'creating' 
                ? 'Setting up your team folder and AI knowledge base...'
                : 'Your team folder and AI knowledge base need to be created.'
              }
            </p>
            {error && (
              <p className="text-xs mt-1 text-red-600 dark:text-red-400">
                Error: {error}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={handleCreateFolder}
          disabled={isCreating}
          className="my-auto"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FolderOpen className="h-4 w-4 mr-2" />
          )}
          {isCreating ? 'Creating...' : 'Create Team Storage'}
        </Button>
      </div>
    </div>
  );
}
