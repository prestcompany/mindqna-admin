import { IAPProduct } from '@/client/premium';
import { getUserEntitlements, getUserPurchases } from '@/client/user';
import TicketForm from '@/components/page/user/TicketForm';
import EntitlementRow from '@/components/shared/purchase/EntitlementRow';
import LiveStatusBlock from '@/components/shared/purchase/LiveStatusBlock';
import PurchaseHistoryRow from '@/components/shared/purchase/PurchaseHistoryRow';
import ReceiptViewer from '@/components/shared/purchase/ReceiptViewer';
import { resolveStatus } from '@/components/shared/purchase/purchase-status';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import usePurchaseDetail from '@/hooks/usePurchaseDetail';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Copy, ExternalLink, Loader2, Ticket } from 'lucide-react';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

export type PurchaseDetailContext = { type: 'purchase'; purchaseId: number } | { type: 'ticket'; ticket: IAPProduct };

interface PurchaseDetailSheetProps {
  open: boolean;
  context: PurchaseDetailContext | null;
  onClose: () => void;
}

const PLATFORM_LABEL: Record<string, string> = { IOS: 'iOS', AOS: 'Android', EVENT: 'EVENT' };

function SummaryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='space-y-1'>
      <div className='text-xs font-medium text-muted-foreground'>{label}</div>
      <div className='flex min-h-6 items-center text-sm text-foreground'>{children}</div>
    </div>
  );
}

function CopyableValue({ value, label }: { value: string; label: string }) {
  return (
    <div className='flex items-center gap-1'>
      <span className='truncate font-mono text-sm text-foreground'>{value}</span>
      <Button
        variant='ghost'
        size='sm'
        className='h-6 w-6 shrink-0 p-0 hover:bg-muted'
        aria-label={`${label} 복사`}
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success(`${label} 복사됨`);
        }}
      >
        <Copy className='h-3 w-3' />
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='space-y-2 border-t border-border pt-4'>
      <h4 className='text-xs font-semibold text-muted-foreground'>{title}</h4>
      {children}
    </section>
  );
}

function UserContextSections({ username }: { username: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ticketOpen, setTicketOpen] = useState(false);

  const entitlements = useQuery({
    queryKey: ['user-entitlements', username],
    queryFn: () => getUserEntitlements(username),
    enabled: !!username,
  });
  const purchases = useQuery({
    queryKey: ['user-purchases', username, 1],
    queryFn: () => getUserPurchases(username, 1),
    enabled: !!username,
  });

  const tickets = entitlements.data?.premiumTickets ?? [];
  const golds = entitlements.data?.goldClubs ?? [];
  const historyItems = purchases.data?.items ?? [];

  return (
    <>
      <Section title='이용권/구독 상태'>
        <LiveStatusBlock username={username} />
        {entitlements.isLoading ? (
          <div className='flex justify-center py-4'>
            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='space-y-2'>
            {tickets.slice(0, 5).map((t) => (
              <EntitlementRow key={`p-${t.id}`} label='프리미엄' t={t} />
            ))}
            {golds.slice(0, 5).map((t) => (
              <EntitlementRow key={`g-${t.id}`} label='골드클럽' t={t} />
            ))}
            {tickets.length === 0 && golds.length === 0 ? (
              <div className='text-xs text-muted-foreground'>DB에 저장된 이용권이 없습니다.</div>
            ) : null}
          </div>
        )}
      </Section>

      <Section title='최근 결제 이력'>
        {purchases.isLoading ? (
          <div className='flex justify-center py-4'>
            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          </div>
        ) : historyItems.length === 0 ? (
          <div className='text-xs text-muted-foreground'>결제 이력이 없습니다.</div>
        ) : (
          <div className='space-y-2'>
            {historyItems.map((row) => (
              <PurchaseHistoryRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </Section>

      <div className='sticky bottom-0 -mx-5 -mb-4 flex flex-wrap justify-end gap-2 border-t border-border bg-background/95 px-5 py-3 backdrop-blur'>
        <Button
          variant='outline'
          className='h-9'
          onClick={() => router.push(`/user/list?username=${encodeURIComponent(username)}`)}
        >
          <ExternalLink className='mr-1.5 h-4 w-4' />
          유저 상세 열기
        </Button>
        <Button variant='outline' className='h-9' onClick={() => setTicketOpen(true)}>
          <Ticket className='mr-1.5 h-4 w-4' />
          티켓 지급/회수
        </Button>
      </div>

      <Sheet open={ticketOpen} onOpenChange={(next) => !next && setTicketOpen(false)}>
        <AdminSideSheetContent title='티켓 관리' size='md'>
          <TicketForm
            username={username}
            reload={async () => {
              await queryClient.invalidateQueries({ queryKey: ['user-entitlements', username] });
              await queryClient.invalidateQueries({ queryKey: ['user-purchases', username] });
            }}
            close={() => setTicketOpen(false)}
          />
        </AdminSideSheetContent>
      </Sheet>
    </>
  );
}

function PurchaseSummary({ context }: { context: PurchaseDetailContext }) {
  const detail = usePurchaseDetail(context.type === 'purchase' ? context.purchaseId : null);

  if (context.type === 'ticket') {
    const t = context.ticket;
    return (
      <div className='space-y-4'>
        <div className='flex flex-wrap gap-1.5'>
          <Badge variant={t.isActive ? 'dotSuccess' : 'dotNeutral'}>{t.isActive ? '활성' : '만료'}</Badge>
          <Badge variant='softNeutral'>{PLATFORM_LABEL[t.platform] ?? t.platform}</Badge>
          <Badge variant={t.dueAt ? 'softInfo' : 'softNeutral'}>{t.dueAt ? '구독' : '소모품'}</Badge>
          <Badge variant={t.isProduction ? 'softNeutral' : 'softWarning'}>{t.isProduction ? 'PROD' : 'TEST'}</Badge>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <SummaryField label='상품 ID'>
            <CopyableValue value={t.productId} label='상품 ID' />
          </SummaryField>
          <SummaryField label='결제 ID'>
            {t.transactionId ? <CopyableValue value={t.transactionId} label='결제 ID' /> : '없음'}
          </SummaryField>
          <SummaryField label='생성'>{dayjs(t.createdAt).format('YYYY.MM.DD HH:mm')}</SummaryField>
          {t.dueAt ? <SummaryField label='만료'>{dayjs(t.dueAt).format('YYYY.MM.DD HH:mm')}</SummaryField> : null}
        </div>
      </div>
    );
  }

  if (detail.isLoading) {
    return (
      <div className='flex min-h-[160px] items-center justify-center'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    return <div className='py-8 text-center text-sm text-muted-foreground'>결제 상세를 불러오지 못했습니다.</div>;
  }

  const p = detail.data;
  const status = resolveStatus(p);

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-1.5'>
        <Badge variant={status.dotVariant}>{status.label}</Badge>
        <Badge variant='softNeutral'>{PLATFORM_LABEL[p.platform] ?? p.platform}</Badge>
        <Badge variant={p.isProduction ? 'softNeutral' : 'softWarning'}>{p.isProduction ? 'PROD' : 'TEST'}</Badge>
        {p.isSubscribe !== null ? (
          <Badge variant={p.isSubscribe ? 'softInfo' : 'softNeutral'}>{p.isSubscribe ? '구독' : '단건'}</Badge>
        ) : null}
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <SummaryField label='유저'>
          {p.username ? (
            <CopyableValue value={p.username} label='유저' />
          ) : (
            <CopyableValue value={p.userId} label='유저 ID' />
          )}
        </SummaryField>
        {p.price ? <SummaryField label='가격 (이력 기준)'>{p.price}</SummaryField> : null}
        <SummaryField label='상품 ID'>
          <CopyableValue value={p.productId} label='상품 ID' />
        </SummaryField>
        <SummaryField label='결제 ID'>
          <CopyableValue value={p.transactionId} label='결제 ID' />
        </SummaryField>
        <SummaryField label='구매 시간'>{dayjs(p.createdAt).format('YYYY.MM.DD HH:mm:ss')}</SummaryField>
        {p.completedAt ? (
          <SummaryField label='완료 시간'>{dayjs(p.completedAt).format('YYYY.MM.DD HH:mm:ss')}</SummaryField>
        ) : null}
      </div>

      {p.relatedTickets.length > 0 ? (
        <Section title='이 결제로 지급된 이용권'>
          <div className='space-y-2'>
            {p.relatedTickets.map((t) => (
              <EntitlementRow
                key={`${t.type}-${t.id}`}
                label={t.type === 'premium' ? '프리미엄' : '골드클럽'}
                t={{ ...t, profileId: null }}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {p.receipt || p.log ? (
        <Section title='영수증·로그'>
          <div className='space-y-2'>
            {p.receipt ? <ReceiptViewer title='영수증' raw={p.receipt} /> : null}
            {p.log ? <ReceiptViewer title='로그' raw={p.log} /> : null}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function PurchaseDetailSheet({ open, context, onClose }: PurchaseDetailSheetProps) {
  if (!context) return null;

  const username = context.type === 'purchase' ? undefined : context.ticket.owner?.username;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <AdminSideSheetContent
        title={context.type === 'purchase' ? '결제 상세' : '이용권 상세'}
        description='결제 정보와 유저의 이용권/구독 상태를 확인합니다.'
        size='lg'
      >
        <div className='space-y-5'>
          <PurchaseSummary context={context} />
          {context.type === 'purchase' ? (
            <PurchaseUserSections purchaseId={context.purchaseId} />
          ) : username ? (
            <UserContextSections username={username} />
          ) : (
            <div className='rounded-lg border border-border bg-canvas p-3 text-xs text-muted-foreground'>
              탈퇴한 유저입니다. 이용권/이력 조회를 사용할 수 없습니다.
            </div>
          )}
        </div>
      </AdminSideSheetContent>
    </Sheet>
  );
}

// 결제 컨텍스트는 상세 API 응답의 username을 기다렸다가 유저 섹션을 렌더한다
function PurchaseUserSections({ purchaseId }: { purchaseId: number }) {
  const detail = usePurchaseDetail(purchaseId);
  if (!detail.data) return null;
  if (!detail.data.username) {
    return (
      <div className='rounded-lg border border-border bg-canvas p-3 text-xs text-muted-foreground'>
        탈퇴한 유저입니다. 이용권/이력 조회를 사용할 수 없습니다.
      </div>
    );
  }
  return <UserContextSections username={detail.data.username} />;
}

export default PurchaseDetailSheet;
