import { FilterBar, FILTER_CONTROL_CLASS, type FilterChipItem } from '@/components/shared/ui/filter-bar';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import ProductList from './ProductList';
import PurchaseDetailSheet, { PurchaseDetailContext } from './PurchaseDetailSheet';
import PurchaseMetaList from './PurchaseMetaList';
import type { PaymentFilters } from './purchase-filters';

type PlatformValue = 'all' | 'IOS' | 'AOS' | 'EVENT';
type KindValue = 'all' | 'sub' | 'consumable';
type EnvValue = 'all' | 'prod' | 'test';
type PurchaseStatusValue = 'all' | 'success' | 'failed' | 'expired';
type EntitlementStatusValue = 'all' | 'active' | 'expired';

const LABELS: Record<string, string> = {
  IOS: 'iOS',
  AOS: 'Android',
  EVENT: 'EVENT',
  success: '성공',
  failed: '실패',
  expired: '만료',
  active: '활성',
};

function PurchaseManagement() {
  const router = useRouter();
  const tab = router.query.tab === 'products' ? 'products' : 'purchases';
  const [detailContext, setDetailContext] = useState<PurchaseDetailContext | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<PlatformValue>('all');
  const [kind, setKind] = useState<KindValue>('all');
  const [environment, setEnvironment] = useState<EnvValue>('all');
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatusValue>('all');
  const [entitlementStatus, setEntitlementStatus] = useState<EntitlementStatusValue>('all');
  const [startedAt, setStartedAt] = useState<dayjs.Dayjs | null>(null);
  const [endedAt, setEndedAt] = useState<dayjs.Dayjs | null>(null);
  const [applied, setApplied] = useState<PaymentFilters>({});
  const [purchasePage, setPurchasePage] = useState(1);
  const [entitlementPage, setEntitlementPage] = useState(1);

  const resetPages = () => {
    setPurchasePage(1);
    setEntitlementPage(1);
  };

  const setTab = (next: string) => {
    router.replace({ pathname: router.pathname, query: { ...router.query, tab: next } }, undefined, { shallow: true });
  };

  const applyFilters = () => {
    resetPages();
    setApplied({
      search: search.trim() || undefined,
      platform: platform === 'all' ? undefined : platform,
      isSubscribe: kind === 'all' ? undefined : kind === 'sub',
      isProduction: environment === 'all' ? undefined : environment === 'prod',
      startDate: startedAt?.format('YYYY-MM-DD'),
      endDate: endedAt?.format('YYYY-MM-DD'),
      purchaseStatus: purchaseStatus === 'all' ? undefined : purchaseStatus,
      entitlementStatus: entitlementStatus === 'all' ? undefined : entitlementStatus,
    });
  };

  const resetFilters = () => {
    resetPages();
    setSearch('');
    setPlatform('all');
    setKind('all');
    setEnvironment('all');
    setPurchaseStatus('all');
    setEntitlementStatus('all');
    setStartedAt(null);
    setEndedAt(null);
    setApplied({});
  };

  const removeChip = (key: string) => {
    resetPages();
    if (key === 'search') setSearch('');
    if (key === 'platform') setPlatform('all');
    if (key === 'kind') setKind('all');
    if (key === 'environment') setEnvironment('all');
    if (key === 'status') {
      if (tab === 'purchases') setPurchaseStatus('all');
      else setEntitlementStatus('all');
    }
    if (key === 'date') {
      setStartedAt(null);
      setEndedAt(null);
    }
    setApplied((previous) => ({
      ...previous,
      ...(key === 'search' ? { search: undefined } : {}),
      ...(key === 'platform' ? { platform: undefined } : {}),
      ...(key === 'kind' ? { isSubscribe: undefined } : {}),
      ...(key === 'environment' ? { isProduction: undefined } : {}),
      ...(key === 'status' ? { [tab === 'purchases' ? 'purchaseStatus' : 'entitlementStatus']: undefined } : {}),
      ...(key === 'date' ? { startDate: undefined, endDate: undefined } : {}),
    }));
  };

  const chips: FilterChipItem[] = [];
  if (applied.search) chips.push({ key: 'search', label: `검색: ${applied.search}` });
  if (applied.platform) chips.push({ key: 'platform', label: `플랫폼: ${LABELS[applied.platform]}` });
  if (applied.isSubscribe !== undefined)
    chips.push({ key: 'kind', label: `유형: ${applied.isSubscribe ? '구독' : '일반'}` });
  if (applied.isProduction !== undefined)
    chips.push({ key: 'environment', label: `환경: ${applied.isProduction ? 'PROD' : 'TEST'}` });
  const currentStatus = tab === 'purchases' ? applied.purchaseStatus : applied.entitlementStatus;
  if (currentStatus) chips.push({ key: 'status', label: `상태: ${LABELS[currentStatus]}` });
  if (applied.startDate || applied.endDate) {
    chips.push({ key: 'date', label: `기간: ${applied.startDate || '처음'} ~ ${applied.endDate || '현재'}` });
  }

  const openDetail = (ctx: PurchaseDetailContext) => {
    setDetailContext(ctx);
    setDetailOpen(true);
  };

  return (
    <TooltipProvider>
      <Tabs value={tab} onValueChange={setTab} className='w-full'>
        <TabsList className='mb-3'>
          <TabsTrigger value='purchases'>결제 내역</TabsTrigger>
          <TabsTrigger value='products'>이용권 현황</TabsTrigger>
        </TabsList>

        <FilterBar chips={chips} onRemoveChip={removeChip}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters();
            }}
            className='flex flex-1 flex-wrap items-center gap-2'
          >
            <div className='relative min-w-[260px] flex-1 sm:max-w-[320px]'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                aria-label='유저 코드, 내부 ID, 상품 ID 또는 결제 ID 검색'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='유저 / 상품 ID / 결제 ID'
                className={cn('pl-9', FILTER_CONTROL_CLASS)}
              />
            </div>
            <Select
              value={tab === 'purchases' ? purchaseStatus : entitlementStatus}
              onValueChange={(value) => {
                if (tab === 'purchases') setPurchaseStatus(value as PurchaseStatusValue);
                else setEntitlementStatus(value as EntitlementStatusValue);
              }}
            >
              <SelectTrigger aria-label='상태' className={cn('w-[110px]', FILTER_CONTROL_CLASS)}>
                <SelectValue placeholder='상태' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>상태 전체</SelectItem>
                {tab === 'purchases' ? (
                  <>
                    <SelectItem value='success'>성공</SelectItem>
                    <SelectItem value='failed'>실패</SelectItem>
                    <SelectItem value='expired'>만료</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value='active'>활성</SelectItem>
                    <SelectItem value='expired'>만료</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <Select value={kind} onValueChange={(value) => setKind(value as KindValue)}>
              <SelectTrigger aria-label='유형' className={cn('w-[110px]', FILTER_CONTROL_CLASS)}>
                <SelectValue placeholder='유형' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>유형 전체</SelectItem>
                <SelectItem value='sub'>구독</SelectItem>
                <SelectItem value='consumable'>일반</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platform} onValueChange={(value) => setPlatform(value as PlatformValue)}>
              <SelectTrigger aria-label='플랫폼' className={cn('w-[120px]', FILTER_CONTROL_CLASS)}>
                <SelectValue placeholder='플랫폼' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>플랫폼 전체</SelectItem>
                <SelectItem value='IOS'>iOS</SelectItem>
                <SelectItem value='AOS'>Android</SelectItem>
                <SelectItem value='EVENT'>EVENT</SelectItem>
              </SelectContent>
            </Select>
            <Select value={environment} onValueChange={(value) => setEnvironment(value as EnvValue)}>
              <SelectTrigger aria-label='환경' className={cn('w-[110px]', FILTER_CONTROL_CLASS)}>
                <SelectValue placeholder='환경' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>환경 전체</SelectItem>
                <SelectItem value='prod'>PROD</SelectItem>
                <SelectItem value='test'>TEST</SelectItem>
              </SelectContent>
            </Select>
            <DatePickerWithRange
              startedAt={startedAt}
              endedAt={endedAt}
              setStartedAt={setStartedAt}
              setEndedAt={setEndedAt}
              triggerClassName={FILTER_CONTROL_CLASS}
            />
            <Button type='submit' className='h-8'>
              검색
            </Button>
            <Button type='button' variant='outline' className='h-8' onClick={resetFilters}>
              초기화
            </Button>
          </form>
        </FilterBar>
        <p className='mb-2 text-xs text-muted-foreground'>
          기간은 결제 내역의 구매 시간, 이용권의 생성 시간을 기준으로 합니다.
        </p>

        <TabsContent value='purchases'>
          <PurchaseMetaList
            filters={applied}
            page={purchasePage}
            onPageChange={setPurchasePage}
            onOpenDetail={openDetail}
          />
        </TabsContent>
        <TabsContent value='products'>
          <ProductList
            filters={applied}
            page={entitlementPage}
            onPageChange={setEntitlementPage}
            onOpenDetail={openDetail}
          />
        </TabsContent>
      </Tabs>

      <PurchaseDetailSheet open={detailOpen} context={detailContext} onClose={() => setDetailOpen(false)} />
    </TooltipProvider>
  );
}

export default PurchaseManagement;
