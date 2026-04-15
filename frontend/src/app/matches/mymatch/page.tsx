'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Loader2, Trash2, Undo2, Clock, CheckCircle, XCircle, Trophy, MapPin, Calendar, PlayCircle, Search, Filter } from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getFairplayRankLabel, getFairplayRankStyle } from '@/app/teams/_variables/FairplayRank';
import Link from 'next/link';
import * as signalR from '@microsoft/signalr';
import { MatchStatus } from '../_variable/MatchStatus';

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
  status: number;
  isHomeMatch: boolean;
  isAutoMatch: boolean;
  creatorFairplayScore?: number | null;
}

interface MatchRequest {
  id: number;
  matchId: number;
  requestingTeamId: number;
  requestingTeamName: string;
  status: number;
  message: string;
  matchStadiumName: string;
  matchTime: string;
  matchType: number;
  matchStatus: number;
  creatorTeamName: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  [MatchStatus.Finding]: { label: 'Đang tìm đối', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Clock className="w-3 h-3" /> },
  [MatchStatus.WaitingApproval]: { label: 'Chờ duyệt', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Clock className="w-3 h-3" /> },
  [MatchStatus.Scheduled]: { label: 'Đã lên lịch', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-3 h-3" /> },
  [MatchStatus.Finished]: { label: 'Kết thúc', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: <Trophy className="w-3 h-3" /> },
  [MatchStatus.Cancelled]: { label: 'Đã hủy', color: 'bg-red-100 text-red-600 border-red-200', icon: <XCircle className="w-3 h-3" /> },
};

export default function MyMatchPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [joinedMatches, setJoinedMatches] = useState<Match[]>([]);
  const [myRequests, setMyRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);

  const [allTeams, setAllTeams] = useState<any[]>([]);

  // Filters state
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTeamId, setFilterTeamId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchMyData();
      fetchAllTeams();
    }
  }, [user, userLoading, filterDate, filterTeamId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (user) fetchMyData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Thiết lập SignalR Realtime Connection
  useEffect(() => {
    const hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(process.env.NEXT_PUBLIC_SIGNALR_HUB as string)
      .withAutomaticReconnect()
      .build();

    hubConnection.start()
      .then(() => {
        hubConnection.invoke('JoinFeed');
      })
      .catch(err => console.error('SignalR Connection Error: ', err));

    hubConnection.on('MatchListUpdated', () => {
      console.log('Real-time update triggered. Refreshing My Matches...');
      fetchMyData();
    });

    return () => {
      hubConnection.invoke('LeaveFeed').finally(() => hubConnection.stop());
    };
  }, [filterDate, filterTeamId, searchTerm]);

  const fetchAllTeams = async () => {
    try {
      const response = await api.get('/team');
      setAllTeams(response.data);
    } catch (error) {
      console.error('Lỗi khi tải danh sách đội:', error);
    }
  };

  const fetchMyData = async () => {
    setLoading(true);
    try {
      const params = {
        matchTime: filterDate || undefined,
        teamId: filterTeamId || undefined,
        searchTerm: searchTerm || undefined
      };

      const [createdRes, requestsRes, allMyMatchesRes] = await Promise.all([
        api.get('/match/my-created-matches', { params }),
        api.get('/match/my-sent-requests', { params }),
        api.get('/match/my-matches', { params })
      ]);
      setMyMatches(createdRes.data);
      setMyRequests(requestsRes.data);

      const createdIds = new Set(createdRes.data.map((m: Match) => m.id));
      const joined = allMyMatchesRes.data.filter((m: Match) => !createdIds.has(m.id));
      setJoinedMatches(joined);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu cá nhân:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMatch = async (matchId: number) => {
    if (!confirm('Bạn có chắc chắn muốn hủy bài đăng tìm kèo này?')) return;
    setActionLoading(`cancel-${matchId}`);
    try {
      await api.post(`/match/${matchId}/cancel`);
      alert("Đã hủy kèo thành công!");
      fetchMyData();
    } catch (error: any) {
      alert(error.response?.data?.message || "Lỗi khi hủy kèo");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAutoMatch = async (matchId: number, isEnabled: boolean) => {
    setActionLoading(`autoMatch-${matchId}`);
    try {
      const res = await api.post(`/match/${matchId}/auto-match`, { isEnabled });
      if (res.data.matched) {
        alert("🎉 " + res.data.message);
      } else {
        alert("✅ " + res.data.message);
      }
      fetchMyData();
    } catch (error: any) {
      alert(error.response?.data?.message || "Lỗi khi đổi trạng thái bắt kèo tự động");
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
    } catch (error: any) {
      alert(error.response?.data?.message || "Lỗi khi rút yêu cầu");
    } finally {
      setActionLoading(null);
    }
  };

  const renderStatusBadge = (status: number) => {
    const config = STATUS_CONFIG[Number(status)] || STATUS_CONFIG[MatchStatus.Finding];
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  if (userLoading || (loading && !myMatches.length && !joinedMatches.length && !myRequests.length)) return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center">
      <Loader2 className="w-10 h-10 animate-spin text-green-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kèo của tôi</h1>
              <p className="text-gray-500 mt-2">Quản lý các bài đăng và yêu cầu nhận kèo của bạn</p>
            </div>
            <Link href="/matches/create" className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2">
              <PlayCircle className="w-5 h-5" /> Tạo Kèo Mới
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-4 overflow-x-auto pb-2">
            <div className="relative flex-1 min-w-[250px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Tìm theo sân, đối thủ..."
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
              className={`px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${showAdvancedFilter ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Filter className="w-5 h-5" /> Lọc Nâng Cao
            </button>
          </div>

          {showAdvancedFilter && (
            <div className="mt-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" /> Chốt Ngày
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  🛡️ Câu Lạc Bộ
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none appearance-none"
                  value={filterTeamId}
                  onChange={(e) => setFilterTeamId(e.target.value)}
                >
                  <option value="">Tất cả câu lạc bộ</option>
                  {allTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterDate('');
                    setFilterTeamId('');
                    setSearchTerm('');
                  }}
                  className="w-full py-2.5 text-gray-500 hover:text-red-500 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Undo2 className="w-4 h-4" /> Reset Bộ Lọc
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-8">
          <Link href="/matches/newfeed" className="px-6 py-2 rounded-full font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
            Tất cả kèo mới
          </Link>
          <Link href="/matches/mymatch" className="px-6 py-2 rounded-full font-bold bg-gray-800 text-white shadow-lg">
            Kèo của tôi
          </Link>
        </div>

        <div className="space-y-12">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <PlayCircle className="w-6 h-6 text-green-600" /> Bài đăng của bạn ({myMatches.length})
            </h2>
            {myMatches.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-dashed border-gray-300 text-center text-gray-500">
                Bạn chưa đăng kèo nào.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myMatches.map(match => (
                  <div key={match.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative">
                    <div className="absolute top-4 right-4">{renderStatusBadge(match.status)}</div>
                    <div className="font-bold text-lg mb-1 truncate pr-20">{match.creatorTeamName}</div>
                    <div className="mb-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getFairplayRankStyle(match.creatorFairplayScore)}`}>
                        {match.creatorFairplayScore != null
                          ? `★ FP: ${match.creatorFairplayScore} (${getFairplayRankLabel(match.creatorFairplayScore)})`
                          : "★ FP: Chưa rõ"}
                      </span>
                    </div>
                    <div className="space-y-2 mb-6 text-sm text-gray-600">
                      {match.isHomeMatch ? <div className="flex items-center gap-2"><MapPin className="w-4 h-4 opacity-40" /> {match.stadiumName}</div> : <div className="flex items-center gap-2">Chưa có sân</div>}
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 opacity-40" /> {new Date(match.matchTime).toLocaleString('vi-VN')}</div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-gray-50">
                      <Link href={`/matches/${match.id}`} className="flex-1 py-2 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition-colors">
                        Chi Tiết
                      </Link>
                      <button
                        onClick={() => handleCancelMatch(match.id)}
                        className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-xs transition-colors"
                      >
                        Hủy Kèo
                      </button>
                    </div>

                    {match.status === MatchStatus.Finding && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleToggleAutoMatch(match.id, !match.isAutoMatch)}
                          className={`w-full py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-sm ${match.isAutoMatch
                            ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          {actionLoading === `autoMatch-${match.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : (
                            match.isAutoMatch ? '⚡ ĐANG BẬT AUTO-MATCH CỦA HỆ THỐNG' : 'Tự ghép tự động đang Tắt'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" /> Kèo bạn đã nhận ({joinedMatches.length})
            </h2>
            {joinedMatches.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-dashed border-gray-300 text-center text-gray-500">
                Chưa có kèo nào bạn tham gia làm đối thủ.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedMatches.map(match => (
                  <div key={match.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative">
                    <div className="absolute top-4 right-4">{renderStatusBadge(match.status)}</div>
                    <div className="font-bold text-lg mb-1 truncate pr-20">{match.creatorTeamName}</div>
                    <div className="mb-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getFairplayRankStyle(match.creatorFairplayScore)}`}>
                        {match.creatorFairplayScore != null
                          ? `★ FP: ${match.creatorFairplayScore} (${getFairplayRankLabel(match.creatorFairplayScore)})`
                          : "★ FP: Chưa rõ"}
                      </span>
                    </div>
                    <div className="space-y-2 mb-6 text-sm text-gray-600">
                      {match.isHomeMatch ? <div className="flex items-center gap-2"><MapPin className="w-4 h-4 opacity-40" /> {match.stadiumName}</div> : <div className="flex items-center gap-2">Chưa có sân</div>}
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 opacity-40" /> {new Date(match.matchTime).toLocaleString('vi-VN')}</div>
                    </div>
                    <Link href={`/matches/${match.id}`} className="block w-full py-2 text-center bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs">
                      Chi Tiết
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <Undo2 className="w-6 h-6 text-blue-600" /> Yêu cầu đang gửi ({myRequests.length})
            </h2>
            {myRequests.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-dashed border-gray-300 text-center text-gray-500">
                Bạn chưa gửi yêu cầu nào.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myRequests.map(req => (
                  <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative">
                    <div className="font-bold text-lg mb-1 truncate">{req.creatorTeamName}</div>
                    <div className="text-xs text-gray-400 mb-4 truncate italic">"{req.message}"</div>
                    <div className="flex gap-2">
                      <Link href={`/matches/${req.matchId}`} className="flex-1 py-1.5 text-center bg-blue-50 text-blue-600 font-bold rounded-lg text-[10px]">Xem Kèo</Link>
                      <button onClick={() => handleWithdrawRequest(req.matchId)} className="flex-1 py-1.5 bg-gray-100 text-gray-500 font-bold rounded-lg text-[10px]">Rút Đơn</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
