import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError } from "@/lib/server/errors";
import { apiRoute, parseJson, parseQuery, zodToAppError } from "@/lib/server/http/handler";
import { createIndentSchema } from "@/lib/shared/schemas";
import type { ErrorEnvelope } from "@/lib/shared/messages";

const jsonReq = (body: unknown, url = "http://localhost/api/x") =>
  new Request(url, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

async function envelope(res: Response): Promise<ErrorEnvelope["error"]> {
  return ((await res.json()) as ErrorEnvelope).error;
}

afterEach(() => vi.restoreAllMocks());

/** Awaits a promise that must reject with an AppError and returns that error. */
async function failure(p: Promise<unknown>): Promise<AppError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    return e as AppError;
  }
  throw new Error("Expected the promise to reject.");
}

describe("apiRoute error envelope", () => {
  it("passes successful responses through", async () => {
    const route = apiRoute(async () => Response.json({ ok: true }));
    const res = await route(new Request("http://localhost/x"), undefined);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("maps AppError to its status, code, message and a request id", async () => {
    const route = apiRoute(async () => {
      throw new AppError("FORBIDDEN");
    });
    const res = await route(new Request("http://localhost/x"), undefined);
    expect(res.status).toBe(403);
    const err = await envelope(res);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toBe("You do not have permission to do this.");
    expect(err.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("never exposes the text of an unexpected error (FR-22)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = apiRoute(async () => {
      throw new Error("ER_ACCESS_DENIED: select * from indent_master where password='secret'");
    });
    const res = await route(new Request("http://localhost/x"), undefined);
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("ER_ACCESS_DENIED");
    expect(text).not.toContain("indent_master");
    expect(text).not.toContain("secret");
    const err = JSON.parse(text).error;
    expect(err.code).toBe("INTERNAL");
    expect(err.message).toContain(err.requestId);
    // The detail is logged server-side with the same request id.
    expect(spy).toHaveBeenCalledOnce();
    expect(String(spy.mock.calls[0][0])).toContain(err.requestId);
    expect(String(spy.mock.calls[0][0])).toContain("ER_ACCESS_DENIED");
  });

  it("does not echo non-Error throwables either", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const route = apiRoute(async () => {
      throw "boom: connection string mysql://root:pw@host";
    });
    const res = await route(new Request("http://localhost/x"), undefined);
    expect(JSON.stringify(await res.json())).not.toContain("mysql://");
  });
});

describe("parseJson", () => {
  it("returns validated data", async () => {
    const data = await parseJson(jsonReq({ indentTypeId: 1, departmentId: 2, items: [{ itemId: 3, requiredQuantity: "1", requiredUnitId: 1, requiredDate: "2026-11-01" }] }), createIndentSchema);
    expect(data.items).toHaveLength(1);
  });

  it("reports invalid JSON as VALIDATION_FAILED", async () => {
    await expect(parseJson(jsonReq("{not json"), createIndentSchema)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it("maps field errors by path", async () => {
    const err = await failure(
      parseJson(
        jsonReq({ indentTypeId: 1, departmentId: 2, items: [{ itemId: 3, requiredQuantity: "0", requiredUnitId: 1, requiredDate: "2026-11-01" }] }),
        createIndentSchema
      )
    );
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.fieldErrors).toHaveProperty(["items.0.requiredQuantity"]);
  });

  it("reports forbidden fields by name", async () => {
    const err = await failure(
      parseJson(
        jsonReq({ indentTypeId: 1, departmentId: 2, status: "SUBMITTED", createdBy: "me", items: [{ itemId: 3, requiredQuantity: "1", requiredUnitId: 1, requiredDate: "2026-11-01" }] }),
        createIndentSchema
      )
    );
    expect(err.fieldErrors).toMatchObject({ status: expect.any(String), createdBy: expect.any(String) });
  });

  it("uses INDENT_EMPTY when there are no lines (BR-01)", async () => {
    const err = await failure(parseJson(jsonReq({ indentTypeId: 1, departmentId: 2, items: [] }), createIndentSchema));
    expect(err.code).toBe("INDENT_EMPTY");
    expect(err.status).toBe(400);
  });

  it("keeps VALIDATION_FAILED when the empty list is only one of several problems", () => {
    const parsed = createIndentSchema.safeParse({ indentTypeId: "x", departmentId: 2, items: [] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(zodToAppError(parsed.error).code).toBe("VALIDATION_FAILED");
  });
});

describe("parseQuery", () => {
  const schema = z.object({ page: z.coerce.number().int().min(1) });
  it("reads the URL query string", () => {
    expect(parseQuery(new Request("http://localhost/x?page=2"), schema)).toEqual({ page: 2 });
  });
  it("rejects invalid values with VALIDATION_FAILED", () => {
    expect(() => parseQuery(new Request("http://localhost/x?page=0"), schema)).toThrowError(AppError);
  });
});

describe("AppError", () => {
  it("defaults to the catalogue message and maps status from the code", () => {
    const e = new AppError("VERSION_CONFLICT");
    expect(e.status).toBe(409);
    expect(e.message).toContain("changed by someone else");
  });
});
