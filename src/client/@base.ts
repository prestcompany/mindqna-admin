import axios from 'axios';
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

// 요청 인터셉터 추가
client.interceptors.request.use(async (config) => {
  const session = await getSession();

  if (session?.accessToken) {
    // 만료 판단은 서버가 한다. 토큰 갱신은 getSession 이 부른 next-auth jwt 콜백이 하고,
    // 갱신이 실패해 만료된 토큰이 가면 서버가 401 을 주고 아래 응답 인터셉터가 로그아웃한다.
    // 브라우저 시계로 판단하면 시계가 틀린 PC 에서 서버가 갱신하기 전에 로그아웃된다.
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
