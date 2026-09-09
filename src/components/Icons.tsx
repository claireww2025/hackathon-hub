interface P {
  size?: number;
  className?: string;
}
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const ChevronLeft = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const ChevronRight = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);
export const ArrowUpRight = ({ size = 13 }: P) => (
  <svg {...base(size)}>
    <path d="M7 17L17 7M17 7H8M17 7v9" />
  </svg>
);
export const Globe = ({ size = 13 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
  </svg>
);
export const Pin = ({ size = 13 }: P) => (
  <svg {...base(size)}>
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0116 0z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);
export const Users = ({ size = 13 }: P) => (
  <svg {...base(size)}>
    <path d="M16 20v-1.5a4 4 0 00-4-4H7a4 4 0 00-4 4V20" />
    <circle cx="9.5" cy="7" r="3.5" />
    <path d="M17 4.2a3.5 3.5 0 010 6.6M21 20v-1.5a4 4 0 00-3-3.8" />
  </svg>
);
