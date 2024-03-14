import { Divider } from "antd";
import { Home, Package2 } from "lucide-react";
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
    id: "product",
    name: "템플릿",
    icon: <Package2 className="w-5 h-5" />,
    submenu: [
      {
        id: "card",
        name: "카드 템플릿",
        link: {
          path: "/product/card",
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
