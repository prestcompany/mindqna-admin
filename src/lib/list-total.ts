import type { TotalPageInfo } from '@/client/types';

/**
 * "총 N건" 에 쓸 전체 건수. 서버가 total 을 보내면 그 값을 쓴다.
 * 아직 totalPage 만 보내는 서버에서는 마지막 페이지에서만 정확히 세고, 그 앞 페이지는 totalPage × pageSize 로 둔다.
 */
export function listTotal(input: {
  pageInfo: TotalPageInfo | undefined;
  page: number;
  rows: number;
  pageSize: number;
}): number {
  const { pageInfo, page, rows, pageSize } = input;
  if (!pageInfo) return 0;
  if (pageInfo.total !== undefined) return pageInfo.total;
  if (page === pageInfo.totalPage) return (page - 1) * pageSize + rows;
  return pageInfo.totalPage * pageSize;
}
