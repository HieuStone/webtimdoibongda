'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { MapPin, Search, Calendar, PlayCircle, Filter, Loader2, Trash2, Undo2, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface Match {
  id: number;
  creatorTeamName: string;
  opponentTeamId: number | null;
  opponentTeamName: string | null;
  stadiumName: string;
  matchTime: string;
  matchType: number;
  skillRequirement: number;
  paymentType: string;
  status: string;
}

interface MatchRequest {
  id: number;
  matchId: number;
  requestingTeamId: number;
  requestingTeamName: string;
  status: string;
  message: string;
  matchStadiumName: string;
  matchTime: string;
  matchType: number;
  matchStatus: string;
  creatorTeamName: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  finding:          { label: 'Đang tìm đối', color: 'bg-blue-100 text-blue-700 border-blue-200',    icon: <Clock className="w-3 h-3" /> },
  waiting_approval: { label: 'Chờ duyệt',    color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Clock className="w-3 h-3" /> },
  scheduled:        { label: 'Đã lên lịch',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-3 h-3" /> },
  finished:         { label: 'Kết thúc',     color: 'bg-gray-100 text-gray-600 border-gray-200',    icon: <CheckCircle className="w-3 h-3" /> },
  cancelled:        { label: 'Đã hủy',       color: 'bg-red-100 text-red-600 border-red-200',       icon: <XCircle className="w-3 h-3" /> },
};

export default function MatchesPage() {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [matches, setMatches] = useState<Match[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [myRequests, setMyRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);

  useEffect(() => {
    fetchMatches();
    if (user) {
      fetchMyData();
    }
  }, [user]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/match');
      setMatches(response.data);
    } catch (error) {
      console.error('Lỗi khi tải danh sách kèo:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyData = async () => {
    try {
      const [matchesRes, requestsRes] = await Promise.all([
        api.get('/match/my-created-matches'),
        api.get('/match/my-sent-requests')
      ]);
      setMyMatches(matchesRes.data);
      setMyRequests(requestsRes.data);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu cá nhân:', error);
    }
  };

  const handleRequestJoin = async (matchId: number) => {
    if (!user) {
      alert("Vui lòng đăng nhập để nhận kèo!");
      return;
    }
    
    // In a real app, we might want to show a team picker if the user has multiple teams
    const teamIdPrompt = prompt("Nhập ID đội bóng của bạn để xin giao hữu (demo):");
    if (!teamIdPrompt) return;
    
    setActionLoading(matchId);
    try {
      await api.post(`/match/${matchId}/request-join`, Number(teamIdPrompt));
      alert("Đã gửi yêu cầu ghép kèo thành công!");
      fetchMatches();
      fetchMyData();
    } catch (error: any) {
      alert(error.response?.data?.message || "Lỗi ghép kèo (Bạn có phải đội trưởng không?)");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelMatch = async (matchId: number) => {
    if (!confirm('Bạn có chắc chắn muốn hủy bài đăng tìm kèo này?')) return;
    setActionLoading(`cancel-${matchId}`);
    try {
      await api.post(`/match/${matchId}/cancel`);
      alert("Đã hủy kèo thành công!");
      fetchMatches();
      fetchMyData();
    } catch (error: any) {
      alert(error.response?.data?.message || "Lỗi khi hủy kèo");
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdrawRequest = async (matchId: number) => {
    if (!confirm('Bạn muốn rút yêu cầu nhận kèo này?')) return;
    setActionLoading(`withdraw-${matchId}`);
    try {
      await api.delete(`/match/${matchId}/withdraw-request`);
      alert("Đã rút yêu cầu thành công!");
      fetchMyData();
      fetchMatches();
    } catch (error: any) {
      alert(error.response?.data?.message || "Lỗi khi rút yêu cầu");
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

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['finding'];
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
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
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('all')} 
            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'all' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Tất cả kèo mới
          </button>
          {user && (
            <button 
              onClick={() => setActiveTab('mine')} 
              className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'mine' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              Kèo của tôi
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span className="ml-3 mt-1.5 font-medium">Đang tải danh sách từ CSDL...</span>
          </div>
        ) : activeTab === 'all' ? (
          matches.length === 0 ? (
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
                          <h3 className="font-bold text-lg text-gray-900 truncate w-32 md:w-40">{match.creatorTeamName}</h3>
                          <p className="text-sm text-green-600 font-medium">Trình độ y/c: {formatSkill(match.skillRequirement)}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg">Sân {match.matchType}</span>
                    </div>
                    
                    <div className="space-y-2 mt-4 mb-6">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium truncate">{match.stadiumName || 'Chưa chốt sân'}</span>
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
          )
        ) : (
          <div className="space-y-12">
            {/* Section: My Created Matches */}
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <PlayCircle className="w-6 h-6 text-green-600" /> Kèo bạn đã đăng ({myMatches.length})
              </h2>
              {myMatches.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-dashed border-gray-300 text-center text-gray-500">
                  Bạn chưa đăng kèo nào. <Link href="/matches/create" className="text-green-600 font-bold hover:underline">Hãy đăng kèo ngay!</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myMatches.map(match => (
                    <div key={match.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative">
                      <div className="absolute top-4 right-4">
                        {renderStatusBadge(match.status)}
                      </div>
                      <div className="font-bold text-lg mb-4 truncate pr-20">{match.creatorTeamName}</div>
                      <div className="space-y-2 mb-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 opacity-40"/> {match.stadiumName}</div>
                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 opacity-40"/> {new Date(match.matchTime).toLocaleString('vi-VN')}</div>
                      </div>
                      <div className="flex gap-2 pt-4 border-t border-gray-50">
                        <Link href={`/matches/${match.id}`} className="flex-1 py-2 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition-colors">
                          Chi Tiết / Phê Duyệt
                        </Link>
                        <button 
                          onClick={() => handleCancelMatch(match.id)}
                          disabled={actionLoading === `cancel-${match.id}`}
                          className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          {actionLoading === `cancel-${match.id}` ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Trash2 className="w-4 h-4"/> Hủy Kèo</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: My Sent Requests */}
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <Undo2 className="w-6 h-6 text-blue-600" /> Yêu cầu bạn đã gửi ({myRequests.length})
              </h2>
              {myRequests.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-dashed border-gray-300 text-center text-gray-500">
                  Bạn chưa gửi yêu cầu nhận kèo nào.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myRequests.map(req => (
                    <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative">
                      <div className="absolute top-4 right-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-orange-50 text-orange-600 border-orange-100 uppercase">
                          {req.status === 'pending' ? 'Bản thảo' : req.status}
                        </span>
                      </div>
                      <div className="font-bold text-gray-500 text-xs mb-1 uppercase tracking-wider">Gửi tới kèo của:</div>
                      <div className="font-bold text-lg mb-1 truncate">{req.creatorTeamName}</div>
                      <div className="text-xs text-gray-400 mb-4 italic line-clamp-1">"{req.message}"</div>
                      
                      <div className="space-y-2 mb-6 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                         <div className="flex items-center gap-2"><MapPin className="w-4 h-4 opacity-40"/> {req.matchStadiumName}</div>
                         <div className="flex items-center gap-2"><Calendar className="w-4 h-4 opacity-40"/> {new Date(req.matchTime).toLocaleString('vi-VN')}</div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Link href={`/matches/${req.matchId}`} className="flex-1 py-2 text-center bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-xs transition-colors">
                          Xem Kèo
                        </Link>
                        <button 
                          onClick={() => handleWithdrawRequest(req.matchId)}
                          disabled={actionLoading === `withdraw-${req.matchId}`}
                          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          {actionLoading === `withdraw-${req.matchId}` ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Undo2 className="w-4 h-4"/> Rút Đơn</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

