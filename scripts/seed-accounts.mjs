import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { loadEnvironment } from "./lib.mjs";
import { databaseUrl, databaseError } from "./postgres.mjs";

// Development-only demo accounts. The password can be overridden with
// SEED_ACCOUNT_PASSWORD. Never run this against production data.
const ACCOUNTS = [
  { email: "admin@reaksan.local", name: "Admin Reaksan", role: "admin" },
  { email: "plp@reaksan.local", name: "PLP Reaksan", role: "plp" },
  { email: "lecturer@reaksan.local", name: "Dosen Pembimbing", role: "lecturer" },
  { email: "aslab@reaksan.local", name: "Aslab Laboratorium", role: "aslab" },
  { email: "student1@reaksan.local", name: "Mahasiswa Satu", role: "user" },
  { email: "student2@reaksan.local", name: "Mahasiswa Dua", role: "user" },
];

const password = process.env.SEED_ACCOUNT_PASSWORD || "Reaksan-demo-123!";

await loadEnvironment();
const pool = new Pool({
  connectionString: databaseUrl(),
  max: 1,
  connectionTimeoutMillis: 5000,
});
pool.on("error", () => {});

async function upsertUser(client, account) {
  const existing = await client.query(
    'SELECT id FROM "user" WHERE email = $1',
    [account.email],
  );
  if (existing.rowCount > 0) {
    await client.query(
      'UPDATE "user" SET name = $2, role = $3, banned = false, ban_reason = NULL, ban_expires = NULL WHERE id = $1',
      [existing.rows[0].id, account.name, account.role],
    );
    return existing.rows[0].id;
  }
  const id = randomUUID();
  await client.query(
    'INSERT INTO "user" (id, name, email, email_verified, role) VALUES ($1, $2, $3, false, $4)',
    [id, account.name, account.email, account.role],
  );
  return id;
}

async function upsertCredential(client, userId) {
  const hash = await hashPassword(password);
  const existing = await client.query(
    "SELECT id FROM account WHERE user_id = $1 AND provider_id = 'credential'",
    [userId],
  );
  if (existing.rowCount > 0) {
    await client.query("UPDATE account SET password = $2 WHERE id = $1", [
      existing.rows[0].id,
      hash,
    ]);
    return;
  }
  await client.query(
    "INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES ($1, $2, 'credential', $2, $3)",
    [randomUUID(), userId, hash],
  );
}

async function upsertAssignment(client, userId, scopeType, scopeId, assignmentType, notes) {
  const existing = await client.query(
    "SELECT id FROM assignment WHERE user_id = $1 AND scope_type = $2 AND scope_id = $3 AND assignment_type = $4",
    [userId, scopeType, scopeId, assignmentType],
  );
  if (existing.rowCount > 0) {
    await client.query("UPDATE assignment SET active = true WHERE id = $1", [
      existing.rows[0].id,
    ]);
    return;
  }
  await client.query(
    "INSERT INTO assignment (user_id, scope_type, scope_id, assignment_type, notes, active) VALUES ($1, $2, $3, $4, $5, true)",
    [userId, scopeType, scopeId, assignmentType, notes],
  );
}

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const userIds = {};
  for (const account of ACCOUNTS) {
    const userId = await upsertUser(client, account);
    userIds[account.role] = userId;
    await upsertCredential(client, userId);
  }

  // Demo scope for the operational roles: the Aslab covers the whole
  // laboratory, while the PLP is only responsible for two assigned labs.
  const lab = await client.query("SELECT code FROM laboratory LIMIT 1");
  if (lab.rowCount > 0 && userIds.aslab) {
    await upsertAssignment(
      client,
      userIds.aslab,
      "LABORATORY",
      lab.rows[0].code,
      "ASLAB",
      "Seed demo aslab scope",
    );
  }
  if (userIds.plp) {
    for (const roomCode of ["lab-organik"]) {
      await upsertAssignment(
        client,
        userIds.plp,
        "ROOM",
        roomCode,
        "PLP",
        "Seed demo PLP scope",
      );
    }
    await client.query(
      "UPDATE assignment SET active = false WHERE user_id = $1 AND scope_id != 'lab-organik'",
      [userIds.plp],
    );
  }

  await client.query("COMMIT");
  console.log(
    `Seeded ${ACCOUNTS.length} demo accounts. Password source: ${
      process.env.SEED_ACCOUNT_PASSWORD ? "SEED_ACCOUNT_PASSWORD" : "development default"
    }.`,
  );
  for (const account of ACCOUNTS) {
    console.log(`- ${account.email} (${account.role})`);
  }
} catch (error) {
  await client.query("ROLLBACK");
  console.error(databaseError(error));
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
