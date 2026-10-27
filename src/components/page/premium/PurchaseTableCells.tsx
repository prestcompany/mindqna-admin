import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import dayjs from 'dayjs';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

export function PlatformBadge({ platform }: { platform: string }) {
  const normalized = platform.toUpperCase();
  if (normalized === 'IOS') return <Badge variant='softInfo'>iOS</Badge>;
  if (normalized === 'AOS') return <Badge variant='softNeutral'>Android</Badge>;
  if (normalized === 'EVENT') return <Badge variant='softWarning'>EVENT</Badge>;
  return <Badge variant='softNeutral'>{platform}</Badge>;
}

export function EnvironmentBadge({ isProduction }: { isProduction: boolean }) {
  return <Badge variant={isProduction ? 'softNeutral' : 'softWarning'}>{isProduction ? 'PROD' : 'TEST'}</Badge>;
}

export function ProductKindBadge({ isSubscribe }: { isSubscribe: boolean }) {
  return <Badge variant={isSubscribe ? 'softInfo' : 'softNeutral'}>{isSubscribe ? '구독' : '일반'}</Badge>;
}

export function IdentifierCell({ value, label, display }: { value?: string | null; label: string; display?: string }) {
  if (!value) return <span className='text-sm text-muted-foreground'>—</span>;
  return (
    <div className='flex min-w-0 items-center gap-1'>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className='max-w-[180px] truncate font-mono text-sm text-foreground'>
            {display || value}
          </span>
        </TooltipTrigger>
        <TooltipContent className='max-w-[400px] break-all'>{value}</TooltipContent>
      </Tooltip>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='h-8 w-8 shrink-0 p-0'
        aria-label={`${label} 복사`}
        onClick={(event) => {
          event.stopPropagation();
          navigator.clipboard.writeText(value).then(
            () => toast.success(`${label} 복사됨`),
            () => toast.error(`${label} 복사 실패`),
          );
        }}
      >
        <Copy className='h-3.5 w-3.5' />
      </Button>
    </div>
  );
}

export function UserCell({ username, userId }: { username?: string | null; userId: string }) {
  return <IdentifierCell value={userId} display={username || userId} label='유저 ID' />;
}

export function DateTimeCell({ value }: { value?: string | null }) {
  if (!value) return <span className='text-sm text-muted-foreground'>—</span>;
  const date = dayjs(value);
  return (
    <div className='space-y-0.5 tabular-nums'>
      <div className='text-sm text-foreground'>{date.format('YYYY.MM.DD')}</div>
      <div className='text-xs text-muted-foreground'>{date.format('HH:mm')}</div>
    </div>
  );
}
