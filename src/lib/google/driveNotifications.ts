import { getGoogleAccessTokenFromServiceAccount } from './serviceAccount';

interface DriveNotification {
  id: string;
  resourceId: string;
  resourceUri: string;
  token: string;
  expiration: string | null;
}

/**
 * Set up Google Drive push notifications for a team folder
 */
export async function setupDriveNotifications(
  folderId: string,
  teamId: string,
  folderName: string
): Promise<DriveNotification | null> {
  try {
    const accessToken = await getGoogleAccessTokenFromServiceAccount();
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured');
      return null;
    }
    
    // Generate a unique channel ID for this team folder
    const channelId = `team-${teamId}-${Date.now()}`;
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}/watch`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: n8nWebhookUrl,
          // Monitor all changes in this folder and subfolders
          kind: 'api#channel'
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to setup Drive notifications:', error);
      return null;
    }

    const notification = await response.json();
    
    console.log(`Drive notifications setup for team ${teamId}, folder: ${folderName}`);
    
    return {
      id: notification.id,
      resourceId: notification.resourceId,
      resourceUri: notification.resourceUri,
      token: notification.token,
      expiration: notification.expiration ? new Date(parseInt(notification.expiration)).toISOString() : null
    };

  } catch (error) {
    console.error('Error setting up Drive notifications:', error);
    return null;
  }
}

/**
 * Set up notifications for subfolders (Public and Private)
 */
export async function setupSubfolderNotifications(
  parentFolderId: string,
  teamId: string,
  subfolderName: string
): Promise<DriveNotification | null> {
  try {
    const accessToken = await getGoogleAccessTokenFromServiceAccount();
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured');
      return null;
    }
    
    // Generate a unique channel ID for this subfolder
    const channelId = `team-${teamId}-${subfolderName.toLowerCase()}-${Date.now()}`;
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${parentFolderId}/watch`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: n8nWebhookUrl,
          // Monitor changes in this specific subfolder
          kind: 'api#channel'
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to setup notifications for ${subfolderName}:`, error);
      return null;
    }

    const notification = await response.json();
    
    console.log(`Subfolder notifications setup for team ${teamId}, ${subfolderName}`);
    
    return {
      id: notification.id,
      resourceId: notification.resourceId,
      resourceUri: notification.resourceUri,
      token: notification.token,
      expiration: notification.expiration ? new Date(parseInt(notification.expiration)).toISOString() : null
    };

  } catch (error) {
    console.error(`Error setting up ${subfolderName} notifications:`, error);
    return null;
  }
}

/**
 * Stop Drive notifications for a channel
 */
export async function stopDriveNotifications(
  folderId: string,
  channelId: string,
  resourceId: string
): Promise<boolean> {
  try {
    const accessToken = await getGoogleAccessTokenFromServiceAccount();
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}/stop`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          resourceId: resourceId
        })
      }
    );

    if (!response.ok) {
      console.error('Failed to stop Drive notifications:', await response.text());
      return false;
    }

    console.log(`Drive notifications stopped for channel: ${channelId}`);
    return true;

  } catch (error) {
    console.error('Error stopping Drive notifications:', error);
    return false;
  }
}
