export type DomainAccent = "workout" | "nutrition" | "recovery" | "sleep" | "energy";

export const ACCENT_HEX: Record<DomainAccent, string> = {
  workout: "#e85d4a",
  nutrition: "#6b8e5a",
  recovery: "#6b86c7",
  sleep: "#8b6fa8",
  energy: "#d9a45b",
};

export const ACCENT_BG_CLASS: Record<DomainAccent, string> = {
  workout: "bg-workout",
  nutrition: "bg-nutrition",
  recovery: "bg-recovery",
  sleep: "bg-sleep",
  energy: "bg-energy",
};
