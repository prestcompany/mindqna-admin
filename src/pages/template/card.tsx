import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import CardList from '@/components/page/card/CardList';

function CardPage() {
  return (
    <div>
      <CardList />
    </div>
  );
}

CardPage.getLayout = getDefaultLayout;
CardPage.pageHeader = pageHeader;

export default CardPage;
