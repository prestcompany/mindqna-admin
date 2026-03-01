import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminTheme, useAdminTheme } from '@/lib/design-system/theme-provider';
import { Palette } from 'lucide-react';
import React from 'react';

const ThemeSwitcher = () => {
  const { theme, setTheme, themeOptions } = useAdminTheme();

  return (
    <div className='flex items-center gap-2'>
      <Palette className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
      <Select value={theme} onValueChange={(value) => setTheme(value as AdminTheme)}>
        <SelectTrigger aria-label='관리자 테마 선택' className='h-8 w-[140px] min-w-[140px]'>
          <SelectValue placeholder='Theme' />
        </SelectTrigger>
        <SelectContent>
          {themeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default React.memo(ThemeSwitcher);
