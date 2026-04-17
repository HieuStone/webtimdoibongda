'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { LogIn, Mail, Lock } from 'lucide-react';
import { useEffect } from 'react';
import { facebookLogin, initFacebookSDK } from '@/lib/facebook-sdk';

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initFacebookSDK();
  }, []);

  const handleFacebookLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const authResponse = await facebookLogin();
      const response = await api.post('/auth/facebook-login', { 
        accessToken: authResponse.accessToken 
      });
      const { token, name } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('userName', name);
      
      router.push('/');
    } catch (err: any) {
      setError(err === 'User cancelled login or did not fully authorize.' 
        ? 'Bạn đã hủy đăng nhập Facebook.' 
        : 'Đăng nhập Facebook thất bại. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, name } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('userName', name);
      
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[url('https://images.unsplash.com/photo-1518605368461-1e1e114e5b98?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-green-900/80 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="mx-auto bg-green-100 w-16 h-16 flex items-center justify-center rounded-full mb-4">
            <LogIn className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Tìm Đối Bóng Đá</h1>
          <p className="text-gray-500 mt-2">Đăng nhập để cáp kèo ngay!</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email của bạn</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                className="pl-10 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                placeholder="vidu@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                className="pl-10 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-md transition-colors disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Đăng Nhập'
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500 font-medium">Hoặc đăng nhập bằng</span>
          </div>
        </div>

        <button
          onClick={handleFacebookLogin}
          type="button"
          disabled={loading}
          className="w-full py-3 px-4 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold rounded-xl shadow-md transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
        >
          <FacebookIcon />
          Tiếp tục với Facebook
        </button>

        <p className="mt-8 text-center text-sm text-gray-600">
          Chưa có đội/tài khoản?{' '}
          <Link href="/register" className="text-green-600 font-semibold hover:underline">
            Tạo tài khoản mới
          </Link>
        </p>
      </div>
    </div>
  );
}
