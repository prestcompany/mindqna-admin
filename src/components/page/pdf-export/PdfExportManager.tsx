import BookExportPanel from '@/components/page/book-order/BookExportPanel';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import PdfExportHistoryTab from './PdfExportHistoryTab';
import PdfExportPolicyTab from './PdfExportPolicyTab';

function PdfExportManager() {
  const [isBookSheetOpen, setIsBookSheetOpen] = useState(false);
  const [isBookExportBusy, setIsBookExportBusy] = useState(false);

  return (
    <>
      <Tabs defaultValue='history' className='space-y-4'>
        <div className='flex items-center justify-between gap-2'>
          <TabsList>
            <TabsTrigger value='history'>발급 이력</TabsTrigger>
            <TabsTrigger value='policy'>정책 설정</TabsTrigger>
          </TabsList>
          <Button type='button' variant='outline' onClick={() => setIsBookSheetOpen(true)}>
            <BookOpen className='h-4 w-4' />
            책 제작 데이터 추출
          </Button>
        </div>
        <TabsContent value='history'>
          <PdfExportHistoryTab />
        </TabsContent>
        <TabsContent value='policy'>
          <PdfExportPolicyTab />
        </TabsContent>
      </Tabs>

      <Sheet
        open={isBookSheetOpen}
        onOpenChange={(open) => {
          // Closing mid-download would unmount the panel and drop the zip being built.
          if (!open && isBookExportBusy) {
            toast.info('다운로드가 끝나면 닫을 수 있습니다.');
            return;
          }
          setIsBookSheetOpen(open);
        }}
      >
        <AdminSideSheetContent
          title='책 제작 데이터 추출'
          description='카페24 발주서(csv, xlsx)를 올려 주문별로 추출 가능 여부를 확인하고, 제본소에 넘길 zip을 내려받습니다.'
          size='xl'
        >
          <BookExportPanel onBusyChange={setIsBookExportBusy} />
        </AdminSideSheetContent>
      </Sheet>
    </>
  );
}

export default PdfExportManager;
