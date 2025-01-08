import { getSquareLibrary, LibrarySubType, LibraryType } from '@/client/library';
import { Locale } from '@/client/types';
import { useQuery } from '@tanstack/react-query';

type Props = {
  category: LibraryType;
  page: number;
  locale?: Locale;
  subCategory?: LibrarySubType;
};
function useLibrary(by: Props) {
  const { category, page, locale, subCategory } = by;
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['libraries', page, locale, subCategory],
    queryFn: () => getSquareLibrary(category, page, subCategory, locale),
  });

  const items = data?.data ?? [];

  const totalPage = data?.pageInfo ?? 1;

  return { items, totalPage, isLoading, refetch };
}

export default useLibrary;
