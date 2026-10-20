"use client";

export type ApiFailure = {
  status: number;
  code: string;
  message: string;
  details?: { field: string; message: string }[];
};

export class StudentApiError extends Error {
  constructor(public failure: ApiFailure) {
    super(failure.message);
  }
}

async function parseError(response: Response): Promise<ApiFailure> {
  try {
    const body = (await response.json()) as {
      error?: {
        code?: string;
        message?: string;
        details?: { field: string; message: string }[];
      };
    };
    return {
      status: response.status,
      code: body.error?.code ?? "UNKNOWN",
      message: body.error?.message ?? "Terjadi masalah saat memproses permintaan.",
      details: body.error?.details,
    };
  } catch {
    return {
      status: response.status,
      code: "UNKNOWN",
      message: "Terjadi masalah saat memproses permintaan.",
    };
  }
}

export async function apiRequest<T>(
  url: string,
  options: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isIdempotent = method === "GET" || method === "HEAD";
  const maxAttempts = isIdempotent ? 3 : 1;
  const timeoutMs = options.timeoutMs ?? 15_000;

  let response: Response | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      response = await fetch(url, {
        method,
        headers:
          options.body === undefined
            ? undefined
            : { "Content-Type": "application/json" },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal:
          typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
            ? AbortSignal.timeout(timeoutMs)
            : undefined,
      });

      if (
        isIdempotent &&
        attempt < maxAttempts &&
        (response.status === 502 ||
          response.status === 503 ||
          response.status === 504)
      ) {
        const delayMs = 200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      break;
    } catch (err) {
      const isTimeout =
        err instanceof DOMException &&
        (err.name === "TimeoutError" || err.name === "AbortError");
      if (isIdempotent && attempt < maxAttempts) {
        const delayMs = 200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw new StudentApiError({
        status: 0,
        code: isTimeout ? "TIMEOUT_ERROR" : "NETWORK_ERROR",
        message: isTimeout
          ? "Waktu tunggu koneksi habis. Silakan coba lagi."
          : "Tidak bisa terhubung ke Reaksan. Coba lagi.",
      });
    }
  }

  if (!response) {
    throw new StudentApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Tidak bisa terhubung ke Reaksan. Coba lagi.",
    });
  }
  if (!response.ok) throw new StudentApiError(await parseError(response));
  if (response.status === 204) return undefined as T;
  const body = (await response.json()) as { data?: T };
  return (body.data ?? (body as T)) as T;
}

export function errorMessage(error: unknown) {
  if (error instanceof StudentApiError) return error.message;
  return "Terjadi masalah saat memproses permintaan.";
}
