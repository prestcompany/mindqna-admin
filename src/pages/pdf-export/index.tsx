import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import PdfExportManager from '@/components/page/pdf-export/PdfExportManager';

function PdfExportPage() {
  return (
    <div>
      <PdfExportManager />
    </div>
  );
}

PdfExportPage.getLayout = getDefaultLayout;
PdfExportPage.pageHeader = pageHeader;

export default PdfExportPage;
