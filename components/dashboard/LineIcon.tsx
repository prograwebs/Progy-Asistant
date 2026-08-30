import {
  ArrowRight,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  CheckCircle2,
  Circle,
  ClipboardList,
  Filter,
  Home,
  MessageCircle,
  Mic2,
  Globe2,
  Phone,
  Play,
  RefreshCw,
  Search,
  Send,
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
  | "phone"
  | "globe"
  | "conversation"
  | "orders"
  | "usage"
  | "settings"
  | "check"
  | "pending"
  | "arrowRight"
  | "play"
  | "search"
  | "filter"
  | "refresh"
  | "send"
  | "back";

const icons: Record<DashboardIconName, LucideIcon> = {
  home: Home,
  business: Building2,
  assistant: Bot,
  catalog: ClipboardList,
  knowledge: BookOpen,
  voice: Mic2,
  test: Play,
  whatsapp: MessageCircle,
  phone: Phone,
  globe: Globe2,
  conversation: MessageCircle,
  orders: ShoppingBasket,
  usage: BarChart3,
  settings: Settings,
  check: CheckCircle2,
  pending: Circle,
  arrowRight: ArrowRight,
  play: Play,
  search: Search,
  filter: Filter,
  refresh: RefreshCw,
  send: Send,
  back: ArrowLeft,
};

export function DashboardIcon({ name, size = 19, className }: { name: DashboardIconName; size?: number; className?: string }) {
  const Icon = icons[name];
  return <Icon size={size} color="currentColor" strokeWidth={1.75} className={className} aria-hidden="true" focusable="false" />;
}
