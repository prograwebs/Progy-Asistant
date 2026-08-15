import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  CheckCircle2,
  Circle,
  ClipboardList,
  Home,
  MessageCircle,
  Mic2,
  Play,
  Settings,
  ShoppingBasket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type DashboardIconName =
  | "home"
  | "business"
  | "assistant"
  | "catalog"
  | "knowledge"
  | "voice"
  | "test"
  | "whatsapp"
  | "conversation"
  | "orders"
  | "usage"
  | "settings"
  | "check"
  | "pending"
  | "arrowRight"
  | "play";

const icons: Record<DashboardIconName, LucideIcon> = {
  home: Home,
  business: Building2,
  assistant: Bot,
  catalog: ClipboardList,
  knowledge: BookOpen,
  voice: Mic2,
  test: Play,
  whatsapp: MessageCircle,
  conversation: MessageCircle,
  orders: ShoppingBasket,
  usage: BarChart3,
  settings: Settings,
  check: CheckCircle2,
  pending: Circle,
  arrowRight: ArrowRight,
  play: Play,
};

export function DashboardIcon({ name, size = 19, className }: { name: DashboardIconName; size?: number; className?: string }) {
  const Icon = icons[name];
  return <Icon size={size} color="currentColor" strokeWidth={1.75} className={className} aria-hidden="true" focusable="false" />;
}
