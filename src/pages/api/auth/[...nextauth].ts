import client from '@/client/@base';
import { jwtDecode } from 'jwt-decode';
import NextAuth, { User, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { needsRefresh } from '@/lib/auth/token-refresh';

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
          const { data } = await client.post('/auth/login', {
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
          // console.error('인증 에러:', error);
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

      // 액세스 토큰이 곧 만료되는지 확인(요청이 가는 동안 만료되지 않게 여유를 둔다)
      const decodedToken = jwtDecode<{ exp: number }>(token.accessToken as string);
      const tokenExpired = needsRefresh(decodedToken.exp);

      if (tokenExpired && token.refreshToken) {
        try {
          // 리프레시 토큰으로 새로운 액세스 토큰 발급
          const { data } = await client.post('/auth/refresh', {
            refreshToken: token.refreshToken,
          });

          token.accessToken = data.accessToken;
          if (data.refresh_token) {
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
        // refreshToken 은 서버(jwt 쿠키)에만 둔다. 화면의 스크립트가 읽을 수 있는 세션에는 넣지 않는다.
        session.accessToken = token.accessToken as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};

export default NextAuth(authOptions);
