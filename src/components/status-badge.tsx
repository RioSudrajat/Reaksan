import { cn } from "cn";

// Shared by client and server components. Keep this module free of "use client"
// so server components can read toneClasses directly instead of a client
// reference, which is undefined during production rendering.
export const toneClasses = {
  yellow: {
    soft: "bg-[#FEF7E6] text-[#8D6500] border border-[#FDE68A]/80",
    dot: "bg-[#FDB913]",
    line: "bg-[#FDB913]",
  },
  blue: {
    soft: "bg-[#F1F5F9] text-[#1E3A5F] border border-[#CBD5E1]/80",
    dot: "bg-[#2563EB]",
    line: "bg-[#2563EB]",
  },
  green: {
    soft: "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]/80",
    dot: "bg-[#16A34A]",
    line: "bg-[#16A34A]",
  },
  cream: {
    soft: "bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]",
    dot: "bg-[#94A3B8]",
    line: "bg-[#94A3B8]",
  },
  rose: {
    soft: "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]/80",
    dot: "bg-[#DC2626]",
    line: "bg-[#DC2626]",
  },
  neutral: {
    soft: "bg-[#F8F9FA] text-[#475569] border border-[#E5E7EB]",
    dot: "bg-[#94A3B8]",
    line: "bg-[#94A3B8]",
  },
  amber: {
    soft: "bg-[#FEF7E6] text-[#8D6500] border border-[#FDE68A]/80",
    dot: "bg-[#D97706]",
    line: "bg-[#D97706]",
  },
  dark: {
    soft: "bg-[#212121] text-white border border-[#212121]",
    dot: "bg-white",
    line: "bg-white",
  },
  "yellow-light": {
    soft: "bg-[#FFF9E6] text-[#AE7C1D] border border-[#FDE68A]",
    dot: "bg-[#FCDD94]",
    line: "bg-[#FCDD94]",
  },
  muted: {
    soft: "bg-[#F5F5F5] text-[#6B6B6B] border border-[#E1E1E1]",
    dot: "bg-[#929292]",
    line: "bg-[#929292]",
  },
} as const;

export type BadgeTone = keyof typeof toneClasses;

export function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: BadgeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        toneClasses[tone].soft,
      )}
    >
      <span className={cn("size-1.5 rounded-full", toneClasses[tone].dot)} />
      {children}
    </span>
  );
}
