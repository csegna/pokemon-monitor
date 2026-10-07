// Small line-icon set ported from the CorSe mockup, as plain SVG so no
// icon package dependency is needed for four icons.

type IconProps = { className?: string };

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="6" height="6" rx="1.4" />
      <rect x="11" y="3" width="6" height="6" rx="1.4" />
      <rect x="3" y="11" width="6" height="6" rx="1.4" />
      <rect x="11" y="11" width="6" height="6" rx="1.4" />
    </svg>
  );
}

export function AlertsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 8a5 5 0 0 1 10 0c0 4 1.5 5 1.5 5h-13S5 12 5 8Z" />
      <path d="M8 16a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 10a7 7 0 1 0 2-4.9" />
      <path d="M3 3v4h4" />
      <path d="M10 6.5V10l2.6 2.6" />
    </svg>
  );
}

export function CheckoutIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 5h12l-1.2 8.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 5Z" />
      <path d="M7 5 8 2h4l1 3" />
      <circle cx="8" cy="17" r="1" />
      <circle cx="13" cy="17" r="1" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M17 11.5A7 7 0 0 1 8.5 3 7 7 0 1 0 17 11.5Z" />
    </svg>
  );
}
