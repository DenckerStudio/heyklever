/**
 * Utility functions for managing notifications
 */

export interface CreateNotificationParams {
  team_id: string;
  message: string;
  type: 'document' | 'team' | 'system' | 'warning' | 'success' | 'error';
  document_identifier?: string;
}

/**
 * Create a new notification
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: number) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notification_id: notificationId,
        status: 'read',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark notification as read');
    }

    return await response.json();
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Fetch notifications for the current team
 */
export async function fetchNotifications(limit: number = 10, status: string = 'new') {
  try {
    const response = await fetch(`/api/notifications?limit=${limit}&status=${status}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch notifications');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

/**
 * Helper function to create common notification types
 */
export const NotificationHelpers = {
  /**
   * Create a document-related notification
   */
  documentUploaded: (teamId: string, documentName: string) => 
    createNotification({
      team_id: teamId,
      message: `Document "${documentName}" has been uploaded successfully`,
      type: 'success',
      document_identifier: documentName,
    }),

  /**
   * Create a team-related notification
   */
  teamMemberJoined: (teamId: string, memberName: string) =>
    createNotification({
      team_id: teamId,
      message: `${memberName} has joined the team`,
      type: 'team',
    }),

  /**
   * Create a system notification
   */
  systemMaintenance: (teamId: string, message: string) =>
    createNotification({
      team_id: teamId,
      message,
      type: 'system',
    }),

  /**
   * Create a warning notification
   */
  warning: (teamId: string, message: string) =>
    createNotification({
      team_id: teamId,
      message,
      type: 'warning',
    }),
};
