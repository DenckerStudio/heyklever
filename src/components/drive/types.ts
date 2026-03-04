export type DriveItemType = "folder" | "file";

export interface DriveItem {
  id: string;
  name: string;
  type: DriveItemType;
  size?: string;
  modifiedAt?: string;
  provider?: "supabase_storage";
  webViewLink?: string;
  mimeType?: string;
  parents?: string[];
  providerAccount?: string;
  path?: string;
  created_at?: string;
  updated_at?: string;
}


