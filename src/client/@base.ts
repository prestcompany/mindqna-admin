import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { getSession, signOut } from 'next-auth/react';
import QueryString from 'qs';

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_ENDPOINT + '/admin',
  headers: {
    // "Content-Type": "application/json",
  },
  paramsSerializer: (params) => {
    const filteredParams = Object.fromEntries(Object.entries(params).filter(([_, value]) => value !== null));
    return QueryString.stringify(filteredParams, { arrayFormat: 'repeat' });
  },
});

// 토큰 만료 확인 함수
const isTokenExpired = (token: string) => {
  try {
    const decodedToken = jwtDecode<{ exp: number }>(token);
    const currentTime = Date.now() / 1000;
    return decodedToken.exp < currentTime;
  } catch {
    return true;
  }
};

// 요청 인터셉터 추가
client.interceptors.request.use(async (config) => {
  const session = await getSession();

  if (session?.accessToken) {
    // 토큰이 만료되었는지 확인
    if (isTokenExpired(session.accessToken)) {
      try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/admin/auth/refresh`, { refreshToken: session.refreshToken });
        config.headers.Authorization = `Bearer ${response.data.accessToken}`;
      } catch (error) {
        await signOut({ redirect: true, callbackUrl: '/login' });
        return Promise.reject(error);
      }
    } else {
      // 토큰이 유효한 경우 그대로 사용
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
  }
  return config;
});

// 응답 인터셉터 추가 (선택적)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 401 에러 처리 (토큰 만료)
    if (error.response?.status === 401) {
      await signOut({ redirect: true, callbackUrl: '/login' });
    }
    return Promise.reject(error);
  },
);

export default client;
