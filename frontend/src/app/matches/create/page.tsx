'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Activity, MapPin, Trophy, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface Area { id: number; name: string; city: string; }
interface Team { id: number; name: string; managerId: number; }

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
    note: ''
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

        const teamsRes = await api.get('/team');

        setAreas(areaRes.data);
        const managed = teamsRes.data.filter((t: any) => t.managerId === profileRes.data.id);
        setMyTeams(managed);

        // Pre-fill valid values
        if (managed.length > 0) setFormData(prev => ({ ...prev, creatorTeamId: managed[0].id }));
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
      await api.post('/match', formData);
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
                    <option value={0}>❌ Bạn không sở hữu đội bóng nào (Hãy sang mục Đội Bóng để Lập đội)</option>
                  ) : (
                    myTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tên Bãi/Sân Cỏ *</label>
                  <input
                    type="text"
                    name="stadiumName"
                    required
                    value={formData.stadiumName}
                    onChange={handleChange}
                    placeholder="VD: Sân Chảo Lửa, Sân 112..."
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
                  <input
                    type="datetime-local"
                    name="matchTime"
                    required
                    value={formData.matchTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium transition-all text-gray-800"
                  />
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
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-1 grid grid-cols-5 gap-1">
                  {[
                    { val: 1, label: 'Kém' },
                    { val: 2, label: 'Yếu' },
                    { val: 3, label: 'TB' },
                    { val: 4, label: 'Khá' },
                    { val: 5, label: 'B.Chuyên' }
                  ].map((level) => (
                    <button
                      key={level.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, skillRequirement: level.val })}
                      className={`py-3 text-[12px] sm:text-sm font-bold rounded-lg transition-all ${formData.skillRequirement === level.val
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
