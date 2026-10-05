"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiRequest,
  errorMessage,
  StudentApiError,
} from "@/components/student-api";
import { controlClass } from "@/components/workspace";

export type CrudField = {
  name: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "select"
    | "checkbox"
    | "textarea"
    | "date"
    | "datetime-local"
    | "hidden"
    | "external";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  step?: string;
  help?: string;
};

function setPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) {
    target[head] = value;
    return;
  }
  const next = (target[head] as Record<string, unknown>) ?? {};
  target[head] = next;
  setPath(next, rest.join("."), value);
}

function readValue(field: CrudField, form: HTMLFormElement) {
  const item = form.elements.namedItem(field.name);
  if (!item) return undefined;
  let element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null =
    null;
  if (typeof RadioNodeList !== "undefined" && item instanceof RadioNodeList) {
    const list = Array.from(item) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
    element =
      list.find((el) => Boolean(el.value?.trim())) ?? list[0] ?? null;
  } else {
    element = item as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  }
  if (!element) return undefined;
  if (field.type === "checkbox") {
    return (element as HTMLInputElement).checked;
  }
  const value = (element.value ?? "").trim();
  if (field.type === "hidden") return value === "" ? null : value;
  if (field.type === "external") return value === "" ? undefined : value;
  if (field.type === "number") return value === "" ? undefined : Number(value);
  if (field.type === "date")
    return value === ""
      ? undefined
      : new Date(`${value}T00:00:00+07:00`).toISOString();
  if (field.type === "datetime-local")
    return value === ""
      ? undefined
      : new Date(`${value}:00+07:00`).toISOString();
  if (field.type === "select") return value === "" ? undefined : value;
  return element.value;
}

export { toDateInput, toJakartaInput } from "@/lib/date-input";

export function CrudForm({
  endpoint,
  method = "POST",
  fields,
  submitLabel,
  successMessage,
  resetOnSuccess = true,
  columns = 2,
  children,
}: {
  endpoint: string;
  method?: "POST" | "PATCH";
  fields: CrudField[];
  submitLabel: string;
  successMessage: string;
  resetOnSuccess?: boolean;
  columns?: 1 | 2 | 3;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<{ field: string; message: string }[]>(
    [],
  );
  const [success, setSuccess] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const value = readValue(field, form);
      if (value === undefined) continue;
      setPath(body, field.name, value);
    }
    setPending(true);
    setError("");
    setDetails([]);
    setSuccess("");
    try {
      await apiRequest(endpoint, { method, body });
      setSuccess(successMessage);
      if (resetOnSuccess) form.reset();
      router.refresh();
    } catch (caught) {
      if (caught instanceof StudentApiError) {
        setError(caught.failure.message);
        setDetails(caught.failure.details ?? []);
      } else {
        setError(errorMessage(caught));
      }
    } finally {
      setPending(false);
    }
  }

  const gridClass =
    columns === 1
      ? "grid gap-3"
      : columns === 3
        ? "grid gap-3 sm:grid-cols-3"
        : "grid gap-3 sm:grid-cols-2";

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-3">
      <div className={gridClass}>
        {fields.map((field) =>
          field.type === "hidden" || field.type === "external" ? null : (
            <label
              key={field.name}
              className={
                "flex flex-col gap-1.5 " +
                (field.type === "textarea" || field.type === "checkbox"
                  ? "sm:col-span-2"
                  : "")
              }
            >
              {field.type === "checkbox" ? (
                <span className="flex min-h-11 items-center gap-2.5 text-[12px] font-medium text-[#212121]">
                  <input
                    type="checkbox"
                    name={field.name}
                    defaultChecked={Boolean(field.defaultValue)}
                    className="size-4 rounded border-[#B7B7B7]"
                  />
                  {field.label}
                </span>
              ) : (
                <>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  {field.type === "select" ? (
                    <select
                      name={field.name}
                      required={field.required}
                      defaultValue={
                        field.defaultValue === undefined
                          ? ""
                          : String(field.defaultValue)
                      }
                      className={controlClass}
                    >
                      <option value="">Pilih...</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      name={field.name}
                      required={field.required}
                      rows={3}
                      defaultValue={String(field.defaultValue ?? "")}
                      placeholder={field.placeholder}
                      className={controlClass}
                    />
                  ) : (
                    <input
                      type={field.type ?? "text"}
                      name={field.name}
                      required={field.required}
                      step={field.step}
                      defaultValue={String(field.defaultValue ?? "")}
                      placeholder={field.placeholder}
                      className={controlClass}
                    />
                  )}
                  {field.help && (
                    <span className="text-[11px] text-[#929292]">
                      {field.help}
                    </span>
                  )}
                </>
              )}
            </label>
          ),
        )}
      </div>

      {children}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[#F3C7C7] bg-[#FDE9E9] px-4 py-3 text-[12px] font-medium text-[#9E3636]"
        >
          <p>{error}</p>
          {details.length > 0 && (
            <ul className="mt-1 list-inside list-disc">
              {details.map((detail) => (
                <li key={`${detail.field}-${detail.message}`}>
                  {detail.field}: {detail.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-[#BFE3CE] bg-[#E5F5ED] px-4 py-3 text-[12px] font-medium text-[#03683A]"
        >
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-xl bg-[#F9B129] px-4 text-[12px] font-bold text-[#212121] transition hover:bg-[#F7B742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA] disabled:opacity-60"
      >
        {pending ? "Memproses..." : submitLabel}
      </button>
    </form>
  );
}

export function EditDisclosure({
  label = "Edit",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-xl px-3 text-[12px] font-bold text-[#38529B] hover:bg-[#E9EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E8EDA]">
        {label}
      </summary>
      <div className="mt-2 rounded-xl border border-[#E1E1E1] bg-[#FAFAFA] p-3">
        {children}
      </div>
    </details>
  );
}
