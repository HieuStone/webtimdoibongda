'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Activity, MapPin, Trophy, ArrowLeft, Loader2, Calendar, PlayCircle } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { LevelTeam } from '@/app/teams/_variables/LevelTeam';

interface Area { id: number; name: string; city: string; }
interface Team { id: number; name: string; managerId: number; teamRole?: number; }

export default function CreateMatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [areas, setAreas] = useState<Area[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);

  // Format current time to local ISO string without timezone shifts for initial form
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);

  const [formData, setFormData] = useState({
    creatorTeamId: 0,
    stadiumName: '',
    areaId: 0,
    matchTime: localISOTime,
    matchType: 7,
    skillRequirement: 3,
    paymentType: '50-50',
    note: '',
    isHomeMatch: true,
    isAutoMatch: false
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [areaRes, profileRes] = await Promise.all([
          api.get('/area'),
          api.get('/auth/profile').catch(() => null)
        ]);

        if (!profileRes) {
          router.push('/login');
          return;
        }

        const userId = profileRes.data.id;

        // Lấy cả danh sách đội mình quản lý (Captain) và đội mình là Phó
        const [allTeamsRes, myTeamsRes] = await Promise.all([
          api.get('/team'),
          api.get('/team/my-teams')
        ]);

        setAreas(areaRes.data);

        // Đội mà user là Manager (Captain)
        const managedTeams: Team[] = allTeamsRes.data
          .filter((t: any) => t.managerId === userId)
          .map((t: any) => ({ ...t, teamRole: 2 })); // Captain = 2

        // Đội mà user là Phần tóm tắc TeamRole từ my-teams
        // my-teams API trả về TeamResponse nởm, cần check teamRole qua members
        // Giải pháp đơn giản: gọi /team/{id}/members với mỗi đội mình là member
        const myTeamIds: number[] = myTeamsRes.data.map((t: any) => t.id);
        const nonCaptainTeamIds = myTeamIds.filter(id => !managedTeams.find(t => t.id === id));

        const viceCaptainTeams: Team[] = [];
        await Promise.all(nonCaptainTeamIds.map(async (teamId: number) => {
          const membersRes = await api.get(`/team/${teamId}/members`);
          const me = membersRes.data.find((m: any) => m.userId === userId);
          if (me && me.teamRole === 1) { // ViceCaptain = 1
            const team = myTeamsRes.data.find((t: any) => t.id === teamId);
            if (team) viceCaptainTeams.push({ ...team, teamRole: 1 });
          }
        }));

        const allEligibleTeams = [...managedTeams, ...viceCaptainTeams];
        setMyTeams(allEligibleTeams);

        if (allEligibleTeams.length > 0) setFormData(prev => ({ ...prev, creatorTeamId: allEligibleTeams[0].id }));
        if (areaRes.data.length > 0) setFormData(prev => ({ ...prev, areaId: areaRes.data[0].id }));

      } catch (err: any) {
        console.error('Lỗi khi tải dữ liệu', err);
      }
    };
    fetchData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.creatorTeamId === 0) {
      setError('Bạn chưa có đội bóng nào do mình làm Đội trưởng. Hãy tạo Đội trước khi cáp kèo.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        matchTime: new Date(formData.matchTime).toISOString()
      };
      await api.post('/match', payload);
      router.push('/matches');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi hệ thống khi đăng kèo. Vui lòng check server.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: ['creatorTeamId', 'areaId', 'matchType', 'skillRequirement'].includes(name) ? Number(value) : value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/matches" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors">
          <ArrowLeft className="w-5 h-5" /> Trở về Sảnh Tìm Kèo
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-7 h-7 text-emerald-200" /> Đăng Kèo Giao Hữu Mới
            </h1>
            <p className="mt-2 text-emerald-100">Phát tín hiệu mời gọi các FC trên toàn khu vực. Tạo trận cầu nảy lửa chỉ với 1 cú click.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-2 font-medium">
                <span className="text-lg">⚠️</span> {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Chọn Đội Bóng Của Bạn *</label>
                <select
                  name="creatorTeamId"
                  value={formData.creatorTeamId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium transition-all"
                >
                  {myTeams.length === 0 ? (
                    <option value={0}>❌ Bạn chưa là Đội trưởng hoặc Đội phó của đội bóng nào</option>
                  ) : (
                    myTeams.map(t => <option key={t.id} value={t.id}>{t.name} {t.teamRole === 1 ? '(Đội phó)' : '(Đội trưởng)'}</option>)
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Loại Kèo *</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 border rounded-xl cursor-pointer text-center font-bold transition-all ${formData.isHomeMatch ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="isHomeMatch" className="hidden" checked={formData.isHomeMatch} onChange={() => setFormData({ ...formData, isHomeMatch: true })} />
                    ⚽ Có Sân Nhà (Chủ nhà)
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 border rounded-xl cursor-pointer text-center font-bold transition-all ${!formData.isHomeMatch ? 'bg-orange-500 text-white border-orange-500 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="isHomeMatch" className="hidden" checked={!formData.isHomeMatch} onChange={() => setFormData({ ...formData, isHomeMatch: false })} />
                    ✈️ Cần Đi Khách (Làm khách)
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {formData.isHomeMatch ? "Tên Bãi/Sân Cỏ *" : "Tên Bãi/Sân Cỏ (Không bắt buộc)"}
                  </label>
                  <input
                    type="text"
                    name="stadiumName"
                    required={formData.isHomeMatch}
                    value={formData.stadiumName}
                    onChange={handleChange}
                    placeholder={formData.isHomeMatch ? "VD: Sân Chảo Lửa, Sân 112..." : "Chưa rõ, chờ đối thủ chốt"}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Chọn Khu Vực Sân *
                  </label>
                  <select
                    name="areaId"
                    value={formData.areaId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium transition-all"
                  >
                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Thời gian bóng lăn *
                  </label>

                  {/* Custom date-time picker */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 z-10">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      type="datetime-local"
                      name="matchTime"
                      required
                      min={localISOTime}
                      value={formData.matchTime}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white font-semibold transition-all text-gray-800 cursor-pointer hover:border-emerald-400"
                    />
                  </div>

                  {/* Chips giờ thi đấu phổ biến */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1.5">Chọn nhanh giờ phổ biến:</p>
                    <div className="flex flex-wrap gap-2">
                      {['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'].map(time => {
                        const [h, m] = time.split(':');
                        const dateOnly = formData.matchTime.slice(0, 10);
                        const chipValue = `${dateOnly}T${h}:${m}`;
                        const isActive = formData.matchTime === chipValue;
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, matchTime: chipValue }))}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${isActive
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-105'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700'
                              }`}
                          >
                            ⏰ {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preview thời gian đã chọn */}
                  {formData.matchTime && (
                    <p className="mt-2 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 inline-flex items-center gap-1.5">
                      ✅ Đã chọn: {new Date(formData.matchTime).toLocaleString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Thể thức & Trả phí</label>
                  <div className="flex gap-2">
                    <select
                      name="matchType"
                      value={formData.matchType}
                      onChange={handleChange}
                      className="w-2/5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-center"
                    >
                      <option value={5}>Sân 5</option>
                      <option value={7}>Sân 7</option>
                      <option value={11}>Sân 11</option>
                    </select>

                    <select
                      name="paymentType"
                      value={formData.paymentType}
                      onChange={handleChange}
                      className="w-3/5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm"
                    >
                      <option value="50-50">Campuchia / 50-50</option>
                      <option value="40-60">Kèo nhẹ / 40-60</option>
                      <option value="30-70">Kèo trung bình / 30-70</option>
                      <option value="Thua trả 100%">Đội thua bao sân</option>
                      <option value="Giao lưu vui vẻ">Mời giao lưu (Chủ bao sân)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-orange-500" /> Yêu cầu đối thủ nằm ở trình độ
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-1 grid grid-cols-6 gap-1">
                  {LevelTeam.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, skillRequirement: level.value })}
                      className={`py-3 text-[12px] sm:text-sm font-bold rounded-lg transition-all ${formData.skillRequirement === level.value
                        ? 'bg-emerald-600 text-white shadow-md transform scale-[1.02]'
                        : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                        }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Lời nhắn / Ghi chú (Nếu có)</label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Ví dụ: Đội đá văn minh lịch sự, không cãi vã chửi rủa, quần đùi áo cộc số chuẩn nhé anh em..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium outline-none resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-blue-600" /> Tính năng ghép kèo tự động
                </label>
                <label className="flex items-center cursor-pointer bg-gray-50 p-4 border border-gray-200 rounded-xl transition-all hover:bg-blue-50">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.isAutoMatch}
                      onChange={(e) => setFormData({ ...formData, isAutoMatch: e.target.checked })}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${formData.isAutoMatch ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formData.isAutoMatch ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <div className="ml-4 font-bold text-gray-700 text-sm">
                    {formData.isAutoMatch ? 'BẬT (Hệ thống sẽ tự động tìm và ghép với đội có cùng trình độ)' : 'TẮT Auto-Match (Chờ tự tìm đối thủ)'}
                    <p className="text-xs text-gray-400 mb-1.5">Lưu ý: Các kèo đấu tự động sẽ có giao động +/- 15 phút so với giờ đã chọn</p>
                  </div>
                </label>
              </div>

              <div className="pt-6 border-t border-gray-100 mt-4">
                <button
                  type="submit"
                  disabled={loading || myTeams.length === 0}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 "
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-200" /> : 'Chốt Lịch Ấn Định (Xác Nhận)'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
