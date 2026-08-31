import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface SpaceTabListProps {
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: string;
  page: number;
  totalPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  children: ReactNode;
}

function SpaceTabList({
  isLoading,
  isEmpty,
  emptyText,
  page,
  totalPage,
  totalCount,
  onPageChange,
  children,
}: SpaceTabListProps) {
  if (isLoading) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (isEmpty) {
    return (
      <Card className='bg-card'>
        <CardContent className='py-8 text-center text-sm text-muted-foreground'>{emptyText}</CardContent>
      </Card>
    );
  }
  return (
    <div className='space-y-3'>
      {children}
      <div className='flex items-center justify-between px-1'>
        <div className='text-sm text-muted-foreground'>총 {totalCount.toLocaleString()}건</div>
        <div className='flex items-center gap-2'>
          <Button type='button' variant='outline' size='sm' onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            <ChevronLeft className='h-4 w-4' />
            이전
          </Button>
          <span className='text-sm text-muted-foreground'>
            {page} / {Math.max(totalPage, 1)}
          </span>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPage}
          >
            다음
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SpaceTabList;
