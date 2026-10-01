import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import BookOrderList from '@/components/page/book-order/BookOrderList';

function BookOrderPage() {
  return (
    <div>
      <BookOrderList />
    </div>
  );
}

BookOrderPage.getLayout = getDefaultLayout;
BookOrderPage.pageHeader = pageHeader;

export default BookOrderPage;
