import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const origin = "http://localhost:3101";
const headers = { Origin: origin };
const password = "Finishing-test-password-123!";
const onePixelPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function signUp(client: APIRequestContext, name: string) {
  const data = {
    name,
    email: `finishing-${randomUUID()}@example.com`,
    password,
  };
  let response = await client.post("/api/auth/sign-up/email", {
    headers,
    data,
  });
  if (response.status() === 429) {
    const seconds = Number(response.headers()["retry-after"] || 10);
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

async function withDatabase<T>(run: (pool: Pool) => Promise<T>) {
  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
    max: 1,
  });
  try {
    return await run(pool);
  } finally {
    await pool.end();
  }
}

async function setRole(email: string, role: string) {
  await withDatabase(async (pool) => {
    const { rowCount } = await pool.query(
      'UPDATE "user" SET role = $1 WHERE email = $2',
      [role, email],
    );
    expect(rowCount).toBe(1);
  });
}

async function userIdFor(email: string) {
  const rows = await withDatabase(async (pool) =>
    pool.query<{ id: string }>('SELECT id FROM "user" WHERE email = $1', [email]),
  );
  expect(rows.rows[0]?.id).toBeTruthy();
  return rows.rows[0].id;
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
  await withDatabase(async (pool) => {
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
  });
}

type AccountKind = "admin" | "plp";
const accounts: Partial<Record<AccountKind, string>> = {};

async function ensureAccount(client: APIRequestContext, kind: AccountKind) {
  const existing = accounts[kind];
  if (existing) return existing;
  const email = await signUp(client, `Finishing ${kind}`);
  await setRole(email, kind);
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

async function signInPage(page: Page, email: string) {
  await page.goto(`${origin}/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("admin material batches dan assignments membuka data, bukan error render", async ({
  page,
  playwright,
  request,
}) => {
  const adminEmail = await ensureAccount(request, "admin");
  await ensureAccount(request, "plp");
  const admin = await sessionFor(playwright.request, "admin");
  const lot = `E2E-${randomUUID().slice(0, 8)}`;
  try {
    const batch = await admin.post("/api/admin/material-batches", {
      headers,
      data: {
        materialCode: "MAT-027",
        roomCode: "lab-organik",
        lotNumber: lot,
        // Zero quantity keeps the shared seeded stock untouched for the other
        // specs while still proving the batches page renders real rows.
        quantity: 0,
        active: true,
      },
    });
    expect(batch.status()).toBe(201);
  } finally {
    await admin.dispose();
  }

  await signInPage(page, adminEmail);
  await expect(page).toHaveURL(/\/admin\/dashboard$/);

  await page.goto(`${origin}/admin/materials/batches`);
  await expect(
    page.getByRole("heading", { name: "Material batches" }),
  ).toBeVisible();
  await expect(page.getByText(lot)).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);

  await page.goto(`${origin}/admin/assignments`);
  await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();
  await expect(page.getByText("Lab Organik").first()).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
});

test("assignment menolak duplikasi, role salah, scope tidak ada, dan periode terbalik", async ({
  playwright,
  request,
}) => {
  await ensureAccount(request, "admin");
  await ensureAccount(request, "plp");
  const admin = await sessionFor(playwright.request, "admin");
  const plpUserId = await userIdFor(accounts.plp as string);
  try {
    const created = await admin.post("/api/admin/assignments", {
      headers,
      data: {
        userId: plpUserId,
        scopeType: "LABORATORY",
        scopeId: "chem-lab",
        assignmentType: "PLP",
        startDate: "2027-01-01T00:00:00+07:00",
        endDate: "2027-12-31T00:00:00+07:00",
        active: true,
      },
    });
    expect(created.status()).toBe(201);

    const duplicate = await admin.post("/api/admin/assignments", {
      headers,
      data: {
        userId: plpUserId,
        scopeType: "LABORATORY",
        scopeId: "chem-lab",
        assignmentType: "PLP",
        active: true,
      },
    });
    expect(duplicate.status()).toBe(409);
    expect((await duplicate.json()).error.code).toBe("DUPLICATE_ASSIGNMENT");

    const student = await request.post("/api/auth/sign-up/email", {
      headers,
      data: {
        name: "Finishing Student",
        email: `finishing-student-${randomUUID()}@example.com`,
        password,
      },
    });
    expect(student.status()).toBe(200);
    const studentId = await userIdFor(
      (await student.json()).user.email as string,
    );
    const wrongRole = await admin.post("/api/admin/assignments", {
      headers,
      data: {
        userId: studentId,
        scopeType: "LABORATORY",
        scopeId: "chem-lab",
        assignmentType: "PLP",
        active: true,
      },
    });
    expect(wrongRole.status()).toBe(400);
    expect((await wrongRole.json()).error.code).toBe("INVALID_ROLE");

    const missingScope = await admin.post("/api/admin/assignments", {
      headers,
      data: {
        userId: plpUserId,
        scopeType: "ROOM",
        scopeId: "room-yang-tidak-ada",
        assignmentType: "PLP",
        active: true,
      },
    });
    expect(missingScope.status()).toBe(400);
    expect((await missingScope.json()).error.code).toBe("INVALID_SCOPE");

    const reversed = await admin.post("/api/admin/assignments", {
      headers,
      data: {
        userId: plpUserId,
        scopeType: "LABORATORY",
        scopeId: "chem-lab",
        assignmentType: "PIC",
        startDate: "2027-06-10T00:00:00+07:00",
        endDate: "2027-06-01T00:00:00+07:00",
        active: false,
      },
    });
    expect(reversed.status()).toBe(400);
    expect((await reversed.json()).error.code).toBe("INVALID_PERIOD");
  } finally {
    await admin.dispose();
  }
});

test("upload gambar memvalidasi tipe dan hanya bisa dibaca user terautentikasi", async ({
  playwright,
  request,
}) => {
  await ensureAccount(request, "admin");
  await ensureAccount(request, "plp");
  const admin = await sessionFor(playwright.request, "admin");
  const plp = await sessionFor(playwright.request, "plp");
  try {
    const upload = await admin.post("/api/admin/uploads", {
      headers,
      multipart: {
        file: {
          name: "sample.png",
          mimeType: "image/png",
          buffer: Buffer.from(onePixelPng, "base64"),
        },
      },
    });
    expect(upload.status()).toBe(201);
    const media = await upload.json();
    expect(media.id).toBeTruthy();

    const read = await plp.get(`/api/media/${media.id}`, { headers });
    expect(read.status()).toBe(200);
    expect(read.headers()["content-type"]).toContain("image/png");
    expect(read.headers()["cache-control"]).toContain("private");

    const anonymous = await request.get(`/api/media/${media.id}`, { headers });
    expect(anonymous.status()).toBe(401);

    const wrongType = await admin.post("/api/admin/uploads", {
      headers,
      multipart: {
        file: {
          name: "notes.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("not an image"),
        },
      },
    });
    expect(wrongType.status()).toBe(400);

    const materials = await admin.get("/api/admin/materials", { headers });
    expect(materials.status()).toBe(200);
    const acetone = (
      (await materials.json()).data as { id: string; code: string }[]
    ).find((material) => material.code === "MAT-027");
    expect(acetone).toBeTruthy();
    const patched = await admin.patch(
      `/api/admin/materials/${acetone?.id}`,
      { headers, data: { imageMediaId: media.id } },
    );
    expect(patched.status()).toBe(200);
    expect((await patched.json()).data.imageMediaId).toBe(media.id);
  } finally {
    await admin.dispose();
    await plp.dispose();
  }
});

test("hasil hitung stok tidak mengubah ledger dan CSV selisih hanya untuk inventory", async ({
  playwright,
  request,
}) => {
  await ensureAccount(request, "admin");
  await ensureAccount(request, "plp");
  const plp = await sessionFor(playwright.request, "plp");
  try {
    const before = await plp.get("/api/plp/inventory/materials/MAT-027", {
      headers,
    });
    expect(before.status()).toBe(200);
    const beforeBatches = ((await before.json()).data as {
      material: {
        batches: { batchId: string; quantity: number; roomCode: string }[];
      };
    }).material.batches;
    expect(beforeBatches.length).toBeGreaterThan(0);
    const targetBatch =
      beforeBatches.find((batch) => batch.roomCode === "lab-organik") ??
      beforeBatches[0];

    const created = await plp.post("/api/plp/opname", {
      headers,
      data: { roomCode: targetBatch.roomCode, notes: "E2E variance check" },
    });
    if (created.status() === 409) {
      // A previous test run left an open session on this room.
      const stale = await plp.get("/api/plp/opname?status=IN_PROGRESS", {
        headers,
      });
      for (const session of (await stale.json()).data as { id: string }[]) {
        await plp.post(`/api/plp/opname/${session.id}/cancel`, {
          headers,
          data: {},
        });
      }
    }
    const sessionResponse =
      created.status() === 201
        ? created
        : await plp.post("/api/plp/opname", {
            headers,
            data: {
              roomCode: targetBatch.roomCode,
              notes: "E2E variance check",
            },
          });
    expect(sessionResponse.status()).toBe(201);
    const sessionId = (await sessionResponse.json()).data.id as string;

    const detail = await plp.get(`/api/plp/opname/${sessionId}`, { headers });
    expect(detail.status()).toBe(200);
    const entries = ((await detail.json()).data as {
      entries: { materialBatchId: string; baseline: number }[];
    }).entries;
    const entry = entries.find(
      (item) => item.materialBatchId === targetBatch.batchId,
    );
    expect(entry).toBeTruthy();

    const counted = await plp.post(`/api/plp/opname/${sessionId}/count`, {
      headers,
      data: {
        materialBatchId: entry?.materialBatchId,
        countedQuantity: (entry?.baseline ?? 0) + 2,
        notes: "Selisih dua unit",
      },
    });
    expect(counted.status()).toBe(200);

    const completed = await plp.post(`/api/plp/opname/${sessionId}/complete`, {
      headers,
      data: { notes: "Selesai" },
    });
    expect(completed.status()).toBe(200);

    const after = await plp.get("/api/plp/inventory/materials/MAT-027", {
      headers,
    });
    const afterBatches = ((await after.json()).data as {
      material: { batches: { batchId: string; quantity: number }[] };
    }).material.batches;
    const unchanged = afterBatches.find(
      (batch) => batch.batchId === targetBatch.batchId,
    );
    expect(Number(unchanged?.quantity)).toBe(Number(targetBatch.quantity));

    const variance = await plp.get(`/api/plp/opname/${sessionId}`, {
      headers,
    });
    const varianceEntries = ((await variance.json()).data as {
      entries: { materialBatchId: string; difference: number }[];
    }).entries;
    expect(
      varianceEntries.find(
        (item) => item.materialBatchId === targetBatch.batchId,
      )?.difference,
    ).toBe(2);

    const csv = await plp.get(
      `/api/exports/opname-variance?sessionId=${sessionId}`,
      { headers },
    );
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(await csv.text()).toContain("Baseline");

    const anonymousCsv = await request.get(
      `/api/exports/opname-variance?sessionId=${sessionId}`,
      { headers },
    );
    expect(anonymousCsv.status()).toBe(401);
  } finally {
    await plp.dispose();
  }
});

test("dashboard dan inventory menampilkan chart dengan data nyata dan tautan sumber", async ({
  playwright,
  request,
}) => {
  await ensureAccount(request, "admin");
  await ensureAccount(request, "plp");
  const plp = await sessionFor(playwright.request, "plp");
  try {
    const browser = await playwright.chromium.launch();
    try {
      const plpContext = await browser.newContext();
      const page = await plpContext.newPage();
      await signInPage(page, accounts.plp as string);
      await expect(page).toHaveURL(/\/plp\/dashboard$/);

      await page.goto(`${origin}/plp/dashboard?trend=7`);
      await expect(
        page.getByRole("heading", { name: "Tren request per periode" }),
      ).toBeVisible();
      await expect(page.getByText("7 hari terakhir, per hari")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Material berisiko per room" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "7 hari" }).first(),
      ).toHaveAttribute("aria-current", "true");

      await page.goto(`${origin}/plp/inventory/materials`);
      await expect(
        page.getByRole("heading", {
          name: "Batch mendekati atau terlewat expiry",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Hitung stok", exact: true }),
      ).toBeVisible();
      await plpContext.close();

      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      await signInPage(adminPage, accounts.admin as string);
      await expect(adminPage).toHaveURL(/\/admin\/dashboard$/);
      await adminPage.goto(`${origin}/admin/dashboard`);
      await expect(
        adminPage.getByRole("heading", { name: "Tren request lintas lab" }),
      ).toBeVisible();
      await expect(
        adminPage.getByRole("heading", {
          name: "Equipment per room dan status",
        }),
      ).toBeVisible();
      await adminContext.close();
    } finally {
      await browser.close();
    }

    const history = await plp.get("/api/plp/history?limit=5", { headers });
    expect(history.status()).toBe(200);
  } finally {
    await plp.dispose();
  }
});
