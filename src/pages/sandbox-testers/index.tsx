import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import SandboxTestersManager from '@/components/page/sandbox-testers/SandboxTestersManager';

function SandboxTestersPage() {
  return <SandboxTestersManager />;
}

SandboxTestersPage.getLayout = getDefaultLayout;
SandboxTestersPage.pageHeader = pageHeader;

export default SandboxTestersPage;
