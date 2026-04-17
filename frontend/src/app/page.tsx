'use client';
import Link from "next/link";
import { ArrowRight, Calendar, Search, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function Home() {
  const { user } = useCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Navbar />

      <main>
        <section className="relative pt-20 pb-32 overflow-hidden bg-green-900 text-white">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
          <div className="relative max-w-4xl mx-auto px-4 text-center z-10">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
              Tìm Đối Chạm Cỏ <br/><span className="text-green-400">Nhanh Chóng & Dễ Dàng</span>
            </h1>
            <p className="text-xl md:text-2xl text-green-100 mb-10 max-w-2xl mx-auto">
              Nơi giao lưu, kết nối các đội bóng phủi chất lượng. Đăng ký để tổ chức đá tập hoặc ghép kèo với hàng ngàn Đội Bóng trong khu vực.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href={user ? "/matches/newfeed" : "/login"} 
                className="px-8 py-4 bg-green-500 hover:bg-green-400 text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                Cáp Kèo Ngay <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href={user ? "/matches/newfeed" : "/register"} 
                className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur text-white border border-white/20 rounded-full font-bold text-lg transition-colors text-center"
              >
                Trở thành Lính đánh thuê
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-800">Cộng Đồng Bóng Đá Số 1</h2>
              <p className="text-gray-500 mt-4 max-w-xl mx-auto">Tính năng mạnh mẽ giúp quản lý lịch thi đấu, đánh giá chi tiết trình độ và hạn chế bùng kèo phút chót.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Lọc Kèo Thông Minh</h3>
                <p className="text-gray-600 leading-relaxed">Tìm kiếm đối thủ theo đúng khu vực (quận/huyện), cấu trúc sân 5-7-11 và trình độ như mức TB/Khá dễ dàng.</p>
              </div>
              <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Hệ Thống Đánh Giá</h3>
                <p className="text-gray-600 leading-relaxed">Bảng Fair-play Rating với hệ thống cảnh báo "Bom kèo", giúp lọc đội hình Toxic để duy trì những trận giao hữu đẹp.</p>
              </div>
              <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Lính Đánh Thuê</h3>
                <p className="text-gray-600 leading-relaxed">Đội đang dư người đá? Anh em tự do tìm kèo ráp team khẩn cấp trong khu vực để lấp chỗ trống ngay tức thì.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm border-t border-gray-800">
        © 2026 Tìm Đối Bóng Đá Phủi. Make with passion.
      </footer>
    </div>
  );
}
