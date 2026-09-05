import {
  ArrowRight,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarDays,
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
  Sparkles,
  ShoppingBasket,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardIconName } from "./types/icons";

const icons: Record<DashboardIconName, LucideIcon> = {
  home: Home,
  business: Building2,
  catalog: ClipboardList,
  knowledge: BookOpen,
  voice: Mic2,
  test: Play,
  whatsapp: MessageCircle,
  phone: Phone,
  globe: Globe2,
  conversation: MessageCircle,
  contacts: Users,
  opportunities: Target,
  calendar: CalendarDays,
  results: BarChart3,
  orders: ShoppingBasket,
  usage: BarChart3,
  settings: Settings,
  assistant: Sparkles,
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
