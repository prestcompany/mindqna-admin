import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import GameList from '@/components/page/game/GameList';

function GamePage() {
  return (
    <div>
      <GameList />
    </div>
  );
}

GamePage.getLayout = getDefaultLayout;
GamePage.pageHeader = pageHeader;

export default GamePage;
