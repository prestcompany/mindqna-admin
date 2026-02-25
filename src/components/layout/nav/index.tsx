import { NextRouter } from 'next/router';
import { ParsedUrlQueryInput } from 'querystring';
import React from 'react';
import NavMenu from './nav-menu';
import style from './nav.module.css';

interface INavProps {
  data: IMenu[];
  label?: string;
}

export interface IMenu {
  id?: string;
  name: string;
  link?: {
    path: string;
    query?: ParsedUrlQueryInput;
  };
  icon?: React.ReactNode;
  isActive?: (router: NextRouter, link: IMenu['link']) => boolean;
  submenu?: IMenu[];
}

export const isEqualPath = (router: NextRouter, link: IMenu['link']) => {
  return (
    router.pathname === link?.path &&
    Object.keys(link.query || {}).every((k) => String(link.query?.[k]) === router.query[k])
  );
};

const Nav = ({ data, label }: INavProps) => {
  return (
    <div className='mb-4'>
      {label && (
        <h4 className='mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80'>
          {label}
        </h4>
      )}
      <ul className={style.menu}>
        {data.map((menu) => {
          return <NavMenu key={menu.id || menu.name} menu={menu} />;
        })}
      </ul>
    </div>
  );
};

export default React.memo(Nav);
