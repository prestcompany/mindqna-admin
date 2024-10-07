import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import ProductList from '@/components/page/premium/ProductList';

function ProductPage() {
  return (
    <div>
      <ProductList />
    </div>
  );
}

ProductPage.getLayout = getDefaultLayout;
ProductPage.pageHeader = pageHeader;

export default ProductPage;
