'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, Menu, X, Activity, Users, MapPin, CalendarDays, Bell, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import * as signalR from '@microsoft/signalr';

interface NotificationItem {
  id: number;
  message: string;
  actionLink: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Notifications state
  const { user } = useCurrentUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      if (localStorage.getItem('token')) {
        const res = await api.get('/notification');
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải thông báo', err);
    }
  };

  useEffect(() => {
    setUserName(localStorage.getItem('userName'));
    setUserAvatar(localStorage.getItem('userAvatar'));
    fetchNotifications();

    // Polling mỗi 30 giây (backup)
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // SignalR Real-time Notifications
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(process.env.NEXT_PUBLIC_SIGNALR_HUB as string, {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect()
      .build();

    hubConnection.start()
      .then(() => {
        console.log('SignalR connected to NotificationHub');
        hubConnection.invoke('JoinUser', user.id);
      })
      .catch(err => console.error('SignalR Connection Error: ', err));

    hubConnection.on('ReceiveNotification', () => {
      console.log('You have a new Notification. Reloading...');
      fetchNotifications();
    });

    return () => {
       hubConnection.stop();
    };
  }, [user]);

  // Click outside to close notifications dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRead = async (id: number, link: string | null) => {
    try {
      await api.post(`/notification/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setShowNotifs(false);
      if (link) {
        router.push(link);
      }
    } catch (err) {
       console.error(err);
    }
  };

  const handleReadAll = async () => {
    try {
      await api.post('/notification/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userAvatar');
    setUserName(null);
    setUserAvatar(null);
    router.push('/login');
  };

  const NavLinks = () => (
    <>
      <Link href="/matches/newfeed" className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-medium px-3 py-2 rounded-lg hover:bg-green-50 transition-colors">
        <Activity className="w-5 h-5" /> Tìm Kèo
      </Link>
      <Link href="/matches/mymatch" className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-medium px-3 py-2 rounded-lg hover:bg-green-50 transition-colors">
        <CheckCircle2 className="w-5 h-5" /> Kèo Của Tôi
      </Link>
      <Link href="/my-matches" className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-medium px-3 py-2 rounded-lg hover:bg-green-50 transition-colors">
        <CalendarDays className="w-5 h-5" /> Lịch Thi Đấu
      </Link>
      <Link href="/teams" className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-medium px-3 py-2 rounded-lg hover:bg-green-50 transition-colors">
        <Users className="w-5 h-5" /> Đội Bóng
      </Link>
    </>
  );

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <span className="text-2xl">⚽</span>
              <span className="font-bold text-xl text-green-600 tracking-tight">Tìm Đối</span>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
              <NavLinks />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {userName && (
              /* Bell Icon - visible on both mobile and desktop */
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center justify-center"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Notifcation */}
                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-sm">
                      <h3 className="font-bold text-gray-800">Thông báo {unreadCount > 0 && <span className="text-red-500 text-sm ml-1">({unreadCount} mới)</span>}</h3>
                      {unreadCount > 0 && (
                        <button onClick={handleReadAll} className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đọc tất cả
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 flex flex-col items-center gap-2">
                           <Bell className="w-8 h-8 opacity-20" />
                           <span className="text-sm font-medium">Bạn chưa có thông báo nào.</span>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {notifications.map(n => (
                            <div 
                              key={n.id} 
                              onClick={() => handleRead(n.id, n.actionLink)}
                              className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-green-50/30' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? 'bg-green-500' : 'bg-transparent'}`} />
                                <div>
                                  <p className={`text-sm ${!n.isRead ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                    {n.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1 font-medium">
                                    {new Date(n.createdAt + (n.createdAt.endsWith('Z') ? '' : 'Z')).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="hidden sm:flex items-center gap-4">
              {userName ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 p-1.5 pr-3 rounded-full border border-gray-200">
                    {userAvatar ? (
                      <img src={userAvatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover shadow-sm ring-1 ring-gray-200" />
                    ) : (
                      <User className="w-4 h-4 text-green-600" />
                    )}
                    {userName}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-gray-600 hover:text-green-600 font-medium transition-colors">
                    Đăng nhập
                  </Link>
                  <Link href="/register" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full font-medium shadow-sm hover:shadow transition-all">
                    Tạo tài khoản
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white">
          <div className="pt-2 pb-3 space-y-1 px-4">
            <NavLinks />
          </div>
          <div className="pt-4 pb-4 border-t border-gray-100 px-4">
            {userName ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-3">
                  <div className="p-0.5 rounded-full overflow-hidden flex items-center justify-center">
                    {userAvatar ? (
                      <img src={userAvatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-green-100" />
                    ) : (
                      <div className="bg-green-100 p-2 rounded-full">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  <div className="font-medium text-gray-800">{userName}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                >
                  <LogOut className="w-5 h-5" /> Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" className="w-full text-center py-2 text-green-600 font-medium border border-green-200 rounded-lg">
                  Đăng nhập
                </Link>
                <Link href="/register" className="w-full text-center py-2 bg-green-600 text-white font-medium rounded-lg">
                  Tạo tài khoản
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
