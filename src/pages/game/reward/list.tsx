import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import GameRewardList from '@/components/page/game/GameRewardList';

function GameRewardPage() {
  return (
    <div>
      <GameRewardList />
    </div>
  );
}

GameRewardPage.getLayout = getDefaultLayout;
GameRewardPage.pageHeader = pageHeader;

export default GameRewardPage;
