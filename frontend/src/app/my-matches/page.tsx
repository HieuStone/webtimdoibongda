'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { ChevronLeft, ChevronRight, Loader2, Trophy, Clock, CheckCircle, XCircle, Calendar, Users, FileText } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Match {
  id: number;
  creatorTeamId: number;
  creatorTeamName: string;
  opponentTeamId?: number;
  opponentTeamName?: string;
  stadiumName?: string;
  matchTime: string;
  matchType: number;
  status: string;
  paymentType: string;
  creatorScore?: number;
  opponentScore?: number;
}

interface AttendanceVote {
  userId: number;
  userName: string;
  isAttending: boolean;
  note?: string;
}

interface AttendanceSession {
  id: number;
  teamId: number;
  teamName: string;
  targetDate: string;
  matchId?: number;
  title: string;
  votes: AttendanceVote[];
  attendingCount: number;
  notAttendingCount: number;
}

const DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  finding:          { label: 'Đang tìm đối', color: 'bg-blue-100 text-blue-700 border-blue-200',    icon: <Clock className="w-3 h-3" /> },
  waiting_approval: { label: 'Chờ duyệt',    color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Clock className="w-3 h-3" /> },
  scheduled:        { label: 'Đã lên lịch',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-3 h-3" /> },
  finished:         { label: 'Kết thúc',     color: 'bg-gray-100 text-gray-600 border-gray-200',    icon: <Trophy className="w-3 h-3" /> },
  cancelled:        { label: 'Đã hủy',       color: 'bg-red-100 text-red-600 border-red-200',       icon: <XCircle className="w-3 h-3" /> },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function MyMatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [myUserId, setMyUserId] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // Score Modal
  const [scoreModal, setScoreModal] = useState<Match | null>(null);
  const [scoreInput, setScoreInput] = useState({ creator: '', opponent: '' });
  const [scoreSaving, setScoreSaving] = useState(false);

  // Attendance View/Vote Modal
  const [attendanceModal, setAttendanceModal] = useState<AttendanceSession | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);

  // Create Attendance Mode
  const [createAttendanceModal, setCreateAttendanceModal] = useState(false);
  const [createParams, setCreateParams] = useState({ title: '', teamId: '', targetDate: '' });
  const [myManagedTeams, setMyManagedTeams] = useState<any[]>([]);

  const fetchPageData = async () => {
    try {
      const profRes = await api.get('/auth/profile').catch(() => ({ data: null }));
      if (profRes.data) setMyUserId(profRes.data.id);

      const [matchRes, sessionRes, teamRes] = await Promise.all([
        api.get('/match/my-matches'),
        api.get('/attendance/my-sessions'),
        api.get('/team').catch(() => ({ data: [] }))
      ]);

      if (teamRes.data && profRes.data) {
        setMyManagedTeams(teamRes.data.filter((t: any) => t.managerId === profRes.data.id));
      }

      const processed = matchRes.data.map((m: Match) => {
        if ((m.status === 'finding' || m.status === 'waiting_approval') && new Date(m.matchTime) < new Date()) {
          return { ...m, status: 'cancelled' };
        }
        return m;
      });
      setMatches(processed);
      setSessions(sessionRes.data);
    } catch (err: any) {
      if (err.response?.status === 401) router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [router]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  function getMatchesForDay(day: number) {
    return matches.filter(m => {
      const d = new Date(m.matchTime);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  function getSessionsForDay(day: number) {
    return sessions.filter(s => {
      const d = new Date(s.targetDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); }

  function getWeekDates(): Date[] {
    const d = new Date(currentDate);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(start);
      dd.setDate(start.getDate() + i);
      return dd;
    });
  }

  function getMatchesForDate(date: Date) {
    return matches.filter(m => new Date(m.matchTime).toDateString() === date.toDateString());
  }

  function getSessionsForDate(date: Date) {
    return sessions.filter(s => new Date(s.targetDate).toDateString() === date.toDateString());
  }

  const prevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const nextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };

  const handleSaveScore = async () => {
    if (!scoreModal) return;
    setScoreSaving(true);
    try {
      await api.post(`/match/${scoreModal.id}/update-score`, {
        creatorScore: Number(scoreInput.creator),
        opponentScore: Number(scoreInput.opponent),
      });
      setMatches(prev => prev.map(m => m.id === scoreModal.id
        ? { ...m, creatorScore: Number(scoreInput.creator), opponentScore: Number(scoreInput.opponent), status: 'finished' }
        : m
      ));
      setScoreModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi lưu tỷ số.');
    } finally {
      setScoreSaving(false);
    }
  };

  const handleVote = async (isAttending: boolean) => {
    if (!attendanceModal) return;
    setVoteLoading(true);
    try {
      await api.post(`/attendance/${attendanceModal.id}/vote`, { isAttending, note: '' });
      await fetchPageData(); // Refresh the list of sessions
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi điểm danh.');
    } finally {
      setVoteLoading(false);
    }
  };

  const handleCreateAttendance = async () => {
    if (!createParams.title || !createParams.teamId || !createParams.targetDate) {
      alert('Vui lòng điền đủ Tiêu đề, Đội và Ngày mục tiêu.');
      return;
    }
    setVoteLoading(true);
    try {
      await api.post('/attendance/session', {
        teamId: Number(createParams.teamId),
        targetDate: new Date(createParams.targetDate).toISOString(),
        title: createParams.title,
        matchId: null
      });
      setCreateAttendanceModal(false);
      setCreateParams({ title: '', teamId: '', targetDate: '' });
      await fetchPageData();
    } catch(err: any) {
      alert(err.response?.data?.message || 'Có lỗi khi tạo Phiên Điểm Danh.');
    } finally {
      setVoteLoading(false);
    }
  };

  // derived data
  const selectedMatches = selectedDay ? getMatchesForDay(selectedDay) : [];
  const selectedSessions = selectedDay ? getSessionsForDay(selectedDay) : [];
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const weekDates = getWeekDates();

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" /> Lịch Thi Đấu & Điểm Danh
            </h1>
            <p className="text-gray-500 mt-1">Đổng bộ {matches.length} kèo và {sessions.length} phiên điểm danh</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCreateAttendanceModal(true)}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm text-sm transition-colors block"
            >
              📋 Lập Điểm Danh
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'month' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >Tháng</button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'week' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >Tuần</button>
            <Link href="/matches/create" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm text-sm transition-colors block">
              + Đăng Kèo
            </Link>
          </div>
        </div>

        {/* === MONTH VIEW === */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50">
                <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-200 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-xl font-black text-gray-800">{MONTHS[month]} {year}</h2>
                <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-200 transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="grid grid-cols-7 border-b border-gray-100">
                {DAYS_OF_WEEK.map(d => (
                  <div key={d} className="text-center py-2 text-xs font-black text-gray-400 uppercase tracking-wider">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 sm:h-20 border-b border-r border-gray-50" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dayMatches = getMatchesForDay(day);
                  const daySessions = getSessionsForDay(day);

                  const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                  const isSelected = selectedDay === day;
                  const hasPast = dayMatches.some(m => m.status === 'finished');
                  const hasFuture = dayMatches.some(m => m.status === 'scheduled' || m.status === 'finding');
                  const hasSession = daySessions.length > 0;
                  
                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                      className={`h-16 sm:h-20 border-b border-r border-gray-50 p-1 cursor-pointer transition-all hover:bg-blue-50 flex flex-col ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''}`}
                    >
                      <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mx-auto ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                        {day}
                      </div>
                      {(dayMatches.length > 0 || hasSession) && (
                        <div className="flex gap-0.5 flex-wrap justify-center mt-1 items-center">
                          {hasFuture && <span className="w-2 h-2 bg-emerald-400 rounded-full" title="Sắp đấu" />}
                          {hasPast && <span className="w-2 h-2 bg-gray-400 rounded-full" title="Đã đấu" />}
                          {hasSession && <span className="w-2 h-2 bg-purple-500 rounded-full flex items-center justify-center" title="Có điểm danh"><span className="text-[6px] text-white">📋</span></span>}
                          {dayMatches.length + daySessions.length > 1 && (
                            <span className="text-[9px] font-black text-blue-500">+{dayMatches.length + daySessions.length}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar: details */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-black text-gray-800 mb-4 text-lg">
                  {selectedDay ? `Ngày ${selectedDay}/${month + 1}` : 'Chọn một ngày để xem'}
                </h3>
                {!selectedDay && (
                  <p className="text-gray-400 text-sm text-center py-8">👆 Bấm vào một ngày bất kỳ trên lịch để xem các sự kiện hôm đó.</p>
                )}
                {selectedDay && selectedMatches.length === 0 && selectedSessions.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-8">Ngày này trống.</p>
                )}
                <div className="space-y-3">
                  {selectedMatches.map(m => (
                    <MatchCard 
                      key={`m-${m.id}`} 
                      match={m} 
                      session={sessions.find(s => s.matchId === m.id)} // Attached Session
                      onEnterScore={() => { setScoreModal(m); setScoreInput({ creator: String(m.creatorScore ?? ''), opponent: String(m.opponentScore ?? '') }); }}
                      onVoteAttendance={() => setAttendanceModal(sessions.find(s => s.matchId === m.id) ?? null)}
                    />
                  ))}
                  {/* Standalone Sessions without a Match */}
                  {selectedSessions.filter(s => !s.matchId).map(s => (
                    <AttendanceCard key={`s-${s.id}`} session={s} onVote={() => setAttendanceModal(s)} />
                  ))}
                </div>
              </div>

              {/* Upcoming */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-black text-gray-800 mb-4 text-lg">⚡ Sắp Tới</h3>
                <div className="space-y-3">
                  {matches
                    .filter(m => new Date(m.matchTime) >= today && m.status !== 'cancelled')
                    .slice(0, 4)
                    .map(m => (
                      <MatchCard 
                        key={m.id} 
                        match={m} 
                        session={sessions.find(s => s.matchId === m.id)}
                        compact 
                        onEnterScore={() => { setScoreModal(m); setScoreInput({ creator: '', opponent: '' }); }} 
                        onVoteAttendance={() => setAttendanceModal(sessions.find(s => s.matchId === m.id) ?? null)}
                      />
                    ))
                  }
                  {matches.filter(m => new Date(m.matchTime) >= today).length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">Chưa có kèo nào sắp tới.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === WEEK VIEW === */}
        {viewMode === 'week' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50">
              <button onClick={prevWeek} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-200 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-black text-gray-800">
                {weekDates[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – {weekDates[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </h2>
              <button onClick={nextWeek} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-200 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-7 divide-x divide-gray-100">
              {weekDates.map((date, idx) => {
                const dayMatches = getMatchesForDate(date);
                const daySessions = getSessionsForDate(date);
                const isToday = date.toDateString() === today.toDateString();
                return (
                  <div key={idx} className="min-h-48">
                    <div className={`py-3 text-center border-b border-gray-100 ${isToday ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>
                      <div className="text-xs font-bold uppercase opacity-70">{DAYS_OF_WEEK[date.getDay()]}</div>
                      <div className={`text-2xl font-black ${isToday ? 'text-white' : 'text-gray-800'}`}>{date.getDate()}</div>
                    </div>
                    <div className="p-2 space-y-2">
                      {dayMatches.map(m => {
                        const content = (
                          <div className={`rounded-lg p-2 text-[11px] font-bold border hover:opacity-80 transition-opacity mb-1 ${m.status !== 'cancelled' ? 'cursor-pointer' : ''} ${STATUS_CONFIG[m.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                            <div className="truncate">⚽ {m.creatorTeamName}</div>
                            {m.opponentTeamName && <div className="truncate text-[10px] opacity-80">vs {m.opponentTeamName}</div>}
                            {m.status === 'finished' && m.creatorScore != null && (
                              <div className="text-center font-black text-base mt-1">{m.creatorScore} – {m.opponentScore}</div>
                            )}
                            <div className="opacity-70 mt-0.5 font-normal">{new Date(m.matchTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        );
                        return m.status !== 'cancelled' ? (
                          <Link href={`/matches/${m.id}`} key={`mw-${m.id}`}>{content}</Link>
                        ) : (
                          <div key={`mw-${m.id}`} className="opacity-60">{content}</div>
                        );
                      })}
                      {daySessions.filter(s => !s.matchId).map(s => (
                        <div key={`sw-${s.id}`} onClick={() => setAttendanceModal(s)} className="rounded-lg p-2 text-[11px] font-bold border cursor-pointer hover:bg-purple-100 transition-colors mb-1 bg-purple-50 text-purple-700 border-purple-200">
                           <div className="truncate">📋 {s.title}</div>
                           <div className="opacity-70 font-normal">{new Date(s.targetDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Score Entry Modal */}
      {scoreModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Nhập Tỷ Số Trận Đấu</h2>
            <p className="text-gray-500 mb-6 text-sm">Cập nhật kết quả sau trận để lưu vào hồ sơ thi đấu.</p>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 text-center">
                <p className="text-sm font-bold text-gray-600 mb-2 truncate">{scoreModal.creatorTeamName}</p>
                <input
                  type="number" min={0} value={scoreInput.creator}
                  onChange={e => setScoreInput(p => ({ ...p, creator: e.target.value }))}
                  className="w-full text-center text-4xl font-black border-2 border-blue-200 focus:border-blue-500 rounded-2xl py-4 outline-none"
                  placeholder="0"
                />
              </div>
              <div className="text-4xl font-black text-gray-300 mt-6">–</div>
              <div className="flex-1 text-center">
                <p className="text-sm font-bold text-gray-600 mb-2 truncate">{scoreModal.opponentTeamName ?? 'Đội Khách'}</p>
                <input
                  type="number" min={0} value={scoreInput.opponent}
                  onChange={e => setScoreInput(p => ({ ...p, opponent: e.target.value }))}
                  className="w-full text-center text-4xl font-black border-2 border-orange-200 focus:border-orange-500 rounded-2xl py-4 outline-none"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setScoreModal(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">Hủy</button>
              <button onClick={handleSaveScore} disabled={scoreSaving} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow disabled:opacity-70 flex items-center justify-center gap-2 transition-colors">
                {scoreSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : '✅ Lưu Kết Quả'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attendanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 mb-1">{attendanceModal.title}</h2>
                  <p className="text-gray-500 text-sm flex items-center gap-2"><Users className="w-4 h-4"/> Cho đội: {attendanceModal.teamName}</p>
                </div>
                <button onClick={() => setAttendanceModal(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
             </div>

             <div className="bg-purple-50 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 border border-purple-100 text-center">
                 <div>
                    <p className="text-3xl font-black text-emerald-600">{attendanceModal.attendingCount}</p>
                    <p className="text-xs font-bold text-gray-500 uppercase mt-1">Tham gia</p>
                 </div>
                 <div>
                    <p className="text-3xl font-black text-red-500">{attendanceModal.notAttendingCount}</p>
                    <p className="text-xs font-bold text-gray-500 uppercase mt-1">Nghỉ</p>
                 </div>
             </div>

             <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Danh sách Điểm Danh báo tham gia</h3>
                {attendanceModal.votes.filter(v => v.isAttending).length === 0 ? (
                  <p className="text-sm text-gray-400 italic bg-gray-50 py-3 rounded-lg text-center">Chưa có ai báo Có</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                     {attendanceModal.votes.filter(v => v.isAttending).map(v => (
                       <span key={v.userId} className={`px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 ${myUserId === v.userId ? 'ring-2 ring-emerald-500' : ''}`}>
                          {myUserId === v.userId ? '👤 Bạn (' + v.userName + ')' : v.userName}
                       </span>
                     ))}
                  </div>
                )}
             </div>

             <div className="mb-8">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Danh sách báo Vắng</h3>
                {attendanceModal.votes.filter(v => !v.isAttending).length === 0 ? (
                  <p className="text-sm text-gray-400 italic bg-gray-50 py-3 rounded-lg text-center">Chưa có ai báo Nghỉ</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                     {attendanceModal.votes.filter(v => !v.isAttending).map(v => (
                       <span key={v.userId} className={`px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-100 flex items-center gap-1 ${myUserId === v.userId ? 'ring-2 ring-red-400' : ''}`}>
                          {v.userName}
                       </span>
                     ))}
                  </div>
                )}
             </div>

             <div className="border-t border-gray-100 pt-6">
                <p className="text-center font-bold text-gray-800 mb-4 text-sm">Lựa chọn của bạn</p>
                <div className="flex gap-3">
                   <button 
                     onClick={() => handleVote(true)}
                     disabled={voteLoading}
                     className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:scale-105"
                   >
                     {voteLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : '✅ Có Đi'}
                   </button>
                   <button 
                     onClick={() => handleVote(false)}
                     disabled={voteLoading}
                     className="flex-1 py-3.5 bg-red-100 hover:bg-red-200 text-red-700 font-black rounded-xl transition-all border border-red-200 flex items-center justify-center gap-2"
                   >
                     {voteLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : '⛔ Báo Nghỉ'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Create Attendance Modal */}
      {createAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Tạo Phiên Điểm Danh Mới</h2>
            <p className="text-gray-500 mb-6 text-sm">Gửi một phiếu điểm danh tới các thành viên đội để lấy ý kiến và kiểm tra lực lượng trước ngày thi đấu.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên sự kiện / Tiêu đề</label>
                <input 
                  type="text" placeholder="VD: Giao lưu nội bộ Chủ Nhật"
                  value={createParams.title} onChange={e => setCreateParams(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Chọn Đội Của Bạn</label>
                {myManagedTeams.length === 0 ? (
                  <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100 italic">Bạn chưa làm đội trưởng của đội nào. Chỉ đội trưởng mới được mở báo quân.</p>
                ) : (
                  <select 
                    value={createParams.teamId} onChange={e => setCreateParams(p => ({ ...p, teamId: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-purple-500 bg-white"
                  >
                    <option value="" disabled>-- Chọn một đội --</option>
                    {myManagedTeams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ngày diễn ra (Dự kiến)</label>
                <input 
                  type="datetime-local"
                  value={createParams.targetDate} onChange={e => setCreateParams(p => ({ ...p, targetDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-purple-500 bg-white"
                />
              </div>
            </div>

            <div className="flex gap-3">
               <button onClick={() => setCreateAttendanceModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">Đóng</button>
               <button 
                 onClick={handleCreateAttendance} disabled={myManagedTeams.length === 0 || voteLoading}
                 className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
               >
                 {voteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '🚀 Tạo Phiếu'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceCard({ session, onVote }: { session: AttendanceSession; onVote: () => void }) {
  const targetDate = new Date(session.targetDate);
  return (
    <div className="rounded-xl border border-purple-100 bg-white p-3 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-sm truncate">{session.title}</div>
          <div className="text-xs text-gray-500 truncate">Cho đội: {session.teamName}</div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 bg-purple-50 text-purple-700 border-purple-200">
          📋 Điểm Danh
        </span>
      </div>
      <div className="text-xs text-gray-400 mb-2">
        <div>🕐 {targetDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={onVote} className="flex-1 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-lg transition-colors">
          ✅ Vote ngay ({session.attendingCount} Có / {session.notAttendingCount} Không)
        </button>
      </div>
    </div>
  );
}

function MatchCard({ match, session, compact = false, onEnterScore, onVoteAttendance }: { match: Match; session?: AttendanceSession; compact?: boolean; onEnterScore: () => void; onVoteAttendance: () => void }) {
  const st = STATUS_CONFIG[match.status] ?? STATUS_CONFIG['finding'];
  const matchTime = new Date(match.matchTime);
  const isFinished = match.status === 'finished';
  const hasOpponent = match.status === 'scheduled' || match.status === 'finished';
  const isAfter90Mins = (new Date().getTime() - matchTime.getTime()) >= 90 * 60 * 1000;

  const showDetails = match.status !== 'cancelled';
  const showEnterScore = hasOpponent && isAfter90Mins;

  return (
    <div className={`rounded-xl border p-3 hover:shadow-md transition-all group ${compact ? 'py-2.5' : ''} ${isFinished ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-sm truncate">{match.creatorTeamName}</div>
          {match.opponentTeamName && <div className="text-xs text-gray-500 truncate">vs {match.opponentTeamName}</div>}
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${st.color}`}>
          {st.icon} {st.label}
        </span>
      </div>

      {isFinished && match.creatorScore != null && (
        <div className="text-center text-2xl font-black text-gray-800 my-2 bg-gray-100 rounded-lg py-1.5">
          {match.creatorScore} <span className="text-gray-400 font-normal text-base">–</span> {match.opponentScore}
        </div>
      )}

      {!compact && (
        <div className="text-xs text-gray-400 mt-1 space-y-0.5">
          <div>🕐 {matchTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
          {match.stadiumName && <div>📍 {match.stadiumName}</div>}
          <div>⚽ Sân {match.matchType} | 💰 {match.paymentType}</div>
        </div>
      )}

      {(showDetails || showEnterScore || session) && (
        <div className="flex gap-2 mt-2">
          {session && (
            <button onClick={onVoteAttendance} className="flex-1 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 font-bold text-xs rounded-lg transition-colors shadow-sm border border-purple-100 flex justify-center gap-1">
              📋 {session.attendingCount} Lên / {session.notAttendingCount} Tịt
            </button>
          )}
          {showDetails && (
            <Link href={`/matches/${match.id}`} className="flex-1 py-1.5 text-center bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-lg transition-colors border border-blue-100">
              Chi Tiết
            </Link>
          )}
          {showEnterScore && (
            <button
              onClick={onEnterScore}
              className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg transition-colors border border-emerald-100"
            >
              {isFinished ? '✏️ Sửa Tỷ Số' : '⚽ Nhập Điểm'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
