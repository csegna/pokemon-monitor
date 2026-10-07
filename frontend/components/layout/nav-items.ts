import { AlertsIcon, CheckoutIcon, DashboardIcon, HistoryIcon } from "./icons";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/alerts", label: "Alerts", Icon: AlertsIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/checkout", label: "Auto-Checkout", Icon: CheckoutIcon },
] as const;
