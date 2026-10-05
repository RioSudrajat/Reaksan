import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import {
  expect,
  test,
  type APIRequestContext,
} from "@playwright/test";

const origin = "http://localhost:3101";
const headers = { Origin: origin };
const password = "Plp-test-password-123!";

async function signUp(client: APIRequestContext, name: string) {
  const data = {
    name,
    email: `plp-${randomUUID()}@example.com`,
    password,
  };
  let response = await client.post("/api/auth/sign-up/email", {
    headers,
    data,
  });
  if (response.status() === 429) {
    const seconds = Number(response.headers()["retry-after"] || 10);
    expect(Number.isFinite(seconds) && seconds >= 0 && seconds <= 10).toBe(true);
    await delay((seconds + 0.1) * 1000);
    response = await client.post("/api/auth/sign-up/email", { headers, data });
  }
  expect(response.status()).toBe(200);
  return data.email;
}

async function signIn(client: APIRequestContext, email: string) {
  const data = { email, password };
  let response = await client.post("/api/auth/sign-in/email", {
    headers,
    data,
  });
  if (response.status() === 429) {
    const seconds = Number(response.headers()["retry-after"] || 10);
    await delay((seconds + 0.1) * 1000);
    response = await client.post("/api/auth/sign-in/email", { headers, data });
  }
  expect(response.status()).toBe(200);
}

async function setRole(email: string, role: string | null) {
  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
    max: 1,
  });
  try {
    const { rowCount } = await pool.query(
      'UPDATE "user" SET role = $1 WHERE email = $2',
      [role, email],
    );
    expect(rowCount).toBe(1);
  } finally {
    await pool.end();
  }
}

const ALL_LABS = [
  "lab-organik",
  "lab-anorganik",
  "lab-biokimia",
  "lab-analitik",
  "lab-fisik",
];

// PLP access is scoped per lab, so the test account needs assignments.
async function assignRooms(email: string, roomCodes: string[]) {
  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
    max: 1,
  });
  try {
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM "user" WHERE email = $1',
      [email],
    );
    expect(rows[0]?.id).toBeTruthy();
    for (const roomCode of roomCodes) {
      await pool.query(
        "INSERT INTO assignment (user_id, scope_type, scope_id, assignment_type, notes, active) VALUES ($1, 'ROOM', $2, 'PLP', 'e2e scope', true)",
        [rows[0].id, roomCode],
      );
    }
  } finally {
    await pool.end();
  }
}

// Accounts are created once per run and reused, so the auth rate limiter is
// not hit by a sign-up for every test.
type AccountKind = "student" | "plp" | "admin" | "target";
const accounts: Partial<Record<AccountKind, string>> = {};

async function ensureAccount(client: APIRequestContext, kind: AccountKind) {
  const existing = accounts[kind];
  if (existing) return existing;
  const email = await signUp(client, `Shared ${kind}`);
  if (kind === "plp" || kind === "admin") await setRole(email, kind);
  if (kind === "plp") await assignRooms(email, ALL_LABS);
  accounts[kind] = email;
  return email;
}

type RequestFactory = {
  newContext: (options: { baseURL: string }) => Promise<APIRequestContext>;
};

async function sessionFor(factory: RequestFactory, kind: AccountKind) {
  const email = accounts[kind];
  expect(email).toBeTruthy();
  const context = await factory.newContext({ baseURL: origin });
  await signIn(context, email as string);
  return context;
}

type RequestOverrides = {
  roomCode?: string;
  startAt?: string;
  endAt?: string;
  unitCodes?: string[];
  materials?: { materialCode: string; quantity: number }[];
};

async function createRequest(
  client: APIRequestContext,
  overrides: RequestOverrides = {},
) {
  return client.post("/api/requests", {
    headers,
    data: {
      title: "PLP workspace verification",
      purpose: "Automated verification of the PLP fulfillment loop",
      roomCode: overrides.roomCode ?? "lab-organik",
      startAt: overrides.startAt ?? "2027-06-01T09:00:00+07:00",
      endAt: overrides.endAt ?? "2027-06-01T11:00:00+07:00",
      supervisor: "Dr. Test",
      fieldPic: "Aslab Test",
      equipment: (overrides.unitCodes ?? []).map((unitCode) => ({ unitCode })),
      materials: overrides.materials ?? [],
    },
  });
}

async function unitStatus(client: APIRequestContext, unitId: string) {
  const response = await client.get("/api/catalog", { headers });
  expect(response.status()).toBe(200);
  const catalog = (await response.json()).data as {
    equipment: { units: { id: string; status: string }[] }[];
  };
  return catalog.equipment
    .flatMap((asset) => asset.units)
    .find((unit) => unit.id === unitId)?.status;
}

test("PLP API dan UI hanya untuk role PLP", async ({
  page,
  playwright,
  request,
}) => {
  const anonymous = await request.get("/api/plp/requests", { headers });
  expect(anonymous.status()).toBe(401);
  expect((await anonymous.json()).error.code).toBe("UNAUTHORIZED");

  const studentEmail = await ensureAccount(request, "student");
  const student = await sessionFor(playwright.request, "student");
  try {
    for (const [method, url] of [
      ["GET", "/api/plp/requests"],
      ["GET", "/api/plp/dashboard"],
      ["GET", "/api/plp/schedule?from=2027-06-01&to=2027-06-07"],
      ["GET", "/api/plp/inventory/equipment"],
      ["GET", "/api/plp/history"],
      ["POST", "/api/plp/maintenance"],
    ] as const) {
      const response = await student.fetch(url, { method, headers });
      expect(response.status()).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    }

    // The UI renders not-found, so the route stays invisible for a student.
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(studentEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/student$/);
    await page.goto("/plp/dashboard");
    await expect(
      page.getByRole("heading", { name: "This page isn’t here" }),
    ).toBeVisible();
  } finally {
    await student.dispose();
  }

  const plpEmail = await ensureAccount(request, "plp");
  const plp = await sessionFor(playwright.request, "plp");
  try {
    const allowed = await plp.get("/api/plp/requests?limit=5", { headers });
    expect(allowed.status()).toBe(200);
  } finally {
    await plp.dispose();
  }

  const browser = await playwright.chromium.launch();
  try {
    const plpPage = await browser.newPage();
    await plpPage.goto(`${origin}/sign-in`);
    await plpPage.getByLabel("Email").fill(plpEmail);
    await plpPage.getByLabel("Password").fill(password);
    await plpPage.getByRole("button", { name: "Sign in" }).click();
    // Role-aware landing: PLP goes straight to its own workspace.
    await expect(plpPage).toHaveURL(/\/plp\/dashboard$/);
    await plpPage.goto(`${origin}/plp/dashboard`);
    await expect(
      plpPage.getByRole("heading", { name: /Selamat bekerja/i }),
    ).toBeVisible();
    await plpPage.goto(`${origin}/plp/requests`);
    await expect(
      plpPage.getByRole("heading", { name: "Request review" }),
    ).toBeVisible();
    await plpPage.goto(`${origin}/plp/schedule`);
    await expect(plpPage.getByText("Global lab schedule").first()).toBeVisible();
    await plpPage.close();
  } finally {
    await browser.close();
  }
});

test("PLP memenuhi flow borrowable dan menutup usage-only", async ({
  playwright,
  request,
}) => {
  await ensureAccount(request, "student");
  await ensureAccount(request, "plp");
  const student = await sessionFor(playwright.request, "student");
  const plp = await sessionFor(playwright.request, "plp");
  try {
    // Borrowable: APPROVED -> READY_FOR_PICKUP -> ACTIVE -> RETURNED -> COMPLETED.
    const created = await createRequest(student, {
      unitCodes: ["OVN-001-05"],
      startAt: "2027-06-02T09:00:00+07:00",
      endAt: "2027-06-02T11:00:00+07:00",
    });
    expect(created.status()).toBe(201);
    const borrowable = (await created.json()).data;

    const approved = await plp.post(`/api/requests/${borrowable.id}/review`, {
      headers,
      data: { action: "approve", note: "" },
    });
    expect(approved.status()).toBe(200);

    const ready = await plp.post(`/api/plp/requests/${borrowable.id}/ready`, {
      headers,
    });
    expect(ready.status()).toBe(200);
    expect((await ready.json()).data.status).toBe("READY_FOR_PICKUP");

    const issued = await plp.post(`/api/requests/${borrowable.id}/issue`, {
      headers,
    });
    expect(issued.status()).toBe(200);
    expect((await issued.json()).data.status).toBe("ACTIVE");

    const returned = await plp.post(`/api/requests/${borrowable.id}/return`, {
      headers,
      data: { condition: "GOOD", notes: "Dikembalikan lengkap" },
    });
    expect(returned.status()).toBe(200);
    expect((await returned.json()).data.status).toBe("RETURNED");
    expect(await unitStatus(student, "OVN-001-05")).toBe("Awaiting return");

    const completed = await plp.post(
      `/api/plp/requests/${borrowable.id}/complete`,
      {
        headers,
        data: { notes: "Inspeksi selesai", equipmentStatus: "AVAILABLE" },
      },
    );
    expect(completed.status()).toBe(200);
    expect((await completed.json()).data.status).toBe("COMPLETED");
    expect(await unitStatus(student, "OVN-001-05")).toBe("Available");

    // Usage-only: no return transaction, completion closes the request directly.
    const usage = await createRequest(student, {
      roomCode: "lab-analitik",
      unitCodes: ["SPC-001-02"],
      startAt: "2027-06-03T09:00:00+07:00",
      endAt: "2027-06-03T11:00:00+07:00",
    });
    expect(usage.status()).toBe(201);
    const usageOnly = (await usage.json()).data;
    expect(
      (
        await plp.post(`/api/requests/${usageOnly.id}/review`, {
          headers,
          data: { action: "approve", note: "" },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await plp.post(`/api/plp/requests/${usageOnly.id}/ready`, { headers })
      ).status(),
    ).toBe(200);
    expect(
      (await plp.post(`/api/requests/${usageOnly.id}/issue`, { headers }))
        .status(),
    ).toBe(200);

    const blockedReturn = await plp.post(
      `/api/requests/${usageOnly.id}/return`,
      { headers, data: { condition: "GOOD", notes: "" } },
    );
    expect(blockedReturn.status()).toBe(409);
    expect((await blockedReturn.json()).error.code).toBe("NOTHING_TO_RETURN");

    const usageDone = await plp.post(
      `/api/plp/requests/${usageOnly.id}/complete`,
      { headers, data: { notes: "" } },
    );
    expect(usageDone.status()).toBe(200);
    expect((await usageDone.json()).data.status).toBe("COMPLETED");
    expect(await unitStatus(student, "SPC-001-02")).toBe("Available");
  } finally {
    await student.dispose();
    await plp.dispose();
  }
});

test("PLP request list memuat filter, pagination, dan konteks review", async ({
  playwright,
  request,
}) => {
  await ensureAccount(request, "student");
  await ensureAccount(request, "plp");
  const student = await sessionFor(playwright.request, "student");
  const plp = await sessionFor(playwright.request, "plp");
  try {
    const created = await createRequest(student, {
      roomCode: "lab-fisik",
      unitCodes: ["FNB-001-01"],
      materials: [{ materialCode: "MAT-064", quantity: 100 }],
      startAt: "2027-06-05T09:00:00+07:00",
      endAt: "2027-06-05T11:00:00+07:00",
    });
    expect(created.status()).toBe(201);
    const booking = (await created.json()).data;

    const pending = await plp.get(
      "/api/plp/requests?status=PENDING_PLP&limit=10",
      { headers },
    );
    expect(pending.status()).toBe(200);
    const page = await pending.json();
    expect(
      page.data.some((item: { id: string }) => item.id === booking.id),
    ).toBe(true);
    expect(page.meta.limit).toBe(10);
    expect(typeof page.meta.total).toBe("number");

    const detail = await plp.get(`/api/plp/requests/${booking.id}`, {
      headers,
    });
    expect(detail.status()).toBe(200);
    const context = (await detail.json()).data;
    expect(context.request.code).toBe(booking.code);
    expect(context.equipment[0].usageType).toBe("USAGE_ONLY");
    expect(context.materials[0].sufficient).toBe(true);

    // Overlapping usage of the same unit is surfaced as a conflict warning.
    const overlap = await createRequest(student, {
      roomCode: "lab-fisik",
      unitCodes: ["FNB-001-01"],
      startAt: "2027-06-05T10:00:00+07:00",
      endAt: "2027-06-05T12:00:00+07:00",
    });
    expect(overlap.status()).toBe(201);
    const overlapping = (await overlap.json()).data;
    await plp.post(`/api/requests/${booking.id}/review`, {
      headers,
      data: { action: "approve", note: "" },
    });
    const overlapDetail = await plp.get(
      `/api/plp/requests/${overlapping.id}`,
      { headers },
    );
    expect(overlapDetail.status()).toBe(200);
    const overlapContext = (await overlapDetail.json()).data;
    expect(
      overlapContext.warnings.some(
        (warning: { kind: string }) => warning.kind === "conflict",
      ),
    ).toBe(true);

    // Release the approved booking again so the shared seeded stock stays
    // available for the other specs in this run.
    const cancelled = await student.delete(`/api/requests/${booking.id}`, {
      headers,
    });
    expect(cancelled.status()).toBe(200);
  } finally {
    await student.dispose();
    await plp.dispose();
  }
});

test("admin mengelola master data, konfigurasi, dan audit", async ({
  playwright,
  request,
}) => {
  await ensureAccount(request, "admin");
  await ensureAccount(request, "target");
  const admin = await sessionFor(playwright.request, "admin");
  const student = await sessionFor(playwright.request, "target");
  try {
    const suffix = randomUUID().slice(0, 8);

    // A student session cannot reach admin APIs.
    const forbidden = await student.post("/api/admin/laboratories", {
      headers,
      data: { code: `lab-${suffix}`, name: "Should fail" },
    });
    expect(forbidden.status()).toBe(403);

    const laboratory = await admin.post("/api/admin/laboratories", {
      headers,
      data: {
        code: `lab-${suffix}`,
        name: "Laboratorium Uji",
        description: "Dibuat oleh test",
        active: true,
      },
    });
    expect(laboratory.status()).toBe(201);

    const room = await admin.post("/api/admin/rooms", {
      headers,
      data: {
        laboratoryCode: `lab-${suffix}`,
        code: `room-${suffix}`,
        name: "Room Uji",
        shortName: "Uji",
        tone: "cream",
        active: true,
      },
    });
    expect(room.status()).toBe(201);

    const material = await admin.post("/api/admin/materials", {
      headers,
      data: {
        code: `mat-${suffix}`,
        name: "Material Uji",
        baseUnit: "mL",
        rule: {
          minimumQuantity: 10,
          dispensingIncrement: 10,
          maximumQuantity: 100,
          unit: "mL",
        },
      },
    });
    expect(material.status()).toBe(201);

    const batch = await admin.post("/api/admin/material-batches", {
      headers,
      data: {
        materialCode: `mat-${suffix}`,
        roomCode: `room-${suffix}`,
        lotNumber: "LOT-TEST",
        quantity: 500,
        active: true,
      },
    });
    expect(batch.status()).toBe(201);

    const configuration = await admin.patch("/api/admin/configuration", {
      headers,
      data: { low_stock_ratio: 3, timezone: "Asia/Jakarta" },
    });
    expect(configuration.status()).toBe(200);
    expect((await configuration.json()).data.low_stock_ratio).toBe(3);

    // Role management goes through Better Auth and is audited.
    const users = await admin.get("/api/auth/admin/list-users?limit=100", {
      headers,
    });
    expect(users.status()).toBe(200);
    const target = (await users.json()).users.find(
      (account: { email: string }) => account.email === accounts.target,
    );
    expect(target).toBeTruthy();
    const promoted = await admin.post(`/api/admin/users/${target.id}/role`, {
      headers,
      data: { roles: ["plp"] },
    });
    expect(promoted.status()).toBe(200);

    // After promotion to PLP, student can access the PLP requests API.
    const plpRequests = await student.get("/api/plp/requests?limit=5", {
      headers,
    });
    expect(plpRequests.status()).toBe(200);

    const audit = await admin.get(
      "/api/admin/audit-logs?entity=laboratory&limit=5",
      { headers },
    );
    expect(audit.status()).toBe(200);
    const auditBody = await audit.json();
    expect(
      auditBody.data.some(
        (entry: { entityType: string }) => entry.entityType === "laboratory",
      ),
    ).toBe(true);
  } finally {
    await admin.dispose();
    await student.dispose();
  }
});

test("approval stok bersamaan tidak bisa overbook", async ({ playwright, request }) => {
  await ensureAccount(request, "student");
  await ensureAccount(request, "plp");
  const student = await sessionFor(playwright.request, "student");
  const plp = await sessionFor(playwright.request, "plp");
  const approvedIds: string[] = [];
  try {
    // MAT-014 has 6000 mL seeded. Reserve 5000 through five approvals so only
    // 1000 mL is left for two concurrent approval attempts.
    for (let index = 0; index < 5; index += 1) {
      const created = await createRequest(student, {
        roomCode: "lab-anorganik",
        materials: [{ materialCode: "MAT-014", quantity: 1000 }],
        startAt: `2027-07-0${index + 1}T08:00:00+07:00`,
        endAt: `2027-07-0${index + 1}T09:00:00+07:00`,
      });
      expect(created.status()).toBe(201);
      const booking = (await created.json()).data;
      const approved = await plp.post(`/api/requests/${booking.id}/review`, {
        headers,
        data: { action: "approve", note: "" },
      });
      expect(approved.status()).toBe(200);
      approvedIds.push(booking.id);
    }

    const racers: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const created = await createRequest(student, {
        roomCode: "lab-anorganik",
        materials: [{ materialCode: "MAT-014", quantity: 1000 }],
        startAt: `2027-07-1${index}T08:00:00+07:00`,
        endAt: `2027-07-1${index}T09:00:00+07:00`,
      });
      expect(created.status()).toBe(201);
      racers.push((await created.json()).data.id);
    }

    const results = await Promise.all(
      racers.map((id) =>
        plp.post(`/api/requests/${id}/review`, {
          headers,
          data: { action: "approve", note: "" },
        }),
      ),
    );
    const statuses = results.map((result) => result.status()).sort();
    expect(statuses).toEqual([200, 409]);
    const failed = results.find((result) => result.status() === 409);
    expect((await failed?.json()).error.code).toBe("INSUFFICIENT_STOCK");
    for (const [index, id] of racers.entries()) {
      if (results[index].status() === 200) approvedIds.push(id);
    }

    // Release every reservation again so later specs see the seeded stock.
    for (const id of approvedIds) {
      const cancelled = await student.delete(`/api/requests/${id}`, {
        headers,
      });
      expect(cancelled.status()).toBe(200);
    }
  } finally {
    await student.dispose();
    await plp.dispose();
  }
});
