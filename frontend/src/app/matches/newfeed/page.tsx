'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { MapPin, Search, Calendar, PlayCircle, Filter, Loader2, Undo2, XCircle, CheckCircle, Clock, Trophy } from 'lucide-react';
import api from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LevelTeam } from '@/app/teams/_variables/LevelTeam';
import { getFairplayRankLabel, getFairplayRankStyle } from '@/app/teams/_variables/FairplayRank';
import * as signalR from '@microsoft/signalr';
import Link from 'next/link';
import { MatchStatus } from '../_variable/MatchStatus';
import { formatViDateTime } from '@/lib/dateUtils';

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
  creatorAvatar: string | null;
  creatorFairplayScore?: number | null;
}

const STATUS_CONFIG: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  [MatchStatus.Finding]: { label: 'Đang tìm đối', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <PlayCircle className="w-3 h-3" /> },
  [MatchStatus.WaitingApproval]: { label: 'Chờ duyệt', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Clock className="w-3 h-3" /> },
  [MatchStatus.Scheduled]: { label: 'Đã lên lịch', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-3 h-3" /> },
  [MatchStatus.Finished]: { label: 'Kết thúc', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: <Trophy className="w-3 h-3" /> },
  [MatchStatus.Cancelled]: { label: 'Đã hủy', color: 'bg-red-100 text-red-600 border-red-200', icon: <XCircle className="w-3 h-3" /> },
};

export default function NewfeedPage() {
  const { user } = useCurrentUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectingMatchId, setSelectingMatchId] = useState<number | null>(null);

  // Filters state
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTeamId, setFilterTeamId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHome, setFilterHome] = useState<'all' | 'home' | 'away'>('all');

  useEffect(() => {
    fetchMatches();
    fetchAllTeams();
  }, [filterDate, filterTeamId, filterHome]);

  // Thiết lập SignalR Real-time Connection
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
      fetchMatches();
    });

    return () => {
      hubConnection.invoke('LeaveFeed').finally(() => hubConnection.stop());
    };
  }, [filterDate, filterTeamId, filterHome, searchTerm]);

  const fetchAllTeams = async () => {
    try {
      const response = await api.get('/team');
      setAllTeams(response.data);
    } catch (error) {
      console.error('Lỗi khi tải danh sách đội:', error);
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/match', {
        params: {
          matchTime: filterDate || undefined,
          teamId: filterTeamId || undefined,
          searchTerm: searchTerm || undefined,
          isHomeMatch: filterHome === 'all' ? undefined : filterHome === 'home'
        }
      });
      setMatches(response.data);
    } catch (error) {
      console.error('Lỗi khi tải danh sách kèo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = async (matchId: number, matchTime: string) => {
    if (!user) {
      alert("Vui lòng đăng nhập để nhận kèo!");
      return;
    }

    setSelectingMatchId(matchId);
    setLoadingTeams(true);
    try {
      const response = await api.get(`/match/my-available-teams?date=${matchTime}`);
      const teams = response.data;

      if (teams.length === 0) {
        alert("Bạn không có đội nào sẵn sàng (chưa có đội hoặc đã có kèo khác) vào ngày này!");
        return;
      }

      if (teams.length === 1) {
        if (confirm(`Sử dụng đội "${teams[0].name}" để nhận kèo này?`)) {
          await submitRequestJoin(matchId, teams[0].id);
        }
      } else {
        setAvailableTeams(teams);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách đội:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const submitRequestJoin = async (matchId: number, teamId: number) => {
    setActionLoading(matchId);
    try {
      await api.post(`/match/${matchId}/request-join`, teamId);
      alert("Đã gửi yêu cầu ghép kèo thành công!");
      setIsModalOpen(false);
      fetchMatches();
    } catch (error: any) {
      alert(error.response?.data?.message || "Lỗi ghép kèo (Bạn có phải đội trưởng không?)");
    } finally {
      setActionLoading(null);
    }
  };

  const formatSkill = (skill: number) => {
    return LevelTeam.find(l => l.value === skill)?.label || 'Chưa rõ';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tất cả kèo mới</h1>
              <p className="text-gray-500 mt-2">Theo dõi các kèo đấu đang tìm đối thủ</p>
            </div>
            <Link href="/matches/create" className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2">
              <PlayCircle className="w-5 h-5" /> Tạo Kèo Mới
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-4 overflow-x-auto pb-2">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên sân, quận huyện..."
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
          <Link href="/matches/newfeed" className="px-6 py-2 rounded-full font-bold bg-gray-800 text-white shadow-lg">
            Tất cả kèo mới
          </Link>
          <Link href="/matches/mymatch" className="px-6 py-2 rounded-full font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
            Kèo của tôi
          </Link>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl w-fit mb-6 overflow-x-auto">
          <button onClick={() => setFilterHome('all')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${filterHome === 'all' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Tất cả</button>
          <button onClick={() => setFilterHome('home')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${filterHome === 'home' ? 'bg-white shadow-sm text-emerald-600 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>⚽ Có Sân Nhà</button>
          <button onClick={() => setFilterHome('away')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${filterHome === 'away' ? 'bg-white shadow-sm text-orange-500 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>✈️ Cần Đi Khách</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span className="ml-3 mt-1.5 font-medium">Đang tải danh sách...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏜️</div>
            <h3 className="text-xl font-bold text-gray-800">Chưa có trận nào!</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches
              .filter(m =>
                m.stadiumName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.creatorTeamName.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((match) => (
                <div key={match.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-transform hover:-translate-y-1 duration-300">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        {match.creatorAvatar ? (
                          <img src={match.creatorAvatar} alt="Team Manager" className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-green-100" />
                        ) : (
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-xl">🛡️</div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 truncate w-32 md:w-40">{match.creatorTeamName}</h3>
                          <p className="text-sm text-green-600 font-medium">Trình độ: {formatSkill(match.skillRequirement)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getFairplayRankStyle(match.creatorFairplayScore)}`} title="Fairplay Score">
                          {match.creatorFairplayScore != null
                            ? `★ ${match.creatorFairplayScore} (${getFairplayRankLabel(match.creatorFairplayScore)})`
                            : "★ Chưa rõ"}
                        </div>
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg border border-gray-200">Sân {match.matchType}</span>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${match.isHomeMatch ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                          {match.isHomeMatch ? '⚽ Có Sân Nhà' : '✈️ Cần Đi Khách'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4 mb-6">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium truncate">{match.stadiumName || 'Chưa có sân'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium truncate">{formatViDateTime(match.matchTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <span className="w-4 h-4 flex justify-center items-center font-bold text-gray-400">💰</span>
                        {match.paymentType}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex gap-3">
                      <button
                        onClick={() => handleRequestJoin(match.id, match.matchTime)}
                        disabled={actionLoading === match.id || loadingTeams || match.status === MatchStatus.Scheduled}
                        className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-70 flex justify-center items-center"
                      >
                        {actionLoading === match.id ? <Loader2 className="w-5 h-5 animate-spin" /> : (match.status === MatchStatus.Scheduled ? 'Đã Chốt' : 'Nhận Kèo')}
                      </button>
                      <Link
                        href={`/matches/${match.id}`}
                        className="flex-1 flex justify-center items-center py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
                      >
                        Chi Tiết
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* Modal Selection Copy */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Chọn đội của bạn</h3>
              <button onClick={() => setIsModalOpen(false)}><XCircle className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-3">
              {availableTeams.map(team => (
                <button
                  key={team.id}
                  onClick={() => submitRequestJoin(selectingMatchId!, team.id)}
                  className="w-full p-4 border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-green-500 hover:bg-green-50 transition-all"
                >
                  <div className="font-bold">{team.name}</div>
                  <div className="text-xs text-gray-500">Trình: {formatSkill(team.skillLevel)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
