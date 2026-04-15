'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Users, Search, Plus, MapPin, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LevelTeam } from '@/app/teams/_variables/LevelTeam';

interface Team {
  id: number;
  name: string;
  shortName: string | null;
  skillLevel: number;
  managerName: string;
  managerId: number;
}

export default function TeamsPage() {
  const { user } = useCurrentUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [otherTeams, setOtherTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const handleJoinTeam = async (teamId: number) => {
    setActionLoading(teamId);
    try {
      const res = await api.post(`/team/${teamId}/request-join`);
      alert(res.data.message || "Gửi yêu cầu thành công!");
    } catch (err: any) {
      if (err.response?.status === 401) {
        alert("Bạn cần Đăng Nhập để thực hiện thao tác này.");
      } else {
        alert(err.response?.data?.message || "Có lỗi xảy ra khi xin vào đội.");
      }
    } finally {
      setActionLoading(null);
    }
  };

  console.log("user", user);
  console.log("teams", teams);
  console.log("myTeams", myTeams);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        let myTeamsData: Team[] = [];
        if (user) {
          try {
            const myTeamsRes = await api.get('/team/my-teams');
            myTeamsData = myTeamsRes.data;
          } catch (e) { }
        }

        const response = await api.get('/team');
        const allTeams = response.data;

        setMyTeams(myTeamsData);
        setOtherTeams(allTeams.filter((t: Team) => !myTeamsData.find((mt: Team) => mt.id === t.id)));
        setTeams(allTeams); // To keep general filter or searching maybe later

      } catch (error) {
        console.error('Lỗi tải danh sách FC:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, [user]);

  const formatSkill = (skill: number) => {
    return LevelTeam.find(t => t.value === skill)?.label || 'Không rõ';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Danh Sách Đội Bóng</h1>
            <p className="text-gray-500 mt-2">Duyệt qua các anh hào bóng đá phủi trong CSDL MySQL.</p>
          </div>
          <Link
            href="/teams/create"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 hover:shadow-md transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" /> Lập Đội Bóng Mới
          </Link>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Tìm tên FC..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span className="ml-3 mt-1.5 font-medium">Đang tải danh sách FC...</span>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-gray-800">Chưa có ai lập đội!</h3>
            <p className="text-gray-500 mt-2">Bấm 'Lập Đội Bóng Mới' để là FC đi tiên phong bạn nhé.</p>
          </div>
        ) : (
          <>
            {myTeams.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="text-blue-500">🛡️</span> Đội Bóng Của Tôi
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {myTeams.map((team) => (
                    <div key={`my-${team.id}`} className="bg-blue-50 p-6 rounded-2xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow group">
                      <div className="w-20 h-20 mx-auto bg-white rounded-full border-4 border-blue-100 shadow-sm flex items-center justify-center text-3xl mb-4 group-hover:scale-105 transition-transform">
                        ⚽
                      </div>
                      <h3 className="text-center font-bold text-lg text-blue-900 mb-1">
                        {team.shortName ? `[${team.shortName}] ` : ''}{team.name}
                      </h3>
                      <div className="flex justify-center items-center gap-1 text-sm text-blue-700 mb-4 font-medium">
                        <span className="opacity-80">Đội trưởng:</span> {team.managerName}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center mb-6 opacity-90">
                        <div className="bg-white/60 rounded-lg p-2">
                          <div className="text-xs font-medium mb-1">Trình độ</div>
                          <div className="text-sm font-bold">{formatSkill(team.skillLevel)}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-2">
                          <div className="text-xs font-medium mb-1">Fair-play</div>
                          <div className="text-sm font-bold">★ TBD</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/teams/${team.id}`}
                          className="flex-1 flex justify-center items-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
                          {user?.id === team.managerId ? "Quản Lý Đội" : "Xem Chi Tiết"}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otherTeams.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="text-gray-400">🌍</span> Các Đội Bóng Khác
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {otherTeams.map((team) => (
                    <div key={team.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                      <div className="w-20 h-20 mx-auto bg-gray-50 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-3xl mb-4 group-hover:scale-105 transition-transform">
                        ⚽
                      </div>
                      <h3 className="text-center font-bold text-lg text-gray-900 mb-1">
                        {team.shortName ? `[${team.shortName}] ` : ''}{team.name}
                      </h3>
                      <div className="flex justify-center items-center gap-1 text-sm text-gray-500 mb-4 font-medium">
                        <span className="text-blue-600">Đội trưởng:</span> {team.managerName}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center mb-6">
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <div className="text-xs text-gray-500 font-medium mb-1">Trình độ</div>
                          <div className="text-sm font-bold text-gray-800">{formatSkill(team.skillLevel)}</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2 border border-orange-100">
                          <div className="text-xs text-orange-600 font-medium mb-1">Fair-play</div>
                          <div className="text-sm font-bold text-orange-700">★ TBD</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleJoinTeam(team.id)}
                          disabled={actionLoading === team.id}
                          className="flex-1 flex justify-center items-center py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-lg text-sm transition-colors disabled:opacity-70">
                          {actionLoading === team.id ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : "Xin Vào Đội"}
                        </button>
                        <Link
                          href={`/teams/${team.id}`}
                          className="flex-1 flex justify-center items-center py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-sm transition-colors border border-gray-200 shadow-sm">
                          Hồ Sơ Đội
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
