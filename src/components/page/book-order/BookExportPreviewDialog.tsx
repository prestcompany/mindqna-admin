import { getBookExportBooks } from '@/client/book-export';
import type { BookExportBook, BookExportRejectedOrder, BookExportRequestOrder } from '@/client/types';
import { errorMessage } from '@/components/page/coupon/errorMessage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { copyText } from '@/lib/clipboard';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { toBookJson } from './services/book-zip-writer';

type PreviewState =
  | { status: 'loading' }
  | { status: 'book'; book: BookExportBook }
  | { status: 'rejected'; rejected: BookExportRejectedOrder }
  | { status: 'error'; error: unknown };

type Props = {
  request: BookExportRequestOrder | null;
  onClose: () => void;
};

function BookExportPreviewDialog({ request, onClose }: Props) {
  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='z-[60] flex max-h-[85vh] flex-col sm:max-w-3xl' overlayClassName='z-[55]'>
        <DialogHeader>
          <DialogTitle>{request ? `주문 미리보기 · ${request.orderNo}` : '주문 미리보기'}</DialogTitle>
          <DialogDescription>제본소에 넘길 JSON과 같은 내용입니다.</DialogDescription>
        </DialogHeader>
        {/* Remounts (and refetches) whenever a different order opens. */}
        {request ? <BookExportPreviewBody key={request.orderNo} request={request} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function BookExportPreviewBody({ request }: { request: BookExportRequestOrder }) {
  const [state, setState] = useState<PreviewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Ignores a response that arrives after a newer request for this dialog started.
  const latestRequest = useRef(0);

  useEffect(() => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    // Routed through a microtask so every outcome lands in .then/.catch and none of them set
    // state directly from the effect body.
    Promise.resolve()
      .then(() => getBookExportBooks([request]))
      .then((result) => {
        if (requestId !== latestRequest.current) return;
        if (result.books[0]) {
          setState({ status: 'book', book: result.books[0] });
        } else {
          setState({
            status: 'rejected',
            rejected: result.rejected[0] ?? { orderNo: request.orderNo, issues: [] },
          });
        }
      })
      .catch((err) => {
        if (requestId !== latestRequest.current) return;
        setState({ status: 'error', error: err });
      });
  }, [request, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((prev) => prev + 1);
  };

  const handleCopy = async (book: BookExportBook) => {
    try {
      await copyText(toBookJson(book));
      toast.success('JSON을 복사했습니다.');
    } catch {
      toast.error('복사하지 못했습니다. 브라우저 권한을 확인해 주세요.');
    }
  };

  if (state.status === 'loading') {
    return (
      <p className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' />
        불러오는 중입니다.
      </p>
    );
  }

  if (state.status === 'book') {
    const { book } = state;
    return (
      <div className='min-h-0 space-y-3 overflow-y-auto'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground'>
          <span>
            주문번호 <span className='font-mono'>{book.orderNo}</span>
          </span>
          <span className='text-muted-foreground'>·</span>
          <span>공간명 {book.cover.spaceName}</span>
          <span className='text-muted-foreground'>·</span>
          <span>
            표지 {book.coverColor} / 내지 {book.paidInner}
          </span>
          <span className='text-muted-foreground'>·</span>
          <span className='tabular-nums'>
            수록 {book.cover.startOrder}~{book.cover.endOrder}
          </span>
          <span className='text-muted-foreground'>·</span>
          <span className='tabular-nums'>카드 {book.cover.count}장</span>
        </div>
        <pre className='max-h-[60vh] overflow-auto rounded-lg border border-hairline bg-canvas p-3 font-mono text-xs'>
          {toBookJson(book)}
        </pre>
        <div className='flex justify-end'>
          <Button type='button' variant='outline' size='sm' onClick={() => handleCopy(book)}>
            JSON 복사
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === 'rejected') {
    return (
      <div className='space-y-1 text-sm'>
        <p className='font-medium text-foreground'>추출할 수 없는 주문입니다.</p>
        {state.rejected.issues.map((issue) => (
          <p key={issue.code} className='text-xs text-muted-foreground'>
            {issue.message}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className='space-y-2 text-sm'>
      <p className='text-foreground'>{errorMessage(state.error)}</p>
      <Button type='button' variant='outline' size='sm' onClick={retry}>
        다시 시도
      </Button>
    </div>
  );
}

export default BookExportPreviewDialog;
