import { getDefaultLayout } from '@/components/layout/default-layout';
import SandboxTestersManager from '@/components/page/sandbox-testers/SandboxTestersManager';

function SandboxTestersPage() {
  return <SandboxTestersManager />;
}

SandboxTestersPage.getLayout = getDefaultLayout;
SandboxTestersPage.pageHeader = {
  title: '샌드박스 테스터',
  description: 'Sandbox·TestFlight 테스트 결제로 실제 유료 혜택을 받을 계정을 정합니다.',
};

export default SandboxTestersPage;
