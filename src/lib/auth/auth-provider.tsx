/**
 * 백오피스 특성상 기본적으로 인증 필요
 * 인증된 사용자 정보를 얻거나 로그인 페이지로 이동
 */
import Spinner from '@/components/shared/spinner';
import { Session } from 'next-auth';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { createContext, PropsWithChildren, useContext, useEffect } from 'react';

interface IAuthProviderProps {}

interface IAuthContext {
  initialized: boolean;
  session: Session;
}

export const AuthContext = createContext<IAuthContext | null>(null);

export function useAuth() {
  const result = useContext(AuthContext);
  if (!result?.initialized) {
    throw new Error('Auth context must be used within a AuthProvider!');
  }
  return result;
}

const publicPageList = ['/login'];

const isPublicPage = (pathname: string) => {
  return publicPageList.includes(pathname);
};

const AuthProvider = ({ children }: PropsWithChildren<IAuthProviderProps>) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const publicPage = isPublicPage(router.pathname);
  const authenticated = Boolean(session?.user);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (authenticated && publicPage) {
      router.replace('/');
    } else if (!authenticated && !publicPage) {
      router.replace('/login');
    }
  }, [authenticated, loading, publicPage, router]);

  if (publicPage) {
    if (!loading && authenticated) {
      return <Spinner />;
    }
    return <>{children}</>;
  }

  if (loading) {
    return <Spinner />;
  }

  if (!authenticated) {
    return <Spinner />;
  }

  return <AuthContext.Provider value={{ initialized: true, session: session as Session }}>{children}</AuthContext.Provider>;
};

export default React.memo(AuthProvider);
