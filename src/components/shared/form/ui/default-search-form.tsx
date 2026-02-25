import React, { PropsWithChildren } from 'react';
import style from './form.module.css';

interface IDefaultSearchFormProps {
  children: React.ReactNode;
  onFinish?: (values: any) => void;
  [key: string]: any;
}

const DefaultSearchForm = <T,>({ children, onFinish, ...rest }: PropsWithChildren<IDefaultSearchFormProps>) => {
  return (
    <div className={style['default-form']} {...rest}>
      {children}
    </div>
  );
};

export default React.memo(DefaultSearchForm) as typeof DefaultSearchForm;
