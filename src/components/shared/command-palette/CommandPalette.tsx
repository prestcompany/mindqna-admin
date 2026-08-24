import { searchSpaces } from '@/client/space';
import { getUser } from '@/client/user';
import { allAdminMenus } from '@/components/layout/main-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { useQuery } from '@tanstack/react-query';
import { Building2, User } from 'lucide-react';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

const OPEN_EVENT = 'command-palette:open';

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type MenuEntry = { id: string; name: string; path: string; group: string };

function flattenMenus(): MenuEntry[] {
  const entries: MenuEntry[] = [];
  for (const menu of allAdminMenus) {
    if (menu.link?.path) {
      entries.push({ id: menu.id ?? menu.link.path, name: menu.name, path: menu.link.path, group: '' });
    }
    for (const sub of menu.submenu ?? []) {
      if (sub.link?.path) {
        entries.push({ id: sub.id ?? sub.link.path, name: sub.name, path: sub.link.path, group: menu.name });
      }
    }
  }
  return entries;
}

function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const keyword = debounced.trim();

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const openFromEvent = () => setOpen(true);
    document.addEventListener('keydown', down);
    window.addEventListener(OPEN_EVENT, openFromEvent);
    return () => {
      document.removeEventListener('keydown', down);
      window.removeEventListener(OPEN_EVENT, openFromEvent);
    };
  }, []);

  const menuEntries = useMemo(flattenMenus, []);

  // shouldFilter={false}(비동기 결과 혼합 시 cmdk 기본 필터가 스페이스/유저 항목을 잘못 걸러냄)
  // → 메뉴는 keyword로 수동 필터링한다.
  const filteredMenus = useMemo(() => {
    if (!keyword) return menuEntries;
    const lowered = keyword.toLowerCase();
    return menuEntries.filter((entry) => `${entry.group} ${entry.name}`.toLowerCase().includes(lowered));
  }, [menuEntries, keyword]);

  // URL 경로에 그대로 들어가는 값이므로 username 형태로 게이트(경로 파괴 문자·불필요한 404 방지)
  const isUsernameLike = /^[A-Za-z0-9._-]{2,}$/.test(keyword);

  const userLookup = useQuery({
    queryKey: ['cmdk-user', keyword],
    queryFn: () => getUser(keyword),
    enabled: open && isUsernameLike,
    retry: false,
  });

  const spaceLookup = useQuery({
    queryKey: ['cmdk-space', keyword],
    queryFn: () => searchSpaces({ page: 1, name: keyword }),
    enabled: open && keyword.length >= 2,
    retry: false,
  });

  const isSearching = userLookup.isFetching || spaceLookup.isFetching;

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
  };

  const spaceItems = (spaceLookup.data?.items ?? []).slice(0, 5);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput value={query} onValueChange={setQuery} placeholder='메뉴 이동 · 유저/스페이스 검색 (2자 이상)' />
      <CommandList>
        {isSearching ? <div className='px-3 py-2 text-xs text-muted-foreground'>검색 중…</div> : null}
        {!isSearching ? <CommandEmpty>결과가 없습니다.</CommandEmpty> : null}
        {filteredMenus.length > 0 ? (
          <CommandGroup heading='메뉴'>
            {filteredMenus.map((entry) => (
              <CommandItem key={entry.id} value={`${entry.group} ${entry.name}`} onSelect={() => go(entry.path)}>
                {entry.group ? <span className='mr-1 text-muted-foreground'>{entry.group} ·</span> : null}
                {entry.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {userLookup.data ? (
          <>
            <CommandSeparator />
            <CommandGroup heading='유저'>
              <CommandItem
                value={`user ${userLookup.data.username}`}
                onSelect={() => go(`/user/list?username=${encodeURIComponent(userLookup.data.username)}`)}
              >
                <User className='mr-2 h-4 w-4 text-muted-foreground' />
                유저 상세 열기: {userLookup.data.username}
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}
        {spaceItems.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading='스페이스'>
              {spaceItems.map((space) => {
                const spaceName = space.spaceInfo?.name;
                const spaceLabel = spaceName ? `${spaceName} (${space.id.slice(0, 8)})` : space.id;
                return (
                  <CommandItem
                    key={space.id}
                    value={`space ${space.id}`}
                    onSelect={() => go(`/space/list?spaceId=${encodeURIComponent(space.id)}`)}
                  >
                    <Building2 className='mr-2 h-4 w-4 text-muted-foreground' />
                    <span className='truncate'>스페이스 열기: {spaceLabel}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
