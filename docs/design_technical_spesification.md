# REAKSAN

## Technical Design Specification — v1.0

**Product:** Reaksan
**Architecture:** Fullstack Next.js — Modular Monolith
**Application:** Next.js + TypeScript (App Router)
**ORM:** Drizzle ORM
**Database:** PostgreSQL
**Authentication:** Better Auth
**UI:** Tailwind CSS + shadcn/ui
**Data Fetching:** Server Components + TanStack Query
**Forms:** React Hook Form + Zod
**Calendar:** FullCalendar

---

# 1. TECHNICAL ARCHITECTURE

Reaksan MVP menggunakan pendekatan:

> **Modular Monolith + Domain-Oriented Architecture**

Bukan microservices.

```text
NEXT.JS FULLSTACK APPLICATION
│
├── CLIENT UI
│   ├── Client Components
│   ├── shadcn/ui + Tailwind CSS
│   ├── TanStack Query
│   ├── React Hook Form + Zod
│   └── FullCalendar
│
├── SERVER LAYER
│   ├── Server Components
│   ├── Route Handlers / Server Actions
│   └── Domain Services (src/services)
│
├── DOMAIN LAYER
│   ├── Business Rules
│   ├── Availability
│   ├── Stock Reservation
│   ├── Conflict Detection
│   ├── Approval
│   ├── Accountability
│   └── State Transition
│
├── MODULES
│   ├── Auth (Better Auth)
│   ├── Users / RBAC
│   ├── Laboratories / Rooms
│   ├── Equipment
│   ├── Materials / Inventory
│   ├── Activities
│   ├── Requests
│   ├── Reservations
│   ├── Shared Usage
│   ├── Fulfillment
│   ├── Incidents
│   ├── Notifications
│   └── Audit
│
└── DATA LAYER
    └── Drizzle ORM + PostgreSQL
```

---

# 2. ARCHITECTURAL PRINCIPLES

## 2.1 Server Is Source of Truth

Client tidak boleh menjadi sumber kebenaran untuk:

* availability;
* reservation;
* stock;
* approval;
* permission;
* equipment status.

Client hanya menampilkan state dari server.

---

## 2.2 Business Logic Must Live in Domain Services

Jangan membuat logic seperti:

```text
if equipment.available
```

hanya di client.

Server harus melakukan:

```text
checkAvailability()
checkReservationConflict()
reserveEquipment()
```

---

## 2.3 Database Integrity

Database harus membantu menjaga:

* foreign key;
* unique constraint;
* check constraint jika memungkinkan;
* transaction integrity.

---

## 2.4 Critical Operations Are Transactional

Operasi berikut harus atomic:

```text
Approve Request
Reserve Equipment
Reserve Material
Issue Material
Issue Equipment
Return Equipment
Resolve Incident
```

---

# 3. FINAL ERD

```text
                                  ┌──────────────┐
                                  │     User     │
                                  └──────┬───────┘
                                         │
                     ┌───────────────────┼──────────────────┐
                     │                   │                  │
                     │                   │                  │
                     ▼                   ▼                  ▼
                 UserRole            Activity          Assignment
                     │                   │
                     ▼                   │
                   Role                  │
                     │                   │
                     ▼                   ▼
                Permission          ResourceRequest
                                         │
                         ┌───────────────┴───────────────┐
                         │                               │
                         ▼                               ▼
                EquipmentRequestItem             MaterialRequestItem
                         │                               │
                         ▼                               ▼
                 EquipmentAsset                    Material
                         │                               │
             ┌───────────┼───────────┐                  │
             │           │           │                  ▼
             ▼           ▼           ▼            MaterialBatch
        Reservation    Incident   Condition              │
             │           │        History                │
             │           │                               ▼
             │           │                        StockTransaction
             │           │
             ▼           ▼
       SharedUsage   Assessment
             │           │
             ▼           ▼
       SharedUsage   Evidence
                         │
                         ▼
                     Resolution


Laboratory
    │
    ▼
  Room
   │
   ├───────────────► EquipmentAsset
   │
   └───────────────► MaterialBatch
```

---

# 4. CARDINALITY

## Identity

```text
User 1 ────< UserRole >──── 1 Role

Role 1 ────< RolePermission >──── 1 Permission
```

Conceptually:

```text
User M:N Role
Role M:N Permission
```

---

## Laboratory

```text
Laboratory 1 ────< Room
Room 1 ────< EquipmentAsset
Room 1 ────< MaterialBatch
```

---

## Activity

```text
User 1 ────< Activity

Activity 1 ────< ResourceRequest

Activity N ──── 1 User
        supervisor
```

---

## Request

```text
ResourceRequest 1 ────< EquipmentRequestItem

ResourceRequest 1 ────< MaterialRequestItem
```

---

## Equipment

```text
EquipmentType 1 ────< EquipmentAsset

EquipmentAsset 1 ────< Reservation

EquipmentAsset 1 ────< ConditionHistory

EquipmentAsset 1 ────< Incident
```

---

## Material

```text
Material 1 ────< MaterialBatch

MaterialBatch 1 ────< StockTransaction
```

---

## Reservation

```text
Reservation 1 ────< SharedUsageRequest

Reservation 1 ────< SharedUsage
```

---

## Incident

```text
Incident 1 ────< IncidentEvidence

Incident 1 ──── 0..1 IncidentAssessment

Incident 1 ──── 0..1 IncidentResolution
```

---

# 5. DATABASE ENUMS

Recommended PostgreSQL/Drizzle enums (file `src/db/schema/enums.ts`):

```ts
import { pgEnum } from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

export const equipmentUsageTypeEnum = pgEnum("equipment_usage_type", [
  "BORROWABLE",
  "USAGE_ONLY",
]);

export const equipmentStatusEnum = pgEnum("equipment_status", [
  "AVAILABLE",
  "RESERVED",
  "IN_USE",
  "MAINTENANCE",
  "DAMAGED",
  "UNDER_INSPECTION",
  "RETIRED",
]);

export const equipmentConditionEnum = pgEnum("equipment_condition", [
  "GOOD",
  "MINOR_ISSUE",
  "DAMAGED",
  "UNKNOWN",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "THESIS_RESEARCH",
  "PRACTICUM",
  "COURSE_PROJECT",
  "GENERAL_RESEARCH",
  "OTHER",
]);

export const activityStatusEnum = pgEnum("activity_status", [
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
  "CANCELLED",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "DRAFT",
  "SUBMITTED",
  "PENDING_PLP",
  "REQUEST_REVISION",
  "APPROVED",
  "REJECTED",
  "READY_FOR_PICKUP",
  "ACTIVE",
  "RETURNED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "OVERDUE",
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "RESERVED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

export const sharedUsageRequestStatusEnum = pgEnum(
  "shared_usage_request_status",
  ["PENDING", "ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"],
);

export const incidentSeverityEnum = pgEnum("incident_severity", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "REPORTED",
  "UNDER_ASSESSMENT",
  "IN_MAINTENANCE",
  "RESOLVED",
]);

export const stockTransactionTypeEnum = pgEnum("stock_transaction_type", [
  "RECEIVE",
  "RESERVE",
  "RELEASE",
  "ISSUE",
  "ADJUST",
  "EXPIRE",
  "TRANSFER",
]);

export const assignmentScopeTypeEnum = pgEnum("assignment_scope_type", [
  "LABORATORY",
  "ROOM",
  "ACTIVITY",
  "EQUIPMENT",
  "RESOURCE",
]);

export const assignmentTypeEnum = pgEnum("assignment_type", [
  "ASLAB",
  "PIC",
  "PLP",
  "CUSTODIAN",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "REQUEST_SUBMITTED",
  "REQUEST_APPROVED",
  "REQUEST_REJECTED",
  "REQUEST_REVISION",
  "REQUEST_CANCELLED",
  "SHARED_USAGE_REQUESTED",
  "SHARED_USAGE_ACCEPTED",
  "SHARED_USAGE_DECLINED",
  "EQUIPMENT_ISSUED",
  "EQUIPMENT_RETURNED",
  "INCIDENT_REPORTED",
  "INCIDENT_UPDATED",
  "GENERAL",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "REQUEST_REVISION",
  "CANCEL",
  "RESERVE",
  "RELEASE",
  "ISSUE",
  "RETURN",
  "INSPECT",
  "REPORT_INCIDENT",
  "ASSESS_INCIDENT",
  "RESOLVE_INCIDENT",
  "ADJUST_STOCK",
]);
```

---

# 6. DRIZZLE SCHEMA — CORE IDENTITY

Setiap tabel memiliki filenya sendiri di `src/db/schema/` dan diekspor dari `src/db/schema/index.ts`. Foreign key memakai import sibling langsung dari file tabel terkait.

```ts
import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { userStatusEnum } from "./enums";

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  status: userStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const role = pgTable("role", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const permission = pgTable("permission", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const userRole = pgTable(
  "user_role",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const rolePermission = pgTable(
  "role_permission",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);
```

---

# 7. DRIZZLE SCHEMA — LABORATORY

```ts
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const laboratory = pgTable("laboratory", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  status: boolean("status").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const room = pgTable(
  "room",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    laboratoryId: uuid("laboratory_id")
      .notNull()
      .references(() => laboratory.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    description: text("description"),
    floor: text("floor"),
    mapPosition: jsonb("map_position"),
    status: boolean("status").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("room_laboratory_code_unique").on(
      table.laboratoryId,
      table.code,
    ),
    index("room_laboratory_idx").on(table.laboratoryId),
  ],
);
```

---

# 8. DRIZZLE SCHEMA — EQUIPMENT

```ts
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  equipmentConditionEnum,
  equipmentStatusEnum,
  equipmentUsageTypeEnum,
} from "./enums";
import { user } from "./identity";
import { room } from "./laboratory";

export const equipmentType = pgTable(
  "equipment_type",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    category: text("category"),
    description: text("description"),
    usageType: equipmentUsageTypeEnum("usage_type").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("equipment_type_category_idx").on(table.category)],
);

export const equipmentAsset = pgTable(
  "equipment_asset",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentTypeId: uuid("equipment_type_id")
      .notNull()
      .references(() => equipmentType.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id),
    assetCode: text("asset_code").notNull().unique(),
    serialNumber: text("serial_number"),
    status: equipmentStatusEnum("status").default("AVAILABLE").notNull(),
    condition: equipmentConditionEnum("condition").default("GOOD").notNull(),
    acquisitionDate: timestamp("acquisition_date", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("equipment_asset_type_idx").on(table.equipmentTypeId),
    index("equipment_asset_room_idx").on(table.roomId),
    index("equipment_asset_status_idx").on(table.status),
    index("equipment_asset_room_status_idx").on(table.roomId, table.status),
  ],
);

export const equipmentConditionHistory = pgTable(
  "equipment_condition_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentAssetId: uuid("equipment_asset_id")
      .notNull()
      .references(() => equipmentAsset.id),
    condition: equipmentConditionEnum("condition").notNull(),
    source: text("source").notNull(),
    recordedById: uuid("recorded_by_id")
      .notNull()
      .references(() => user.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("equipment_condition_history_asset_created_idx").on(
      table.equipmentAssetId,
      table.createdAt,
    ),
  ],
);
```

---

# 9. DRIZZLE SCHEMA — MATERIAL

```ts
import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { stockTransactionTypeEnum } from "./enums";
import { user } from "./identity";
import { room } from "./laboratory";

export const material = pgTable(
  "material",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    category: text("category"),
    baseUnit: text("base_unit").notNull(),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("material_name_idx").on(table.name),
    index("material_category_idx").on(table.category),
  ],
);

export const materialBatch = pgTable(
  "material_batch",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    materialId: uuid("material_id")
      .notNull()
      .references(() => material.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id),
    lotNumber: text("lot_number"),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    receivedDate: timestamp("received_date", { withTimezone: true }).notNull(),
    status: boolean("status").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("material_batch_material_idx").on(table.materialId),
    index("material_batch_room_idx").on(table.roomId),
    index("material_batch_expiry_idx").on(table.expiryDate),
    index("material_batch_material_expiry_idx").on(
      table.materialId,
      table.expiryDate,
    ),
  ],
);

export const materialDispensingRule = pgTable("material_dispensing_rule", {
  id: uuid("id").defaultRandom().primaryKey(),
  materialId: uuid("material_id")
    .notNull()
    .unique()
    .references(() => material.id),
  minimumQuantity: numeric("minimum_quantity", {
    precision: 14,
    scale: 3,
  }).notNull(),
  dispensingIncrement: numeric("dispensing_increment", {
    precision: 14,
    scale: 3,
  }).notNull(),
  maximumQuantity: numeric("maximum_quantity", {
    precision: 14,
    scale: 3,
  }).notNull(),
  unit: text("unit").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const stockTransaction = pgTable(
  "stock_transaction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    materialBatchId: uuid("material_batch_id")
      .notNull()
      .references(() => materialBatch.id),
    type: stockTransactionTypeEnum("type").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    beforeQuantity: numeric("before_quantity", {
      precision: 14,
      scale: 3,
    }).notNull(),
    afterQuantity: numeric("after_quantity", {
      precision: 14,
      scale: 3,
    }).notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    performedById: uuid("performed_by_id")
      .notNull()
      .references(() => user.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("stock_transaction_batch_created_idx").on(
      table.materialBatchId,
      table.createdAt,
    ),
    index("stock_transaction_reference_idx").on(
      table.referenceType,
      table.referenceId,
    ),
  ],
);
```

---

# 10. DRIZZLE SCHEMA — ACTIVITY

```ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { activityStatusEnum, activityTypeEnum } from "./enums";
import { user } from "./identity";

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => user.id),
    supervisorId: uuid("supervisor_id")
      .notNull()
      .references(() => user.id),
    title: text("title").notNull(),
    type: activityTypeEnum("type").notNull(),
    description: text("description"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    status: activityStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("activity_student_idx").on(table.studentId),
    index("activity_supervisor_idx").on(table.supervisorId),
    index("activity_status_idx").on(table.status),
    index("activity_period_idx").on(table.startDate, table.endDate),
  ],
);
```

---

# 11. DRIZZLE SCHEMA — REQUEST

```ts
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { requestStatusEnum } from "./enums";
import { activity } from "./activity";
import { user } from "./identity";

export const resourceRequest = pgTable(
  "resource_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activity.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => user.id),
    supervisorId: uuid("supervisor_id")
      .notNull()
      .references(() => user.id),
    title: text("title").notNull(),
    purpose: text("purpose").notNull(),
    description: text("description"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    practicalPlan: jsonb("practical_plan").notNull(),
    status: requestStatusEnum("status").default("DRAFT").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("resource_request_student_idx").on(table.studentId),
    index("resource_request_activity_idx").on(table.activityId),
    index("resource_request_status_idx").on(table.status),
    index("resource_request_period_idx").on(table.startAt, table.endAt),
  ],
);
```

---

# 12. DRIZZLE SCHEMA — REQUEST ITEMS

```ts
import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { equipmentAsset } from "./equipment";
import { material } from "./material";
import { resourceRequest } from "./request";

export const equipmentRequestItem = pgTable(
  "equipment_request_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => resourceRequest.id, { onDelete: "cascade" }),
    equipmentAssetId: uuid("equipment_asset_id")
      .notNull()
      .references(() => equipmentAsset.id),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    purpose: text("purpose"),
    usagePlan: jsonb("usage_plan"),
  },
  (table) => [
    index("equipment_request_item_request_idx").on(table.requestId),
    index("equipment_request_item_asset_period_idx").on(
      table.equipmentAssetId,
      table.startAt,
      table.endAt,
    ),
  ],
);

export const materialRequestItem = pgTable(
  "material_request_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => resourceRequest.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => material.id),
    requestedQuantity: numeric("requested_quantity", {
      precision: 14,
      scale: 3,
    }).notNull(),
    unit: text("unit").notNull(),
  },
  (table) => [
    index("material_request_item_request_idx").on(table.requestId),
    index("material_request_item_material_idx").on(table.materialId),
  ],
);
```

---

# 13. DRIZZLE SCHEMA — RESERVATION

```ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { reservationStatusEnum } from "./enums";
import { equipmentAsset } from "./equipment";
import { user } from "./identity";
import { resourceRequest } from "./request";

export const reservation = pgTable(
  "reservation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentAssetId: uuid("equipment_asset_id")
      .notNull()
      .references(() => equipmentAsset.id),
    requestId: uuid("request_id")
      .notNull()
      .references(() => resourceRequest.id),
    primaryUserId: uuid("primary_user_id")
      .notNull()
      .references(() => user.id),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: reservationStatusEnum("status").default("RESERVED").notNull(),
    purpose: text("purpose"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("reservation_asset_period_idx").on(
      table.equipmentAssetId,
      table.startAt,
      table.endAt,
    ),
    index("reservation_primary_user_idx").on(table.primaryUserId),
    index("reservation_request_idx").on(table.requestId),
    index("reservation_status_idx").on(table.status),
  ],
);
```

---

# 14. DRIZZLE SCHEMA — SHARED USAGE

```ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sharedUsageRequestStatusEnum } from "./enums";
import { user } from "./identity";
import { reservation } from "./reservation";

export const sharedUsageRequest = pgTable(
  "shared_usage_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservation.id),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => user.id),
    requestedStartAt: timestamp("requested_start_at", {
      withTimezone: true,
    }).notNull(),
    requestedEndAt: timestamp("requested_end_at", {
      withTimezone: true,
    }).notNull(),
    purpose: text("purpose"),
    status: sharedUsageRequestStatusEnum("status")
      .default("PENDING")
      .notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("shared_usage_request_reservation_idx").on(table.reservationId),
    index("shared_usage_request_requester_idx").on(table.requesterId),
    index("shared_usage_request_status_idx").on(table.status),
  ],
);

export const sharedUsage = pgTable(
  "shared_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservation.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    purpose: text("purpose"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("shared_usage_reservation_period_idx").on(
      table.reservationId,
      table.startAt,
      table.endAt,
    ),
    index("shared_usage_user_idx").on(table.userId),
  ],
);
```

---

# 15. DRIZZLE SCHEMA — FULFILLMENT

```ts
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { equipmentConditionEnum } from "./enums";
import { equipmentAsset } from "./equipment";
import { user } from "./identity";
import { materialBatch } from "./material";
import { resourceRequest } from "./request";

export const issueTransaction = pgTable(
  "issue_transaction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => resourceRequest.id),
    equipmentAssetId: uuid("equipment_asset_id").references(
      () => equipmentAsset.id,
    ),
    materialBatchId: uuid("material_batch_id").references(
      () => materialBatch.id,
    ),
    issuedToId: uuid("issued_to_id")
      .notNull()
      .references(() => user.id),
    quantity: numeric("quantity", { precision: 14, scale: 3 }),
    issuedById: uuid("issued_by_id")
      .notNull()
      .references(() => user.id),
    conditionAtIssue: equipmentConditionEnum("condition_at_issue"),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("issue_transaction_request_idx").on(table.requestId),
    index("issue_transaction_asset_idx").on(table.equipmentAssetId),
    index("issue_transaction_batch_idx").on(table.materialBatchId),
    index("issue_transaction_recipient_idx").on(table.issuedToId),
  ],
);

export const returnTransaction = pgTable(
  "return_transaction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    issueTransactionId: uuid("issue_transaction_id")
      .notNull()
      .unique()
      .references(() => issueTransaction.id),
    equipmentAssetId: uuid("equipment_asset_id")
      .notNull()
      .references(() => equipmentAsset.id),
    returnedById: uuid("returned_by_id")
      .notNull()
      .references(() => user.id),
    receivedById: uuid("received_by_id")
      .notNull()
      .references(() => user.id),
    conditionAtReturn: equipmentConditionEnum("condition_at_return").notNull(),
    notes: text("notes"),
    returnedAt: timestamp("returned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("return_transaction_asset_idx").on(table.equipmentAssetId),
  ],
);
```

---

# 16. DRIZZLE SCHEMA — INCIDENT

```ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { incidentSeverityEnum, incidentStatusEnum } from "./enums";
import { activity } from "./activity";
import { equipmentAsset } from "./equipment";
import { user } from "./identity";
import { resourceRequest } from "./request";
import { reservation } from "./reservation";

export const incident = pgTable(
  "incident",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentAssetId: uuid("equipment_asset_id")
      .notNull()
      .references(() => equipmentAsset.id),
    requestId: uuid("request_id").references(() => resourceRequest.id),
    reservationId: uuid("reservation_id").references(() => reservation.id),
    activityId: uuid("activity_id").references(() => activity.id),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => user.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    severity: incidentSeverityEnum("severity").default("MEDIUM").notNull(),
    status: incidentStatusEnum("status").default("REPORTED").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("incident_asset_idx").on(table.equipmentAssetId),
    index("incident_request_idx").on(table.requestId),
    index("incident_reservation_idx").on(table.reservationId),
    index("incident_reporter_idx").on(table.reporterId),
    index("incident_status_idx").on(table.status),
  ],
);

export const incidentAssessment = pgTable("incident_assessment", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id")
    .notNull()
    .unique()
    .references(() => incident.id),
  assessedById: uuid("assessed_by_id")
    .notNull()
    .references(() => user.id),
  finding: text("finding").notNull(),
  assessment: text("assessment").notNull(),
  recommendedAction: text("recommended_action"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const incidentEvidence = pgTable(
  "incident_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incident.id),
    fileUrl: text("file_url").notNull(),
    fileType: text("file_type"),
    uploadedById: uuid("uploaded_by_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("incident_evidence_incident_idx").on(table.incidentId)],
);

export const incidentResolution = pgTable("incident_resolution", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id")
    .notNull()
    .unique()
    .references(() => incident.id),
  resolvedById: uuid("resolved_by_id")
    .notNull()
    .references(() => user.id),
  action: text("action").notNull(),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

---

# 17. DRIZZLE SCHEMA — ASSIGNMENT

```ts
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { assignmentScopeTypeEnum, assignmentTypeEnum } from "./enums";
import { user } from "./identity";

export const assignment = pgTable(
  "assignment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    scopeType: assignmentScopeTypeEnum("scope_type").notNull(),
    scopeId: text("scope_id").notNull(),
    assignmentType: assignmentTypeEnum("assignment_type").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("assignment_user_idx").on(table.userId),
    index("assignment_scope_idx").on(table.scopeType, table.scopeId),
    index("assignment_type_idx").on(table.assignmentType),
    index("assignment_active_idx").on(table.active),
  ],
);
```

`scopeId` bersifat polymorphic reference sehingga validasinya dilakukan di application layer.

---

# 18. DRIZZLE SCHEMA — NOTIFICATION

```ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { notificationTypeEnum } from "./enums";
import { user } from "./identity";

export const notification = pgTable(
  "notification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notification_recipient_read_idx").on(
      table.recipientId,
      table.readAt,
    ),
    index("notification_recipient_created_idx").on(
      table.recipientId,
      table.createdAt,
    ),
  ],
);
```

---

# 19. DRIZZLE SCHEMA — AUDIT

```ts
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { auditActionEnum } from "./enums";
import { user } from "./identity";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: auditActionEnum("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
    index("audit_log_actor_idx").on(table.actorId),
    index("audit_log_created_idx").on(table.createdAt),
    index("audit_log_action_idx").on(table.action),
  ],
);
```

---

# 20. BETTER AUTH TABLES

Better Auth memiliki tabel internal sendiri sesuai konfigurasi library. Tabel ini tetap didefinisikan sebagai schema Drizzle di `src/db/schema/` dan dimigrasikan dengan Drizzle Kit.

Minimal:

```text
User
Session
Account
Verification
```

Business user domain harus terintegrasi dengan authentication identity tanpa menduplikasi password/session management.

Jika Better Auth membutuhkan schema tambahan, gunakan schema yang dihasilkan/direkomendasikan oleh versi library yang digunakan.

---

# 21. INDEXING STRATEGY

Index utama:

## Equipment

```text
equipmentTypeId
roomId
status
roomId + status
equipmentAssetId + reservation time
```

## Material

```text
materialId
roomId
expiryDate
materialId + expiryDate
```

## Request

```text
studentId
activityId
status
startAt + endAt
```

## Reservation

```text
equipmentAssetId + startAt + endAt
status
primaryUserId
```

## Incident

```text
equipmentAssetId
requestId
status
reporterId
```

## Audit

```text
entityType + entityId
actorId
createdAt
action
```

---

# 22. RESERVATION CONFLICT ALGORITHM

Dua interval dianggap conflict jika:

```text
existing.startAt < requested.endAt
AND
existing.endAt > requested.startAt
```

Contoh:

```text
Existing:
08:00 → 12:00

Requested:
10:00 → 14:00
```

Conflict.

Namun:

```text
Existing:
08:00 → 12:00

Requested:
12:00 → 14:00
```

Tidak conflict.

---

# 23. RESERVATION VALIDATION FLOW

```text id="2n8d1h"
Receive Request
      ↓
Validate startAt < endAt
      ↓
Validate equipment status
      ↓
Find overlapping reservations
      ↓
Ignore CANCELLED / EXPIRED
      ↓
If overlap exists
      ↓
CONFLICT
      │
      └── Reject reservation
```

Query conceptual:

```sql
SELECT id
FROM reservation
WHERE equipment_asset_id = :assetId
  AND status IN ('RESERVED', 'ACTIVE')
  AND start_at < :requestedEnd
  AND end_at > :requestedStart
LIMIT 1;
```

---

# 24. CONCURRENCY CONTROL

Availability check saja tidak cukup.

Dua request dapat melakukan:

```text
Request A → check → available
Request B → check → available
Request A → reserve
Request B → reserve
```

Maka terjadi double booking.

Solusi MVP:

> Use PostgreSQL transaction + appropriate locking.

Saat approval:

```text
BEGIN

Lock relevant equipment reservation/resource state

Re-check conflict

Create reservation

COMMIT
```

Untuk production-hardening, PostgreSQL exclusion constraints pada range timestamp dapat dipertimbangkan untuk reservation table.

---

# 25. STOCK RESERVATION ALGORITHM

Misal:

```text
Physical = 5 L
Reserved = 2 L
Available = 3 L
```

Request:

```text
2.5 L
```

Validation:

```text
2.5 <= 3
```

→ valid.

Request:

```text
3.5 L
```

→ invalid.

---

# 26. STOCK RESERVATION TRANSACTION

```text id="yp95zt"
BEGIN
   ↓
Load material batches
   ↓
Lock relevant stock rows
   ↓
Calculate available stock
   ↓
Validate requested quantity
   ↓
Create RESERVE transactions
   ↓
Update reserved allocation
   ↓
Create audit
   ↓
COMMIT
```

---

# 27. IMPORTANT STOCK DESIGN DECISION

Physical quantity **tidak dikurangi saat approval**.

Approval hanya mengalokasikan quantity.

Concept:

```text
Physical Stock
      │
      ├── Reserved
      │
      └── Available
```

Saat issue:

```text
Physical ↓
Reserved ↓
```

---

# 28. BATCH ALLOCATION

Untuk MVP, batch allocation dapat dilakukan saat fulfillment.

Strategy:

```text
Select eligible batches
       ↓
Filter:
- active
- sufficient quantity
- not expired
       ↓
Sort by expiryDate ASC
       ↓
Allocate
```

Ini memungkinkan FEFO-style allocation tanpa mengunci implementasi menjadi SOP laboratorium tertentu.

---

# 29. REQUEST APPROVAL TRANSACTION

Approval harus:

```text id="9v9yn1"
BEGIN

1. Verify requester
2. Verify request state
3. Validate activity
4. Validate supervisor
5. Validate equipment
6. Validate equipment conflicts
7. Validate material stock
8. Reserve equipment
9. Reserve material stock
10. Update request → APPROVED
11. Create audit log
12. Create notification

COMMIT
```

Jika langkah 8 atau 9 gagal:

```text
ROLLBACK
```

---

# 30. ISSUE TRANSACTION

```text id="v9f54m"
BEGIN

Validate request = READY_FOR_PICKUP

Equipment:
- verify reservation
- verify status

Material:
- verify reserved quantity

Create issue transaction

Equipment → IN_USE

Material physical stock ↓
Material reserved allocation ↓

Request → ACTIVE

Create audit
Create notification

COMMIT
```

---

# 31. RETURN TRANSACTION

```text id="s2u2me"
BEGIN

Validate active equipment issue

Create return transaction

Equipment → UNDER_INSPECTION

Request → RETURNED

Create audit

COMMIT
```

Inspection berikutnya menentukan:

```text
AVAILABLE
MAINTENANCE
DAMAGED
RETIRED
```

---

# 32. EXACT REQUEST TRANSITIONS

| From             | Action         | To               | Actor        |
| ---------------- | -------------- | ---------------- | ------------ |
| DRAFT            | Submit         | PENDING_PLP      | Student      |
| SUBMITTED        | System process | PENDING_PLP      | System       |
| PENDING_PLP      | Approve        | APPROVED         | PLP/Admin    |
| PENDING_PLP      | Reject         | REJECTED         | PLP/Admin    |
| PENDING_PLP      | Revision       | REQUEST_REVISION | PLP/Admin    |
| REQUEST_REVISION | Resubmit       | PENDING_PLP      | Student      |
| PENDING_PLP      | Cancel         | CANCELLED        | Student      |
| APPROVED         | Prepare        | READY_FOR_PICKUP | System/PLP   |
| APPROVED         | Cancel         | CANCELLED        | Student/PLP* |
| READY_FOR_PICKUP | Issue          | ACTIVE           | PLP          |
| ACTIVE           | Return         | RETURNED         | PLP          |
| RETURNED         | Complete       | COMPLETED        | System/PLP   |

`*` subject to cancellation policy.

---

# 33. INVALID REQUEST TRANSITIONS

Contoh:

```text
COMPLETED → APPROVED
```

Invalid.

```text
REJECTED → ACTIVE
```

Invalid.

```text
ACTIVE → CANCELLED
```

Invalid.

```text
RETURNED → ACTIVE
```

Invalid.

Server harus memiliki explicit transition guard.

---

# 34. EQUIPMENT TRANSITION RULES

### AVAILABLE → RESERVED

Only when approved request creates reservation.

### RESERVED → IN_USE

When equipment is issued.

### IN_USE → UNDER_INSPECTION

When returned.

### UNDER_INSPECTION → AVAILABLE

Inspection = GOOD.

### UNDER_INSPECTION → MAINTENANCE

Repair required.

### UNDER_INSPECTION → RETIRED

No longer usable.

### MAINTENANCE → AVAILABLE

After maintenance completion.

### Any active state → DAMAGED

Only authorized incident/inspection workflow.

---

# 35. AUTHORIZATION MODEL

Authorization =

```text
Identity
+
Role
+
Permission
+
Scope
+
Resource Ownership
```

---

# 36. STUDENT SCOPING

Student dapat:

```text
READ:
- public laboratory resources
- availability
- relevant usage plans

WRITE:
- own activities
- own requests
- own incident reports

UPDATE:
- own draft/revision requests
```

Student tidak dapat:

```text
Update another student's request
Approve request
Adjust stock
Change equipment status
```

---

# 37. PLP SCOPING

PLP dapat:

```text
View:
- requests
- inventory
- reservations
- incidents

Manage:
- approval
- issue
- return
- inspection
- stock
- incident
```

Jika organisasi memiliki PLP scope per laboratory, authorization dapat dibatasi berdasarkan assignment.

---

# 38. LECTURER SCOPING

Lecturer dapat melihat:

```text
Activity
Request
Resource Usage
Incident
```

hanya jika:

```text
activity.supervisorId === currentUser.id
```

Lecturer tidak dapat:

```text
Approve
Reject
Adjust Stock
Issue
Return
```

---

# 39. ASLAB SCOPING

Aslab dapat mengakses resource sesuai assignment:

```text
Assignment
scopeType
scopeId
assignmentType
```

Contoh:

```text
ASLAB
LABORATORY
LAB-03
```

Maka Aslab dapat melihat relevant operations di LAB-03.

---

# 40. ADMIN SCOPING

Admin memiliki system-level access.

Namun:

> Administrative power does not bypass audit.

Critical admin actions tetap dicatat.

---

# 41. API RESPONSE STANDARD

## Success

```json
{
  "data": {
    "id": "req_123",
    "status": "PENDING_PLP"
  }
}
```

List:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

---

# 42. API ERROR STANDARD

```json
{
  "error": {
    "code": "RESERVATION_CONFLICT",
    "message": "The selected equipment is unavailable for the requested time.",
    "details": {
      "equipmentAssetId": "asset_123"
    }
  }
}
```

HTTP mapping:

```text
400 → validation
401 → unauthenticated
403 → forbidden
404 → not found
409 → business conflict
422 → semantic validation
500 → internal error
```

---

# 43. ACTIVITY DTO

```typescript
type CreateActivityDto = {
  title: string;
  type: ActivityType;
  description?: string;
  supervisorId: string;
  startDate: string;
  endDate: string;
};
```

Validation:

```text
title → required, min 3 chars
type → valid enum
supervisorId → existing lecturer
startDate < endDate
```

---

# 44. REQUEST DTO

```typescript
type CreateResourceRequestDto = {
  activityId: string;

  title: string;
  purpose: string;
  description?: string;

  startAt: string;
  endAt: string;

  practicalPlan: PracticalPlanDto;

  equipmentItems: EquipmentRequestItemDto[];
  materialItems: MaterialRequestItemDto[];
};
```

---

# 45. EQUIPMENT ITEM DTO

```typescript
type EquipmentRequestItemDto = {
  equipmentAssetId: string;
  startAt: string;
  endAt: string;
  purpose?: string;
  usagePlan?: UsagePlanDto;
};
```

---

# 46. MATERIAL ITEM DTO

```typescript
type MaterialRequestItemDto = {
  materialId: string;
  requestedQuantity: number;
  unit: string;
};
```

---

# 47. SHARED USAGE DTO

```typescript
type CreateSharedUsageRequestDto = {
  reservationId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  purpose?: string;
};
```

Validation:

```text
start < end

requestedStart >= reservation.startAt

requestedEnd <= reservation.endAt

requester != reservation.primaryUser
```

---

# 48. INCIDENT DTO

```typescript
type CreateIncidentDto = {
  equipmentAssetId: string;

  requestId?: string;
  reservationId?: string;
  activityId?: string;

  title: string;
  description: string;

  severity: IncidentSeverity;
};
```

Validation:

* equipment exists;
* equipment is accessible;
* request/reservation relationship valid if supplied.

---

# 49. REQUEST VALIDATION RULES

## General

```text
title required
purpose required
startAt < endAt
activity must exist
student must own activity
supervisor must match activity
```

## Equipment

```text
asset exists
asset active
asset not RETIRED
asset not MAINTENANCE
asset not DAMAGED
no overlapping reservation
```

## Material

```text
material active
quantity > 0
unit matches material rule
quantity >= minimum
quantity respects increment
quantity <= maximum
```

---

# 50. RESOURCE VISIBILITY RULE

Student dapat melihat occupied reservation:

```text
User Name
Activity Title
Purpose
Time
Usage Plan
```

Tidak boleh:

```text
Email
Phone
Authentication data
Private notes
Internal PLP notes
```

---

# 51. FRONTEND ROUTE ARCHITECTURE

Root:

```text
/
├── login
├── unauthorized
└── dashboard
```

Role-aware application:

```text
/student/*
/plp/*
/lecturer/*
/aslab/*
/admin/*
```

---

# 52. STUDENT ROUTES

```text
/student/dashboard

/student/laboratory
/student/laboratory/map
/student/laboratory/rooms/[roomId]

/student/equipment
/student/equipment/[assetId]

/student/materials
/student/materials/[materialId]

/student/activities
/student/activities/new
/student/activities/[activityId]

/student/requests
/student/requests/new
/student/requests/[requestId]

/student/calendar

/student/shared-usage

/student/incidents
/student/incidents/new
/student/incidents/[incidentId]

/student/notifications
```

---

# 53. PLP ROUTES

```text
/plp/dashboard

/plp/requests
/plp/requests/[requestId]

/plp/schedule

/plp/inventory/equipment
/plp/inventory/equipment/[assetId]

/plp/inventory/materials
/plp/inventory/materials/[materialId]

/plp/fulfillment
/plp/fulfillment/issue
/plp/fulfillment/return

/plp/incidents
/plp/incidents/[incidentId]

/plp/history
```

---

# 54. LECTURER ROUTES

```text
/lecturer/dashboard

/lecturer/students
/lecturer/students/[studentId]

/lecturer/activities
/lecturer/activities/[activityId]

/lecturer/resource-usage

/lecturer/incidents

/lecturer/notifications
```

---

# 55. ASLAB ROUTES

```text
/aslab/dashboard
/aslab/assignments
/aslab/schedule
/aslab/activities
/aslab/resource-usage
/aslab/incidents
```

---

# 56. ADMIN ROUTES

```text
/admin/dashboard

/admin/users
/admin/roles
/admin/permissions

/admin/laboratories
/admin/rooms

/admin/equipment
/admin/equipment/assets

/admin/materials
/admin/materials/batches

/admin/assignments

/admin/configuration

/admin/audit-logs
```

---

# 57. FRONTEND COMPONENT ARCHITECTURE

```text
components/
│
├── ui/
│   ├── button
│   ├── dialog
│   ├── input
│   ├── select
│   ├── table
│   ├── tabs
│   └── ...
│
├── layout/
│   ├── AppShell
│   ├── Sidebar
│   ├── Header
│   └── PageContainer
│
├── laboratory/
│   ├── LabMap
│   ├── RoomCard
│   └── RoomStats
│
├── equipment/
│   ├── EquipmentCard
│   ├── AssetStatusBadge
│   ├── EquipmentDetail
│   ├── AvailabilityCalendar
│   └── EquipmentTimeline
│
├── materials/
│   ├── MaterialCard
│   ├── StockIndicator
│   ├── BatchTable
│   └── StockHistory
│
├── activity/
│   ├── ActivityCard
│   ├── ActivityForm
│   └── ActivityTimeline
│
├── request/
│   ├── RequestForm
│   ├── RequestSummary
│   ├── RequestStatus
│   ├── RequestTimeline
│   └── RequestReview
│
├── shared-usage/
│   ├── SharedUsageRequestCard
│   └── SharedUsageDialog
│
├── fulfillment/
│   ├── IssuePanel
│   ├── ReturnPanel
│   └── InspectionPanel
│
├── incident/
│   ├── IncidentForm
│   ├── IncidentDetail
│   ├── EvidenceUploader
│   └── IncidentTimeline
│
└── notifications/
    ├── NotificationList
    └── NotificationItem
```

---

# 58. DATA FETCHING ARCHITECTURE

TanStack Query keys:

```typescript
['laboratories']

['rooms', roomId]

['equipment-assets']
['equipment-assets', assetId]
['equipment-availability', assetId]

['materials']
['materials', materialId]
['material-stock', materialId]

['activities']
['activities', activityId]

['requests']
['requests', requestId]

['reservations', assetId]

['shared-usage-requests']

['incidents']
['incidents', incidentId]

['notifications']
```

Mutations harus melakukan invalidation terhadap query terkait.

---

# 59. FORM ARCHITECTURE

React Hook Form:

```text
ActivityForm
RequestForm
MaterialRequestForm
IncidentForm
AdminEquipmentForm
AdminMaterialForm
```

Zod schema:

```text
activity.schema.ts
request.schema.ts
equipment.schema.ts
material.schema.ts
incident.schema.ts
```

Frontend validation meningkatkan UX.

Server tetap melakukan validation kedua.

---

# 60. LOADING STATES

Setiap page harus memiliki loading state.

Contoh:

```text
Skeleton
```

bukan blank screen.

Student dashboard:

```text
DashboardSkeleton
```

Inventory:

```text
TableSkeleton
```

Equipment detail:

```text
EquipmentDetailSkeleton
```

Calendar:

```text
CalendarSkeleton
```

---

# 61. EMPTY STATES

Empty state harus actionable.

Contoh:

```text
No Research Activities

You haven't created a research activity yet.

[Create Activity]
```

Inventory:

```text
No equipment found.

Try changing your filters.
```

Request:

```text
No requests yet.

[Create Resource Request]
```

---

# 62. ERROR STATES

Error harus membedakan:

### Network error

```text
Unable to connect to Reaksan.
[Retry]
```

### Permission error

```text
You don't have permission to access this resource.
```

### Business error

```text
This equipment is no longer available for the selected time.
```

### Server error

```text
Something went wrong.
Please try again.
```

---

# 63. TOAST RULES

Toast hanya untuk feedback singkat.

Contoh:

```text
Request submitted successfully.
```

Jangan gunakan toast sebagai satu-satunya tempat untuk informasi critical.

Critical error harus juga tampil di page/form.

---

# 64. NOTIFICATION EVENT MAP

## Request Submitted

```text
Student
   ↓
Submit Request
   ↓
Notification → PLP
```

## Request Approved

```text
PLP
   ↓
Approve
   ↓
Notification → Student
```

## Request Rejected

```text
PLP
   ↓
Reject
   ↓
Notification → Student
```

## Revision Requested

```text
PLP
   ↓
Request Revision
   ↓
Notification → Student
```

---

# 65. SHARED USAGE NOTIFICATION

```text
Student B
   ↓
Request Shared Usage
   ↓
Notification → Student A
```

Accept:

```text
Student A
   ↓
Accept
   ↓
Notification → Student B
```

Decline:

```text
Student A
   ↓
Decline
   ↓
Notification → Student B
```

---

# 66. INCIDENT NOTIFICATION

```text
Incident Reported
       ↓
PLP Notification
       ↓
Assessment
       ↓
Relevant Student
       +
Supervisor
       +
Aslab/PIC if relevant
```

Recipients should be determined by relationship/scope.

---

# 67. AUDIT EVENT MAP

Critical event:

```text
User Action
    ↓
Domain Service
    ↓
Database Transaction
    ↓
Audit Log
```

Examples:

```text
Request Approved
→ Audit

Equipment Issued
→ Audit

Material Issued
→ Audit

Stock Adjusted
→ Audit

Incident Assessed
→ Audit

Equipment Condition Changed
→ Audit
```

---

# 68. AUDIT DATA POLICY

Audit log:

* append-oriented;
* not user-editable;
* not normally deletable;
* timestamps server-generated;
* actor identified where possible.

Before/after snapshots digunakan hanya jika diperlukan.

---

# 69. SEED DATA

Seed harus menyediakan environment demo yang realistis.

## Users

```text
admin@reaksan.local
plp@reaksan.local
lecturer@reaksan.local
aslab@reaksan.local
student1@reaksan.local
student2@reaksan.local
```

Password demo hanya untuk development.

---

# 70. ROLES

Seed:

```text
ADMIN
PLP
LECTURER
ASLAB
STUDENT
```

Permissions seed:

```text
laboratory:view

equipment:view
equipment:create
equipment:update

material:view
material:create
material:update
inventory:adjust

activity:create
activity:view
activity:update

request:create
request:view
request:submit
request:approve
request:reject
request:revision
request:cancel

reservation:view
shared-usage:create
shared-usage:respond

fulfillment:issue
fulfillment:return
fulfillment:inspect

incident:create
incident:assess
incident:resolve

audit:view
```

---

# 71. LAB SEED

MVP:

```text
LAB-01
LAB-02
LAB-03
LAB-04
LAB-05
```

Nama dapat dikonfigurasi.

---

# 72. EQUIPMENT SEED

Contoh:

```text
Oven
├── OVN-001
├── OVN-002
└── OVN-003

Analytical Balance
├── BAL-001
└── BAL-002

Spectrophotometer
├── SPC-001
└── SPC-002
```

Beberapa asset:

```text
BORROWABLE
```

dan beberapa:

```text
USAGE_ONLY
```

agar kedua workflow dapat diuji.

---

# 73. MATERIAL SEED

Contoh:

```text
HCl
Ethanol
NaOH
Acetone
Distilled Water
```

Setiap material memiliki:

* base unit;
* batch;
* quantity;
* expiry;
* dispensing rule.

Nilai seed hanya untuk demo/testing dan bukan SOP laboratorium.

---

# 74. ACTIVITY SEED

```text
Sintesis Senyawa X
Student 1
Supervisor 1
THESIS_RESEARCH
```

```text
Analisis Sampel Y
Student 2
Supervisor 1
THESIS_RESEARCH
```

---

# 75. RESERVATION SEED

Buat reservation demo agar calendar tidak kosong.

Contoh:

```text
OVN-001

18 Sep 2026
08:00–12:00
Student 1
Drying Sample
```

Kemudian:

```text
18 Sep 2026
12:00–16:00
AVAILABLE
```

Ini memungkinkan demo shared usage.

---

# 76. INCIDENT SEED

Buat minimal satu resolved incident:

```text
OVN-002
Incident:
Temperature controller issue

Status:
RESOLVED

Assessment:
Controller required servicing.
```

---

# 77. ENVIRONMENT VARIABLES

Aplikasi fullstack memakai satu set environment:

```env
NODE_ENV=development

DATABASE_URL=postgresql://user:password@localhost:5432/reaksan

BETTER_AUTH_SECRET=change-me
BETTER_AUTH_URL=http://localhost:3000
```

---

# 78. ENVIRONMENT NOTES

- `DATABASE_URL` adalah koneksi runtime untuk Drizzle.
- `MIGRATION_DATABASE_URL` opsional, dipakai khusus untuk migrasi bila provider memisahkan koneksi pooled dan direct.
- Nilai environment disimpan di `.env.local` dan tidak di-commit.
- `BETTER_AUTH_URL` harus sama dengan origin aplikasi yang berjalan, termasuk port.

---

# 79. FILE STORAGE

Untuk incident evidence:

```env
STORAGE_PROVIDER=local
STORAGE_BUCKET=reaksan
```

Production dapat menggunakan object storage.

Contoh future:

```text
S3-compatible storage
```

Jangan menyimpan file binary besar langsung di PostgreSQL.

---

# 80. OPTIONAL ENVIRONMENT VARIABLES

Jika dibutuhkan:

```env
REDIS_URL=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

Redis tidak wajib pada MVP.

---

# 81. PROJECT FOLDER STRUCTURE

Satu aplikasi Next.js (fullstack):

```text
src/
├── app/
│   ├── (auth)/
│   │   └── sign-in/
│   │
│   ├── (protected)/
│   │   └── app/
│   │
│   └── api/
│       ├── auth/[...all]/
│       ├── activities/
│       ├── requests/
│       ├── reservations/
│       ├── shared-usage/
│       ├── fulfillment/
│       ├── incidents/
│       └── notifications/
│
├── components/
│   ├── ui/
│   └── <domain>/
│
├── db/
│   ├── schema/
│   └── index.ts
│
├── lib/
│   ├── auth.ts
│   ├── auth-client.ts
│   ├── session.ts
│   ├── permissions.ts
│   └── api.ts
│
├── services/
│   └── <domain>/
│
└── validators/
    └── <domain>.ts
```

---

# 82. FEATURE-BASED FRONTEND

`components/` dan `services/` diorganisasi per domain:

```text
laboratory/
equipment/
materials/
activities/
requests/
reservations/
shared-usage/
fulfillment/
incidents/
notifications/
administration/
```

Setiap feature dapat memiliki:

```text
components/
hooks/
queries/
mutations/
types/
schemas/
utils/
```

---

# 83. SERVER FOLDER STRUCTURE

```text
src/
├── app/
│   └── api/              # route handlers per domain
│
├── services/             # domain logic + seluruh query Drizzle
│
├── db/
│   ├── schema/           # satu file per tabel
│   └── index.ts          # shared connection pool
│
├── lib/                  # auth, session, permissions, api helpers
│
└── validators/           # schema Zod per domain
```

---

# 84. DOMAIN MODULE INTERNAL STRUCTURE

Example:

```text
services/requests/
├── requests.service.ts        # use case + query Drizzle
├── request-state.machine.ts   # aturan transisi status
├── request-policy.ts          # aturan authorization per scope
└── types.ts

app/api/requests/
├── route.ts                   # GET list, POST create
└── [id]/
    ├── route.ts               # GET detail, PATCH update, DELETE
    ├── submit/route.ts
    ├── approve/route.ts
    └── reject/route.ts

validators/
└── requests.ts                # schema Zod
```

Domain-specific business logic tidak ditempatkan di route handler.

---

# 85. ROUTE HANDLER RESPONSIBILITY

Route handler hanya:

```text
HTTP
 ↓
Input validation (Zod)
 ↓
Authorization / session check
 ↓
Service
 ↓
Response
```

Jangan:

```text
Route Handler
 ├── SQL / query Drizzle
 ├── business logic
 ├── stock calculation
 ├── notification
 └── audit
```

---

# 86. SERVICE RESPONSIBILITY

Service menangani use case dan seluruh query Drizzle domain.

Contoh:

```text
requests.service.ts
- createRequest()
- submitRequest()
- approveRequest()
- rejectRequest()
- requestRevision()
- cancelRequest()
```

Reservation:

```text
reservations.service.ts
- checkAvailability()
- createFromApproval()
- cancelReservation()
```

Inventory:

```text
inventory.service.ts
- calculateAvailableStock()
- reserveStock()
- releaseStock()
- issueStock()
- adjustStock()
```

API handler memakai `withApiSession` untuk endpoint JSON terautentikasi; user ID dari session diverifikasi terpisah dan diteruskan ke service.

---

# 87. PERSISTENCE RESPONSIBILITY

Query Drizzle berada di domain service.

```text
services/equipment/
services/reservations/
services/inventory/
services/requests/
```

Business decisions tetap berada pada service/domain layer.

Route handler, page, dan component tidak boleh berisi query domain.

---

# 88. CROSS-MODULE DEPENDENCY

Recommended dependency:

```text
Requests
   ↓
Reservations
   ↓
Inventory

Requests
   ↓
Fulfillment

Equipment
   ↓
Incidents

All critical modules
   ↓
Audit
   ↓
Notifications
```

Hindari circular dependency.

---

# 89. USE CASE ARCHITECTURE

Core use cases:

```text
CreateActivity
SubmitRequest
ApproveRequest
RejectRequest
RequestRevision
CancelRequest

CheckEquipmentAvailability
CreateReservation
RequestSharedUsage
AcceptSharedUsage
DeclineSharedUsage

IssueEquipment
IssueMaterial
ReturnEquipment
InspectEquipment

ReportIncident
AssessIncident
ResolveIncident

AdjustStock
```

---

# 90. EXACT APPROVAL USE CASE

```text
ApproveRequest(requestId, actorId)
```

Algorithm:

```text
1. Authenticate actor
2. Check actor permission
3. Load request
4. Ensure request = PENDING_PLP
5. Load activity
6. Verify supervisor
7. Load equipment items
8. Check equipment statuses
9. Check reservation conflicts
10. Load material items
11. Calculate stock availability
12. Lock relevant rows
13. Re-check all conditions
14. Create reservations
15. Reserve material stock
16. Update request
17. Create audit
18. Create notifications
19. Commit
```

---

# 91. EXACT SHARED USAGE USE CASE

```text
RequestSharedUsage(requesterId, reservationId)
```

Steps:

```text
1. Authenticate
2. Load reservation
3. Verify reservation active
4. Verify requester != primary user
5. Validate requested interval
6. Ensure interval within reservation
7. Create shared usage request
8. Notify primary user
9. Audit
```

Accept:

```text
AcceptSharedUsage(primaryUserId, sharedRequestId)
```

Server verifies:

```text
currentUser.id == reservation.primaryUserId
```

---

# 92. EXACT INCIDENT USE CASE

```text
ReportIncident()
```

Steps:

```text
1. Authenticate
2. Validate equipment
3. Validate related request/reservation
4. Create incident
5. Preserve reporter identity
6. Upload evidence
7. Notify PLP
8. Audit
```

Report tidak otomatis mengubah equipment status menjadi DAMAGED.

---

# 93. INSPECTION USE CASE

```text
InspectEquipment()
```

Steps:

```text
1. Authenticate PLP/authorized Aslab
2. Load incident/equipment
3. Record condition
4. Create condition history
5. If issue:
      create/update incident
6. Update equipment status
7. Audit
8. Notify relevant users
```

---

# 94. DATA CONSISTENCY RULE

Setiap critical action harus memiliki urutan:

```text
Validate
 ↓
Lock
 ↓
Revalidate
 ↓
Mutate
 ↓
Audit
 ↓
Notify
 ↓
Commit
```

Audit/notification yang harus atomically follow business mutation dapat dibuat di transaction yang sama.

External side effects seperti email sebaiknya menggunakan outbox pattern di masa depan.

---

# 95. MVP NOTIFICATION IMPLEMENTATION

MVP:

```text
Database Notification
+
In-app Notification UI
```

Tidak perlu langsung:

```text
WhatsApp
Email
Push notification
```

External channels dapat ditambahkan kemudian.

---

# 96. DATE/TIME STANDARD

Server menyimpan:

```text
UTC
```

Frontend menampilkan sesuai timezone user/lab.

Untuk environment Indonesia:

```text
Asia/Jakarta
```

digunakan sebagai default display timezone bila diperlukan.

---

# 97. FILE UPLOAD RULES

Incident evidence:

* image;
* PDF jika diperlukan;
* maximum size configurable;
* MIME validation;
* filename sanitization;
* authorization check.

File URL tidak boleh dapat digunakan untuk mengakses incident evidence yang tidak authorized.

---

# 98. SOFT DELETE POLICY

Jangan soft-delete semua entity secara otomatis.

### Soft deactivate

Cocok untuk:

```text
User
EquipmentType
EquipmentAsset
Material
Laboratory
Room
```

gunakan:

```text
active/status
```

### Transactional records

Jangan delete:

```text
Request
Reservation
Issue
Return
Incident
AuditLog
StockTransaction
```

History harus dipertahankan.

---

# 99. DATABASE MIGRATION POLICY

Gunakan:

```text
Drizzle Kit
```

Setelah mengubah schema di `src/db/schema/`:

```bash
npm run db:generate
```

Periksa SQL yang dihasilkan di `drizzle/`, lalu terapkan:

```bash
npm run db:migrate
```

Commit file SQL dan `drizzle/meta` bersama perubahan schema.

Jangan mengubah migration yang sudah diterapkan atau melakukan reset destruktif untuk memperbaiki error.

Jangan melakukan perubahan schema production secara manual tanpa migration.

---

# 100. TESTING STRATEGY

Minimum testing:

## Unit

Test:

```text
Reservation conflict
Stock calculation
Request state transition
Shared usage validation
Permission policy
```

## Integration

Test:

```text
Approve Request
Issue
Return
Incident
Stock reservation
```

## E2E

Critical scenario:

```text
Student creates Activity
→ creates Request
→ PLP approves
→ equipment reserved
→ material reserved
→ PLP issues
→ student uses
→ return
→ inspection
→ complete
```

---

# 101. CRITICAL TEST CASES

### TC-01

Two students request same equipment overlapping.

Expected:

```text
One reservation succeeds.
Other receives RESERVATION_CONFLICT.
```

### TC-02

Two requests consume more material than available.

Expected:

```text
Second approval fails.
```

### TC-03

Student tries to approve own request.

Expected:

```text
403 FORBIDDEN
```

### TC-04

Lecturer tries to approve.

Expected:

```text
403 FORBIDDEN
```

### TC-05

Student requests shared usage outside primary reservation.

Expected:

```text
422 INVALID_SHARED_USAGE_INTERVAL
```

### TC-06

Student reports damage.

Expected:

```text
Incident created.
Equipment is NOT automatically marked damaged.
```

### TC-07

PLP inspection finds damage.

Expected:

```text
Condition history created.
Equipment enters appropriate state.
```

---

# 102. OBSERVABILITY

MVP server should log:

* request ID;
* HTTP method;
* endpoint;
* response status;
* latency;
* error code.

Critical domain operations should include structured logs.

Example:

```text
request.approved
reservation.created
stock.reserved
equipment.issued
incident.reported
```

---

# 103. API VERSIONING

Base:

```text
/api/v1
```

Breaking changes:

```text
/api/v2
```

MVP tidak perlu versioning yang kompleks di luar path versioning.

---

# 104. CONFIGURATION

Business configuration sebaiknya tidak hardcode.

Contoh:

```text
minimum cancellation lead time
material dispensing rules
notification preferences
laboratory timezone
```

Dapat disimpan di:

```text
SystemConfiguration
```

jika kebutuhan sudah muncul.

---

# 105. PERFORMANCE TARGET

MVP target:

```text
Typical API response:
< 500 ms
```

untuk standard queries dalam normal development/deployment environment.

Availability query harus tetap efisien walaupun reservation bertambah.

Gunakan:

* proper indexes;
* pagination;
* selective Drizzle queries;
* avoid N+1;
* caching hanya bila diperlukan.

---

# 106. SECURITY BASELINE

Required:

```text
HTTPS
Secure authentication
RBAC
Server-side authorization
Input validation
Rate limiting
CORS restriction
Secure cookies
File validation
Audit logging
SQL injection protection through Drizzle parameterized queries
```

Password handling diserahkan kepada Better Auth.

---

# 107. DEPLOYMENT SHAPE

MVP dapat menggunakan:

```text
Next.js Fullstack Application
        │
        ▼
Node.js-compatible host
(VPS / Railway / Render / Vercel + connection pooler)

PostgreSQL
        │
        ▼
Managed PostgreSQL
```

Aplikasi tidak membutuhkan service backend terpisah. Provider dapat diganti tanpa mengubah domain architecture.

Jalankan migrasi sekali per release sebelum aplikasi melayani traffic.

---

# 108. FINAL TECHNICAL ARCHITECTURE

```text
                           REAKSAN
                              │
                NEXT.JS FULLSTACK APPLICATION
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    CLIENT UI             SERVER LAYER          DOMAIN
        │                     │                     │
    Components           Server Components      Business Rules
    shadcn/ui            Route Handlers         Availability
    TanStack Query       Server Actions         Conflict Detection
    Forms + Zod          Better Auth            Approval
    FullCalendar         Domain Services        Accountability
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                          Drizzle ORM
                              │
                              ▼
                         PostgreSQL
```

---

# 109. FINAL DOMAIN GRAPH

```text
USER
 │
 ├──────── ROLE / PERMISSION
 │
 ├──────── ACTIVITY
 │             │
 │             └──────── REQUEST
 │                         │
 │              ┌──────────┴──────────┐
 │              │                     │
 │          EQUIPMENT              MATERIAL
 │              │                     │
 │            ASSET                 BATCH
 │              │                     │
 │          RESERVATION          STOCK LEDGER
 │              │
 │        SHARED USAGE
 │
 └──────── INCIDENT
                │
        ┌───────┼────────┐
        ▼       ▼        ▼
    ASSESSMENT EVIDENCE RESOLUTION

All important mutations
          │
          ▼
       AUDIT LOG

Important user-facing events
          │
          ▼
     NOTIFICATION
```

---

# 110. TECHNICAL NORTH STAR

Reaksan technical architecture harus menjamin:

> **No resource can be double-booked, no stock can be over-reserved, no critical transaction happens without traceability, and no user can perform an operation outside their authority or scope.**

Secara sistem:

```text
RESOURCE
   │
   ├── LOCATION
   ├── AVAILABILITY
   ├── STOCK
   ├── USER
   ├── ACTIVITY
   ├── REQUEST
   ├── RESERVATION
   ├── FULFILLMENT
   ├── CONDITION
   ├── INCIDENT
   └── AUDIT
```

Technical Design Specification v1 ini menjadi kontrak teknis sebelum implementation.

