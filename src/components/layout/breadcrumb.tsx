import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { getRouteLabel } from './route-labels';

const Breadcrumb = () => {
  const router = useRouter();
  const segments = router.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className='flex min-w-0 items-center gap-1 text-sm'>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const href = '/' + segments.slice(0, index + 1).join('/');
        const label = getRouteLabel(segment);

        return (
          <React.Fragment key={href}>
            {index > 0 && <ChevronRight className='w-3.5 h-3.5 text-muted-foreground' />}
            {isLast ? (
              <span className='truncate font-medium text-foreground'>{label}</span>
            ) : (
              <Link href={href} className='transition-colors text-muted-foreground hover:text-foreground'>
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default React.memo(Breadcrumb);
