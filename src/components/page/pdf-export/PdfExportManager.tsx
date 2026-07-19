import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PdfExportHistoryTab from './PdfExportHistoryTab';
import PdfExportPolicyTab from './PdfExportPolicyTab';

function PdfExportManager() {
  return (
    <Tabs defaultValue='history' className='space-y-4'>
      <TabsList>
        <TabsTrigger value='history'>내보내기 이력</TabsTrigger>
        <TabsTrigger value='policy'>정책 설정</TabsTrigger>
      </TabsList>
      <TabsContent value='history'>
        <PdfExportHistoryTab />
      </TabsContent>
      <TabsContent value='policy'>
        <PdfExportPolicyTab />
      </TabsContent>
    </Tabs>
  );
}

export default PdfExportManager;
