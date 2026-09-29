import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSetting } from "@/db/schema";
import type { DbExecutor } from "@/services/executor";
import { writeAudit } from "@/services/audit.service";
import type { SettingsInput } from "@/validators/admin";

export type AppSettings = {
  cancellation_lead_time_minutes: number;
  low_stock_ratio: number;
  timezone: string;
  notification_policy: {
    request_submitted: boolean;
    request_decision: boolean;
    incident_reported: boolean;
  };
};

// Defaults keep every lab usable before an admin touches the configuration
// page. Stored rows override one key at a time. PLP access is not a setting:
// it comes from per-lab assignments in the assignment table.
export const defaultSettings: AppSettings = {
  cancellation_lead_time_minutes: 60,
  low_stock_ratio: 2,
  timezone: "Asia/Jakarta",
  notification_policy: {
    request_submitted: true,
    request_decision: true,
    incident_reported: true,
  },
};

export async function getAppSettings(): Promise<AppSettings> {
  const rows = await db.select().from(appSetting);
  const settings: AppSettings = {
    ...defaultSettings,
    notification_policy: { ...defaultSettings.notification_policy },
  };
  for (const row of rows) {
    if (row.key in settings) {
      (settings as Record<string, unknown>)[row.key] = row.value;
    }
  }
  return settings;
}

export async function updateAppSettings(
  actorId: string,
  input: SettingsInput,
): Promise<AppSettings> {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  return db.transaction(async (tx) => {
    for (const [key, value] of entries) {
      await tx
        .insert(appSetting)
        .values({ key, value, updatedById: actorId })
        .onConflictDoUpdate({
          target: appSetting.key,
          set: { value, updatedById: actorId },
        });
    }
    await writeAudit(tx, {
      actorId,
      action: "UPDATE",
      entityType: "app_setting",
      entityId: entries.map(([key]) => key).join(","),
      after: input,
    });
    const rows = await tx.select().from(appSetting);
    const settings: AppSettings = {
      ...defaultSettings,
      notification_policy: { ...defaultSettings.notification_policy },
    };
    for (const row of rows) {
      if (row.key in settings) {
        (settings as Record<string, unknown>)[row.key] = row.value;
      }
    }
    return settings;
  });
}

export async function findSetting(exec: DbExecutor, key: keyof AppSettings) {
  const [row] = await exec
    .select()
    .from(appSetting)
    .where(eq(appSetting.key, key))
    .limit(1);
  return row?.value;
}
