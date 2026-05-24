import Link from "next/link";
import { Activity, Apple, Heart, MessageCircle, Settings } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Today", icon: Activity },
  { href: "/workouts", label: "Workouts", icon: Heart },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-24">{children}</main>

      {/* Bottom tab bar (mobile-first) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-around px-4 pt-2 pb-[env(safe-area-inset-bottom,8px)]">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 text-text-tertiary transition-colors hover:text-text-primary"
            >
              <Icon className="size-5" strokeWidth={2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
