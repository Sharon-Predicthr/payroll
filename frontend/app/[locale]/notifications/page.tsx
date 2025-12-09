"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from 'next-intl';
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDirection } from "@/contexts/DirectionContext";
import { isAuthenticated } from "@/lib/auth";
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  FileText,
  Users,
  CreditCard,
  Settings,
  Zap,
} from "lucide-react";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Notification {
  id: number;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

function getNotificationIcon(type: string) {
  switch (type.toLowerCase()) {
    case "payroll":
      return <CreditCard className="w-5 h-5 text-blue-600" />;
    case "employees":
      return <Users className="w-5 h-5 text-green-600" />;
    case "documents":
      return <FileText className="w-5 h-5 text-purple-600" />;
    case "system":
      return <Settings className="w-5 h-5 text-gray-600" />;
    case "integrations":
      return <Zap className="w-5 h-5 text-orange-600" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-600" />;
    case "warning":
      return <AlertCircle className="w-5 h-5 text-orange-600" />;
    case "success":
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    default:
      return <Info className="w-5 h-5 text-blue-600" />;
  }
}

// formatDate will be defined inside the component to use translations

export default function NotificationsPage() {
  const router = useRouter();
  const locale = useLocale();
  const { direction } = useDirection();
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [seeding, setSeeding] = useState(false);

  // Seed sample notifications (DEV ONLY - remove in production)
  const seedNotifications = async () => {
    try {
      setSeeding(true);
      const token = localStorage.getItem('paylens_access_token');
      if (!token) return;

      const response = await fetch('/api/notifications/seed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh notifications after seeding
        await fetchNotifications();
        await fetchUnreadCount();
        alert(`Successfully created ${data.count} sample notifications!`);
      } else {
        const errorData = await response.json();
        alert(`Failed to seed notifications: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error seeding notifications:', error);
      alert('Error seeding notifications. Check console for details.');
    } finally {
      setSeeding(false);
    }
  };

  // Format date helper
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // If less than 1 minute, show "Just now"
    if (diffMins < 1) return t('time.justNow');
    
    // If less than 1 hour, show minutes
    if (diffMins < 60) {
      const minutesText = t('time.minutesAgo');
      return minutesText.replace('{count}', diffMins.toString());
    }
    
    // If less than 24 hours, show hours
    if (diffHours < 24) {
      const hoursText = t('time.hoursAgo');
      return hoursText.replace('{count}', diffHours.toString());
    }
    
    // If less than 7 days, show days
    if (diffDays < 7) {
      const daysText = t('time.daysAgo');
      return daysText.replace('{count}', diffDays.toString());
    }
    
    // Otherwise, show formatted date
    return new Intl.DateTimeFormat(locale === 'he' || locale === 'ar' ? locale : 'en-US', {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push(`/${locale}/login`);
    }
  }, [router, locale]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('paylens_access_token');
      if (!token) {
        router.push(`/${locale}/login`);
        return;
      }

      let url = `/api/notifications?limit=50&offset=0`;
      if (filter === "unread") {
        // Filter unread on client side for now
        // In a real app, you'd add ?isRead=false to the API
      }
      if (typeFilter !== "all") {
        // Filter by type on client side for now
        // In a real app, you'd add ?type=${typeFilter} to the API
      }

      console.log('[Frontend] Fetching notifications from:', url);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Frontend] Notifications response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[Frontend] Notifications response data:', data);
        if (data.success && data.data) {
          console.log('[Frontend] Setting notifications:', data.data.length, 'items');
          setNotifications(data.data);
        } else {
          console.warn('[Frontend] Response missing success or data:', data);
        }
      } else if (response.status === 401) {
        router.push(`/${locale}/login`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Frontend] Error fetching notifications:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('paylens_access_token');
      if (!token) return;

      const response = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.count || data.data?.unreadCount || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('paylens_access_token');
      if (!token) return;

      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('paylens_access_token');
      if (!token) return;

      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    if (isAuthenticated()) {
      fetchNotifications();
      fetchUnreadCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, typeFilter]);

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread" && n.is_read) return false;
    if (typeFilter !== "all" && n.type.toLowerCase() !== typeFilter.toLowerCase()) return false;
    return true;
  });

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-main mb-2">
              {t('title')}
            </h1>
            <p className="text-sm text-text-muted">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* TEMPORARY: Seed Notifications Button (Remove in production) */}
            <Button
              variant="outline"
              onClick={seedNotifications}
              disabled={seeding}
              className="h-9 px-4 text-sm bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
            >
              {seeding ? 'Seeding...' : '🌱 Seed Sample Notifications'}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="h-9 px-4 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {t('markAllAsRead')}
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Tabs */}
              <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
                <TabsList>
                  <TabsTrigger value="all">
                    {t('filters.all')}
                    {filter === "all" && notifications.length > 0 && (
                      <Badge variant="secondary" className="ml-2 rtl:ml-0 rtl:mr-2">
                        {notifications.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="unread">
                    {t('filters.unread')}
                    {unreadCount > 0 && (
                      <Badge variant="primary" className="ml-2 rtl:ml-0 rtl:mr-2">
                        {unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-text-muted whitespace-nowrap">
                  {t('filters.type')}:
                </label>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-[150px] h-9 text-sm"
                >
                  <option value="all">{t('filters.allTypes')}</option>
                  <option value="payroll">{t('filters.payroll')}</option>
                  <option value="employees">{t('filters.employees')}</option>
                  <option value="documents">{t('filters.documents')}</option>
                  <option value="system">{t('filters.system')}</option>
                  <option value="integrations">{t('filters.integrations')}</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-text-muted font-medium">{t('emptyState.title')}</p>
                <p className="text-sm text-text-muted mt-1">{t('emptyState.description')}</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y divide-gray-200">
                  {filteredNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3
                                className={`text-sm font-medium mb-1 ${
                                  !notification.is_read
                                    ? 'text-text-main font-semibold'
                                    : 'text-text-main'
                                }`}
                              >
                                {notification.title}
                              </h3>
                              <p className="text-sm text-text-muted mb-2 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {notification.type}
                                </Badge>
                                <span className="text-xs text-text-muted">
                                  {formatDate(notification.created_at)}
                                </span>
                              </div>
                            </div>

                            {/* Mark as Read Button */}
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                onClick={() => markAsRead(notification.id)}
                                className="h-8 px-3 text-xs flex-shrink-0"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" />
                                {t('markAsRead')}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Unread Indicator */}
                        {!notification.is_read && (
                          <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

