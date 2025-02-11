import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import GamePlayList from '@/components/page/game/GamePlayList';

function GamePlayPage() {
  return (
    <div>
      <GamePlayList />
    </div>
  );
}

GamePlayPage.getLayout = getDefaultLayout;
GamePlayPage.pageHeader = pageHeader;

export default GamePlayPage;
