"use client";

import { useId } from "react";
import { cn } from "cn";
import { displayFont } from "@/lib/fonts";

const FLASK_LIP = { x: 10.2, y: 3, width: 11.6, height: 3.4, rx: 1.4 };
const FLASK_BODY =
  "M11.6 4.4 h8.8 v5.2 c0 1 .3 2 .9 2.9 l1 1.4 c1.7 2.4 2.7 5.3 2.7 8.3 a9.4 9.4 0 1 1 -18.8 0 c0 -3 1 -5.9 2.7 -8.3 l1 -1.4 c.6 -.9 .9 -1.9 .9 -2.9 z";
const R_STEM = "M12.4 10.4 V24.6";
const R_ARM = "M12.6 11.2 H16.2";
const R_RETURN = "M17.3 19.7 H12.6";
const R_LEG = "M16.4 20 L22.6 24.8";

export type LogoDirection = "brand" | "inverse" | "mono";

function FlaskShapes() {
  return (
    <>
      <rect
        x={FLASK_LIP.x}
        y={FLASK_LIP.y}
        width={FLASK_LIP.width}
        height={FLASK_LIP.height}
        rx={FLASK_LIP.rx}
      />
      <path d={FLASK_BODY} />
    </>
  );
}

function RStrokes({ color }: { color: string }) {
  return (
    <g
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={R_STEM} />
      <path d={R_ARM} />
      <circle cx={17.3} cy={15.6} r={4.1} />
      <path d={R_RETURN} />
      <path d={R_LEG} />
    </g>
  );
}

function SymbolShapes({
  direction,
  maskId,
}: {
  direction: LogoDirection;
  maskId: string;
}) {
  const flaskColor =
    direction === "inverse"
      ? "#FFFFFF"
      : direction === "mono"
        ? "currentColor"
        : "#F9B129";

  if (direction === "brand") {
    return (
      <>
        <g fill={flaskColor}>
          <FlaskShapes />
        </g>
        <RStrokes color="#212121" />
      </>
    );
  }

  return (
    <>
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="32"
        height="32"
      >
        <g fill="#FFFFFF">
          <FlaskShapes />
        </g>
        <g
          fill="none"
          stroke="#000000"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={R_STEM} />
          <path d={R_ARM} />
          <circle cx={17.3} cy={15.6} r={4.1} />
          <path d={R_RETURN} />
          <path d={R_LEG} />
        </g>
      </mask>
      <g fill={flaskColor} mask={`url(#${maskId})`}>
        <FlaskShapes />
      </g>
    </>
  );
}

function useMaskId() {
  return `reaksan-flask-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

export function ReaksanSymbol({
  className,
  direction = "brand",
  title,
}: {
  className?: string;
  direction?: LogoDirection;
  title?: string;
}) {
  const maskId = useMaskId();
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <SymbolShapes direction={direction} maskId={maskId} />
    </svg>
  );
}

export function ReaksanLogo({
  className,
  direction = "brand",
  label = "Reaksan Unpad",
}: {
  className?: string;
  direction?: LogoDirection;
  label?: string;
}) {
  const secondLine =
    direction === "inverse"
      ? "text-[#FEF1CC]"
      : direction === "mono"
        ? "text-current"
        : "text-[#212121]";

  return (
    <span
      role="img"
      aria-label={label}
      style={{ lineHeight: 0.92 }}
      className={cn(
        "inline-flex select-none flex-col items-start uppercase",
        displayFont.className,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "tracking-[-0.01em]",
          direction === "mono" ? "text-current" : "text-[#F9B129]",
        )}
      >
        Reaksan
      </span>
      <span
        aria-hidden="true"
        className={cn("-mr-[0.04em] ml-[1.72em] tracking-[0.04em]", secondLine)}
      >
        Unpad
      </span>
    </span>
  );
}
