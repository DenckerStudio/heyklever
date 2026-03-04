"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  FolderOpen, 
  ExternalLink, 
  Users, 
  Lock, 
  Globe, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  RefreshCw
} from "lucide-react";

interface TeamFolderInfoProps {
  teamId: string;
  teamName: string;
  teamFolder?: any;
}

export function TeamFolderInfo({ teamId, teamName, teamFolder }: TeamFolderInfoProps) {
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Trigger n8n workflow to sync files
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

      if (response.ok) {
        // Show success message
        console.log('Sync triggered successfully');
      }
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpload = () => {
    // Open file upload dialog
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.txt,.md';
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      setUploading(true);
      try {
        // Upload files to team folder
        for (const file of Array.from(files)) {
          await uploadFileToTeamFolder(file);
        }
      } catch (error) {
        console.error('Error uploading files:', error);
      } finally {
        setUploading(false);
      }
    };

    input.click();
  };

  const uploadFileToTeamFolder = async (file: File) => {
    // This would integrate with your file upload system
    console.log('Uploading file:', file.name);
    // Implementation would go here
  };

  if (!teamFolder) {
    return (
      <div className="border rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
        <h3 className="text-lg font-medium mb-2">Team Storage Not Set Up</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your team storage is being set up. This usually takes a few moments.
        </p>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {syncing ? 'Setting up...' : 'Retry Setup'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Team Folder */}
      <div className="border rounded-lg p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">{teamFolder.folder_name}</h3>
              <p className="text-sm text-muted-foreground">Main team folder</p>
            </div>
          </div>
          <a
            href={teamFolder.folder_url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 rounded-md border border-border/60 bg-background/50 hover:bg-muted inline-flex items-center justify-center"
            title="Open in Google Drive"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Public Folder */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <Globe className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <div className="font-medium text-sm">Public Folder</div>
              <div className="text-xs text-muted-foreground">Client-accessible content</div>
            </div>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>

          {/* Private Folder */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <Lock className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <div className="font-medium text-sm">Private Folder</div>
              <div className="text-xs text-muted-foreground">Team-only content</div>
            </div>
            <CheckCircle className="h-4 w-4 text-amber-600" />
          </div>
        </div>

        {/* Namespace Info */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">AI Namespaces</div>
          <div className="space-y-1 text-xs font-mono">
            <div>Public: {teamFolder.public_namespace}</div>
            <div>Private: {teamFolder.private_namespace}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleUpload} disabled={uploading} size="sm">
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload Files
          </Button>
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync AI
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to use your team storage:</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• <strong>Upload files</strong> to the main folder or subfolders</li>
          <li>• <strong>Public folder:</strong> Content accessible to your clients via client URLs</li>
          <li>• <strong>Private folder:</strong> Internal team documents and resources</li>
          <li>• <strong>Auto-sync:</strong> Files are automatically processed and added to your AI knowledge base</li>
          <li>• <strong>Team access:</strong> All team members have automatic access to the folder</li>
        </ul>
      </div>
    </div>
  );
}
