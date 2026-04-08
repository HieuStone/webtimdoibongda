'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Shield, ArrowLeft, CheckCircle, Clock, Loader2, User, LogOut, Crown, UserMinus } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function TeamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const { user } = useCurrentUser();
  const currentUserId = user?.id ?? null;
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedNewManagerId, setSelectedNewManagerId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const [teamRes, memRes] = await Promise.all([
          api.get(`/team/${id}`),
          api.get(`/team/${id}/members`)
        ]);

        setTeam(teamRes.data);
        setMembers(memRes.data);
      } catch (error) {
        console.error('Lỗi tải đội bóng:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamData();
  }, [id]);

  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    try {
      await api.post(`/team/${id}/approve-join/${userId}`);
      // Lạc quan update UI
      setMembers(members.map(m => m.userId === userId ? { ...m, status: 'approved' } : m));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi phê duyệt.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignRole = async (userId: number, role: string) => {
    setActionLoading(userId * 10);
    try {
      await api.post(`/team/${id}/roles/${userId}`, { role });
      setMembers(members.map(m => m.userId === userId ? { ...m, teamRole: role } : m));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật chức vụ.');
    } finally {
      setActionLoading(null);
    }
  };

  const submitLeaveTeam = async (newManagerId: number | null) => {
    setActionLoading(999);
    try {
      await api.post(`/team/${id}/leave`, { newManagerId });
      alert("Đã rời đội thành công!");
      router.push('/teams');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi rời đội.');
      setActionLoading(null);
    }
  };

  const handleLeaveTeam = () => {
    if (isManager && approvedMembers.length > 1) {
      setShowLeaveModal(true);
    } else {
      if (confirm('Bạn chắc chắn muốn rời đội bóng này?')) {
        submitLeaveTeam(null);
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
    </div>
  );

  if (!team) return (
    <div className="min-h-screen bg-gray-50 text-center py-20 font-bold text-gray-500">
      Đội bóng không tồn tại cõi mạng này (404 Not Found)!
    </div>
  );

  const isManager = currentUserId === team.managerId;
  const pendingMembers = members.filter(m => m.status === 'pending');
  const approvedMembers = members.filter(m => m.status === 'approved');
  const isMember = currentUserId && approvedMembers.some(m => m.userId === currentUserId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/teams" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors">
          <ArrowLeft className="w-5 h-5" /> Bảng Xếp Hạng Đội Bóng
        </Link>

        {/* Banner Headers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="px-8 py-8 border-b border-gray-100 bg-gradient-to-br from-blue-700 to-blue-900 text-white flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
            <div className="w-28 h-28 bg-white/20 rounded-full flex justify-center items-center text-5xl shadow-inner border-2 border-white/50 backdrop-blur">
              🛡️
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {team.shortName ? `[${team.shortName}] ` : ''}{team.name}
              </h1>
              <p className="text-blue-100 font-medium text-lg mb-4">Đội trưởng: {team.managerName}</p>

              {isMember && (
                <button
                  onClick={handleLeaveTeam}
                  disabled={actionLoading === 999}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-70 shadow-sm inline-flex"
                >
                  {actionLoading === 999 ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  Rời Đội Bóng
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nơi duyệt yêu cầu xin vào đội (Chỉ hiện ra thẻ này nếu Login = Account Manager) */}
        {isManager && pendingMembers.length > 0 && (
          <div className="bg-orange-50 rounded-2xl p-6 border border-orange-200 shadow-sm mb-8 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-orange-200 opacity-50 transform rotate-12">
              <Clock className="w-32 h-32" />
            </div>
            <h2 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2 relative z-10">
              <Clock className="w-6 h-6" /> Duyệt Chuyển Nhượng Mới ({pendingMembers.length})
            </h2>
            <div className="space-y-3 relative z-10">
              {pendingMembers.map(req => (
                <div key={req.userId} className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-xl border border-orange-200 shadow-sm gap-4">
                  <div className="flex items-center gap-3">
                    <User className="w-10 h-10 text-orange-500 bg-orange-100 rounded-full p-2" />
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{req.name}</p>
                      <p className="text-sm text-gray-500">{req.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApprove(req.userId)}
                    disabled={actionLoading === req.userId}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-md disabled:opacity-70 flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                  >
                    {actionLoading === req.userId ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Ký Hợp Đồng</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danh sách thành viên chính thức */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Đội Hình Hiện Tại ({approvedMembers.length})</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedMembers.map(mem => (
                <div key={mem.userId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        {mem.name}
                        {mem.userId === team.managerId && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 uppercase font-black tracking-wider">Đội Trưởng</span>}
                        {mem.userId !== team.managerId && mem.teamRole === 'vice_captain' && <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200 uppercase font-black tracking-wider">Đội Phó</span>}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">{mem.email}</p>
                    </div>
                  </div>

                  {isManager && mem.userId !== team.managerId && (
                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      {mem.teamRole !== 'vice_captain' ? (
                        <button
                          onClick={() => handleAssignRole(mem.userId, 'vice_captain')}
                          disabled={actionLoading === mem.userId * 10}
                          className="w-full sm:w-auto text-xs px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold rounded-lg transition-colors border border-blue-100 flex items-center justify-center gap-1"
                        >
                          {actionLoading === mem.userId * 10 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />} Phong Đội Phó
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAssignRole(mem.userId, 'member')}
                          disabled={actionLoading === mem.userId * 10}
                          className="w-full sm:w-auto text-xs px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 font-semibold rounded-lg transition-colors border border-gray-200 flex items-center justify-center gap-1"
                        >
                          {actionLoading === mem.userId * 10 ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />} Hủy Đội Phó
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {approvedMembers.length === 0 && (
                <div className="col-span-2 text-center text-gray-400 py-10 font-medium">Chưa có thành viên chính thức nào.</div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Rời Đội cho Manager */}
        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-black text-gray-900 mb-2 flex items-center gap-2"><Crown className="w-6 h-6 text-amber-500" /> Bàn Giao Băng Đội Trưởng</h3>
                <p className="text-gray-500 text-sm">Bạn là Đội trưởng. Hãy chọn người kế nhiệm trước khi chính thức rời khỏi độ bóng này.</p>
              </div>
              <div className="p-6 bg-gray-50 max-h-64 overflow-y-auto space-y-3">
                {approvedMembers.filter(m => m.userId !== currentUserId).map(m => (
                  <div
                    key={m.userId}
                    onClick={() => setSelectedNewManagerId(m.userId)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedNewManagerId === m.userId ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white hover:border-blue-300 shadow-sm'
                      }`}
                  >
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{m.name}</p>
                      {m.teamRole === 'vice_captain' && <p className="text-xs text-blue-600 font-bold mt-0.5">Đội Phó</p>}
                    </div>
                    {selectedNewManagerId === m.userId && <CheckCircle className="w-6 h-6 text-blue-500 shrink-0" />}
                  </div>
                ))}
              </div>
              <div className="p-6 flex flex-col gap-3 bg-white border-t border-gray-100">
                <button
                  onClick={() => submitLeaveTeam(selectedNewManagerId)}
                  disabled={!selectedNewManagerId || actionLoading === 999}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  Xác Nhận Kế Nhiệm & Rời Đội
                </button>
                <button
                  onClick={() => {
                    if (confirm('Hệ thống sẽ tự động chỉ định Đội Phó (hoặc thành viên lâu nhất) lên thay bạn. Bạn chắc chứ?')) {
                      submitLeaveTeam(null);
                    }
                  }}
                  disabled={actionLoading === 999}
                  className="w-full py-3 bg-orange-50 text-orange-600 font-bold rounded-xl hover:bg-orange-100 transition-colors border border-orange-100"
                >
                  Bỏ Qua (Hệ Thống Tự Chỉ Định)
                </button>
                <button
                  onClick={() => setShowLeaveModal(false)}
                  disabled={actionLoading === 999}
                  className="w-full py-3 bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Huỷ Bỏ Hành Động
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
