import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/router';
import { useState } from 'react';
import ProductList from './ProductList';
import PurchaseDetailSheet, { PurchaseDetailContext } from './PurchaseDetailSheet';
import PurchaseMetaList from './PurchaseMetaList';

function PurchaseManagement() {
  const router = useRouter();
  const tab = router.query.tab === 'products' ? 'products' : 'purchases';
  const [detailContext, setDetailContext] = useState<PurchaseDetailContext | null>(null);

  const setTab = (next: string) => {
    router.replace({ pathname: router.pathname, query: { ...router.query, tab: next } }, undefined, {
      shallow: true,
    });
  };

  const openDetail = (ctx: PurchaseDetailContext) => setDetailContext(ctx);

  return (
    <div>
      <Tabs value={tab} onValueChange={setTab} className='w-full'>
        <TabsList className='mb-4'>
          <TabsTrigger value='purchases'>결제 내역</TabsTrigger>
          <TabsTrigger value='products'>이용권 현황</TabsTrigger>
        </TabsList>
        <TabsContent value='purchases'>
          <PurchaseMetaList onOpenDetail={openDetail} />
        </TabsContent>
        <TabsContent value='products'>
          <ProductList onOpenDetail={openDetail} />
        </TabsContent>
      </Tabs>

      <PurchaseDetailSheet open={!!detailContext} context={detailContext} onClose={() => setDetailContext(null)} />
    </div>
  );
}

export default PurchaseManagement;
