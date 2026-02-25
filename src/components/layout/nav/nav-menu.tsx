import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { IMenu, isEqualPath } from '.';
import NavItem from './nav-item';

interface INavMenuProps {
  menu: IMenu;
}

const NavMenu = ({ menu }: INavMenuProps) => {
  const router = useRouter();
  const [isShowSubMenu, setIsShowSubMenu] = useState(
    menu.submenu && menu.submenu.length > 0 && menu.submenu.find((v) => (v.isActive || isEqualPath)(router, v.link))
      ? true
      : false,
  );

  if (menu.submenu) {
    return (
      <li>
        <a onClick={() => setIsShowSubMenu(!isShowSubMenu)}>
          {menu.icon}
          <span className='grow'>{menu.name}</span>
          {menu.submenu.length > 0 && (
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isShowSubMenu ? 'rotate-180' : ''}`}
            />
          )}
        </a>
        <ul className={isShowSubMenu ? 'block' : 'hidden'}>
          {menu.submenu.map((sub) => {
            return <NavItem key={sub.id || sub.name} item={sub} />;
          })}
        </ul>
      </li>
    );
  }

  return <NavItem item={menu} />;
};

export default React.memo(NavMenu);
