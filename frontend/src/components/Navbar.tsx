'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, Menu, X, Activity, Users, MapPin, CalendarDays } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setUserName(localStorage.getItem('userName'));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setUserName(null);
    router.push('/login');
  };

  const NavLinks = () => (
    <>
      <Link href="/matches" className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-medium px-3 py-2 rounded-lg hover:bg-green-50 transition-colors">
        <Activity className="w-5 h-5" /> Tìm Kèo
      </Link>
      <Link href="/teams" className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-medium px-3 py-2 rounded-lg hover:bg-green-50 transition-colors">
        <Users className="w-5 h-5" /> Đội Bóng
      </Link>
      <Link href="/my-matches" className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-medium px-3 py-2 rounded-lg hover:bg-green-50 transition-colors">
        <CalendarDays className="w-5 h-5" /> Lịch Của Tôi
      </Link>
      <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-medium px-3 py-2 rounded-lg hover:bg-green-50 transition-colors">
        <MapPin className="w-5 h-5" /> Quanh Đây
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
          
          <div className="hidden sm:flex items-center gap-4">
            {userName ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                  <User className="w-4 h-4 text-green-600" />
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

      {isMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white">
          <div className="pt-2 pb-3 space-y-1 px-4">
            <NavLinks />
          </div>
          <div className="pt-4 pb-4 border-t border-gray-100 px-4">
            {userName ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <User className="w-5 h-5 text-green-600" />
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
