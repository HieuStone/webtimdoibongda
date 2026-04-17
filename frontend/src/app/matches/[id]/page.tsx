'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Activity, ArrowLeft, Loader2, MapPin, Calendar, CheckCircle, XCircle, MessageCircle, Star } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import ChatBox from '@/components/ChatBox';
import { LevelTeam } from '@/app/teams/_variables/LevelTeam';
import { MatchStatus } from '../_variable/MatchStatus';
import { formatViDateTime } from '@/lib/dateUtils';

export default function MatchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [ratingScore, setRatingScore] = useState<number>(10);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const [matchData, setMatchData] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [myManagedTeams, setMyManagedTeams] = useState<any[]>([]);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let profile: { id: number; name: string } | null = null;
        let myTeams: any[] = [];
        try {
          const profRes = await api.get('/auth/profile');
          profile = profRes.data as { id: number; name: string };
          setCurrentProfile(profile);

          const teamRes = await api.get('/team');
          myTeams = teamRes.data.filter((t: any) => t.managerId === profile!.id);
          setMyManagedTeams(myTeams);
        } catch (e) {
          // It's okay if not logged in
        }

        const [matchRes, reqRes] = await Promise.all([
          api.get(`/match/${id}`),
          api.get(`/match/${id}/requests`)
        ]);

        setMatchData(matchRes.data);
        setRequests(reqRes.data);

        // Load danh sách đội chưa có kèo vào ngày match này (cho dropdown xin kèo)
        try {
          const dateStr = matchRes.data.matchTime.split('T')[0];
          const availRes = await api.get(`/match/my-available-teams?date=${dateStr}`);
          setAvailableTeams(availRes.data);
        } catch (e) {
          // OK nếu chưa login
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleApprove = async (requestId: number) => {
    setActionLoading(requestId * 10 + 1); // unique key: approve
    try {
      await api.post(`/match/${id}/approve/${requestId}`);
      alert("Đã chốt kèo thành công! Trận đấu đã được lên lịch.");
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!confirm('Bạn chắc chắn muốn từ chối yêu cầu này?')) return;
    setActionLoading(requestId * 10 + 2); // unique key: reject
    try {
      await api.post(`/match/${id}/reject/${requestId}`);
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi từ chối.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOpponent = async () => {
    if (!confirm('Bạn chắc chắn muốn hủy kèo với đối thủ hiện tại để tìm đối khác?')) return;
    setActionLoading(999); // unique key for cancel opponent
    try {
      await api.post(`/match/${id}/cancel-opponent`);
      alert("Đã hủy kèo thành công! Trận đấu đã quay lại trạng thái tìm đối.");
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi hủy kèo.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoinMatch = async (selectedTeamId: number) => {
    try {
      await api.post(`/match/${id}/request-join`, { teamId: selectedTeamId });
      alert("Đã gửi yêu cầu ghép kèo thành công!");
      window.location.reload();
    } catch (error: any) {
      if (error.response?.status === 401) {
        alert("Hãy đăng nhập để xin kèo bạn nhé.");
      } else {
        alert(error.response?.data?.message || "Lỗi ghép kèo. Bạn có phải đội trưởng không?");
      }
    }
  };

  const handleRateOpponent = async () => {
    setSubmittingRating(true);
    try {
      await api.post(`/match/${id}/rate`, { fairplayRating: ratingScore, comment: ratingComment });
      alert("Đánh giá thành công! Cảm ơn bạn đã góp phần xây dựng cộng đồng Fairplay.");
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá.');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center">
      <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
    </div>
  );

  if (!matchData) return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center flex-col text-gray-500">
      <span className="text-6xl mb-4">🏜️</span>
      <h2 className="text-xl font-bold">Không tìm thấy kèo này (404)</h2>
    </div>
  );

  const isMatchOwner = myManagedTeams.some(t => t.id === matchData.creatorTeamId);
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const isOpponentOrRequester = myManagedTeams.some(t => t.id === matchData.opponentTeamId || requests.some(r => r.teamId === t.id));
  const canChat = isMatchOwner || isOpponentOrRequester;
  const alreadyRequested = requests.some(r => myManagedTeams.some(t => t.id === r.teamId));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/matches" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors">
          <ArrowLeft className="w-5 h-5" /> Trở về Danh sách
        </Link>

        {/* Thông tin chính của Trận Đấu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="px-8 py-8 border-b border-gray-100 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 transform scale-150 translate-x-1/4 -translate-y-1/4">
              <Activity className="w-64 h-64" />
            </div>

            {matchData.creatorAvatar ? (
              <img src={matchData.creatorAvatar} alt="Creator" className="w-24 h-24 rounded-full object-cover shadow-inner border-2 border-white/50 backdrop-blur relative z-10 shrink-0" />
            ) : (
              <div className="w-24 h-24 bg-white/20 rounded-full flex justify-center items-center text-4xl shadow-inner border-2 border-white/50 backdrop-blur relative z-10 shrink-0">
                ⚔️
              </div>
            )}
              <div className="relative z-10 flex-1">
                <div className="inline-block bg-emerald-900/50 text-emerald-100 px-3 py-1 rounded-full text-xs font-bold mb-3 border border-emerald-500/30 uppercase tracking-wider">
                  Status: {matchData.status === MatchStatus.Finding ? 'Đang Tìm Kèo' : 'Đã Chốt Đối Thủ'}
                </div>
                <div className="inline-block bg-emerald-900/50 text-emerald-100 px-3 py-1 rounded-full text-xs font-bold mb-3 border border-emerald-500/30 uppercase tracking-wider">
                  {matchData.isHomeMatch ? 'Đã có sân' : 'Chưa có sân'}
                </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{matchData.creatorTeamName} đang rủ đá giao lưu</h1>
              <div className="flex flex-col sm:flex-row gap-4 mt-4 font-medium text-emerald-100">
                <div className="flex items-center justify-center md:justify-start gap-2"><MapPin className="w-5 h-5" /> {matchData.stadiumName || 'Chưa có sân'}</div>
                <div className="flex items-center justify-center md:justify-start gap-2"><Calendar className="w-5 h-5" /> {formatViDateTime(matchData.matchTime)}</div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 px-8 py-4 flex flex-wrap justify-center md:justify-start gap-6 text-sm font-bold text-emerald-900 border-b border-emerald-100">
            <div>⚽ Thể thức: Sân {matchData.matchType}</div>
            <div>🔥 Yêu cầu trình: {LevelTeam.find(l => l.value === matchData.skillRequirement)?.label || 'Chưa rõ'}</div>
            <div>💰 Chế độ: {matchData.paymentType}</div>
          </div>

          {!isMatchOwner && matchData.status !== MatchStatus.Scheduled && (
            <div className="p-8 border-b border-gray-100 flex flex-col items-center gap-4 bg-white font-medium">
              {alreadyRequested ? (
                <div className="flex flex-col items-center gap-2 text-blue-600 bg-blue-50 px-6 py-4 rounded-2xl border border-blue-100">
                  <CheckCircle className="w-8 h-8" />
                  <span className="text-lg font-bold">Bạn đã gửi yêu cầu tham gia kèo này!</span>
                  <p className="text-sm text-blue-500">Vui lòng chờ đội trưởng phản hồi hoặc liên hệ qua Chat.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-gray-800">Chọn đội bóng bạn quản lý để xin kèo:</h3>
                  {myManagedTeams.length === 0 ? (
                    <p className="text-red-500 font-medium bg-red-50 px-4 py-2 rounded-lg border border-red-100">Bạn chưa làm đội trưởng đội nào cả. Vui lòng vào mục Đội Bóng để khởi tạo đội trước!</p>
                  ) : availableTeams.length === 0 ? (
                    <p className="text-orange-600 font-medium bg-orange-50 px-4 py-3 rounded-lg border border-orange-100">
                      ⚠️ Tất cả đội của bạn đã có lịch đá ngày này rồi. Mỗi đội chỉ được phép 1 kèo/ngày!
                    </p>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                      <select
                        id="teamSelect"
                        className="bg-gray-50 border border-gray-300 text-gray-900 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block px-4 py-3 min-w-[250px] font-medium"
                      >
                        {availableTeams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const sel = document.getElementById('teamSelect') as HTMLSelectElement;
                          if (sel) handleJoinMatch(Number(sel.value));
                        }}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-1 w-full sm:w-auto flex items-center justify-center gap-2"
                      >
                        👉 Gửi Yêu Cầu Giao Lưu
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {matchData.status === MatchStatus.Scheduled && (
            <div className="p-8 text-center bg-blue-50/50 border-b border-blue-100">
              <div className="text-4xl mb-4 transform hover:scale-110 transition-transform">🤝</div>
              <h2 className="text-3xl font-black text-blue-900 tracking-tight">
                <span className="text-emerald-700">{matchData.creatorTeamName}</span>
                <span className="mx-4 text-blue-400 text-xl font-bold">VS</span>
                <span className="text-orange-600">{matchData.opponentTeamName}</span>
              </h2>
              <p className="text-blue-600 mt-4 font-medium max-w-lg mx-auto bg-blue-100/50 py-2 px-4 rounded-lg">Trận đấu đã chính thức được 2 đội trưởng ấn định. Xin chúc cả 2 đội thi đấu cống hiến, fair-play và bảo toàn đôi chân!</p>

              {isMatchOwner && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleCancelOpponent}
                    disabled={actionLoading === 999}
                    className="px-6 py-2.5 bg-white hover:bg-red-50 text-red-500 font-bold border border-red-200 rounded-xl shadow-sm disabled:opacity-70 flex items-center justify-center gap-2 transition-colors hover:scale-105"
                  >
                    {actionLoading === 999 ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Hủy Giao Lưu (Tìm Đối Khác)</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {matchData.note && (
            <div className="px-8 py-6 bg-white">
              <h3 className="font-bold text-gray-800 mb-3 uppercase text-sm tracking-wider">Ghi chú từ Chủ Nhà:</h3>
              <p className="text-gray-700 italic bg-gray-50 p-5 rounded-2xl border border-gray-100 leading-relaxed max-w-2xl text-lg">"{matchData.note}"</p>
            </div>
          )}

          {matchData.status === MatchStatus.Finished && canChat && (
            <div className="px-8 py-8 bg-blue-50/50 border-t border-blue-100 flex flex-col items-center">
              <h3 className="text-xl font-black text-blue-900 mb-2">Đánh giá đối thủ (Fairplay)</h3>
              <p className="text-blue-600 mb-6 text-sm text-center max-w-md">Hãy chấm điểm mức độ chơi đẹp, đúng giờ và thái độ của đối thủ từ 0-10 điểm.</p>

              <div className="flex items-center gap-4 mb-6">
                <input
                  type="range"
                  min="0" max="10" step="0.5"
                  value={ratingScore}
                  onChange={(e) => setRatingScore(parseFloat(e.target.value))}
                  className="w-48 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="text-3xl font-black text-emerald-600 w-16">{ratingScore}</span>
              </div>

              <textarea
                placeholder="Nhận xét thêm về đối thủ (không bắt buộc)..."
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                className="w-full max-w-md p-3 rounded-xl border border-blue-200 text-sm focus:ring-emerald-500 bg-white mb-4"
                rows={3}
              />

              <button
                onClick={handleRateOpponent}
                disabled={submittingRating}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-1 w-full max-w-md flex justify-center items-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {submittingRating ? <Loader2 className="w-5 h-5 animate-spin" /> : <>⭐ Gửi Đánh Giá</>}
              </button>
            </div>
          )}
        </div>

        {/* Nơi quản lý yêu cầu duyệt Cáp Kèo (Chỉ hiển thị cho Manager) */}
        {isMatchOwner && matchData.status !== MatchStatus.Scheduled && (
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border border-orange-200 shadow-sm mb-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/2 -translate-y-1/2">
              <CheckCircle className="w-64 h-64 text-orange-900" />
            </div>
            <h2 className="text-2xl font-black text-orange-900 mb-6 flex items-center gap-3 relative z-10">
              🎫 Phê Duyệt Đối Thủ ({pendingRequests.length})
            </h2>
            {pendingRequests.length === 0 ? (
              <p className="text-orange-700 font-medium bg-orange-100/50 p-4 rounded-xl relative z-10">
                Chưa có đội nào gửi yêu cầu nhận kèo này. Hãy chờ thêm nhé đội trưởng! ⏳
              </p>
            ) : (
              <div className="space-y-4 relative z-10">
                {pendingRequests.map(req => {
                  const approveKey = req.id * 10 + 1;
                  const rejectKey = req.id * 10 + 2;
                  return (
                    <div key={req.id} className="bg-white p-5 rounded-2xl border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                      {/* Hàng trên: avatar + tên + trình độ + rating */}
                      <div className="flex items-start gap-4 mb-4">
                        {req.avatar ? (
                          <img src={req.avatar} alt="Manager" className="w-14 h-14 rounded-full object-cover shadow-sm border border-orange-200 shrink-0" />
                        ) : (
                          <div className="w-14 h-14 bg-orange-100 rounded-full flex justify-center items-center text-3xl shadow-sm border border-orange-200 shrink-0">🛡️</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-xl leading-tight">{req.teamName}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="bg-orange-50 border border-orange-200 text-orange-700 font-bold px-3 py-1 rounded-full text-sm">
                              🏅 {LevelTeam.find(l => l.value === req.skillLevel)?.label || 'Chưa rõ'}
                            </span>
                            {req.avgRating != null ? (
                              <span className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 text-yellow-700 font-bold px-3 py-1 rounded-full text-sm">
                                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                {req.avgRating} Fairplay
                              </span>
                            ) : (
                              <span className="bg-gray-100 border border-gray-200 text-gray-500 px-3 py-1 rounded-full text-sm">Chưa có đánh giá</span>
                            )}
                          </div>
                          {req.message && (
                            <p className="text-gray-500 italic text-sm mt-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">💬 "{req.message}"</p>
                          )}
                        </div>
                      </div>

                      {/* Hàng dưới: các nút hành động */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-orange-100">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoading === approveKey}
                          className="flex-1 min-w-[120px] px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow disabled:opacity-70 flex items-center justify-center gap-2 transition-all hover:scale-105"
                        >
                          {actionLoading === approveKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Chốt Đội Này</>}
                        </button>

                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={actionLoading === rejectKey}
                          className="flex-1 min-w-[100px] px-4 py-2.5 bg-white hover:bg-red-50 text-red-500 font-bold border border-red-200 rounded-xl disabled:opacity-70 flex items-center justify-center gap-2 transition-colors"
                        >
                          {actionLoading === rejectKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Từ Chối</>}
                        </button>

                        <Link
                          href={`/teams/${req.teamId}`}
                          className="flex-1 min-w-[100px] px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-600 font-bold border border-blue-200 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                          🛡️ Hồ Sơ Đội
                        </Link>

                        <button
                          onClick={() => alert(`Tính năng nhắn tin với ${req.teamName} sẽ sớm có mặt!`)}
                          className="flex-1 min-w-[100px] px-4 py-2.5 bg-white hover:bg-purple-50 text-purple-600 font-bold border border-purple-200 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" /> Nhắn Tin
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Chat Box cho Cáp Kèo */}
        {canChat && (
          <div className="mt-8 mb-12">
            <ChatBox roomType="MATCH" roomId={Number(id)} />
          </div>
        )}
      </main>
    </div>
  );
}
