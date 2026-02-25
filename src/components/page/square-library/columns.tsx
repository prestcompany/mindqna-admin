import { LibraryData, LibrarySubType } from '@/client/square-library';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { LibraryMap } from './constants';
import { truncateText } from './handlers';

interface CreateColumnsProps {
  currentPage: number;
  onEdit: (value: LibraryData) => void;
  onRemove: (value: LibraryData) => void;
}

export const createColumns = ({
  currentPage,
  onEdit,
  onRemove,
}: CreateColumnsProps): ColumnDef<LibraryData>[] => [
  {
    id: 'index',
    header: '번호',
    cell: ({ row }) => (currentPage - 1) * 10 + row.index + 1,
  },
  {
    accessorKey: 'img',
    header: '이미지',
    cell: ({ row }) => {
      const value = row.original.img;
      return <img width='100%' height={60} src={value ?? ''} alt='img' className='object-contain' />;
    },
  },
  {
    accessorKey: 'name',
    header: '이름',
  },
  {
    accessorKey: 'subCategory',
    header: '타입',
    cell: ({ row }) => {
      const value = row.original.subCategory;
      return <Badge variant='success'>{LibraryMap[value]}</Badge>;
    },
  },
  {
    accessorKey: 'title',
    header: '제목 키',
    cell: ({ row }) => {
      const text = row.original.title;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild><span>{truncateText(text, 10)}</span></TooltipTrigger>
            <TooltipContent>{text}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: 'content',
    header: '내용 키',
    cell: ({ row }) => {
      const text = row.original.content;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild><span>{truncateText(text, 15)}</span></TooltipTrigger>
            <TooltipContent>{text}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: 'viewCount',
    header: '조회수',
  },
  {
    accessorKey: 'clickCount',
    header: '클릭수',
  },
  {
    accessorKey: 'link',
    header: '링크',
    size: 250,
    cell: ({ row }) => {
      const value = row.original.link;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={value} target='_blank' className='truncate block max-w-[250px]'>
                {value}
              </Link>
            </TooltipTrigger>
            <TooltipContent side='top'>{value}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: 'isActive',
    header: '활성화',
    cell: ({ row }) => {
      const value = row.original.isActive;
      return <Badge variant={value ? 'success' : 'muted'}>{value ? '활성화' : '비활성화'}</Badge>;
    },
  },
  {
    accessorKey: 'isFixed',
    header: '고정',
    cell: ({ row }) => {
      const value = row.original.isFixed;
      return <Badge variant={value ? 'success' : 'muted'}>{value ? '고정됨' : '고정 안됨'}</Badge>;
    },
  },
  {
    id: 'actions',
    header: 'Action',
    cell: ({ row }) => (
      <div className='flex gap-4'>
        <Button variant='outline' onClick={() => onEdit(row.original)}>수정</Button>
        <Button variant='outline' onClick={() => onRemove(row.original)}>삭제</Button>
      </div>
    ),
  },
];
