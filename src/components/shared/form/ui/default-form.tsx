import React, { PropsWithChildren } from 'react';
import style from './form.module.css';

interface IDefaultFormProps {
  children: React.ReactNode;
  onFinish?: (values: any) => void;
  [key: string]: any;
}

const DefaultForm = <T,>({ children, onFinish, ...rest }: PropsWithChildren<IDefaultFormProps>) => {
  return (
    <div className={style['default-form']} {...rest}>
      {children}
    </div>
  );
};

export default React.memo(DefaultForm) as typeof DefaultForm;
