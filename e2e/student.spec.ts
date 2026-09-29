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

async function signUp(client: APIRequestContext, name: string) {
  const data = {
    name,
    email: `student-${randomUUID()}@example.com`,
    password: "Student-test-password-123!",
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

// PLP access is scoped per lab, so the test accounts need explicit assignments.
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
      title: "Integration run",
      purpose: "Automated verification of the request lifecycle",
      roomCode: overrides.roomCode ?? "lab-organik",
      startAt: overrides.startAt ?? "2027-03-01T09:00:00+07:00",
      endAt: overrides.endAt ?? "2027-03-01T11:00:00+07:00",
      supervisor: "Dr. Test",
      fieldPic: "Aslab Test",
      equipment: (overrides.unitCodes ?? []).map((unitCode) => ({ unitCode })),
      materials: overrides.materials ?? [],
    },
  });
}

async function catalog(client: APIRequestContext, room?: string) {
  const response = await client.get(
    room ? `/api/catalog?room=${room}` : "/api/catalog",
    { headers },
  );
  expect(response.status()).toBe(200);
  return (await response.json()).data as {
    rooms: { id: string }[];
    equipment: {
      id: string;
      roomId: string;
      status: string;
      units: { id: string; status: string }[];
    }[];
    materials: {
      id: string;
      roomId: string;
      physical: number;
      reserved: number;
      available: number;
    }[];
  };
}

function unitStatus(
  data: Awaited<ReturnType<typeof catalog>>,
  assetId: string,
  unitId: string,
) {
  return data.equipment
    .find((asset) => asset.id === assetId)
    ?.units.find((unit) => unit.id === unitId)?.status;
}

test("student APIs reject anonymous callers and student pages redirect", async ({
  request,
  page,
}) => {
  for (const url of [
    "/api/requests",
    "/api/incidents",
    "/api/notifications",
    "/api/shared-usage",
    "/api/catalog",
  ]) {
    const response = await request.get(url, { headers });
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  }
  await page.goto("/student");
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto("/app/calendar");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("a student only sees own requests and cannot review them", async ({
  request,
  playwright,
}) => {
  await signUp(request, "Request Owner");
  const created = await createRequest(request, {
    roomCode: "lab-analitik",
    unitCodes: ["BAL-002-01"],
  });
  expect(created.status()).toBe(201);
  const mine = (await created.json()).data;
  expect(mine.status).toBe("PENDING_PLP");
  expect(mine.code).toMatch(/^REQ-\d{4}-\d{3}$/);

  const strangerContext = await playwright.request.newContext({ baseURL: origin });
  try {
    await signUp(strangerContext, "Stranger");
    const strangerList = await (
      await strangerContext.get("/api/requests", { headers })
    ).json();
    expect(strangerList.data).toEqual([]);
    for (const [method] of [
      ["GET", undefined],
      ["PATCH", undefined],
      ["DELETE", undefined],
    ] as const) {
      const response = await strangerContext.fetch(`/api/requests/${mine.id}`, {
        method,
        headers,
        ...(method === "PATCH"
          ? {
              data: {
                title: "Stolen",
                purpose: "Stolen purpose",
                roomCode: "lab-organik",
                startAt: "2027-03-01T09:00:00+07:00",
                endAt: "2027-03-01T11:00:00+07:00",
                supervisor: "",
                fieldPic: "",
                equipment: [],
                materials: [],
              },
            }
          : {}),
      });
      expect(response.status()).toBe(404);
    }
    // A session without the review permission is refused before touching the row.
    const review = await strangerContext.post(
      `/api/requests/${mine.id}/review`,
      { headers, data: { action: "approve", note: "" } },
    );
    expect(review.status()).toBe(403);
    expect((await review.json()).error.code).toBe("FORBIDDEN");
  } finally {
    await strangerContext.dispose();
  }
});

test("PLP review drives the request lifecycle and blocks conflicts", async ({
  request,
  playwright,
}) => {
  await signUp(request, "Lifecycle Student");
  const plpContext = await playwright.request.newContext({ baseURL: origin });
  const plpEmail = await signUp(plpContext, "Lifecycle PLP");
  await setRole(plpEmail, "plp");
  await assignRooms(plpEmail, ALL_LABS);

  const created = await createRequest(request, {
    unitCodes: ["OVN-001-01"],
    startAt: "2027-03-05T09:00:00+07:00",
    endAt: "2027-03-05T11:00:00+07:00",
  });
  expect(created.status()).toBe(201);
  const booking = (await created.json()).data;

  const approved = await plpContext.post(
    `/api/requests/${booking.id}/review`,
    { headers, data: { action: "approve", note: "Setuju" } },
  );
  expect(approved.status()).toBe(200);
  expect((await approved.json()).data.status).toBe("APPROVED");

  const afterApproval = await catalog(request);
  expect(unitStatus(afterApproval, "OVN-001", "OVN-001-01")).toBe("Reserved");

  const conflict = await createRequest(request, {
    unitCodes: ["OVN-001-01"],
    startAt: "2027-03-05T10:00:00+07:00",
    endAt: "2027-03-05T12:00:00+07:00",
  });
  expect(conflict.status()).toBe(409);
  expect((await conflict.json()).error.code).toBe("RESERVATION_CONFLICT");

  const issued = await plpContext.post(`/api/requests/${booking.id}/issue`, {
    headers,
  });
  expect(issued.status()).toBe(200);
  expect((await issued.json()).data.status).toBe("ACTIVE");
  expect(unitStatus(await catalog(request), "OVN-001", "OVN-001-01")).toBe(
    "In use",
  );

  const returned = await plpContext.post(`/api/requests/${booking.id}/return`, {
    headers,
    data: { condition: "MINOR_ISSUE", notes: "Perlu kalibrasi ulang" },
  });
  expect(returned.status()).toBe(200);
  expect((await returned.json()).data.status).toBe("RETURNED");
  expect(unitStatus(await catalog(request), "OVN-001", "OVN-001-01")).toBe(
    "Awaiting return",
  );

  const invalid = await plpContext.post(`/api/requests/${booking.id}/return`, {
    headers,
    data: { condition: "GOOD", notes: "" },
  });
  expect(invalid.status()).toBe(409);

  // Revision then rejection keeps the reason visible to the student.
  const second = await createRequest(request, {
    unitCodes: ["OVN-001-02"],
    startAt: "2027-03-08T09:00:00+07:00",
    endAt: "2027-03-08T11:00:00+07:00",
  });
  const secondBooking = (await second.json()).data;
  const revision = await plpContext.post(
    `/api/requests/${secondBooking.id}/review`,
    { headers, data: { action: "revision", note: "Lengkapi usage plan" } },
  );
  expect(revision.status()).toBe(200);
  expect((await revision.json()).data.status).toBe("REQUEST_REVISION");

  const resubmit = await request.patch(`/api/requests/${secondBooking.id}`, {
    headers,
    data: {
      title: "Integration run revised",
      purpose: "Revisi sudah dilengkapi",
      roomCode: "lab-organik",
      startAt: "2027-03-08T09:00:00+07:00",
      endAt: "2027-03-08T11:00:00+07:00",
      supervisor: "Dr. Test",
      fieldPic: "Aslab Test",
      equipment: [{ unitCode: "OVN-001-02" }],
      materials: [],
    },
  });
  expect(resubmit.status()).toBe(200);
  expect((await resubmit.json()).data.status).toBe("PENDING_PLP");

  const rejected = await plpContext.post(
    `/api/requests/${secondBooking.id}/review`,
    { headers, data: { action: "reject", note: "Jadwal bentrok" } },
  );
  expect(rejected.status()).toBe(200);
  const rejectedBody = (await rejected.json()).data;
  expect(rejectedBody.status).toBe("REJECTED");
  expect(rejectedBody.rejectionReason).toBe("Jadwal bentrok");

  const mine = await (await request.get("/api/requests", { headers })).json();
  const stored = mine.data.find(
    (item: { id: string }) => item.id === booking.id,
  );
  expect(stored.status).toBe("RETURNED");
  expect(stored.issuedAt).toBeTruthy();
  expect(stored.returnedAt).toBeTruthy();
});

test("material stock cannot be overbooked and cancel releases reserved stock", async ({
  request,
  playwright,
}) => {
  await signUp(request, "Stock Student");
  const plpContext = await playwright.request.newContext({ baseURL: origin });
  const stockPlpEmail = await signUp(plpContext, "Stock PLP");
  await setRole(stockPlpEmail, "plp");
  await assignRooms(stockPlpEmail, ALL_LABS);

  const material = { materialCode: "MAT-027", quantity: 1000 };
  const slots = [
    ["2027-04-01T08:00:00+07:00", "2027-04-01T09:00:00+07:00"],
    ["2027-04-01T09:00:00+07:00", "2027-04-01T10:00:00+07:00"],
    ["2027-04-01T10:00:00+07:00", "2027-04-01T11:00:00+07:00"],
    ["2027-04-01T11:00:00+07:00", "2027-04-01T12:00:00+07:00"],
  ] as const;

  const ids: string[] = [];
  for (const [startAt, endAt] of slots.slice(0, 3)) {
    const created = await createRequest(request, {
      roomCode: "lab-organik",
      materials: [material],
      startAt,
      endAt,
    });
    expect(created.status()).toBe(201);
    ids.push((await created.json()).data.id);
    const approved = await plpContext.post(`/api/requests/${ids.at(-1)}/review`, {
      headers,
      data: { action: "approve", note: "" },
    });
    expect(approved.status()).toBe(200);
  }

  const reserved = await catalog(request, "lab-organik");
  const acetone = reserved.materials.find((item) => item.id === "MAT-027");
  expect(acetone?.reserved).toBe(3000);
  expect(acetone?.available).toBe(0);

  const overbook = await createRequest(request, {
    roomCode: "lab-organik",
    materials: [material],
    startAt: slots[3][0],
    endAt: slots[3][1],
  });
  expect(overbook.status()).toBe(409);
  expect((await overbook.json()).error.code).toBe("INSUFFICIENT_STOCK");

  const cancelled = await request.delete(`/api/requests/${ids[0]}`, {
    headers,
  });
  expect(cancelled.status()).toBe(200);
  expect((await cancelled.json()).data.status).toBe("CANCELLED");

  const released = await catalog(request, "lab-organik");
  expect(released.materials.find((item) => item.id === "MAT-027")?.reserved).toBe(
    2000,
  );
  expect(released.materials.find((item) => item.id === "MAT-027")?.available).toBe(
    1000,
  );

  const reuse = await createRequest(request, {
    roomCode: "lab-organik",
    materials: [material],
    startAt: slots[3][0],
    endAt: slots[3][1],
  });
  expect(reuse.status()).toBe(201);
  const reuseId = (await reuse.json()).data.id;
  expect(
    (
      await plpContext.post(`/api/requests/${reuseId}/review`, {
        headers,
        data: { action: "approve", note: "" },
      })
    ).status(),
  ).toBe(200);

  // Issue reduces physical stock exactly once, inside the transaction.
  const issued = await plpContext.post(`/api/requests/${ids[1]}/issue`, {
    headers,
  });
  expect(issued.status()).toBe(200);
  const afterIssue = await catalog(request, "lab-organik");
  const issuedMaterial = afterIssue.materials.find(
    (item) => item.id === "MAT-027",
  );
  expect(issuedMaterial?.physical).toBe(2000);
  expect(issuedMaterial?.reserved).toBe(2000);
  expect(issuedMaterial?.available).toBe(0);

  const secondIssue = await plpContext.post(`/api/requests/${ids[1]}/issue`, {
    headers,
  });
  expect(secondIssue.status()).toBe(409);
});

test("shared usage stays inside the primary reservation and needs acceptance", async ({
  request,
  playwright,
}) => {
  await signUp(request, "Shared Usage Primary");
  const plpContext = await playwright.request.newContext({ baseURL: origin });
  const sharedPlpEmail = await signUp(plpContext, "Shared PLP");
  await setRole(sharedPlpEmail, "plp");
  await assignRooms(sharedPlpEmail, ALL_LABS);

  const created = await createRequest(request, {
    roomCode: "lab-analitik",
    unitCodes: ["SPC-001-01"],
    startAt: "2027-05-04T09:00:00+07:00",
    endAt: "2027-05-04T12:00:00+07:00",
  });
  expect(created.status()).toBe(201);
  const booking = (await created.json()).data;
  expect(
    (
      await plpContext.post(`/api/requests/${booking.id}/review`, {
        headers,
        data: { action: "approve", note: "" },
      })
    ).status(),
  ).toBe(200);

  const requesterContext = await playwright.request.newContext({
    baseURL: origin,
  });
  try {
    await signUp(requesterContext, "Shared Requester");
    const before = await (
      await requesterContext.get("/api/requests", { headers })
    ).json();

    const reservationId = await firstReservation(requesterContext);
    const outside = await requesterContext.post("/api/shared-usage", {
      headers,
      data: {
        reservationId,
        startAt: "2027-05-04T08:00:00+07:00",
        endAt: "2027-05-04T10:00:00+07:00",
        purpose: "",
      },
    });
    expect(outside.status()).toBe(422);
    expect((await outside.json()).error.code).toBe("OUTSIDE_RESERVATION");

    const own = await request.post("/api/shared-usage", {
      headers,
      data: {
        reservationId,
        startAt: "2027-05-04T10:00:00+07:00",
        endAt: "2027-05-04T11:00:00+07:00",
        purpose: "",
      },
    });
    expect(own.status()).toBe(422);
    expect((await own.json()).error.code).toBe("OWN_RESERVATION");

    const shared = await requesterContext.post("/api/shared-usage", {
      headers,
      data: {
        reservationId,
        startAt: "2027-05-04T10:00:00+07:00",
        endAt: "2027-05-04T11:00:00+07:00",
        purpose: "Verifikasi shared usage",
      },
    });
    expect(shared.status()).toBe(201);
    const sharedRequest = (await shared.json()).data;
    expect(sharedRequest.status).toBe("PENDING");

    const incoming = await (
      await request.get("/api/shared-usage", { headers })
    ).json();
    expect(
      incoming.data.incoming.some(
        (item: { id: string }) => item.id === sharedRequest.id,
      ),
    ).toBe(true);

    const strangerResponse = await requesterContext.post(
      `/api/shared-usage/${sharedRequest.id}/respond`,
      { headers, data: { action: "accept" } },
    );
    expect(strangerResponse.status()).toBe(404);

    const declined = await request.post(
      `/api/shared-usage/${sharedRequest.id}/respond`,
      { headers, data: { action: "decline" } },
    );
    expect(declined.status()).toBe(200);
    expect((await declined.json()).data.status).toBe("DECLINED");

    const again = await requesterContext.post("/api/shared-usage", {
      headers,
      data: {
        reservationId,
        startAt: "2027-05-04T10:00:00+07:00",
        endAt: "2027-05-04T11:00:00+07:00",
        purpose: "Percobaan kedua",
      },
    });
    expect(again.status()).toBe(201);
    const secondRequest = (await again.json()).data;

    const overlap = await requesterContext.post("/api/shared-usage", {
      headers,
      data: {
        reservationId,
        startAt: "2027-05-04T10:30:00+07:00",
        endAt: "2027-05-04T11:30:00+07:00",
        purpose: "Overlap",
      },
    });
    expect(overlap.status()).toBe(409);
    expect((await overlap.json()).error.code).toBe("SHARED_USAGE_OVERLAP");

    const accepted = await request.post(
      `/api/shared-usage/${secondRequest.id}/respond`,
      { headers, data: { action: "accept" } },
    );
    expect(accepted.status()).toBe(200);
    expect((await accepted.json()).data.status).toBe("ACCEPTED");

    const page = await (
      await requesterContext.get("/api/shared-usage", { headers })
    ).json();
    const available = page.data.available.find(
      (item: { id: string }) => item.id === sharedRequest.reservationId,
    );
    expect(available.myRequestStatus).toBe("ACCEPTED");

    // Shared usage never creates a new resource request for the requester.
    const after = await (
      await requesterContext.get("/api/requests", { headers })
    ).json();
    expect(after.data.length).toBe(before.data.length);
  } finally {
    await requesterContext.dispose();
  }
});

async function firstReservation(client: APIRequestContext) {
  const page = await (await client.get("/api/shared-usage", { headers })).json();
  const reservation = page.data.available[0];
  expect(reservation).toBeTruthy();
  return reservation.id as string;
}

test("an incident report never flips equipment status by itself", async ({
  request,
  playwright,
}) => {
  await signUp(request, "Incident Reporter");
  const plpContext = await playwright.request.newContext({ baseURL: origin });
  const incidentPlpEmail = await signUp(plpContext, "Incident PLP");
  await setRole(incidentPlpEmail, "plp");
  await assignRooms(incidentPlpEmail, ALL_LABS);

  const before = await catalog(request);
  const statusBefore = unitStatus(before, "PHM-002", "PHM-002-01");

  const created = await request.post("/api/incidents", {
    headers,
    data: {
      equipmentCode: "PHM-002",
      roomCode: "lab-fisik",
      title: "Elektroda pH tidak stabil",
      description: "Pembacaan bergeser setelah kalibrasi.",
      severity: "HIGH",
    },
  });
  expect(created.status()).toBe(201);
  const incident = (await created.json()).data;
  expect(incident.status).toBe("REPORTED");
  expect(incident.assessment).toBeNull();

  const afterReport = await catalog(request);
  expect(unitStatus(afterReport, "PHM-002", "PHM-002-01")).toBe(statusBefore);

  const assessed = await plpContext.post(
    `/api/incidents/${incident.code}/assess`,
    {
      headers,
      data: {
        finding: "Kontroler aus",
        assessment: "Perlu penggantian modul kontroler",
        recommendedAction: "Ganti modul lalu kalibrasi",
        equipmentCondition: "MINOR_ISSUE",
        status: "IN_MAINTENANCE",
      },
    },
  );
  expect(assessed.status()).toBe(200);

  const detail = await (
    await request.get(`/api/incidents/${incident.code}`, { headers })
  ).json();
  expect(detail.data.status).toBe("IN_MAINTENANCE");
  expect(detail.data.assessment.assessment).toContain("penggantian");

  const resolved = await plpContext.post(
    `/api/incidents/${incident.code}/resolve`,
    {
      headers,
      data: {
        action: "Modul diganti dan diuji",
        notes: "Selesai oleh PLP",
        equipmentStatus: "AVAILABLE",
      },
    },
  );
  expect(resolved.status()).toBe(200);
  const final = await (
    await request.get(`/api/incidents/${incident.code}`, { headers })
  ).json();
  expect(final.data.status).toBe("RESOLVED");
  expect(final.data.resolution.action).toContain("Modul diganti");

  const strangerContext = await playwright.request.newContext({
    baseURL: origin,
  });
  try {
    await signUp(strangerContext, "Incident Stranger");
    const hidden = await strangerContext.get(
      `/api/incidents/${incident.code}`,
      { headers },
    );
    expect(hidden.status()).toBe(404);
  } finally {
    await strangerContext.dispose();
  }
});

test("room catalog only exposes resources of that room", async ({ request }) => {
  await signUp(request, "Catalog Student");
  const organik = await catalog(request, "lab-organik");
  expect(organik.equipment.length).toBeGreaterThan(0);
  expect(
    organik.equipment.every((asset) => asset.roomId === "lab-organik"),
  ).toBe(true);
  expect(
    organik.materials.every((item) => item.roomId === "lab-organik"),
  ).toBe(true);

  const analitik = await catalog(request, "lab-analitik");
  expect(analitik.materials.length).toBeGreaterThan(0);
  expect(
    analitik.materials.every((item) => item.roomId === "lab-analitik"),
  ).toBe(true);
  expect(
    analitik.equipment.every((asset) => asset.roomId === "lab-analitik"),
  ).toBe(true);

  const missing = await request.get("/api/catalog?room=not-a-room", {
    headers,
  });
  expect(missing.status()).toBe(404);
});

test("the student workspace renders real server data", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `student-ui-${randomUUID()}@example.com`;
  await signUpWithPage(page, email);
  await page.goto("/student");
  await expect(
    page.getByRole("heading", { name: /Plan your next lab session/i }),
  ).toBeVisible();
  await expect(page.getByText("Organik").first()).toBeVisible();

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const created = await page.request.post("/api/requests", {
    headers,
    data: {
      title: "Calendar UI run",
      purpose: "Verify the calendar renders a stored request",
      roomCode: "lab-organik",
      startAt: `${now.getFullYear()}-${month}-15T09:00:00+07:00`,
      endAt: `${now.getFullYear()}-${month}-16T11:00:00+07:00`,
      supervisor: "Dr. UI",
      fieldPic: "Aslab UI",
      equipment: [{ unitCode: "OVN-001-04" }],
      materials: [],
    },
  });
  expect(created.status()).toBe(201);

  // A request scheduled in another month must be reachable with month navigation.
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = String(next.getMonth() + 1).padStart(2, "0");
  const nextCreated = await page.request.post("/api/requests", {
    headers,
    data: {
      title: "Next month run",
      purpose: "Verify month navigation keeps showing stored requests",
      roomCode: "lab-organik",
      startAt: `${next.getFullYear()}-${nextMonth}-15T09:00:00+07:00`,
      endAt: `${next.getFullYear()}-${nextMonth}-16T11:00:00+07:00`,
      supervisor: "Dr. UI",
      fieldPic: "Aslab UI",
      equipment: [{ unitCode: "OVN-001-03" }],
      materials: [],
    },
  });
  expect(nextCreated.status()).toBe(201);

  await page.goto("/student/calendar");
  await expect(
    page.getByRole("heading", {
      name: /Follow the status of every request/i,
    }),
  ).toBeVisible();
  const bar = page.locator("[data-schedule-bar]").first();
  await expect(bar).toBeVisible();
  await bar.click();
  await expect(
    page.getByRole("dialog", { name: "Schedule details" }),
  ).toBeVisible();
  await expect(page.getByText("Review PLP").first()).toBeVisible();

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(
    page.getByRole("button", { name: /Next month run/ }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(
    page.getByRole("button", { name: /Calendar UI run/ }).first(),
  ).toBeVisible();
  await page.goto("/student/laboratory/rooms/lab-analitik");
  await expect(
    page.getByRole("heading", { name: "Lab Analitik", level: 2 }),
  ).toBeVisible();
  await page.goto("/student/shared-usage");
  await expect(
    page.getByRole("heading", { name: /Ask to share a slot/i }),
  ).toBeVisible();
  await page.goto("/app");
  await expect(page).toHaveURL(/\/student$/);
  expect(errors).toEqual([]);
});

async function signUpWithPage(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Student UI");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Student-test-password-123!");
  await page.getByRole("button", { name: "Create account" }).click();
  // The auth server rate-limits rapid sign-ups; retry once inside its window.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await expect(page).toHaveURL(/\/student$/, { timeout: 4000 });
      return;
    } catch {
      await page.waitForTimeout(4000);
      const button = page.getByRole("button", { name: "Create account" });
      if (await button.isVisible()) await button.click();
    }
  }
  await expect(page).toHaveURL(/\/student$/);
}
