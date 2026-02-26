'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PublicNavbar } from './PublicNavbar';
import { AnnouncementBanner } from '../announcements/AnnouncementBanner';
import { AnnouncementPopup } from '../announcements/AnnouncementPopup';

interface MainLayoutProps {
  children: React.ReactNode;
}

interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  displayType: 'BANNER' | 'POPUP';
}

interface UserInfo {
  name: string | null;
  email: string;
  tier: string;
  isAdmin: boolean;
}

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/pricing'];

async function fetchAnnouncements(): Promise<AnnouncementData[]> {
  try {
    const res = await fetch('/api/announcements/active');
    if (!res.ok) return [];
    const data = await res.json();
    return data.announcements || [];
  } catch {
    return [];
  }
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/legal');
  const isAdminRoute = pathname.startsWith('/admin');

  // Fetch user info (includes admin status)
  useEffect(() => {
    if (isPublicRoute || isAdminRoute) return;

    let cancelled = false;
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.user) {
          setUserInfo({
            name: data.user.name,
            email: data.user.email,
            tier: data.user.tier || 'FREE',
            isAdmin: data.user.isAdmin ?? false,
          });
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [isPublicRoute, isAdminRoute]);

  useEffect(() => {
    if (isPublicRoute || isAdminRoute) return;

    fetchAnnouncements().then(setAnnouncements);

    const interval = setInterval(() => {
      fetchAnnouncements().then(setAnnouncements);
    }, 300_000);

    return () => clearInterval(interval);
  }, [isPublicRoute, isAdminRoute]);

  // Public routes: PublicNavbar only, no sidebar
  if (isPublicRoute) {
    return (
      <>
        <PublicNavbar />
        {children}
      </>
    );
  }

  // Admin routes: pass through to AdminLayout
  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Announcement Banner */}
      {announcements.length > 0 && (
        <AnnouncementBanner announcements={announcements} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isAdmin={userInfo?.isAdmin} />

      {/* Main content area */}
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} userName={userInfo?.name} userEmail={userInfo?.email} userTier={userInfo?.tier} isAdmin={userInfo?.isAdmin} />

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Announcement Popup (overlay) */}
      {announcements.length > 0 && (
        <AnnouncementPopup announcements={announcements} />
      )}
    </div>
  );
}
