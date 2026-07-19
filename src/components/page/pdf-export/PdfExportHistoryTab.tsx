import { getPdfExportHistory } from '@/client/pdf-export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import PdfExportRowActions from './PdfExportRowActions';
import PdfExportStatusBadge from './PdfExportStatusBadge';

function PdfExportHistoryTab() {
  const [space, setSpace] = useState('');
  const [user, setUser] = useState('');
  const [applied, setApplied] = useState<{ space: string; user: string }>({ space: '', user: '' });
  const [page, setPage] = useState(1);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['pdf-export-history', page, applied.space, applied.user],
    queryFn: () =>
      getPdfExportHistory({
        page,
        space: applied.space || undefined,
        user: applied.user || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const search = () => {
    setPage(1);
    setApplied({ space: space.trim(), user: user.trim() });
  };

  const items = data?.items ?? [];
  const totalPage = data?.pageInfo.totalPage ?? 0;

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-end gap-2'>
        <div className='space-y-1'>
          <label className='block text-xs text-slate-500'>공간 검색</label>
          <Input
            value={space}
            onChange={(e) => setSpace(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder='공간 이름 또는 spaceId'
            className='w-56'
          />
        </div>
        <div className='space-y-1'>
          <label className='block text-xs text-slate-500'>유저 검색</label>
          <Input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder='닉네임 · username · profileId'
            className='w-56'
          />
        </div>
        <Button type='button' onClick={search} disabled={isFetching}>
          검색
        </Button>
      </div>

      <div className='rounded-xl border border-slate-200/80 bg-white'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>공간</TableHead>
              <TableHead>발급자</TableHead>
              <TableHead>파일명</TableHead>
              <TableHead className='text-right'>범위</TableHead>
              <TableHead className='text-right'>카드수</TableHead>
              <TableHead className='text-right'>비용</TableHead>
              <TableHead className='text-right'>다운로드</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>발급일</TableHead>
              <TableHead>만료일</TableHead>
              <TableHead className='text-right'>액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className='py-10 text-center text-sm text-slate-400'>
                  {applied.space || applied.user ? '검색 결과가 없습니다.' : '발급 이력이 없습니다.'}
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className='font-medium text-slate-900'>{row.spaceName || '(이름 없음)'}</div>
                    <div className='text-[11px] text-slate-400'>{row.spaceId}</div>
                  </TableCell>
                  <TableCell>
                    <div className='text-slate-900'>{row.nickname}</div>
                    <div className='text-[11px] text-slate-400'>{row.username}</div>
                  </TableCell>
                  <TableCell className='max-w-[220px] truncate' title={row.fileName}>
                    {row.fileName}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {row.startOrder}–{row.endOrder}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>{row.count}</TableCell>
                  <TableCell className='text-right tabular-nums'>{row.cost}</TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {row.downloadCount}/{row.maxDownloadCount}
                  </TableCell>
                  <TableCell>
                    <PdfExportStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className='text-xs text-slate-500'>
                    {new Date(row.createdAt).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell className='text-xs text-slate-500'>
                    {new Date(row.expiresAt).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell className='text-right'>
                    <PdfExportRowActions record={row} onChanged={() => refetch()} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPage > 1 ? (
        <div className='flex items-center justify-center gap-3 text-sm'>
          <Button variant='outline' size='sm' onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            이전
          </Button>
          <span className='tabular-nums text-slate-600'>
            {page} / {totalPage}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
            disabled={page >= totalPage}
          >
            다음
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default PdfExportHistoryTab;
