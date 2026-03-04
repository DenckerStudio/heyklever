"use client";

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { NotificationItem } from './notification-item';
import { NotificationModal } from './notification-modal';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTeams } from '@/lib/hooks/useTeams';

interface Notification {
  id: number;
  created_at: string;
  team_id: string;
  message: string;
  type: string;
  status: string;
  document_identifier?: string;
  content?: string;
  action_url?: string;
  metadata?: Record<string, any>;
}

interface NotificationDropdownProps {
  className?: string;
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const { currentTeam } = useTeams();
  const supabase = createSupabaseBrowserClient();

  // Fetch initial notifications
  const fetchNotifications = async () => {
    if (!currentTeam?.id) return;
    
    try {
      const response = await fetch('/api/notifications?limit=10&status=new');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRead = async (notificationId: number) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notificationId,
          status: 'read',
        }),
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleAction = async (notificationId: number, action: 'accept' | 'reject') => {
    try {
      const response = await fetch('/api/notifications/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notificationId,
          action,
        }),
      });

      if (response.ok) {
        // Optimistically remove from list or mark as read
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        console.log(`Action ${action} processed for notification ${notificationId}`);
      } else {
        console.error('Failed to process action');
      }
    } catch (error) {
      console.error('Error processing notification action:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.map(notification =>
          fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notification_id: notification.id,
              status: 'read',
            }),
          })
        )
      );
      setNotifications([]);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (!currentTeam?.id) return;

    fetchNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`notifications:${currentTeam.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_notifications',
          filter: `team_id=eq.${currentTeam.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTeam?.id]);

  return (
    <>
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
              "relative p-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 outline-none",
            className
          )}
        >
            <Bell className="w-5 h-5" />
          {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background animate-pulse" />
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
          className="w-[380px] max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-xl shadow-lg border-border/40 backdrop-blur-xl bg-background/95"
          sideOffset={8}
      >
          <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground/90">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/5"
              >
                Mark all as read
              </button>
            )}
        </div>

          <div className="overflow-y-auto flex-1 p-2 max-h-[500px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/20">
        {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                Checking for updates...
          </div>
        ) : notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground/70">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">No new notifications at the moment.</p>
          </div>
        ) : (
              <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {notifications.map((notification) => (
                  <NotificationItem
                key={notification.id}
                    notification={notification}
                    onRead={handleRead}
                    onAction={handleAction}
                    onViewDetails={setSelectedNotification}
                  />
            ))}
          </div>
        )}
          </div>
      </DropdownMenuContent>
    </DropdownMenu>

      <NotificationModal
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        notification={selectedNotification}
      />
    </>
  );
}
