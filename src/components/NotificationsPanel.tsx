import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Bell, 
  AlertTriangle, 
  Flame, 
  TreePine, 
  Clock, 
  MapPin,
  X 
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'fire' | 'deforestation' | 'biodiversity' | 'weather' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  location?: string;
  read: boolean;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export function NotificationsPanel({ 
  isOpen, 
  onClose, 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead 
}: NotificationsPanelProps) {
  if (!isOpen) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'fire': return <Flame className="w-4 h-4 text-red-500" />;
      case 'deforestation': return <TreePine className="w-4 h-4 text-orange-500" />;
      case 'biodiversity': return <TreePine className="w-4 h-4 text-green-500" />;
      case 'weather': return <AlertTriangle className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="fixed right-4 top-16 w-96 max-h-[80vh] bg-card border rounded-lg shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-l-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-muted/30' : ''
                  } ${
                    notification.severity === 'critical' ? 'border-l-red-500' :
                    notification.severity === 'high' ? 'border-l-orange-500' :
                    notification.severity === 'medium' ? 'border-l-yellow-500' :
                    'border-l-green-500'
                  }`}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        <Badge variant={getSeverityColor(notification.severity)} className="text-xs">
                          {notification.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(notification.timestamp)}</span>
                        {notification.location && (
                          <>
                            <span>•</span>
                            <MapPin className="w-3 h-3" />
                            <span>{notification.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" className="w-full">
            View All Notifications
          </Button>
        </div>
      </div>
    </div>
  );
}