'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { MapPin, Search, Calendar, PlayCircle, Filter, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface Match {
  id: number;
  creatorTeamName: string;
  opponentTeamName: string | null;
  stadiumName: string;
  matchTime: string;
  matchType: number;
  skillRequirement: number;
  paymentType: string;
  status: string;
}

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await api.get('/match');
      setMatches(response.data);
    } catch (error) {
      console.error('Lỗi khi tải danh sách kèo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = async (matchId: number) => {
    const teamIdPrompt = prompt("Nhập ID đội bóng của bạn để xin giao hữu (demo):");
    if (!teamIdPrompt) return;
    
    setActionLoading(matchId);
    try {
      await api.post(`/match/${matchId}/request-join`, Number(teamIdPrompt));
      alert("Đã gửi yêu cầu ghép kèo thành công!");
      fetchMatches();
    } catch (error: any) {
      alert(error.response?.data?.message || "Lỗi ghép kèo (Bạn có phải đội trưởng không?)");
    } finally {
      setActionLoading(null);
    }
  };

  const formatSkill = (skill: number) => {
    switch (skill) {
      case 1: return 'Kém';
      case 2: return 'Yếu';
      case 3: return 'Trung Bình';
      case 4: return 'Khá';
      case 5: return 'Bán chuyên';
      default: return 'Chưa rõ';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tìm Kèo Giao Hữu</h1>
              <p className="text-gray-500 mt-2">Danh sách Cáp Kèo thực tế từ hệ thống Backend</p>
            </div>
            <Link href="/matches/create" className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 hover:shadow-md transform hover:-translate-y-0.5">
              <PlayCircle className="w-5 h-5" /> Tạo Kèo Mới
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-4 overflow-x-auto pb-2">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Tìm theo tên sân, quận huyện..." className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <button className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-200 transition-colors whitespace-nowrap">
              <Filter className="w-5 h-5" /> Lọc Nâng Cao
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-6">
          <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-full font-medium ${activeTab === 'all' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 shadow-sm transition-colors'}`}>Tất cả kèo mới</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span className="ml-3 mt-1.5 font-medium">Đang tải danh sách từ CSDL...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏜️</div>
            <h3 className="text-xl font-bold text-gray-800">Chưa có trận nào được tạo!</h3>
            <p className="text-gray-500 mt-2">Chưa ai đăng kèo, bạn hãy trở thành người đầu tiên tạo Kèo nhé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <div key={match.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-transform hover:-translate-y-1 duration-300">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-xl">🛡️</div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{match.creatorTeamName}</h3>
                        <p className="text-sm text-green-600 font-medium">Trình độ y/c: {formatSkill(match.skillRequirement)}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg">Sân {match.matchType}</span>
                  </div>
                  
                  <div className="space-y-2 mt-4 mb-6">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{match.stadiumName || 'Chưa chốt sân'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-red-600">{new Date(match.matchTime).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <span className="w-4 h-4 flex justify-center items-center font-bold text-gray-400">💰</span>
                      Chế độ: <span className="font-medium">{match.paymentType}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex gap-3">
                    <button 
                      onClick={() => handleRequestJoin(match.id)}
                      disabled={actionLoading === match.id || match.status === 'scheduled'}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-70 flex justify-center items-center"
                    >
                      {actionLoading === match.id ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : (match.status === 'scheduled' ? 'Đã Chốt Đối' : 'Nhận Kèo Này')}
                    </button>
                    <Link 
                      href={`/matches/${match.id}`}
                      className="flex-1 flex justify-center items-center py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
                    >
                      Chi Tiết Kèo
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
