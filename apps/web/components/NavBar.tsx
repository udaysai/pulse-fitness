"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, Dumbbell, MessageCircle, Settings } from "lucide-react";
import { ACCENT_HEX, type DomainAccent } from "@/lib/design/accents";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: typeof Activity; accent: DomainAccent }[] = [
  { href: "/dashboard", label: "Today", icon: Activity, accent: "workout" },
  { href: "/plan", label: "Plan", icon: CalendarDays, accent: "recovery" },
  { href: "/workouts", label: "Workouts", icon: Dumbbell, accent: "workout" },
  { href: "/chat", label: "Chat", icon: MessageCircle, accent: "sleep" },
  { href: "/settings", label: "Settings", icon: Settings, accent: "energy" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-canvas/70 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-md items-center justify-around px-3 pt-2 pb-[max(env(safe-area-inset-bottom),10px)]">
        {NAV.map(({ href, label, icon: Icon, accent }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const accentHex = ACCENT_HEX[accent];
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="group relative flex flex-1 flex-col items-center gap-1 py-1.5"
            >
              <span
                className={cn(
                  "grid h-8 w-12 place-items-center rounded-full transition-all duration-300",
                  active ? "scale-100" : "scale-95",
                )}
                style={active ? { backgroundColor: `${accentHex}1f` } : undefined}
              >
                <Icon
                  className="size-5 transition-colors duration-300"
                  strokeWidth={active ? 2.5 : 2}
                  style={{ color: active ? accentHex : "var(--color-text-tertiary)" }}
                />
              </span>
              <span
                className="text-[10px] font-medium transition-colors duration-300"
                style={{ color: active ? accentHex : "var(--color-text-tertiary)" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
