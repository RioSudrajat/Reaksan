import { cn } from "cn";

// Shared by client and server components. Keep this module free of "use client"
// so server components can read toneClasses directly instead of a client
// reference, which is undefined during production rendering.
export const toneClasses = {
  yellow: {
    soft: "bg-[#FEF1CC] text-[#705012]",
    dot: "bg-[#F9B129]",
    line: "bg-[#F9B129]",
  },
  blue: {
    soft: "bg-[#E9EEFC] text-[#38529B]",
    dot: "bg-[#6E8EDA]",
    line: "bg-[#6E8EDA]",
  },
  green: {
    soft: "bg-[#E5F5ED] text-[#03683A]",
    dot: "bg-[#048444]",
    line: "bg-[#048444]",
  },
  cream: {
    soft: "bg-[#F1F0EC] text-[#5D5B53]",
    dot: "bg-[#929292]",
    line: "bg-[#929292]",
  },
  rose: {
    soft: "bg-[#FDE9E9] text-[#9E3636]",
    dot: "bg-[#F45959]",
    line: "bg-[#F45959]",
  },
} as const;

export function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: keyof typeof toneClasses;
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
