import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import GameRewardPolicyList from '@/components/page/game/GameRewardPolicyList';

function GameRewardPolicyPage() {
  return (
    <div>
      <GameRewardPolicyList />
    </div>
  );
}

GameRewardPolicyPage.getLayout = getDefaultLayout;
GameRewardPolicyPage.pageHeader = pageHeader;

export default GameRewardPolicyPage;
