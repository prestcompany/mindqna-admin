import { isLoginThrottled, TOO_MANY_ATTEMPTS } from '@/lib/login-error';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import NextAuth, { User, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// 로그인·갱신은 서버에서 돈다. @/client/@base 의 인터셉터(getSession, 401 이면 signOut)는 브라우저용이라 쓰지 않는다.
// 로그인·갱신 중 API 가 멈춰도 함수 실행 시간 끝까지 기다리지 않게 10초에 끊는다.
const authClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_ENDPOINT + '/admin', timeout: 10_000 });

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '이메일', type: 'text' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const { data } = await authClient.post('/auth/login', {
            email: credentials?.email,
            password: credentials?.password,
          });

          if (data.accessToken) {
            return {
              id: data.id,
              email: credentials?.email || '',
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            } as User;
          }
          return null;
        } catch (error) {
          // 시도 제한은 틀린 비밀번호와 다르게 알린다. next-auth 가 /login?error=TooManyAttempts 로 보낸다.
          if (isLoginThrottled(error)) throw new Error(TOO_MANY_ATTEMPTS);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.id = user.id;
      }

      // 액세스 토큰이 만료되었는지 확인
      const decodedToken = jwtDecode<{ exp: number }>(token.accessToken as string);
      const tokenExpired = Date.now() >= decodedToken.exp * 1000;

      if (tokenExpired && token.refreshToken) {
        try {
          // 리프레시 토큰으로 새로운 액세스 토큰 발급
          const { data } = await authClient.post('/auth/refresh', {
            refreshToken: token.refreshToken,
          });

          token.accessToken = data.accessToken;
          if (data.refreshToken) {
            token.refreshToken = data.refreshToken;
          }
        } catch (error) {
          console.error('토큰 갱신 실패:', error);
          // 리프레시 토큰도 만료된 경우 로그아웃 처리
          return { ...token, error: 'RefreshTokenExpired' };
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    // authorize 가 던진 오류(TooManyAttempts 등)도 next-auth 기본 오류 화면 대신 로그인 화면에 띄운다.
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};

export default NextAuth(authOptions);
