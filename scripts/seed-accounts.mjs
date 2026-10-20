import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { loadEnvironment } from "./lib.mjs";
import { databaseUrl, databaseError } from "./postgres.mjs";

// Development-only demo accounts. The password can be overridden with
// SEED_ACCOUNT_PASSWORD. Never run this against production data.
const ACCOUNTS = [
  {
    email: "admin@reaksan.local",
    username: "admin",
    name: "Admin Reaksan",
    role: "admin",
  },
  {
    email: "plp@reaksan.local",
    username: "198503152010121001",
    name: "Koordinator PLP",
    role: "plp",
  },
  {
    email: "plp.organik@reaksan.local",
    username: "198706202014041002",
    name: "PLP Lab Organik",
    role: "plp",
  },
  {
    email: "plp.anorganik@reaksan.local",
    username: "198811102015031003",
    name: "PLP Lab Anorganik",
    role: "plp",
  },
  {
    email: "plp.biokimia@reaksan.local",
    username: "198904052016022001",
    name: "PLP Lab Biokimia",
    role: "plp",
  },
  {
    email: "plp.analitik@reaksan.local",
    username: "199008122018011002",
    name: "PLP Lab Analitik",
    role: "plp",
  },
  {
    email: "plp.fisik@reaksan.local",
    username: "199105222019031001",
    name: "PLP Lab Fisik",
    role: "plp",
  },
  {
    email: "student1@reaksan.local",
    username: "140310210001",
    name: "Mahasiswa Satu",
    role: "user",
  },
  {
    email: "student2@reaksan.local",
    username: "140310210002",
    name: "Mahasiswa Dua",
    role: "user",
  },
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
      'UPDATE "user" SET name = $2, role = $3, username = $4, banned = false, ban_reason = NULL, ban_expires = NULL WHERE id = $1',
      [existing.rows[0].id, account.name, account.role, account.username],
    );
    return existing.rows[0].id;
  }
  const id = randomUUID();
  await client.query(
    'INSERT INTO "user" (id, name, email, email_verified, role, username) VALUES ($1, $2, $3, false, $4, $5)',
    [id, account.name, account.email, account.role, account.username],
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

async function upsertAssignment(
  client,
  userId,
  scopeType,
  scopeId,
  assignmentType,
  notes,
) {
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
  const userIdsByEmail = {};
  for (const account of ACCOUNTS) {
    const userId = await upsertUser(client, account);
    userIdsByEmail[account.email] = userId;
    await upsertCredential(client, userId);
  }

  // Dedicated PLP per room
  const plpRoomMap = {
    "plp.organik@reaksan.local": "lab-organik",
    "plp.anorganik@reaksan.local": "lab-anorganik",
    "plp.biokimia@reaksan.local": "lab-biokimia",
    "plp.analitik@reaksan.local": "lab-analitik",
    "plp.fisik@reaksan.local": "lab-fisik",
  };

  for (const [email, roomCode] of Object.entries(plpRoomMap)) {
    const plpId = userIdsByEmail[email];
    if (plpId) {
      await upsertAssignment(
        client,
        plpId,
        "ROOM",
        roomCode,
        "PLP",
        `Penugasan dedicated PLP ${roomCode}`,
      );
    }
  }

  // Multi-lab / supervisor PLP
  if (userIdsByEmail["plp@reaksan.local"]) {
    for (const roomCode of [
      "lab-organik",
      "lab-anorganik",
      "lab-biokimia",
      "lab-analitik",
      "lab-fisik",
    ]) {
      await upsertAssignment(
        client,
        userIdsByEmail["plp@reaksan.local"],
        "ROOM",
        roomCode,
        "PLP",
        "Koordinator PLP multi-room scope",
      );
    }
  }

  await client.query("COMMIT");
  console.log(
    `Seeded ${ACCOUNTS.length} demo accounts. Password source: ${
      process.env.SEED_ACCOUNT_PASSWORD
        ? "SEED_ACCOUNT_PASSWORD"
        : "development default"
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
