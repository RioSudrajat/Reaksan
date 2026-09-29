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
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers:
        options.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
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
