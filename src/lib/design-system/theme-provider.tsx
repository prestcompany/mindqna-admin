import React, { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo } from 'react';

export type AdminTheme = 'vercel';

export const ADMIN_THEME_OPTIONS: Array<{
  value: AdminTheme;
  label: string;
  description: string;
}> = [
  {
    value: 'vercel',
    label: 'Vercel',
    description: 'High-contrast neutral SaaS tone',
  },
];

interface AdminThemeContextValue {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
  themeOptions: typeof ADMIN_THEME_OPTIONS;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function AdminThemeProvider({ children }: PropsWithChildren) {
  const theme: AdminTheme = 'vercel';
  const setTheme = useCallback((nextTheme: AdminTheme) => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.setAttribute('data-admin-theme', nextTheme);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.setAttribute('data-admin-theme', 'vercel');
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }, []);

  const contextValue = useMemo<AdminThemeContextValue>(
    () => ({
      theme,
      setTheme,
      themeOptions: ADMIN_THEME_OPTIONS,
    }),
    [setTheme, theme],
  );

  return <AdminThemeContext.Provider value={contextValue}>{children}</AdminThemeContext.Provider>;
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);

  if (!context) {
    throw new Error('useAdminTheme must be used within AdminThemeProvider');
  }

  return context;
}
