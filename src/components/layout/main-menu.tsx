import { Divider } from "antd";
import { Home, Package2, User } from "lucide-react";
import React from "react";
import Menu, { IMenu } from "./nav";

const mainMenuData: IMenu[] = [
  {
    id: "home",
    name: "홈",
    icon: <Home className="w-5 h-5" />,
    link: {
      path: "/",
    },
  },
  {
    id: "dashboard",
    name: "대시보드",
    icon: <User className="w-5 h-5" />,
    submenu: [
      {
        id: "analytics",
        name: "통계",
        link: {
          path: "/dashboard/analytics",
        },
      },
      {
        id: "user",
        name: "유저",
        link: {
          path: "/dashboard/user",
        },
      },
      {
        id: "space",
        name: "공간",
        link: {
          path: "/dashboard/space",
        },
      },
      {
        id: "premium",
        name: "프리미엄",
        link: {
          path: "/dashboard/premium",
        },
      },
    ],
  },
  {
    id: "product",
    name: "템플릿",
    icon: <Package2 className="w-5 h-5" />,
    submenu: [
      {
        id: "assets",
        name: "이미지",
        link: {
          path: "/product/assets",
        },
      },
      {
        id: "card",
        name: "카드 템플릿",
        link: {
          path: "/product/card",
        },
      },
      {
        id: "interior",
        name: "가구 템플릿",
        link: {
          path: "/product/interior",
        },
      },
      {
        id: "exp",
        name: "펫 경험치",
        link: {
          path: "/product/exp",
        },
      },
      {
        id: "bubble",
        name: "펫 말풍선",
        link: {
          path: "/product/bubble",
        },
      },
      {
        id: "snack",
        name: "펫 간식",
        link: {
          path: "/product/snack",
        },
      },
      {
        id: "locale",
        name: "다국어",
        link: {
          path: "/product/locales",
        },
      },
      {
        id: "push",
        name: "푸시 알림",
        link: {
          path: "/product/push",
        },
      },
    ],
  },
];

const MainMenu = () => {
  return (
    <>
      <>
        <Divider orientation="left" plain>
          메인
        </Divider>

        <Menu data={mainMenuData} />
      </>
    </>
  );
};

export default React.memo(MainMenu);
