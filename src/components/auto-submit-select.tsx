"use client";

import type { ComponentProps } from "react";

export function AutoSubmitSelect({
  className,
  children,
  onChange,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      className={className}
      onChange={(e) => {
        onChange?.(e);
        e.currentTarget.form?.requestSubmit();
      }}
      {...props}
    >
      {children}
    </select>
  );
}
