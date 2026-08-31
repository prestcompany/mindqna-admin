/** @type {import('tailwindcss').Config} */

/**
 * Geist(Vercel) 중립 회색 램프.
 *
 * Tailwind 기본 `slate`/`gray`는 파란 기가 도는 회색이라 Geist의 무채색 캔버스와
 * 섞이면 톤이 어긋납니다. 코드베이스 전역(`border-slate-200`, `text-gray-600` 등)을
 * 일괄 수정하는 대신 팔레트 자체를 순수 무채색(채도 0)으로 재정의합니다.
 *
 * 대비 기준(#fafafa 캔버스 위):
 *   500 #737373 = 4.54:1 → 본문 텍스트 최저선
 *   400 #a1a1a1 = 2.9:1  → 텍스트 금지, 아이콘/데코 전용
 * DESIGN.md §2.3의 텍스트 대비 규칙과 일치합니다.
 *
 * 장기 방향은 semantic 토큰(`border-border`, `text-muted-foreground`)으로의
 * 이전이며, 이 램프는 그 전환기의 안전망입니다.
 */
const neutralRamp = {
  50: '#fafafa',
  100: '#f2f2f2',
  200: '#ebebeb',
  300: '#e0e0e0',
  400: '#a1a1a1',
  500: '#737373',
  600: '#4d4d4d',
  700: '#3d3d3d',
  800: '#2b2b2b',
  900: '#171717',
  950: '#0a0a0a',
};

module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    fontFamily: {
      // Geist Sans에는 한글 글리프가 없어 Pretendard를 유지합니다(DESIGN.md §3).
      sans: [
        'var(--font-pretendard)',
        'Helvetica Neue',
        'Apple SD Gothic Neo',
        'Malgun Gothic',
        '맑은고딕',
        'Dotum',
        '돋움',
        'Gulim',
        '굴림',
        'Helvetica',
        'Arial',
        'Hiragino Sans',
        'Yu Gothic',
        'sans-serif',
        'Apple Color Emoji',
        'Segoe UI Emoji',
      ],
      mono: [
        'var(--font-jbmono)',
        'ui-monospace',
        'Consolas',
        'SFMono-Regular',
        'Liberation Mono',
        'Menlo',
        'Monaco',
        'Courier',
        'Apple SD Gothic Neo',
        'Nanum Gothic',
        '나눔고딕',
        'Malgun Gothic',
        '맑은고딕',
        'monospace',
      ],
    },
    extend: {
      /**
       * DESIGN.md §Hierarchy의 5단 스케일(12 / 14 / 15 / 16 / 24+)을 px로 고정합니다.
       *
       * globals.css가 루트를 15px로 잡는 것은 의도된 것(body = 루트 크기)이지만,
       * Tailwind 기본 fontSize는 16px 기준 rem이라 유틸리티 이름과 디자인 토큰이
       * 어긋납니다. text-xs는 11.25px로 DESIGN.md가 정한 12px 바닥을 밑돌았고,
       * text-sm은 13.13px로 label/body-sm의 14px에 미달했습니다.
       *
       * letterSpacing은 이미 tracking-display/heading/label 토큰이 담당합니다 —
       * 같은 14px에 label(-0.28px)과 body-sm(0)이 공존하므로 크기에 묶을 수 없습니다.
       */
      /**
       * DESIGN.md §Spacing System: base unit 4px, scale 4 -> 8 -> 12 -> 16 -> 24 ->
       * 32 -> 40 -> 64 -> 96 -> 128px. Tailwind's default spacing is rem, so against
       * the intentional 15px root every box rendered at 93.75% — p-4 was 15px, not 16.
       * Pinned to px so the 4px grid is literally a 4px grid.
       */
      spacing: {
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        3.5: '14px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        9: '36px',
        10: '40px',
        11: '44px',
        12: '48px',
        14: '56px',
        16: '64px',
        20: '80px',
        24: '96px',
        28: '112px',
        32: '128px',
        40: '160px',
        56: '224px',
        72: '288px',
        80: '320px',
      },

      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['15px', '22px'],
        lg: ['16px', '24px'],
        '2xl': ['24px', '30px'],
      },

      colors: {
        // --- Geist 중립 램프 (Tailwind 기본 팔레트 대체) ---
        slate: neutralRamp,
        gray: neutralRamp,

        // --- Surface ---
        background: 'hsl(var(--background))',
        canvas: 'hsl(var(--canvas))',
        elevated: 'hsl(var(--canvas-elevated))',
        'hairline-soft': 'hsl(var(--hairline-soft))',

        // --- Ink ladder ---
        foreground: 'hsl(var(--foreground))',
        ink: 'hsl(var(--ink))',
        body: 'hsl(var(--body))',
        mute: 'hsl(var(--mute))',
        faint: 'hsl(var(--faint))',

        // --- Border ---
        border: 'hsl(var(--border))',
        hairline: 'hsl(var(--hairline))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // --- Accent ---
        link: {
          DEFAULT: 'hsl(var(--link))',
          deep: 'hsl(var(--link-deep))',
          soft: 'hsl(var(--link-soft))',
        },
        violet: 'hsl(var(--violet))',
        cyan: 'hsl(var(--cyan))',
        pink: 'hsl(var(--pink))',
        magenta: 'hsl(var(--magenta))',

        // --- shadcn chrome ---
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },

        // --- Semantic ---
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          deep: 'hsl(var(--destructive-deep))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },

        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },

      /**
       * Geist 반경 스케일: 6(컨트롤) / 12(카드) / 16(패널) / 100(알약).
       * shadcn 컴포넌트의 관용(`rounded-md` = 버튼·입력, `rounded-lg` = 카드)에
       * 맞춰 매핑했으므로 기존 코드 수정 없이 값이 정렬됩니다.
       * `rounded-xl`은 카드 값으로 흡수한 레거시 별칭 — 신규 사용 금지.
       */
      borderRadius: {
        none: '0px',
        sm: 'var(--radius-micro)', // 4px
        DEFAULT: 'var(--radius-control)', // 6px
        md: 'var(--radius-control)', // 6px — 버튼·입력·뱃지·셀렉트
        lg: 'var(--radius-card)', // 12px — 카드·테이블·코드블록
        xl: 'var(--radius-card)', // 12px — 레거시 별칭(신규 금지)
        '2xl': 'var(--radius-panel)', // 16px — 큰 패널
        '3xl': 'var(--radius-panel)', // 16px
        pill: 'var(--radius-pill)', // 100px — 필터 칩·카테고리 탭
        full: '9999px',
      },

      /**
       * 깊이는 2단뿐입니다. 정적 표면은 `shadow-none` + 헤어라인이 기본.
       * 기존 `shadow-sm`(83곳)은 whisper로, `shadow-md/lg/xl/2xl`(18곳)은
       * floating 한 단계로 흡수해 5단 스케일을 접었습니다.
       */
      boxShadow: {
        none: 'none',
        whisper: 'var(--shadow-whisper)',
        floating: 'var(--shadow-floating)',
        sm: 'var(--shadow-whisper)',
        DEFAULT: 'var(--shadow-whisper)',
        md: 'var(--shadow-floating)',
        lg: 'var(--shadow-floating)',
        xl: 'var(--shadow-floating)',
        '2xl': 'var(--shadow-floating)',
      },

      // Geist 디스플레이 타입의 음수 자간 (DESIGN.md §3)
      letterSpacing: {
        display: '-1.28px',
        heading: '-0.4px',
        label: '-0.28px',
      },

      transitionDuration: {
        fast: '120ms',
        base: '160ms',
        slow: '200ms',
        exit: '140ms', // 시트/모달 퇴장 — enter(slow)보다 짧게
      },
    },
  },
  // Container queries let form rows respond to the panel they sit in rather than the
  // viewport — a 600px side sheet on a 1440px screen is still a narrow column.
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/container-queries')],
  corePlugins: {
    preflight: true,
  },
};
