import { cn } from "@/lib/utils";

type Props = {
  role: "user" | "assistant";
  children: React.ReactNode;
};

export function ChatBubble({ role, children }: Props) {
  return (
    <div
      className={cn(
        "max-w-[85%] text-sm leading-relaxed",
        role === "user" ? "self-end text-text-primary" : "self-start text-text-primary"
      )}
    >
      {role === "assistant" && (
        <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-text-tertiary">
          <span className="size-1.5 rounded-full bg-workout" />
          Pulse
        </div>
      )}
      <div className="whitespace-pre-wrap">{children}</div>
    </div>
  );
}
