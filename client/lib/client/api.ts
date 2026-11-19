// Browser-side API helper (DEC-015, FR-22). Every request goes through apiFetch,
// so failures are always checked, parsed from the error envelope and thrown as
// one ApiError that the ErrorDialog can show. Raw technical text never reaches users.

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;
  readonly requestId?: string;

  constructor(code: string, message: string, status = 0, fieldErrors?: Record<string, string>, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
  }
}

const NETWORK_MESSAGE = "We could not reach the server. Check your connection and try again.";
const GENERIC_MESSAGE = "Something went wrong. Please try again.";

/** Turns any thrown value into an ApiError. Aborted requests are returned as code "ABORTED". */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof DOMException && err.name === "AbortError") return new ApiError("ABORTED", "Request cancelled.");
  return new ApiError("INTERNAL", GENERIC_MESSAGE);
}

export const isAborted = (err: unknown): boolean => toApiError(err).code === "ABORTED";

async function errorFrom(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    const e = body?.error;
    if (e && typeof e.code === "string" && typeof e.message === "string") {
      return new ApiError(e.code, e.message, res.status, e.fieldErrors, e.requestId);
    }
  } catch {
    // not JSON: fall through to the generic message
  }
  return new ApiError("INTERNAL", GENERIC_MESSAGE, res.status);
}

type Init = Omit<RequestInit, "body"> & { json?: unknown };

async function send(url: string, { json, headers, ...init }: Init): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("NETWORK", NETWORK_MESSAGE);
  }
  if (!res.ok) throw await errorFrom(res);
  return res;
}

/** JSON request. Resolves with the parsed body (undefined for 204). Throws ApiError. */
export async function apiFetch<T = unknown>(url: string, init: Init = {}): Promise<T> {
  try {
    const res = await send(url, init);
    return (res.status === 204 ? undefined : await res.json()) as T;
  } catch (err) {
    throw toApiError(err);
  }
}

/** File request (export). Resolves with the blob and the file name from Content-Disposition. */
export async function apiDownload(url: string, init: Init = {}): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await send(url, init);
    const match = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "");
    return { blob: await res.blob(), filename: match?.[1] ?? "indents.xlsx" };
  } catch (err) {
    const e = toApiError(err);
    // A stream that dies midway looks like a network failure; say what actually failed.
    throw e.code === "NETWORK" ? new ApiError("EXPORT_FAILED", "The export could not be completed. Please try again.") : e;
  }
}

/** Saves a blob through a temporary link (works without a popup). */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
