import type { AppVersionPolicies, FeatureFlagVersionUsage } from '@/client/types';
import { segmentSummaries } from './services/app-versions';

type AppVersionOverviewProps = {
  versions: FeatureFlagVersionUsage[];
  policies: AppVersionPolicies | undefined;
};

const PERCENT = new Intl.NumberFormat('ko-KR', { style: 'percent', maximumFractionDigits: 0 });
const COUNT = new Intl.NumberFormat('ko-KR');

/** 버전 조건을 고르기 전에 지금 나와 있는 버전과 최소 지원 버전을 한눈에 본다. */
function AppVersionOverview({ versions, policies }: AppVersionOverviewProps) {
  const segments = segmentSummaries(versions);

  return (
    <section aria-labelledby='app-version-overview' className='rounded-xl border border-border bg-card px-4 py-4'>
      <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
        <h2 id='app-version-overview' className='text-sm font-semibold text-foreground'>
          앱 버전 현황
        </h2>
        <p className='text-xs text-muted-foreground'>최근 30일 로그인 사용자 기준</p>
      </div>

      {segments.length ? (
        <ul className='mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {segments.map((s) => {
            const policy = s.id.startsWith('ios') ? policies?.ios : policies?.android;
            return (
              <li key={s.id} className='rounded-lg border border-border bg-background px-4 py-3'>
                <p className='text-xs font-medium text-muted-foreground'>{s.label} 최신</p>
                <p className='mt-1 flex items-baseline gap-2'>
                  <span className='text-2xl font-semibold tracking-display text-foreground tabular-nums'>
                    {s.latest.name}
                  </span>
                  <span className='text-sm text-muted-foreground tabular-nums'>코드 {s.latest.code}</span>
                </p>
                <p className='mt-1 text-xs text-muted-foreground tabular-nums'>
                  사용자 {COUNT.format(s.users)}명 중 {PERCENT.format(s.latestUsers / s.users)}가 최신
                  {policy ? ` · 최소 지원 ${policy.minVersionName} (${policy.minVersionCode})` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className='mt-2 text-sm text-muted-foreground'>
          아직 집계된 버전이 없습니다.
          {policies?.ios || policies?.android
            ? ` 최소 지원 버전: ${[
                policies.ios && `iOS ${policies.ios.minVersionName} (${policies.ios.minVersionCode})`,
                policies.android && `Android ${policies.android.minVersionName} (${policies.android.minVersionCode})`,
              ]
                .filter(Boolean)
                .join(', ')}`
            : ''}
        </p>
      )}
    </section>
  );
}

export default AppVersionOverview;
