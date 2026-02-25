import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import React, { PropsWithChildren } from 'react';

interface IDefaultModalProps {
  open?: boolean;
  handleHide: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const DefaultModal = ({ children, handleHide, title, open, className, ...rest }: PropsWithChildren<IDefaultModalProps>) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleHide()}>
      <DialogContent className={className}>
        {title && <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>}
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(DefaultModal);
