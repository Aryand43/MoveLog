import {
  Mic, Camera, Undo2, Flag, LayoutDashboard, Boxes, AlertTriangle, ScrollText, Settings,
  Wifi, WifiOff, CheckCircle2, Clock, Bot, User, Send, Search, Download, Share2, ChevronRight,
} from "lucide-react";

export const Icons = {
  mic: Mic, camera: Camera, undo: Undo2, flag: Flag,
  dashboard: LayoutDashboard, boxes: Boxes, alert: AlertTriangle, log: ScrollText, settings: Settings,
  online: Wifi, offline: WifiOff, check: CheckCircle2, clock: Clock,
  bot: Bot, user: User, send: Send, search: Search, download: Download, share: Share2, chevron: ChevronRight,
};

/** Maps an audit event kind to its icon and colour. */
export function kindStyle(kind: string) {
  switch (kind) {
    case "voice": return { Icon: Mic, ring: "bg-sky-50 text-sky-700 border-sky-200" };
    case "log": return { Icon: Boxes, ring: "bg-slate-100 text-slate-700 border-slate-200" };
    case "photo": return { Icon: Camera, ring: "bg-violet-50 text-violet-700 border-violet-200" };
    case "ai": return { Icon: Bot, ring: "bg-amber-50 text-amber-800 border-amber-200" };
    case "human": return { Icon: User, ring: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "ops": return { Icon: Send, ring: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    default: return { Icon: Clock, ring: "bg-slate-100 text-slate-700 border-slate-200" };
  }
}
