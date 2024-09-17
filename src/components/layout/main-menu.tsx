import { Divider } from 'antd';
import { BellDot, Home, Package2, User } from 'lucide-react';
import React from 'react';
import Menu, { IMenu } from './nav';

const mainMenuData: IMenu[] = [
  {
    id: 'home',
    name: '홈',
    icon: <Home className='w-5 h-5' />,
    link: {
      path: '/',
    },
  },
  {
    id: 'dashboard',
    name: '대시보드',
    icon: <User className='w-5 h-5' />,
    submenu: [
      {
        id: 'analytics',
        name: '통계',
        link: {
          path: '/dashboard/analytics',
        },
      },
      {
        id: 'user',
        name: '유저',
        link: {
          path: '/dashboard/user',
        },
      },
      {
        id: 'space',
        name: '공간',
        link: {
          path: '/dashboard/space',
        },
      },
      {
        id: 'premium',
        name: 'IAP 결제 내역',
        link: {
          path: '/dashboard/purchase',
        },
      },
      {
        id: 'products',
        name: 'IAP 상품 관리',
        link: {
          path: '/dashboard/products',
        },
      },
    ],
  },
  {
    id: 'product',
    name: '템플릿',
    icon: <Package2 className='w-5 h-5' />,
    submenu: [
      {
        id: 'assets',
        name: '이미지',
        link: {
          path: '/product/assets',
        },
      },
      {
        id: 'card',
        name: '카드 템플릿',
        link: {
          path: '/product/card',
        },
      },
      {
        id: 'interior',
        name: '가구 템플릿',
        link: {
          path: '/product/interior',
        },
      },
      {
        id: 'exp',
        name: '펫 경험치',
        link: {
          path: '/product/exp',
        },
      },
      {
        id: 'bubble',
        name: '펫 말풍선',
        link: {
          path: '/product/bubble',
        },
      },
      {
        id: 'snack',
        name: '펫 간식',
        link: {
          path: '/product/snack',
        },
      },
      {
        id: 'locale',
        name: '다국어',
        link: {
          path: '/product/locales',
        },
      },
      {
        id: 'banner',
        name: '이벤트 배너',
        link: {
          path: '/product/banner',
        },
      },
      {
        id: 'room',
        name: '방',
        link: {
          path: '/product/room',
        },
      },
      {
        id: 'coupon',
        name: '쿠폰',
        link: {
          path: '/product/coupon',
        },
      },
    ],
  },
  {
    id: 'push',
    name: '푸시 관리',
    icon: <BellDot className='w-5 h-5' />,
    submenu: [
      {
        id: 'list',
        name: '푸시 목록',
        link: {
          path: '/push/list',
        },
      },
      {
        id: 'new',
        name: '푸시 발송',
        link: {
          path: '/push/new',
        },
      },
    ],
  },
];

const MainMenu = () => {
  return (
    <>
      <>
        <Divider orientation='left' plain>
          메인
        </Divider>

        <Menu data={mainMenuData} />
      </>
    </>
  );
};

export default React.memo(MainMenu);
