import { Divider } from 'antd';
import { Component, Folders, Gamepad2Icon, LucideLayoutGrid, MegaphoneIcon, ShoppingCartIcon, UsersIcon } from 'lucide-react';
import React from 'react';
import Menu, { IMenu } from './nav';

const mainMenuData: IMenu[] = [
  {
    id: 'dashboard',
    name: '대시보드',
    icon: <LucideLayoutGrid className='w-4 h-4' />,
    link: { path: '/dashboard/analytics' },
  },
  {
    id: 'users',
    name: '유저 및 공간 관리',
    icon: <UsersIcon className='w-4 h-4' />,
    submenu: [
      {
        id: 'user-list',
        name: '유저 관리',
        link: {
          path: '/user/list',
        },
      },
      {
        id: 'space-list',
        name: '공간 관리',
        link: {
          path: '/space/list',
        },
      },
    ],
  },
  {
    id: 'template',
    name: '템플릿 관리',
    icon: <Component className='w-4 h-4' />,
    submenu: [
      {
        id: 'card',
        name: '카드 템플릿 관리',
        link: {
          path: '/template/card',
        },
      },
      {
        id: 'interior',
        name: '가구 템플릿 관리',
        link: {
          path: '/template/interior',
        },
      },
      {
        id: 'room',
        name: '방 템플릿 관리',
        link: {
          path: '/template/room',
        },
      },
      {
        id: 'bubble',
        name: '펫 커스텀 관리',
        link: {
          path: '/template/custom',
        },
      },
      {
        id: 'bubble',
        name: '펫 말풍선 관리',
        link: {
          path: '/template/bubble',
        },
      },
      {
        id: 'exp',
        name: '펫 경험치 관리',
        link: {
          path: '/template/exp',
        },
      },
      {
        id: 'snack',
        name: '펫 간식 관리',
        link: {
          path: '/template/snack',
        },
      },
    ],
  },
  {
    id: 'product',
    name: '상품 관리',
    icon: <ShoppingCartIcon className='w-4 h-4' />,
    submenu: [
      {
        id: 'iap-purchase',
        name: '인앱 결제 내역',
        link: {
          path: '/product/purchase',
        },
      },
      {
        id: 'iap-product',
        name: '인앱 상품 관리',
        link: {
          path: '/product/iap-product',
        },
      },
      {
        id: 'coupon',
        name: '쿠폰 관리',
        link: {
          path: '/product/coupon',
        },
      },
    ],
  },
  {
    id: 'game',
    name: '게임 관리',
    icon: <Gamepad2Icon className='w-4 h-4' />,
    submenu: [
      {
        id: 'game-list',
        name: '게임 관리',
        link: {
          path: '/game/list',
        },
      },
      {
        id: 'game-ranking-list',
        name: '게임 랭킹 관리',
        link: {
          path: '/game/ranking/list',
        },
      },
      {
        id: 'game-reward-list',
        name: '게임 보상 관리',
        link: {
          path: '/game/reward/list',
        },
      },
      {
        id: 'game-reward-policy-list',
        name: '게임 보상 정책 관리',
        link: {
          path: '/game/reward-policy/list',
        },
      },
    ],
  },
  {
    id: 'marketing',
    name: '마케팅 관리',
    icon: <MegaphoneIcon className='w-4 h-4' />,
    submenu: [
      {
        id: 'banner',
        name: '배너 관리',
        link: {
          path: '/marketing/banner',
        },
      },
      {
        id: 'push',
        name: '푸시 관리',
        link: {
          path: '/marketing/push/list',
        },
      },
    ],
  },
  {
    id: 'resource',
    name: '리소스 관리',
    icon: <Folders className='w-4 h-4' />,
    submenu: [
      {
        id: 'assets',
        name: '이미지 관리',
        link: {
          path: '/resource/assets',
        },
      },
      {
        id: 'locales',
        name: '다국어 관리',
        link: {
          path: '/resource/locales',
        },
      },
    ],
  },
  {
    id: 'square-library',
    name: '라이브러리 관리',
    icon: <Folders className='w-4 h-4' />,
    submenu: [
      {
        id: 'info',
        name: '소식 관리',
        link: {
          path: '/square-library/info',
        },
      },
      {
        id: 'article',
        name: '아티클 관리',
        link: {
          path: '/square-library/article',
        },
      },
    ],
  },
];

const MainMenu = () => {
  return (
    <>
      {/* <Divider orientation='left' plain>
          <span className='text-xl font-semibold'>메인</span>
        </Divider> */}
      <Divider />
      <Menu data={mainMenuData} />
    </>
  );
};

export default React.memo(MainMenu);
