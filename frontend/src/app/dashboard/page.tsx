'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Activity, ArrowRight, Users, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const [profileRes, teamsRes] = await Promise.all([
          api.get('/auth/profile'),
          api.get('/team')
        ]);
        
        setUserProfile(profileRes.data);
        
        // Filter teams that the user is managing
        const managed = teamsRes.data.filter((t: any) => t.managerId === profileRes.data.id);
        setMyTeams(managed);
      } catch (error: any) {
        console.error(error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-green-600">
         <Loader2 className="w-12 h-12 animate-spin mb-4" />
         <p className="font-medium text-lg text-gray-500">Đang tải hồ sơ Live...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trang Tổng Quan - Cầu Thủ</h1>
            <p className="text-gray-500 mt-1">Chào mừng sự trở lại, <span className="font-bold text-green-600">{userProfile?.name}</span> ({userProfile?.email})</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Băng Đội Trưởng FC</p>
              <p className="text-2xl font-bold text-gray-900">{myTeams.length} Đội</p>
            </div>
          </div>
          {/* Add more metric cards if needed */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tính năng mở rộng (Mô phỏng API)</h2>
            <div className="bg-white rounded-2xl p-8 border border-green-100 shadow-sm">
                <div className="text-center font-medium text-gray-500">
                    <div className="text-6xl mb-4">🏆</div>
                    Dữ liệu Dashboard đã được Live Fetch bằng tài khoản JWT Token của bạn! Thử click vào <b>Tìm Kèo</b> trên Navbar để gọi `/api/match` xem có trận đấu nào chưa nhé.
                </div>
            </div>
          </div>

          <div>
            <div className="mt-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" /> Đội Bạn Quản Lý
              </h3>
              <div className="space-y-4">
                {myTeams.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Bạn chưa lập Đội Bóng (FC) nào cả.</p>
                ) : myTeams.map((team, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-gray-50 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">⚽</div>
                        <div>
                          <p className="font-medium text-gray-800">{team.name}</p>
                          <p className="text-xs text-gray-500">Manager</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-green-600">Active</span>
                    </div>
                ))}
                
                <Link 
                   href="/teams/create"
                   className="w-full py-2 flex items-center justify-center gap-2 text-blue-600 font-medium border border-dashed border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  + Tạo đội bóng mới
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
