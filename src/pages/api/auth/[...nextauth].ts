import client from '@/client/@base';
import { jwtDecode } from 'jwt-decode';
import NextAuth, { User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export default NextAuth({
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

      // 액세스 토큰이 만료되었는지 확인
      const decodedToken = jwtDecode<{ exp: number }>(token.accessToken as string);
      const tokenExpired = Date.now() >= decodedToken.exp * 1000;

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
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
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
});
