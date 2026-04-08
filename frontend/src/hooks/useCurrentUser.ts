'use client';
import { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': string;
}

/**
 * Hook dùng chung để lấy thông tin người dùng hiện tại.
 * Decode trực tiếp từ JWT token trong localStorage, không cần gọi API.
 * Trả về { user, loading } — nếu chưa đăng nhập thì user = null.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        setUser({
          id: parseInt(decoded.sub),
          name: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
          email: decoded.email,
        });
      } catch {
        // Token không hợp lệ → user = null
      }
    }
    setLoading(false);
  }, []);

  return { user, loading };
}
