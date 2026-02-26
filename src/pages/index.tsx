import { IDefaultLayoutPage, IPageHeader, getDefaultLayout } from '@/components/layout/default-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/auth-provider';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import {
  ArrowRight,
  Bell,
  Coins,
  FolderKanban,
  Gamepad2,
  Image,
  Library,
  type LucideIcon,
  Megaphone,
  Users,
} from 'lucide-react';
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';

const pageHeader: IPageHeader = {
  title: 'Welcome',
  description: '관리자님, 환영합니다.',
};

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const quickActions: QuickAction[] = [
  { title: '유저 목록', description: '계정 및 상태 관리', href: '/user/list', icon: Users },
  { title: '공간 목록', description: '공간/프로필 조회', href: '/space/list', icon: FolderKanban },
  { title: '배너 관리', description: '마케팅 배너 운영', href: '/marketing/banner', icon: Image },
  { title: '푸시 관리', description: '푸시 발송/등록', href: '/marketing/push/list', icon: Bell },
  { title: '결제 내역', description: '구매 데이터 확인', href: '/product/purchase', icon: Coins },
  { title: '라이브러리', description: '콘텐츠 관리', href: '/square-library/info', icon: Library },
  { title: '가구 템플릿', description: '템플릿 에셋 운영', href: '/template/interior', icon: Megaphone },
  { title: '게임 목록', description: '게임 설정/운영', href: '/game/list', icon: Gamepad2 },
];

const IndexPage: IDefaultLayoutPage = () => {
  useAuth();

  return (
    <div className='space-y-6'>
      <Card className='border-zinc-200 bg-white shadow-sm'>
        <CardHeader>
          <CardTitle className='text-xl text-zinc-900'>빠른 이동</CardTitle>
          <CardDescription className='text-zinc-500'>자주 사용하는 운영 메뉴를 바로 열 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className='group rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50'
                >
                  <div className='flex items-center justify-between'>
                    <div className='rounded-md border border-zinc-200 bg-zinc-50 p-2 text-zinc-700'>
                      <Icon className='h-4 w-4' />
                    </div>
                    <ArrowRight className='h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5' />
                  </div>
                  <div className='mt-4'>
                    <div className='text-sm font-semibold text-zinc-900'>{item.title}</div>
                    <div className='mt-1 text-xs text-zinc-500'>{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

IndexPage.getLayout = getDefaultLayout;
IndexPage.pageHeader = pageHeader;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

export default IndexPage;
