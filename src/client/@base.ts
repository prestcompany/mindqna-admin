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
    // 만료된 토큰은 getSession 이 부른 next-auth jwt 콜백이 서버에서 갱신한다. 그래도 만료면 갱신이 실패한 것이다.
    if (isTokenExpired(session.accessToken)) {
      await signOut({ redirect: true, callbackUrl: '/login' });
      return Promise.reject(new Error('Session expired'));
    }
    config.headers.Authorization = `Bearer ${session.accessToken}`;
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
