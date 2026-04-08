'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Shield, MapPin, Trophy, ArrowLeft, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface Area {
  id: number;
  name: string;
}

export default function CreateTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [areas, setAreas] = useState<Area[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    areaId: 0, 
    skillLevel: 3, 
  });

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const response = await api.get('/area');
        setAreas(response.data);
        if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, areaId: response.data[0].id }));
        }
      } catch (err) {
        console.error('Lỗi tải danh sách khu vực', err);
      }
    };
    fetchAreas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.areaId === 0) {
      setError('Vui lòng chọn khu vực.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/team', formData);
      router.push('/teams');
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setError('Hãy Đăng Nhập trước khi muốn Lập Đội Bóng bạn nhé!');
      } else {
        setError(err.response?.data?.message || 'Lỗi hệ thống khi lập đội. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'skillLevel' || name === 'areaId' ? Number(value) : value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/teams" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors">
          <ArrowLeft className="w-5 h-5" /> Quay lại danh sách
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 text-blue-200" /> Đăng Ký Đội Bóng Mới
            </h1>
            <p className="mt-2 text-blue-100">Khẳng định vị thế, chinh phục các giải đấu phủi phong trào bắt đầu từ đây.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-2 font-medium">
                <span className="text-lg">⚠️</span> {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tên Câu Lạc Bộ (FC) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-xl opacity-80">⚽</span>
                  </div>
                  <input 
                    type="text" 
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ví dụ: FC Thanh Xuân, Manchester Phủi..." 
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-gray-400 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tên viết tắt</label>
                  <input 
                    type="text" 
                    name="shortName"
                    value={formData.shortName}
                    onChange={handleChange}
                    placeholder="VD: MU, ARS, TX" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Khu vực hoạt động *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="w-5 h-5 text-gray-400" />
                    </div>
                    <select 
                      name="areaId"
                      value={formData.areaId}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all appearance-none font-medium text-gray-700"
                    >
                      {areas.length === 0 ? (
                        <option value={0}>Đang tải danh sách khu vực...</option>
                      ) : (
                        areas.map((area) => (
                           <option key={area.id} value={area.id}>{area.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-orange-500" /> Đánh giá trình độ chung
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-1 grid grid-cols-5 gap-1">
                  {[
                    { val: 1, label: 'Kém' },
                    { val: 2, label: 'Yếu' },
                    { val: 3, label: 'Trung Bình' },
                    { val: 4, label: 'Khá' },
                    { val: 5, label: 'Chuyên' }
                  ].map((level) => (
                    <button
                      key={level.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, skillLevel: level.val })}
                      className={`py-3 text-sm font-bold rounded-lg transition-all ${
                        formData.skillLevel === level.val 
                          ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]' 
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-1">Đánh giá trung thực giúp Đội trưởng dễ dàng tìm & ghép các đối xứng tầm hơn.</p>
              </div>

              <div className="pt-6 border-t border-gray-100 mt-4">
                <button 
                  type="submit" 
                  disabled={loading || areas.length === 0}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:transform-none disabled:hover:shadow-lg"
                >
                  {loading ? (
                     <>
                       <Loader2 className="w-6 h-6 animate-spin text-blue-200" />
                       Đang Khởi Tạo Đội Bóng...
                     </>
                  ) : (
                     'Xác Nhận Lập Đội Bóng'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
