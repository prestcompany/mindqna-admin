import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import GameRankingList from '@/components/page/game/GameRankingList';

function GameRankingPage() {
  return (
    <div>
      <GameRankingList />
    </div>
  );
}

GameRankingPage.getLayout = getDefaultLayout;
GameRankingPage.pageHeader = pageHeader;

export default GameRankingPage;
