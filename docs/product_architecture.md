# REAKSAN

## Product Architecture / System Blueprint — v1.0

**Product:** Reaksan  
**Architecture Type:** Laboratory Resource Management &amp; Coordination Platform  
**MVP Focus:** Chemistry Laboratory — TA / Research Students  
**Architecture Principle:** Visibility First, Approval Second

---

# 1. SYSTEM ARCHITECTURE OVERVIEW

Reaksan dibangun sebagai platform dengan empat lapisan utama:

```text
┌──────────────────────────────────────────────────────────────┐
│                         REAKSAN                              │
├──────────────────────────────────────────────────────────────┤
│              NEXT.JS FULLSTACK APPLICATION                   │
│                                                              │
│ CLIENT UI                                                    │
│ React + Tailwind CSS + shadcn/ui                             │
│ TanStack Query + TanStack Table + React Hook Form + Zod      │
│ FullCalendar                                                 │
│                                                              │
│ SERVER LAYER                                                 │
│ Server Components + Route Handlers + Server Actions          │
│ Auth & Session (Better Auth)                                 │
│ Users & RBAC                                                 │
│ Laboratory                                                   │
│ Inventory                                                    │
│ Activity                                                     │
│ Request                                                      │
│ Reservation                                                  │
│ Shared Usage                                                 │
│ Fulfillment                                                  │
│ Incident                                                     │
│ Notification                                                 │
│ Audit                                                        │
│                                                              │
│ DOMAIN LAYER                                                 │
│ Business Rules                                               │
│ Availability                                                 │
│ Stock Reservation                                            │
│ Conflict Detection                                           │
│ Approval                                                     │
│ Accountability                                               │
│ State Transition                                             │
│                                                              │
│ DATA LAYER                                                   │
│ Drizzle ORM + PostgreSQL                                     │
│                                                              │
│ Users / Labs / Resources / Activities / Requests             │
│ Reservations / Inventory / Incidents / Audit Logs            │
└──────────────────────────────────────────────────────────────┘

```

---

# 2. HIGH-LEVEL MODULE MAP

Reaksan dibagi menjadi 12 domain/module utama.

```text
REAKSAN
│
├── 01 Authentication & Identity
│
├── 02 User & Access Management
│
├── 03 Laboratory Management
│
├── 04 Equipment Management
│
├── 05 Material & Inventory Management
│
├── 06 Research Activity Management
│
├── 07 Resource Request Management
│
├── 08 Reservation & Availability
│
├── 09 Shared Usage Coordination
│
├── 10 Fulfillment & Return
│
├── 11 Incident & Accountability
│
├── 12 Notification & Audit
│
└── 13 Administration

```

---

# 3. MODULE RESPONSIBILITIES

## 3.1 Authentication &amp; Identity

Responsibilities:

- login;
- logout;
- session;
- password management;
- account verification;
- authentication state.

Technology:

**Better Auth**

Future:

**UNPAD SSO**

---

# 4. USER &amp; ACCESS MANAGEMENT

Responsibilities:

- users;
- roles;
- permissions;
- role assignment;
- supervisor relationship;
- assignment scope.

Core entities:

```text
User
Role
Permission
UserRole
Assignment

```

RBAC harus berada di server.

Client hanya menyembunyikan elemen UI yang tidak relevan; server tetap menjadi enforcement layer.

---

# 5. LABORATORY MANAGEMENT

Responsibilities:

- laboratory;
- rooms;
- room visualization;
- room resources;
- room statistics.

Hierarchy:

```text
Laboratory
   │
   └── Room
        ├── Equipment Assets
        └── Material Batches

```

MVP:

**5 rooms**

Namun database tidak boleh mengasumsikan jumlah tersebut secara hardcoded.

---

# 6. EQUIPMENT MANAGEMENT

Equipment domain terdiri dari:

```text
Equipment Type
       │
       ├── Asset 001
       ├── Asset 002
       └── Asset 003

```

Responsibilities:

- equipment catalog;
- individual asset;
- asset status;
- condition;
- location;
- usage type;
- lifecycle history;
- availability.

Core entities:

```text
EquipmentType
EquipmentAsset
EquipmentConditionHistory
EquipmentStatusHistory

```

---

# 7. MATERIAL &amp; INVENTORY MANAGEMENT

Responsibilities:

- material catalog;
- material batch;
- stock;
- stock reservation;
- stock issue;
- stock adjustment;
- expiry;
- dispensing rules.

Hierarchy:

```text
Material
   │
   ├── Batch A
   ├── Batch B
   └── Batch C

```

Core entities:

```text
Material
MaterialBatch
StockTransaction
MaterialDispensingRule

```

---

# 8. RESEARCH ACTIVITY MANAGEMENT

Activity menjadi konteks utama mahasiswa.

```text
Student
   │
   ▼
Research Activity
   │
   ├── Supervisor
   ├── Practical Plan
   └── Requests

```

Responsibilities:

- create activity;
- edit activity;
- supervisor;
- activity period;
- activity description;
- research plan.

Core entities:

```text
Activity
ActivityParticipant
ActivitySupervisor

```

Untuk MVP, satu student menjadi primary owner activity.

---

# 9. RESOURCE REQUEST MANAGEMENT

Request adalah transaksi utama.

Satu request dapat berisi:

```text
Request
├── Equipment Items
│   ├── OVN-001
│   └── BAL-002
│
└── Material Items
    ├── HCl 250 mL
    └── Ethanol 500 mL

```

Responsibilities:

- create;
- submit;
- validate;
- review;
- approve;
- reject;
- revision;
- cancel;
- track.

Core entities:

```text
ResourceRequest
EquipmentRequestItem
MaterialRequestItem

```

---

# 10. RESERVATION &amp; AVAILABILITY

Reservation adalah domain terpisah dari Request.

Alasannya:

Request menjawab:

> "Saya meminta resource."

Reservation menjawab:

> "Resource tersebut dialokasikan kepada siapa dan kapan."

Core entities:

```text
Reservation
ReservationSlot

```

Reservation dapat berasal dari:

- approved request;
- shared usage.

---

# 11. SHARED USAGE COORDINATION

Responsibilities:

- detect occupied slot;
- create shared usage request;
- notify primary user;
- accept;
- decline;
- create shared usage record.

Entities:

```text
SharedUsageRequest
SharedUsage

```

Flow:

```text
Student B
   │
   ▼
Occupied Reservation
   │
   ▼
Shared Usage Request
   │
   ▼
Student A
   │
   ├── ACCEPT
   └── DECLINE

```

---

# 12. FULFILLMENT

Fulfillment adalah proses operasional setelah approval.

Responsibilities:

- prepare resource;
- issue equipment;
- issue material;
- confirm quantity;
- confirm condition;
- return equipment.

Entities:

```text
IssueTransaction
ReturnTransaction

```

---

# 13. INCIDENT &amp; ACCOUNTABILITY

Responsibilities:

- report incident;
- upload evidence;
- inspect;
- assess;
- resolve;
- track responsibility.

Entities:

```text
Incident
IncidentAssessment
IncidentEvidence
IncidentResolution

```

---

# 14. NOTIFICATION &amp; AUDIT

Notification menangani event communication.

Audit menangani traceability.

Entities:

```text
Notification
AuditLog

```

---

# 15. COMPLETE DOMAIN ENTITY MAP

```text
                              ┌────────────┐
                              │    User    │
                              └─────┬──────┘
                                    │
                  ┌─────────────────┼──────────────────┐
                  │                 │                  │
                  ▼                 ▼                  ▼
               Activity         Assignment           Role
                  │
                  │
                  ▼
               Request
          ┌───────┴────────┐
          │                │
          ▼                ▼
 Equipment Item        Material Item
          │                │
          ▼                ▼
 Equipment Asset        Material
          │                │
          │                ▼
          │          Material Batch
          │                │
          │                ▼
          │        Stock Transaction
          │
          ▼
      Reservation
          │
          ├───────────────┐
          │               │
          ▼               ▼
    Shared Usage      Issue Transaction
                          │
                          ▼
                   Return Transaction
                          │
                          ▼
                Condition Inspection
                          │
                          ▼
                       Incident
                          │
                 ┌────────┼────────┐
                 ▼        ▼        ▼
             Assessment Evidence Resolution


Laboratory
    │
    ▼
  Room
   ├── Equipment Asset
   └── Material Batch

```

---

# 16. CORE ENTITY DEFINITIONS

## 16.1 User

```text
User
- id
- name
- email
- password/auth reference
- status
- createdAt
- updatedAt

```

Role tidak disimpan sebagai business logic tunggal di user jika sistem menggunakan many-role capability.

---

# 17. Role

```text
Role
- id
- name
- description

```

MVP roles:

```text
STUDENT
PLP
LECTURER
ASLAB
ADMIN

```

---

# 18. Permission

Permission berbasis action.

Contoh:

```text
request:create
request:approve
request:reject
request:cancel

equipment:view
equipment:create
equipment:update

inventory:view
inventory:adjust

incident:create
incident:assess
incident:resolve

```

Pendekatan ini lebih scalable dibanding:

```text
if role === "PLP"

```

di seluruh codebase.

---

# 19. Laboratory

```text
Laboratory
- id
- name
- code
- description
- status

```

---

# 20. Room

```text
Room
- id
- laboratoryId
- name
- code
- description
- floor
- mapPosition
- status

```

`mapPosition` dapat digunakan untuk visual lab map.

---

# 21. Equipment Type

```text
EquipmentType
- id
- name
- category
- description
- usageType
- active

```

---

# 22. Equipment Asset

```text
EquipmentAsset
- id
- equipmentTypeId
- roomId
- assetCode
- serialNumber
- status
- condition
- acquisitionDate
- notes

```

---

# 23. Equipment Condition History

```text
EquipmentConditionHistory
- id
- equipmentAssetId
- condition
- source
- recordedBy
- notes
- createdAt

```

`source`:

```text
STUDENT_REPORT
PLP_INSPECTION
ASLAB_INSPECTION
MAINTENANCE
ADMIN

```

---

# 24. Material

```text
Material
- id
- name
- category
- baseUnit
- description
- active

```

---

# 25. Material Batch

```text
MaterialBatch
- id
- materialId
- roomId
- lotNumber
- quantity
- expiryDate
- receivedDate
- status

```

---

# 26. Material Dispensing Rule

```text
MaterialDispensingRule
- id
- materialId
- minimumQuantity
- dispensingIncrement
- maximumQuantity
- unit
- active

```

---

# 27. Stock Transaction

Stock tidak hanya disimpan sebagai angka.

Setiap perubahan penting menghasilkan transaction.

```text
StockTransaction
- id
- materialBatchId
- type
- quantity
- beforeQuantity
- afterQuantity
- referenceType
- referenceId
- performedBy
- reason
- createdAt

```

Transaction types:

```text
RECEIVE
RESERVE
RELEASE
ISSUE
ADJUST
EXPIRE
TRANSFER

```

---

# 28. Activity

```text
Activity
- id
- studentId
- supervisorId
- title
- type
- description
- startDate
- endDate
- status
- createdAt
- updatedAt

```

MVP:

```text
type = THESIS_RESEARCH

```

---

# 29. Resource Request

```text
ResourceRequest
- id
- activityId
- studentId
- supervisorId
- title
- purpose
- description
- startAt
- endAt
- practicalPlan
- status
- submittedAt
- approvedAt
- completedAt
- createdAt
- updatedAt

```

---

# 30. Equipment Request Item

```text
EquipmentRequestItem
- id
- requestId
- equipmentAssetId
- startAt
- endAt
- purpose
- usagePlan

```

---

# 31. Material Request Item

```text
MaterialRequestItem
- id
- requestId
- materialId
- requestedQuantity
- unit

```

Batch selection dapat dilakukan saat fulfillment jika operational policy menggunakan batch allocation.

---

# 32. Reservation

```text
Reservation
- id
- equipmentAssetId
- requestId
- primaryUserId
- startAt
- endAt
- status
- purpose

```

Reservation status:

```text
RESERVED
ACTIVE
COMPLETED
CANCELLED
EXPIRED

```

---

# 33. Shared Usage Request

```text
SharedUsageRequest
- id
- reservationId
- requesterId
- requestedStartAt
- requestedEndAt
- purpose
- status
- respondedAt

```

Status:

```text
PENDING
ACCEPTED
DECLINED
CANCELLED
EXPIRED

```

---

# 34. Shared Usage

```text
SharedUsage
- id
- reservationId
- userId
- startAt
- endAt
- purpose
- confirmedAt

```

---

# 35. Issue Transaction

```text
IssueTransaction
- id
- requestId
- equipmentAssetId
- materialBatchId
- issuedTo
- quantity
- issuedBy
- conditionAtIssue
- issuedAt

```

Untuk equipment:

```text
quantity = 1

```

Untuk material:

```text
quantity = actual issued quantity

```

---

# 36. Return Transaction

```text
ReturnTransaction
- id
- issueTransactionId
- equipmentAssetId
- returnedBy
- receivedBy
- conditionAtReturn
- notes
- returnedAt

```

Hanya berlaku untuk borrowable equipment.

---

# 37. Incident

```text
Incident
- id
- equipmentAssetId
- requestId
- reservationId
- activityId
- reporterId
- severity
- status
- title
- description
- createdAt
- updatedAt

```

---

# 38. Incident Assessment

```text
IncidentAssessment
- id
- incidentId
- assessedBy
- finding
- assessment
- recommendedAction
- createdAt

```

---

# 39. Incident Evidence

```text
IncidentEvidence
- id
- incidentId
- fileUrl
- fileType
- uploadedBy
- createdAt

```

---

# 40. Incident Resolution

```text
IncidentResolution
- id
- incidentId
- resolvedBy
- action
- resolutionNotes
- resolvedAt

```

---

# 41. Assignment

Assignment digunakan untuk membuat struktur Aslab/PIC tetap fleksibel.

```text
Assignment
- id
- userId
- scopeType
- scopeId
- assignmentType
- startDate
- endDate
- active

```

Contoh:

```text
scopeType = LABORATORY
scopeId = LAB-03
assignmentType = ASLAB

```

Future:

```text
scopeType = ACTIVITY
assignmentType = PIC

```

---

# 42. Notification

```text
Notification
- id
- recipientId
- type
- title
- message
- referenceType
- referenceId
- readAt
- createdAt

```

---

# 43. Audit Log

```text
AuditLog
- id
- actorId
- action
- entityType
- entityId
- beforeData
- afterData
- reason
- createdAt

```

---

# 44. ENTITY RELATIONSHIP

Core relationships:

```text
User
 │
 ├──< Activity
 │       │
 │       ├─── Supervisor → User
 │       │
 │       └──< ResourceRequest
 │                │
 │                ├──< EquipmentRequestItem
 │                │          │
 │                │          └── EquipmentAsset
 │                │
 │                └──< MaterialRequestItem
 │                           │
 │                           └── Material
 │
 ├──< Reservation
 │       │
 │       └──< SharedUsage
 │
 ├──< Incident
 │
 └──< AuditLog


Laboratory
 │
 └──< Room
       │
       ├──< EquipmentAsset
       │
       └──< MaterialBatch


Material
 │
 └──< MaterialBatch
       │
       └──< StockTransaction


EquipmentAsset
 │
 ├──< Reservation
 ├──< EquipmentConditionHistory
 ├──< IssueTransaction
 └──< Incident

```

---

# 45. REQUEST STATE MACHINE

```text
                         ┌───────────────┐
                         │     DRAFT     │
                         └───────┬───────┘
                                 │ submit
                                 ▼
                         ┌───────────────┐
                         │   SUBMITTED   │
                         └───────┬───────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │    PENDING_PLP   │
                       └────────┬─────────┘
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
                 ▼              ▼              ▼
              APPROVE        REJECT       REVISION
                 │              │              │
                 ▼              ▼              │
             APPROVED        REJECTED           │
                 │                             │
                 │                             │
                 ▼                             │
          READY_FOR_PICKUP                     │
                 │                             │
                 ▼                             │
               ACTIVE                          │
                 │                             │
                 ▼                             │
             RETURNED                          │
                 │                             │
                 ▼                             │
             COMPLETED                         │
                                               │
                                               ▼
                                           SUBMITTED

```

Cancellation dapat terjadi pada state tertentu.

---

# 46. EQUIPMENT STATE MACHINE

```text
                  ┌───────────┐
                  │ AVAILABLE │
                  └─────┬─────┘
                        │ reserve
                        ▼
                  ┌───────────┐
                  │ RESERVED  │
                  └─────┬─────┘
                        │ issue
                        ▼
                   ┌─────────┐
                   │ IN_USE  │
                   └────┬────┘
                        │ return
                        ▼
               ┌──────────────────┐
               │ UNDER_INSPECTION │
               └────────┬─────────┘
                        │
             ┌──────────┼───────────┐
             │          │           │
             ▼          ▼           ▼
          AVAILABLE  MAINTENANCE  RETIRED
                         │
                         ▼
                     AVAILABLE

```

Incident dapat membuat equipment masuk:

```text
DAMAGED

```

kemudian:

```text
DAMAGED
   ↓
UNDER_INSPECTION
   ↓
MAINTENANCE / AVAILABLE / RETIRED

```

---

# 47. MATERIAL STOCK STATE

Material tidak menggunakan equipment lifecycle.

Gunakan stock ledger.

```text
RECEIVED
    │
    ▼
AVAILABLE
    │
    ├── RESERVE
    │      ↓
    │   RESERVED
    │      │
    │      └── ISSUE
    │             ↓
    │         CONSUMED
    │
    ├── ADJUST
    │
    └── EXPIRE

```

Stock state lebih baik dihitung dari transaction daripada mengandalkan status saja.

---

# 48. SHARED USAGE STATE MACHINE

```text
REQUESTED
    │
    ├── ACCEPT
    │     ↓
    │  ACCEPTED
    │     ↓
    │  CONFIRMED
    │
    ├── DECLINE
    │     ↓
    │  DECLINED
    │
    └── CANCEL
          ↓
       CANCELLED

```

---

# 49. INCIDENT STATE MACHINE

```text
REPORTED
   ↓
UNDER_ASSESSMENT
   │
   ├── NO_ISSUE
   │      ↓
   │   RESOLVED
   │
   ├── MAINTENANCE_REQUIRED
   │      ↓
   │   IN_MAINTENANCE
   │      ↓
   │   RESOLVED
   │
   └── RETIRE_REQUIRED
          ↓
       RESOLVED

```

---

# 50. API DOMAIN ARCHITECTURE

API menggunakan RESTful domain-oriented architecture.

Base:

```text
/api/v1

```

---

# 51. AUTH API

```http
POST /auth/sign-in
POST /auth/sign-out
GET  /auth/session
POST /auth/forgot-password
POST /auth/reset-password

```

Authentication internals dapat mengikuti Better Auth.

---

# 52. USER API

```http
GET    /users/me
PATCH  /users/me

GET    /users
GET    /users/:id
PATCH  /users/:id

GET    /users/:id/activities
GET    /users/:id/requests

```

---

# 53. LABORATORY API

```http
GET /laboratories
GET /laboratories/:id

GET /laboratories/:id/rooms

GET /rooms
GET /rooms/:id

GET /rooms/:id/overview
GET /rooms/:id/resources

```

---

# 54. EQUIPMENT API

```http
GET    /equipment-types
POST   /equipment-types
GET    /equipment-types/:id
PATCH  /equipment-types/:id

GET    /equipment-assets
POST   /equipment-assets
GET    /equipment-assets/:id
PATCH  /equipment-assets/:id

GET    /equipment-assets/:id/availability
GET    /equipment-assets/:id/history
GET    /equipment-assets/:id/incidents

```

---

# 55. MATERIAL API

```http
GET    /materials
POST   /materials
GET    /materials/:id
PATCH  /materials/:id

GET    /materials/:id/batches
POST   /materials/:id/batches

GET    /material-batches/:id
PATCH  /material-batches/:id

GET    /materials/:id/stock
GET    /materials/:id/transactions

```

---

# 56. ACTIVITY API

```http
GET    /activities
POST   /activities
GET    /activities/:id
PATCH  /activities/:id
DELETE /activities/:id

GET /activities/:id/requests
GET /activities/:id/resources
GET /activities/:id/incidents

```

---

# 57. REQUEST API

```http
GET    /requests
POST   /requests
GET    /requests/:id
PATCH  /requests/:id
DELETE /requests/:id

POST /requests/:id/submit
POST /requests/:id/cancel

POST /requests/:id/approve
POST /requests/:id/reject
POST /requests/:id/request-revision

GET /requests/:id/history

```

---

# 58. RESERVATION API

```http
GET /reservations
GET /reservations/:id

GET /equipment-assets/:id/reservations
GET /equipment-assets/:id/availability

```

Reservation creation primarily dilakukan sebagai hasil request approval.

Tidak dianjurkan membuka endpoint:

```http
POST /reservations

```

secara bebas untuk student karena dapat melewati approval workflow.

---

# 59. SHARED USAGE API

```http
POST /reservations/:id/shared-usage-requests

GET /shared-usage-requests
GET /shared-usage-requests/:id

POST /shared-usage-requests/:id/accept
POST /shared-usage-requests/:id/decline
POST /shared-usage-requests/:id/cancel

```

---

# 60. FULFILLMENT API

```http
POST /requests/:id/issue
POST /requests/:id/return

GET /requests/:id/issues
GET /requests/:id/returns

```

Endpoint return hanya relevan untuk equipment yang borrowable.

---

# 61. INCIDENT API

```http
GET  /incidents
POST /incidents
GET  /incidents/:id
PATCH /incidents/:id

POST /incidents/:id/assess
POST /incidents/:id/resolve

POST /incidents/:id/evidence

```

---

# 62. NOTIFICATION API

```http
GET /notifications
POST /notifications/:id/read
POST /notifications/read-all

```

---

# 63. AUDIT API

Admin/authorized roles:

```http
GET /audit-logs
GET /audit-logs/:id

```

Audit log tidak menyediakan normal CRUD.

User tidak dapat:

```http
DELETE /audit-logs/:id

```

---

# 64. PERMISSION MATRIX

Legend:

- **V** = View
- **C** = Create
- **U** = Update
- **A** = Approve
- **I** = Issue
- **R** = Return
- **X** = Special action
- **—** = No access


| Module        | Student | PLP      | Lecturer | Aslab | Admin |
| ------------- | ------- | -------- | -------- | ----- | ----- |
| Lab           | V       | V        | V        | V     | C/U   |
| Room          | V       | V/U      | V        | V     | C/U   |
| Equipment     | V       | V/U      | V        | V     | C/U   |
| Material      | V       | V/U      | V        | V     | C/U   |
| Activity      | C/U     | V        | V        | V\*   | V     |
| Request       | C/U/X   | V/A/U/X  | V        | V\*   | V/U   |
| Reservation   | V       | V/U      | V        | V\*   | V/U   |
| Shared Usage  | C/X     | V        | V        | V\*   | V     |
| Issue         | —       | I        | —        | I\*   | I     |
| Return        | R       | R/I      | —        | R\*   | R     |
| Incident      | C       | C/U/A/X  | V        | C/U   | C/U   |
| Notification  | V/X     | V/X      | V/X      | V/X   | V     |
| Audit         | —       | V\*      | —        | V\*   | V     |
| User          | Self    | Relevant | Self     | Self  | C/U   |
| Configuration | —       | Limited  | —        | —     | C/U   |


`*` = scoped access berdasarkan assignment atau relationship.

---

# 65. API AUTHORIZATION MODEL

Authorization tidak cukup hanya:

```text
role === PLP

```

Gunakan kombinasi:

```text
ROLE
+
PERMISSION
+
RESOURCE SCOPE

```

Contoh:

Aslab dapat melihat incident hanya jika:

```text
Aslab
AND
Assignment covers relevant laboratory/activity/resource

```

Contoh lecturer:

```text
Lecturer
AND
studentId belongs to supervised student

```

Contoh student:

```text
Student
AND
request.studentId === currentUser.id

```

---

# 66. PAGE ARCHITECTURE

# Student

```text
/student
│
├── dashboard
│
├── laboratory
│   ├── map
│   ├── rooms/:id
│   ├── equipment
│   ├── equipment/:id
│   ├── materials
│   └── materials/:id
│
├── activities
│   ├──
│   ├── new
│   └── :id
│
├── requests
│   ├──
│   ├── new
│   └── :id
│
├── calendar
│
├── shared-usage
│
├── incidents
│   ├──
│   └── new
│
└── notifications

```

---

# 67. PLP PAGE ARCHITECTURE

```text
/plp
│
├── dashboard
│
├── requests
│   ├── pending
│   ├── approved
│   ├── rejected
│   └── :id
│
├── schedule
│
├── inventory
│   ├── equipment
│   ├── assets
│   ├── materials
│   └── batches
│
├── fulfillment
│   ├── issue
│   └── return
│
├── incidents
│   └── :id
│
└── history

```

---

# 68. LECTURER PAGE ARCHITECTURE

```text
/lecturer
│
├── dashboard
├── students
│   └── :id
├── activities
│   └── :id
├── resource-usage
├── incidents
└── notifications

```

---

# 69. ASLAB PAGE ARCHITECTURE

```text
/aslab
│
├── dashboard
├── assignments
├── schedule
├── activities
├── resource-usage
└── incidents

```

---

# 70. ADMIN PAGE ARCHITECTURE

```text
/admin
│
├── dashboard
├── users
├── roles
├── laboratories
├── rooms
├── equipment
├── assets
├── materials
├── batches
├── assignments
├── configuration
└── audit-logs

```

---

# 71. STUDENT END-TO-END FLOW

## Scenario A — Available Equipment

```text
LOGIN
 ↓
Dashboard
 ↓
Laboratory Map
 ↓
Select Room
 ↓
Equipment
 ↓
Select Equipment Type
 ↓
Select Asset
 ↓
View Availability
 ↓
Select Available Slot
 ↓
Create / Select Activity
 ↓
Add Equipment
 ↓
Add Material
 ↓
Fill Research Plan
 ↓
Review
 ↓
Submit Request
 ↓
PENDING_PLP

```

---

# 72. STUDENT END-TO-END FLOW

## Scenario B — Occupied Equipment

```text
Select Equipment
       ↓
View Calendar
       ↓
Occupied Slot
       ↓
View:
- User
- Activity
- Purpose
- Usage Plan
       ↓
Student needs same slot
       ↓
Request Shared Usage
       ↓
Primary User receives notification
       ↓
ACCEPT / DECLINE

```

If accepted:

```text
Shared Usage Confirmed

```

---

# 73. PLP END-TO-END FLOW

```text
PLP Dashboard
 ↓
Pending Requests
 ↓
Open Request
 ↓
Review Student
 ↓
Review Activity
 ↓
Review Supervisor
 ↓
Review Equipment
 ↓
Review Availability
 ↓
Review Material Stock
 ↓
Review Research Plan
 ↓
 ┌──────────────┬──────────────┐
 ▼              ▼              ▼
APPROVE       REJECT       REVISION

```

---

# 74. APPROVAL → FULFILLMENT FLOW

```text
APPROVED
   ↓
Create Reservation
   ↓
Reserve Material Stock
   ↓
READY_FOR_PICKUP
   ↓
PLP Issue
   ↓
Equipment → IN_USE
Material → Physical Stock Deducted
   ↓
ACTIVE

```

Critical operation harus atomic.

---

# 75. RETURN FLOW

```text
ACTIVE
 ↓
Student returns equipment
 ↓
PLP receives
 ↓
PLP inspection
 ↓
 ┌─────────────┐
 │             │
 ▼             ▼
GOOD          ISSUE
 │             │
 ▼             ▼
AVAILABLE   INCIDENT
               ↓
        UNDER_INSPECTION

```

---

# 76. INCIDENT FLOW

```text
REPORT INCIDENT
      ↓
INCIDENT_REPORTED
      ↓
PLP / ASLAB ASSESSMENT
      ↓
Finding
      ↓
 ┌────────┬───────────────┐
 ▼        ▼               ▼
NO ISSUE  MAINTENANCE    RETIRE
   │         │              │
   └─────────┴──────────────┘
               ↓
            RESOLVED

```

---

# 77. STOCK FLOW

```text
Physical Stock
      │
      ▼
Student Request
      │
      ▼
PLP Approval
      │
      ▼
Reserved Stock ↑
Available Stock ↓
      │
      ▼
PLP Issue
      │
      ▼
Physical Stock ↓
Reserved Stock ↓

```

---

# 78. REQUEST CONFLICT DETECTION

Ketika request masuk, server harus melakukan:

```text
Check Equipment Conflict
        +
Check Material Availability
        +
Check Reservation Conflict
        +
Check Request Validity

```

Contoh:

```text
OVN-001
08:00–12:00
Reserved Ahmad

New Request:
OVN-001
10:00–14:00
Budi

```

Result:

```text
CONFLICT

```

Request tidak boleh langsung membuat overlapping reservation.

---

# 79. SHARED USAGE CONFLICT DETECTION

Shared usage:

```text
Primary:
08:00–16:00

Requested Shared:
13:00–15:00

```

Valid.

Namun:

```text
Primary:
08:00–16:00

Requested Shared:
15:00–18:00

```

Invalid.

Karena:

```text
18:00 > 16:00

```

---

# 80. MATERIAL RESERVATION CONFLICT

Contoh:

```text
Physical HCl = 1 L

Request A:
600 mL

Approved:
Reserved = 600 mL

Available:
400 mL

```

Request B:

```text
500 mL

```

harus ditolak atau masuk revision karena:

```text
500 mL > 400 mL

```

---

# 81. RESOURCE VISIBILITY MODEL

Student dapat melihat:

```text
Equipment
├── Status
├── Condition
├── Room
├── Availability
├── Current Reservation
├── User
├── Purpose
├── Activity
└── Usage Plan

```

Data pribadi yang tidak relevan tetap disembunyikan.

---

# 82. AUDITABILITY MODEL

Critical actions menghasilkan:

```text
AuditLog

```

Minimal:

```text
CREATE_REQUEST
SUBMIT_REQUEST
APPROVE_REQUEST
REJECT_REQUEST
REQUEST_REVISION
CANCEL_REQUEST

RESERVE_EQUIPMENT
RELEASE_EQUIPMENT

RESERVE_STOCK
RELEASE_STOCK
ISSUE_MATERIAL
ISSUE_EQUIPMENT
ADJUST_STOCK

RETURN_EQUIPMENT
INSPECT_EQUIPMENT

REPORT_INCIDENT
ASSESS_INCIDENT
RESOLVE_INCIDENT

```

---

# 83. DOMAIN EVENT CONCEPT

Reaksan dapat menggunakan internal domain events agar module tidak terlalu tightly coupled.

Contoh:

```text
RequestApproved
      ↓
ReservationCreated
      ↓
StockReserved
      ↓
NotificationCreated
      ↓
AuditLogged

```

Contoh:

```text
EquipmentReturned
      ↓
InspectionRequired
      ↓
ConditionUpdated
      ↓
IncidentCreated (if needed)
      ↓
NotificationCreated

```

MVP dapat menggunakan domain event internal di dalam aplikasi Next.js (in-process) tanpa membutuhkan message broker eksternal.

---

# 84. TRANSACTION BOUNDARIES

Critical workflows harus menggunakan database transaction.

### Approval Transaction

```text
BEGIN

Validate Request
Validate Equipment Availability
Validate Material Availability

Update Request → APPROVED

Create Reservation

Reserve Material Stock

Create Audit Log

Create Notification

COMMIT

```

Jika salah satu gagal:

```text
ROLLBACK

```

---

# 85. ISSUE TRANSACTION

```text
BEGIN

Validate Request = READY_FOR_PICKUP

Validate Equipment Status
Validate Material Reserved Quantity

Create Issue Transaction

Equipment → IN_USE

Physical Material Stock ↓
Reserved Material Stock ↓

Request → ACTIVE

Audit Log

COMMIT

```

---

# 86. RETURN TRANSACTION

```text
BEGIN

Validate Equipment Issue

Create Return Transaction

Equipment → UNDER_INSPECTION

Request → RETURNED

Audit Log

COMMIT

```

Kemudian inspection menentukan status akhir equipment.

---

# 87. DATA STRATEGY (SERVER + CLIENT)

Server Components membaca data langsung melalui domain services dan Drizzle, sehingga halaman awal tidak membutuhkan API round-trip tambahan.

TanStack Query digunakan untuk:

- server state;
- request data;
- inventory;
- availability;
- activities;
- notifications.

TanStack Table digunakan untuk:

- inventory;
- requests;
- users;
- audit logs.

React Hook Form + Zod:

- activity form;
- request form;
- material quantity;
- incident report;
- admin forms.

FullCalendar:

- equipment availability;
- PLP schedule;
- activity schedule.

---

# 88. COMPONENT ARCHITECTURE

Shared UI:

```text
components/
├── ui/
├── layout/
├── navigation/
├── data-table/
├── calendar/
├── status-badge/
├── resource-card/
├── room-card/
├── inventory/
├── request/
├── activity/
├── incident/
└── notifications/

```

Domain component tidak boleh seluruhnya dimasukkan ke `components/ui`.

`ui` hanya berisi primitive components.

---

# 89. SERVER MODULE STRUCTURE

Fullstack Next.js:

```text
src/
├── services/
│   ├── auth/
│   ├── users/
│   ├── roles/
│   ├── permissions/
│   │
│   ├── laboratories/
│   ├── rooms/
│   │
│   ├── equipment/
│   ├── materials/
│   ├── inventory/
│   │
│   ├── activities/
│   ├── requests/
│   ├── reservations/
│   ├── shared-usage/
│   │
│   ├── fulfillment/
│   ├── incidents/
│   │
│   ├── notifications/
│   └── audit/
│
├── app/
│   └── api/              # route handlers per domain
│
├── db/
│   └── schema/           # tabel Drizzle per file
│
├── validators/           # schema Zod per domain
│
└── lib/                  # auth, session, api helpers

```

---

# 90. DOMAIN OWNERSHIP

Setiap module harus memiliki domain ownership yang jelas.

```text
Equipment Module
→ equipment lifecycle

Inventory Module
→ material stock

Request Module
→ request lifecycle

Reservation Module
→ time allocation

Fulfillment Module
→ issue/return

Incident Module
→ incident lifecycle

Audit Module
→ traceability

```

Jangan membuat satu `InventoryService` raksasa yang menangani seluruh sistem.

---

# 91. API RESPONSE STANDARD

API response harus konsisten.

Success:

```json
{
  "data": {},
  "meta": {}
}

```

Error:

```json
{
  "error": {
    "code": "EQUIPMENT_RESERVATION_CONFLICT",
    "message": "Equipment is already reserved for the selected time."
  }
}

```

Business error menggunakan machine-readable error code.

---

# 92. PAGINATION

List endpoint harus mendukung:

```text
page
limit
search
sort
order
filters

```

Contoh:

```http
GET /equipment-assets?
page=1
&limit=20
&search=oven
&status=AVAILABLE

```

---

# 93. FILTERING MODEL

Inventory:

```text
room
status
condition
usageType
category
availability

```

Request:

```text
status
student
activity
room
date

```

Incident:

```text
status
severity
equipment
reporter
date

```

---

# 94. MVP SECURITY BOUNDARIES

Student:

Tidak boleh:

- approve request;
- modify stock;
- directly change equipment status;
- edit another user's activity;
- modify another user's reservation;
- access audit logs.

PLP:

Tidak boleh:

- modify user authentication;
- modify academic supervisor relationship unless authorized.

Lecturer:

Tidak boleh:

- approve request;
- modify stock;
- issue equipment.

Aslab:

Tidak boleh otomatis memiliki seluruh PLP permissions.

Admin:

Memiliki administrative capabilities tetapi critical operational actions tetap harus tercatat dalam audit log.

---

# 95. CRITICAL SYSTEM INVARIANTS

Reaksan harus menjaga invariant berikut:

### INV-01

Satu equipment asset tidak boleh memiliki dua reservation aktif yang overlapping.

### INV-02

Shared usage tidak boleh berada di luar primary reservation.

### INV-03

Available material stock tidak boleh negatif.

### INV-04

Physical material stock tidak boleh negatif.

### INV-05

Equipment dengan status RETIRED tidak dapat di-reserve.

### INV-06

Equipment MAINTENANCE tidak dapat di-reserve.

### INV-07

Equipment USAGE\_ONLY tidak menghasilkan physical return.

### INV-08

Material tidak memiliki return transaction.

### INV-09

Student hanya dapat mengubah resource request miliknya sendiri.

### INV-10

Audit log critical action tidak boleh dihapus melalui normal application flow.

### INV-11

Approval harus atomic terhadap reservation dan stock reservation.

### INV-12

Supervisor relationship untuk TA activity harus valid.

---

# 96. MVP IMPLEMENTATION PRIORITY

## P0 — Core

```text
Authentication
RBAC
Laboratory
Rooms
Equipment
Equipment Assets
Materials
Material Batches
Activity
Request
Availability
Reservation
PLP Approval
Issue
Return
Incident
Audit

```

## P1 — Coordination

```text
Shared Usage
Detailed Usage Plan
Notifications
Advanced filtering
Calendar improvements

```

## P2 — Operational Enhancement

```text
Maintenance
Analytics
QR
Advanced reporting
External notification

```

---

# 97. SYSTEM DEPENDENCY GRAPH

```text
Authentication
      │
      ▼
Users / Roles
      │
      ├───────────────┐
      ▼               ▼
Laboratory         Activity
      │               │
      ▼               ▼
Resources          Request
      │               │
      │        ┌──────┴───────┐
      │        ▼              ▼
      │   Equipment        Material
      │      │                │
      │      ▼                ▼
      │ Reservation      Stock Reservation
      │      │
      │      ▼
      │ Shared Usage
      │
      └──────┬───────────────┘
             ▼
         Fulfillment
             │
       ┌─────┴─────┐
       ▼           ▼
      Issue       Return
                     │
                     ▼
                 Inspection
                     │
                     ▼
                  Incident
                     │
                     ▼
               Accountability

All critical actions
        ↓
     Audit Log

```

---

# 98. REAKSAN CORE LOOP

Core product loop:

```text
DISCOVER
   ↓
PLAN
   ↓
REQUEST
   ↓
APPROVE
   ↓
RESERVE
   ↓
USE
   ↓
RETURN
   ↓
INSPECT
   ↓
RECORD
   ↓
DISCOVER AGAIN

```

Yang membuat Reaksan berbeda adalah:

```text
DISCOVER
   +
SEE OTHER USERS' PLANS
   +
COORDINATE

```

sebelum request.

---

# 99. SYSTEM BLUEPRINT SUMMARY

Reaksan memiliki tiga backbone utama:

## Backbone 1 — Resource

```text
Laboratory
→ Room
→ Equipment / Material
→ Availability / Stock

```

## Backbone 2 — Research

```text
Student
→ Activity
→ Request
→ Reservation
→ Usage

```

## Backbone 3 — Accountability

```text
Issue
→ Return
→ Inspection
→ Incident
→ Resolution
→ Audit

```

Ketiganya bertemu pada satu objek utama:

```text
RESOURCE USAGE

```

---

# 100. ARCHITECTURAL NORTH STAR

Reaksan harus menjaga prinsip:

> **Every resource has a location, every usage has a schedule, every request has a purpose, every transaction has an actor, and every incident has a traceable context.**

Dalam bentuk sistem:

```text
RESOURCE
   │
   ├── WHERE?
   │    └── Laboratory / Room
   │
   ├── WHAT?
   │    └── Equipment / Material
   │
   ├── WHEN?
   │    └── Reservation / Availability
   │
   ├── WHO?
   │    └── Student / Shared User / PLP
   │
   ├── WHY?
   │    └── Activity / Research Plan
   │
   ├── HOW?
   │    └── Request / Fulfillment
   │
   └── WHAT HAPPENED?
        └── Condition / Incident / Audit

```

Ini adalah fondasi arsitektur Reaksan v1.