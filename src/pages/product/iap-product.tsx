import { getDefaultLayout } from '@/components/layout/default-layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

function IapProductRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/product/purchase?tab=products');
  }, [router]);

  return null;
}

IapProductRedirectPage.getLayout = getDefaultLayout;

export default IapProductRedirectPage;
