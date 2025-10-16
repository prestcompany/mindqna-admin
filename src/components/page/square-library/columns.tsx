import { LibraryData, LibrarySubType } from '@/client/square-library';
import { Button, Image, TableProps, Tag, Tooltip } from 'antd';
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
}: CreateColumnsProps): TableProps<LibraryData>['columns'] => [
  {
    title: '번호',
    key: 'index',
    render: (_: any, __: LibraryData, index: number) => (currentPage - 1) * 10 + index + 1,
  },
  {
    title: '이미지',
    dataIndex: 'img',
    key: 'img',
    render: (value: string) => {
      return <Image width={'100%'} height={60} src={value ?? ''} alt='img' style={{ objectFit: 'contain' }} />;
    },
  },
  {
    title: '이름',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '타입',
    dataIndex: 'subCategory',
    key: 'subCategory',
    render: (value: LibrarySubType) => {
      return <Tag color='green'>{LibraryMap[value]}</Tag>;
    },
  },
  {
    title: '제목 키',
    dataIndex: 'title',
    key: 'title',
    render: (text: string) => <Tooltip title={text}>{truncateText(text, 10)}</Tooltip>,
  },
  {
    title: '내용 키',
    dataIndex: 'content',
    key: 'content',
    render: (text: string) => <Tooltip title={text}>{truncateText(text, 15)}</Tooltip>,
  },
  {
    title: '조회수',
    dataIndex: 'viewCount',
    key: 'viewCount',
  },
  {
    title: '클릭수',
    dataIndex: 'clickCount',
    key: 'clickCount',
  },
  {
    title: '링크',
    dataIndex: 'link',
    key: 'link',
    width: 250,
    ellipsis: true,
    render: (value: string) => {
      return (
        <Tooltip title={value} placement='topLeft'>
          <Link href={value} target='_blank'>
            {value}
          </Link>
        </Tooltip>
      );
    },
  },
  {
    title: '활성화',
    dataIndex: 'isActive',
    key: 'isActive',
    render: (value: boolean) => {
      return <Tag color={value ? 'green' : 'default'}>{value ? '활성화' : '비활성화'}</Tag>;
    },
  },
  {
    title: '고정',
    dataIndex: 'isFixed',
    key: 'isFixed',
    render: (value: boolean) => {
      return <Tag color={value ? 'green' : 'default'}>{value ? '고정됨' : '고정 안됨'}</Tag>;
    },
  },
  {
    title: 'Action',
    dataIndex: '',
    key: 'x',
    render: (value) => (
      <div className='flex gap-4'>
        <Button onClick={() => onEdit(value)}>수정</Button>
        <Button onClick={() => onRemove(value)}>삭제</Button>
      </div>
    ),
  },
];
