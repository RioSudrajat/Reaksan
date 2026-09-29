# REAKSAN

## Product Requirement Definition — v1.0

**Product Type:** Laboratory Resource Management &amp; Coordination Platform  
**MVP Focus:** Chemistry Laboratory — TA / Research Students  
**Primary Users:** Student, PLP, Lecturer, Aslab, Admin  
**Primary Objective:** Improve visibility, coordination, verification, fulfillment, and accountability of laboratory resources.

---

# 1. Product Overview

## 1.1 Product Definition

**Reaksan** adalah platform manajemen sumber daya laboratorium yang menghubungkan mahasiswa peneliti/TA, PLP, dosen pembimbing, Aslab, dan administrator dalam satu sistem.

Reaksan bukan sekadar sistem inventaris.

Fokus utamanya adalah menyelesaikan **information and coordination bottleneck** dalam penggunaan laboratorium.

Sistem memberikan mahasiswa kemampuan untuk mengetahui:

- resource apa yang tersedia;
- resource berada di laboratorium/ruangan mana;
- equipment mana yang tersedia;
- equipment mana yang sedang digunakan;
- kapan equipment digunakan;
- siapa yang menggunakan;
- tujuan penggunaannya;
- detail rencana penggunaan;
- kapan resource kembali tersedia;
- apakah sebuah slot dapat digunakan bersama.

Pada sisi PLP, sistem membantu:

- memverifikasi permintaan;
- mengatur reservasi;
- mengeluarkan equipment/material;
- menerima pengembalian;
- memantau kondisi equipment;
- mengelola stok;
- menangani incident;
- menjaga audit trail.

Dosen berperan sebagai **academic supervisor**, bukan sebagai approval gate.

---

# 2. Problem Statement

## 2.1 Current Problems

Pengelolaan resource laboratorium masih berpotensi bergantung pada komunikasi manual antara mahasiswa dan PLP.

Contoh:

Mahasiswa A membutuhkan oven selama beberapa hari untuk penelitian.

Mahasiswa A memberikan informasi kepada PLP mengenai:

- tanggal penggunaan;
- durasi;
- temperatur;
- tujuan penggunaan;
- tahapan eksperimen.

Mahasiswa B kemudian membutuhkan oven yang sama.

Namun Mahasiswa B tidak mengetahui bahwa oven sedang digunakan atau detail rencana penggunaan Mahasiswa A sebelum bertanya kepada PLP.

Akibatnya:

1. PLP menjadi sumber informasi utama mengenai resource.
2. Pertanyaan availability berulang.
3. Mahasiswa sulit melakukan perencanaan penelitian.
4. Potensi resource idle atau konflik jadwal meningkat.
5. Penggunaan resource bersama sulit dikoordinasikan.
6. Riwayat penggunaan equipment tidak selalu terstruktur.
7. Kondisi equipment sulit ditelusuri secara sistematis.
8. Riwayat stok dan penggunaan material membutuhkan pencatatan yang lebih terstruktur.
9. Ketika terjadi incident, pihak yang terkait sulit ditelusuri secara cepat.

---

# 3. Product Opportunity

Reaksan mengubah model:

**Student → Ask PLP → PLP checks → PLP answers**

menjadi:

**Student → View Resource → View Availability → Plan Activity → Request → PLP Verifies → Fulfillment**

Dengan demikian:

> **Visibility first, approval second.**

Mahasiswa memperoleh visibility sebelum membuat permintaan.

PLP tetap menjadi pihak yang memiliki kewenangan operasional.

---

# 4. Product Goals

## 4.1 Primary Goals

### Goal 1 — Resource Visibility

Mahasiswa dapat mengetahui kondisi resource laboratorium secara mandiri.

Informasi meliputi:

- location;
- availability;
- status;
- current usage;
- schedule;
- relevant usage plan.

### Goal 2 — Research Planning

Mahasiswa dapat menghubungkan penggunaan laboratory resource dengan aktivitas penelitian/TA.

### Goal 3 — Coordination

Mahasiswa dapat melihat penggunaan resource oleh mahasiswa lain dan melakukan koordinasi penggunaan bersama.

### Goal 4 — Operational Efficiency

PLP tidak perlu menjawab pertanyaan availability yang dapat dijawab langsung oleh sistem.

### Goal 5 — Accountability

Setiap penggunaan equipment dapat ditelusuri berdasarkan:

- user;
- activity;
- reservation;
- supervisor;
- Aslab/PIC;
- PLP;
- incident;
- condition history.

### Goal 6 — Inventory Accuracy

Sistem membedakan:

- physical stock;
- reserved stock;
- available stock.

### Goal 7 — Equipment Lifecycle Tracking

Sistem menyimpan histori:

**Available → Reserved → In Use → Returned → Inspection → Available / Maintenance / Retired**

---

# 5. Product Principles

## 5.1 Visibility First, Approval Second

User harus dapat melihat informasi sebelum melakukan request.

## 5.2 One Research Context, Multiple Requests

Mahasiswa memiliki satu Research Activity yang dapat menghasilkan beberapa resource request.

## 5.3 One Request, Multiple Resource Types

Satu request dapat mengandung:

- equipment;
- materials.

Namun domain logic tetap memisahkan keduanya.

## 5.4 Operational Authority Remains with PLP

Sistem tidak menggantikan kewenangan PLP.

Sistem membantu PLP mengelola kewenangan tersebut secara digital.

## 5.5 Transparent Usage, Minimal Personal Data

Mahasiswa dapat mengetahui penggunaan resource oleh mahasiswa lain.

Namun informasi yang ditampilkan hanya informasi yang relevan dengan koordinasi.

Contoh yang dapat ditampilkan:

- nama pengguna;
- activity title;
- purpose;
- schedule;
- usage plan;
- supervisor jika relevan.

Tidak menampilkan:

- password;
- email pribadi;
- nomor telepon;
- data autentikasi;
- informasi pribadi yang tidak berkaitan dengan penggunaan resource.

## 5.6 Auditability

Perubahan penting harus memiliki histori.

Contoh:

- siapa melakukan approval;
- kapan stock berubah;
- siapa melakukan issue;
- siapa melakukan return;
- siapa melaporkan incident;
- siapa melakukan inspection.

---

# 6. Target Users

## 6.1 Student — Primary User

MVP difokuskan pada mahasiswa yang sedang melakukan:

- Tugas Akhir;
- penelitian.

General practicum belum menjadi fokus MVP.

---

## 6.2 PLP — Operational Authority

PLP merupakan pihak utama dalam:

- approval;
- resource fulfillment;
- inventory operation;
- equipment inspection;
- incident handling.

---

## 6.3 Lecturer — Academic Supervisor

Dosen:

- menjadi supervisor penelitian;
- melihat aktivitas mahasiswa yang dibimbing;
- melihat penggunaan resource;
- melihat incident yang relevan.

Dosen **tidak melakukan approval request**.

---

## 6.4 Aslab — Operational Support

Aslab memiliki akses berdasarkan assignment.

Aslab dapat:

- melihat aktivitas yang ditugaskan;
- melihat schedule;
- melihat resource usage;
- melaporkan incident;
- membantu operational monitoring.

Reaksan tidak mengasumsikan struktur organisasi Aslab tertentu.

---

## 6.5 Admin

Admin mengelola konfigurasi dan master data sistem.

---

# 7. Role &amp; Permission Matrix


| Capability                  | Student | PLP      | Lecturer | Aslab    | Admin |
| --------------------------- | -------: | --------: | --------: | --------: | -----: |
| Login                       | ✓       | ✓        | ✓        | ✓        | ✓     |
| View Lab Map                | ✓       | ✓        | ✓        | ✓        | ✓     |
| View Inventory              | ✓       | ✓        | ✓        | ✓        | ✓     |
| View Equipment Availability | ✓       | ✓        | ✓        | ✓        | ✓     |
| View Usage Plan             | ✓       | ✓        | ✓        | ✓        | ✓     |
| Create Activity             | ✓       | —        | —        | —        | ✓     |
| Create Request              | ✓       | —        | —        | —        | ✓     |
| Approve Request             | —       | ✓        | —        | —        | ✓     |
| Issue Equipment             | —       | ✓        | —        | Assigned | ✓     |
| Issue Material              | —       | ✓        | —        | Assigned | ✓     |
| Return Equipment            | ✓       | ✓        | —        | Assigned | ✓     |
| Condition Inspection        | —       | ✓        | —        | ✓        | ✓     |
| Report Incident             | ✓       | ✓        | —        | ✓        | ✓     |
| Manage Inventory            | —       | ✓        | —        | Limited  | ✓     |
| Manage Users                | —       | —        | —        | —        | ✓     |
| Manage Configuration        | —       | —        | —        | —        | ✓     |
| View Audit Log              | —       | Relevant | Relevant | Relevant | ✓     |


Permissions should eventually be implemented using **RBAC + scoped permissions**, not only hardcoded role checks.

---

# 8. Core Domain Model

The central domain hierarchy is:

```text
User
 │
 ├── Student
 │      │
 │      ▼
 │   Activity
 │      │
 │      ▼
 │   Request
 │      │
 │      ├───────────────┐
 │      ▼               ▼
 │ Equipment Item    Material Item
 │      │               │
 │      ▼               ▼
 │ Equipment Asset   Material Batch
 │      │               │
 │      ▼               ▼
 │ Reservation       Stock
 │      │
 │      ▼
 │ Shared Usage
 │
 ▼
Incident / Condition History

```

---

# 9. Laboratory Structure

Reaksan harus mendukung struktur:

```text
Laboratory
   └── Room
        ├── Equipment Assets
        └── Materials

```

MVP memiliki **5 laboratory rooms**.

Jumlah tersebut harus configurable sehingga sistem tidak hardcode hanya untuk lima ruangan.

---

# 10. Laboratory Map

Dashboard mahasiswa menampilkan visualisasi laboratorium.

Konsep visual:

- top-down;
- isometric / pseudo-3D;
- interactive;
- room-based.

User dapat memilih room.

Contoh:

```text
┌──────────────────────────────┐
│        LABORATORY MAP         │
│                              │
│  ┌────────┐  ┌────────┐      │
│  │ LAB 01 │  │ LAB 02 │      │
│  └────────┘  └────────┘      │
│                              │
│  ┌────────┐  ┌────────┐      │
│  │ LAB 03 │  │ LAB 04 │      │
│  └────────┘  └────────┘      │
│             ┌────────┐       │
│             │ LAB 05 │       │
│             └────────┘       │
└──────────────────────────────┘

```

Klik room → Room Overview.

---

# 11. Room Overview

Setiap room menampilkan:

- total equipment;
- available equipment;
- equipment in use;
- maintenance equipment;
- total material;
- low-stock material;
- current reservations.

Contoh:

```text
LAB 03

Equipment      24
Available      18
In Use          4
Maintenance     2

Materials      38
Low Stock       4

[Equipment]
[Materials]
[Schedule]

```

---

# 12. Equipment Domain

Equipment direpresentasikan sebagai **individual assets**.

Contoh:

```text
Equipment Type
    Oven

Assets
    OVN-001
    OVN-002
    OVN-003

```

Setiap asset memiliki:

- asset ID;
- equipment name;
- serial number;
- room;
- condition;
- status;
- usage type;
- acquisition information jika diperlukan;
- history.

---

# 13. Equipment Usage Type

Equipment tidak selalu dapat dipinjam secara fisik.

Karena itu:

```text
BORROWABLE

```

dan

```text
USAGE_ONLY

```

harus dibedakan.

### BORROWABLE

Equipment dapat:

- reserved;
- issued;
- used;
- returned.

### USAGE\_ONLY

Equipment tetap berada di laboratorium.

Mahasiswa melakukan:

- reservation;
- usage;
- check-in/check-out jika diperlukan;
- tidak ada physical borrowing.

Contoh penggunaan:

```text
Spectrophotometer
→ Usage Only

Balance
→ Usage Only

Portable Equipment
→ Borrowable

```

Actual classification harus configurable per equipment.

---

# 14. Equipment Status

Status minimum:

```text
AVAILABLE
RESERVED
IN_USE
MAINTENANCE
DAMAGED
UNDER_INSPECTION
RETIRED

```

Status tidak boleh diubah sembarangan oleh student.

Perubahan status harus mengikuti workflow atau permission yang sesuai.

---

# 15. Equipment Availability

Availability harus mendukung:

**Date + Time**

bukan hanya tanggal.

Contoh:

```text
18 September 2026

08:00 ───── 12:00
Ahmad — Drying Sample

12:00 ───── 14:00
AVAILABLE

14:00 ───── 17:00
Budi — Heating Process

```

Mahasiswa dapat memilih slot available.

---

# 16. Detailed Usage Plan

Setiap reservation dapat memiliki usage plan.

Contoh:

```text
18 Sep
08:00–12:00
Temperature: 100°C
Purpose: Drying sample

19 Sep
08:00–14:00
Temperature: 120°C
Purpose: Heating process

20 Sep
09:00–12:00
Temperature: 80°C
Purpose: Final drying

```

Usage plan menjadi informasi koordinasi.

Mahasiswa lain dapat melihat informasi yang relevan.

---

# 17. Shared Usage

Mahasiswa dapat meminta penggunaan sebagian slot yang sedang dimiliki mahasiswa lain.

Flow:

```text
Student B
    ↓
View Occupied Slot
    ↓
Request Shared Usage
    ↓
Student A
    ├── Accept
    └── Decline
    ↓
Shared Usage Confirmed

```

PLP dapat melihat shared usage.

Namun PLP tidak menjadi approval gate untuk setiap shared-use request.

---

# 18. Shared Usage Rules

Shared usage:

1. hanya dapat diajukan pada slot yang sudah dimiliki primary user;
2. tidak boleh melebihi reservation primary user;
3. membutuhkan persetujuan primary user;
4. memiliki user record tersendiri;
5. tetap menyimpan primary reservation;
6. dapat ditelusuri untuk accountability;
7. dapat terlihat oleh PLP.

Contoh:

```text
Reservation
Primary: Ahmad
08:00–16:00

Shared Usage
Budi
13:00–15:00

```

---

# 19. Material Domain

Material merupakan consumable.

Material tidak menggunakan return workflow.

Contoh:

```text
HCl
├── Batch A
│   ├── Lot: HCL-001
│   ├── Expiry: ...
│   └── Quantity: 5 L
│
└── Batch B
    ├── Lot: HCL-002
    └── Quantity: 3 L

```

---

# 20. Material Inventory

Material harus mendukung:

- material name;
- category;
- base unit;
- quantity;
- batch;
- lot number;
- expiry date;
- received date;
- room/storage location;
- dispensing configuration.

---

# 21. Configurable Material Rules

Reaksan tidak boleh hardcode aturan dispensing laboratorium.

Setiap material dapat memiliki:

- minimum dispensing quantity;
- dispensing increment;
- maximum request quantity;
- unit.

Contoh konfigurasi:

```text
HCl

Minimum: 50 mL
Increment: 50 mL
Maximum: 1000 mL

```

Nilai tersebut merupakan contoh konfigurasi, bukan SOP universal.

---

# 22. Stock Model

Sistem harus membedakan:

### Physical Stock

Stock fisik aktual.

### Reserved Stock

Stock yang sudah dialokasikan melalui request approved.

### Available Stock

Stock yang masih dapat diminta.

Formula:

```text
Available Stock =
Physical Stock - Reserved Stock

```

Contoh:

```text
Physical Stock = 5 L
Reserved Stock = 0 L
Available Stock = 5 L

```

Setelah approval:

```text
Physical = 5 L
Reserved = 500 mL
Available = 4.5 L

```

Setelah issue:

```text
Physical = 4.5 L
Reserved = 0
Available = 4.5 L

```

Dengan model ini, sistem mencegah overbooking tanpa mengurangi physical stock sebelum material benar-benar diberikan.

---

# 23. Research Activity

Activity adalah konteks utama penelitian.

Contoh:

```text
Activity

Title:
Sintesis Senyawa X

Type:
THESIS_RESEARCH

Student:
Ahmad

Supervisor:
Dr. Budi

Period:
18–30 September 2026

Description:
...

```

Activity dapat memiliki banyak request.

```text
Activity
├── Request #001
├── Request #002
└── Request #003

```

---

# 24. Activity Type

MVP:

```text
THESIS_RESEARCH

```

Future:

```text
PRACTICUM
COURSE_PROJECT
GENERAL_RESEARCH
OTHER

```

Data model tidak boleh hardcode hanya untuk TA.

---

# 25. Unified Resource Request

Student membuat satu request untuk satu kebutuhan penelitian.

Request dapat berisi:

```text
Equipment
├── Oven OVN-001
└── Analytical Balance BAL-002

Materials
├── HCl 250 mL
└── Ethanol 500 mL

```

Sehingga UX:

> satu research request

tetapi lapisan domain di server tetap memisahkan:

```text
EquipmentRequestItem
MaterialRequestItem

```

---

# 26. Request Information

Minimum request:

- request ID;
- activity;
- student;
- supervisor;
- title;
- purpose;
- description;
- start date/time;
- end date/time;
- detailed practical/research plan;
- equipment items;
- material items;
- status;
- timestamps.

---

# 27. Request State Machine

Primary lifecycle:

```text
DRAFT
   ↓
SUBMITTED
   ↓
PENDING_PLP
   ↓
 ┌───────────────┐
 │               │
 ▼               ▼
APPROVED       REJECTED
 │
 ▼
READY_FOR_PICKUP
 │
 ▼
ACTIVE
 │
 ▼
RETURNED
 │
 ▼
COMPLETED

```

Additional states:

```text
CANCELLED
REQUEST_REVISION
EXPIRED
OVERDUE

```

---

# 28. PLP Approval

PLP melakukan:

```text
Review Request
     ↓
Check availability
     ↓
Check material stock
     ↓
Check schedule
     ↓
Approve / Reject / Request Revision

```

Approval tidak dilakukan oleh dosen.

Setelah approved:

- equipment slot menjadi reserved;
- material menjadi reserved stock;
- request dapat masuk fulfillment.

---

# 29. Request Revision

PLP dapat meminta mahasiswa memperbaiki request.

Contoh:

```text
PLP:
"Silakan revisi jumlah HCl menjadi 500 mL."

Status:
REQUEST_REVISION

```

Student kemudian mengedit request dan resubmit.

---

# 30. Cancellation Policy

Student dapat melakukan cancellation sesuai status.


| Request Status     | Student Action                |
| ------------------ | ----------------------------- |
| DRAFT              | Cancel                        |
| SUBMITTED          | Cancel                        |
| PENDING\_PLP       | Cancel                        |
| APPROVED           | Cancel with time restriction  |
| READY\_FOR\_PICKUP | Restricted                    |
| ACTIVE             | No cancellation; Early Return |
| RETURNED           | No                            |
| COMPLETED          | No                            |


Recommended configurable policy:

- sebelum approval → bebas cancel;
- setelah approval → cancel jika masih melewati minimum lead time;
- mendekati waktu penggunaan → cancellation dapat membutuhkan intervention PLP;
- setelah resource digunakan → gunakan early return.

Nilai lead time harus configurable.

---

# 31. No-Show

PLP dapat menandai:

```text
NO_SHOW

```

ketika mahasiswa tidak datang mengambil resource sesuai reservation.

System dapat:

- release reservation;
- record no-show;
- menyimpan history.

MVP tidak otomatis memberikan punishment kecuali kebijakan institusi sudah ditentukan.

---

# 32. Fulfillment

Setelah approval:

```text
APPROVED
   ↓
READY_FOR_PICKUP
   ↓
PLP Issue
   ↓
ACTIVE

```

PLP melakukan:

- identity/user verification;
- equipment issue;
- material dispensing;
- quantity confirmation;
- condition confirmation.

---

# 33. Equipment Return

Untuk borrowable equipment:

```text
ACTIVE
  ↓
Student Return
  ↓
PLP Inspection
  ↓
GOOD / ISSUE

```

Jika good:

```text
AVAILABLE

```

Jika issue:

```text
UNDER_INSPECTION

```

kemudian:

```text
MAINTENANCE

```

atau:

```text
RETIRED

```

sesuai hasil assessment.

---

# 34. Condition Reporting

Incident dapat dilaporkan oleh:

- Student;
- PLP;
- Aslab.

Student dapat melakukan self-report.

Contoh:

```text
Condition:
Good
Minor Issue
Damaged

Notes:
...

Photo:
...

```

Namun student report **tidak otomatis mengubah status equipment menjadi DAMAGED**.

---

# 35. PLP Inspection

PLP melakukan condition check saat return.

Contoh:

```text
Student:
"Equipment condition: Good"

PLP:
"Inspection result: Damaged"

Finding:
Temperature controller not responding.

```

Kedua record harus disimpan.

Jangan overwrite laporan student.

---

# 36. Incident Management

Incident minimum memiliki:

- incident ID;
- equipment/resource;
- activity;
- request;
- reservation;
- reporter;
- primary user;
- shared user;
- supervisor;
- Aslab/PIC jika ada;
- PLP;
- timestamp;
- description;
- evidence;
- severity;
- assessment;
- resolution;
- status.

---

# 37. Accountability Chain

Setiap incident harus dapat ditelusuri:

```text
Incident
   ↓
Equipment
   ↓
Reservation
   ↓
Activity
   ↓
Student
   ↓
Shared User
   ↓
Supervisor
   ↓
Aslab / PIC
   ↓
PLP
   ↓
Assessment
   ↓
Resolution

```

Konsep ini membuat Reaksan tidak hanya menjadi inventory system tetapi juga accountability system.

---

# 38. Responsibility Roles

Gunakan istilah:

### Resource Custodian

Pihak yang bertanggung jawab atas resource secara operasional.

### Academic Supervisor

Dosen pembimbing.

### Usage PIC

Mahasiswa atau pihak yang menjadi PIC aktivitas.

### Current User

Pengguna resource pada waktu tertentu.

Jangan menggunakan istilah **owner equipment** kecuali kebijakan institusi memang menetapkan ownership tersebut.

---

# 39. Equipment History

Setiap equipment memiliki timeline.

Contoh:

```text
OVN-001

10 Sep
AVAILABLE

15 Sep
RESERVED
Ahmad

18 Sep
ISSUED
PLP Siti

19 Sep
INCIDENT REPORTED

19 Sep
UNDER_INSPECTION

20 Sep
MAINTENANCE

25 Sep
AVAILABLE

```

History tidak boleh dihapus secara normal.

---

# 40. Audit Log

Audit log mencatat aktivitas penting.

Contoh:

```text
15 Sep 2026 14:23

Actor:
PLP Siti

Action:
ADJUST_STOCK

Resource:
HCl

Before:
5.2 L

Adjustment:
-500 mL

After:
4.7 L

Reference:
REQ-1024

```

Audit log minimum mencatat:

- actor;
- action;
- entity;
- entity ID;
- before state jika relevan;
- after state jika relevan;
- timestamp;
- reason;
- reference.

---

# 41. Student User Flow

```text
LOGIN
  ↓
DASHBOARD
  ↓
LAB MAP
  ↓
SELECT ROOM
  ↓
VIEW INVENTORY
  ↓
SELECT RESOURCE
  ↓
VIEW DETAILS
  ↓
VIEW AVAILABILITY
  ↓
SELECT SLOT
  ↓
[Available]
     ↓
Select

[Occupied]
     ↓
View Usage Plan
     ↓
Request Shared Usage
     ↓
Primary User Approval

```

Kemudian:

```text
CREATE / SELECT ACTIVITY
        ↓
CREATE REQUEST
        ↓
ADD EQUIPMENT
        ↓
ADD MATERIAL
        ↓
FILL RESEARCH PLAN
        ↓
SUBMIT
        ↓
PENDING PLP

```

---

# 42. PLP User Flow

```text
LOGIN
  ↓
PLP DASHBOARD
  ↓
REQUEST QUEUE
  ↓
OPEN REQUEST
  ↓
CHECK:
- Student
- Supervisor
- Activity
- Schedule
- Equipment
- Material
- Availability
- Stock
  ↓
APPROVE / REJECT / REVISION

```

Setelah approved:

```text
READY FOR PICKUP
   ↓
ISSUE
   ↓
ACTIVE
   ↓
RETURN
   ↓
INSPECTION
   ↓
COMPLETED

```

---

# 43. Lecturer Flow

```text
LOGIN
  ↓
SUPERVISED STUDENTS
  ↓
SELECT STUDENT
  ↓
VIEW ACTIVITY
  ↓
VIEW RESOURCE USAGE
  ↓
VIEW INCIDENT

```

Tidak ada:

```text
Approve Request

```

dalam MVP.

---

# 44. Aslab Flow

Access berdasarkan assignment:

```text
LOGIN
 ↓
MY ASSIGNMENTS
 ↓
LAB / ACTIVITY
 ↓
SCHEDULE
 ↓
RESOURCE USAGE
 ↓
REPORT INCIDENT

```

Aslab tidak otomatis memiliki seluruh permission PLP.

---

# 45. Admin Flow

```text
LOGIN
 ↓
ADMIN DASHBOARD
 ├── Users
 ├── Roles
 ├── Laboratories
 ├── Rooms
 ├── Equipment
 ├── Equipment Assets
 ├── Materials
 ├── Material Batches
 ├── Assignments
 ├── Configuration
 └── Audit Logs

```

---

# 46. Notification Requirements

MVP dapat menggunakan in-app notifications.

Important events:

### Student

- request submitted;
- request approved;
- request rejected;
- revision requested;
- shared usage accepted;
- shared usage declined;
- request cancelled;
- incident update.

### PLP

- new request;
- request revision;
- cancellation;
- shared usage;
- return;
- incident.

### Lecturer

- relevant student activity;
- relevant incident.

Email/WhatsApp notification dapat menjadi future scope.

---

# 47. Dashboard Requirements

## Student Dashboard

Prioritas:

```text
My Activities
My Requests
Upcoming Reservations
Pending Actions
Notifications

```

Lab map menjadi visual entry point.

---

## PLP Dashboard

Prioritas:

```text
Pending Requests
Today's Reservations
Equipment In Use
Returns Today
Low Stock
Open Incidents

```

---

## Lecturer Dashboard

Prioritas:

```text
Supervised Students
Active Research
Upcoming Activities
Resource Usage
Incidents

```

---

## Aslab Dashboard

Prioritas:

```text
Assignments
Today's Schedule
Active Activities
Resource Usage
Incidents

```

---

## Admin Dashboard

Prioritas:

```text
Users
Laboratories
Inventory
Equipment
Materials
Assignments
System Activity
Audit Logs

```

---

# 48. Search &amp; Filtering

Inventory harus mendukung:

- search;
- room filter;
- equipment type;
- status;
- availability;
- usage type;
- condition.

Material:

- search;
- category;
- room;
- stock status;
- expiry;
- batch.

Request:

- status;
- student;
- activity;
- date;
- equipment;
- room.

---

# 49. MVP Authentication

MVP:

```text
Email
Password

```

Authentication menggunakan **Better Auth**.

Future:

```text
UNPAD SSO

```

Arsitektur authentication harus dibuat agar migrasi/penambahan SSO tidak memaksa perubahan besar pada domain user.

---

# 50. Technical Architecture

## Fullstack Application

```text
Next.js (App Router)
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
TanStack Table
React Hook Form
Zod
FullCalendar
Drizzle ORM
PostgreSQL
Better Auth

```

Aplikasi fullstack bertanggung jawab atas:

- UI;
- form;
- client-side state;
- data fetching;
- validation UX;
- calendar interaction;
- authentication integration;
- authorization;
- business rules;
- request lifecycle;
- inventory calculation;
- reservation conflict;
- shared usage;
- incident;
- audit log.

Pemisahan tanggung jawab di dalam satu aplikasi:

```text
Client Components
        ↓
Server Components / Route Handlers / Server Actions
        ↓
Domain Services (src/services)
        ↓
Drizzle ORM (src/db/schema)
        ↓
PostgreSQL

```

Business rules kritis tetap divalidasi di server, bukan hanya di client.

---

# 51. Database Concept

Core entities:

```text
User
Role
Permission

Laboratory
Room

EquipmentType
EquipmentAsset
EquipmentConditionHistory

Material
MaterialBatch
StockTransaction

Activity
ActivityParticipant
Supervisor

ResourceRequest
EquipmentRequestItem
MaterialRequestItem

Reservation
SharedUsageRequest
SharedUsage

IssueTransaction
ReturnTransaction

Incident
IncidentAssessment
IncidentEvidence
IncidentResolution

Assignment

Notification
AuditLog
SystemConfiguration

```

Exact schema masih dapat berubah pada tahap technical design.

---

# 52. Important Data Relationships

### User → Activity

One student can have many activities.

### Activity → Request

One activity can have many requests.

### Request → Resource Items

One request can have many equipment/material items.

### EquipmentType → EquipmentAsset

One equipment type can have many physical assets.

### EquipmentAsset → Reservation

One asset can have many reservations over time.

### Reservation → SharedUsage

One reservation can have multiple shared usage records.

### Material → MaterialBatch

One material can have multiple batches.

### MaterialBatch → StockTransaction

One batch can have many stock transactions.

### EquipmentAsset → Incident

One asset can have multiple incidents over its lifecycle.

---

# 53. Core Business Rules

## BR-01

Student cannot request unavailable equipment unless using shared usage workflow.

## BR-02

Equipment reservation cannot overlap for the same asset.

## BR-03

Shared usage must remain inside the primary reservation period.

## BR-04

Shared usage requires primary user approval.

## BR-05

PLP can see all confirmed reservations and shared usage.

## BR-06

Approved material requests reserve stock.

## BR-07

Physical material stock is reduced when material is issued.

## BR-08

Material is not returned.

## BR-09

Borrowable equipment must be returned.

## BR-10

Usage-only equipment remains in the laboratory.

## BR-11

Student cannot directly change equipment condition/status.

## BR-12

Student incident reports do not automatically mark equipment damaged.

## BR-13

PLP/authorized personnel perform equipment inspection.

## BR-14

Student and PLP condition reports must remain independently auditable.

## BR-15

Lecturer does not approve resource requests.

## BR-16

TA/research activity requires a supervisor in MVP.

## BR-17

Activity can have multiple requests.

## BR-18

A request can contain both equipment and materials.

## BR-19

Critical state transitions must create audit records.

## BR-20

Inventory availability must reflect reservations to prevent overbooking.

---

# 54. Non-Functional Requirements

## Performance

Target:

- dashboard initial load responsive;
- inventory search responsive;
- availability calendar responsive;
- API pagination for large datasets.

Exact SLA can be defined after deployment requirements are known.

---

## Security

Required:

- secure password handling through Better Auth;
- RBAC;
- server-side authorization;
- input validation;
- protection against unauthorized resource modification;
- audit trail;
- secure file upload for incident evidence;
- rate limiting where appropriate.

---

## Data Integrity

Critical operations should be transactional.

Especially:

```text
Approve Request
Reserve Stock
Reserve Equipment
Issue Material
Issue Equipment
Return Equipment
Condition Update

```

The system must prevent race conditions such as:

```text
Two students reserve the same equipment slot

```

or:

```text
Two requests reserve the same remaining material stock

```

---

# 55. UX Requirements

Reaksan should feel like a **coordination platform**, not a traditional administrative inventory system.

Design priorities:

1. visibility;
2. clarity;
3. calendar;
4. resource status;
5. research context;
6. actionability.

Avoid overwhelming users with administrative tables on student-facing pages.

---

# 56. Student Information Architecture

```text
Dashboard
│
├── Laboratory
│   ├── Lab Map
│   ├── Rooms
│   ├── Equipment
│   └── Materials
│
├── My Research
│   ├── Activities
│   └── Activity Detail
│
├── Requests
│   ├── All
│   ├── Pending
│   ├── Approved
│   └── History
│
├── Calendar
│
├── Incidents
│
└── Notifications

```

---

# 57. PLP Information Architecture

```text
Dashboard
│
├── Requests
│
├── Reservations
│
├── Inventory
│   ├── Equipment
│   ├── Assets
│   ├── Materials
│   └── Batches
│
├── Issue / Return
│
├── Incidents
│
├── Schedule
│
└── Audit / History

```

---

# 58. Lecturer Information Architecture

```text
Dashboard
│
├── Students
├── Activities
├── Resource Usage
├── Incidents
└── Notifications

```

---

# 59. Aslab Information Architecture

```text
Dashboard
│
├── Assignments
├── Schedule
├── Activities
├── Resource Usage
└── Incidents

```

---

# 60. Admin Information Architecture

```text
Dashboard
│
├── Users
├── Roles & Permissions
├── Laboratories
├── Rooms
├── Equipment
├── Materials
├── Assignments
├── Configuration
└── Audit Logs

```

---

# 61. MVP Scope

## INCLUDED

### Authentication

- email/password;
- role-based access.

### Student

- profile;
- research activity;
- supervisor;
- lab map;
- room;
- inventory;
- equipment assets;
- material inventory;
- availability;
- detailed usage plans;
- unified request;
- shared usage;
- request status;
- cancellation;
- history;
- incident report.

### PLP

- request management;
- approval;
- revision;
- rejection;
- equipment reservation;
- material reservation;
- issue;
- return;
- inspection;
- inventory;
- stock;
- batch;
- incident management;
- schedule.

### Lecturer

- supervised students;
- activity visibility;
- resource usage;
- incident visibility.

### Aslab

- assignments;
- activity visibility;
- schedule;
- incident reporting.

### Admin

- users;
- roles;
- laboratories;
- rooms;
- equipment;
- assets;
- materials;
- batches;
- assignments;
- configuration;
- audit logs.

---

# 62. Explicitly OUT OF MVP

The following are future scope:

- UNPAD SSO;
- WhatsApp integration;
- advanced email automation;
- QR-based equipment management;
- predictive stock analytics;
- automatic demand forecasting;
- advanced FEFO automation;
- maintenance scheduling engine;
- advanced analytics;
- Excel/PDF reporting;
- general practicum workflow;
- course/project workflow;
- advanced 3D laboratory simulation;
- automated institutional punishment for no-show/cancellation;
- advanced mobile native application.

---

# 63. Future Product Direction

Reaksan can eventually evolve from:

**Inventory Management**

into:

**Laboratory Resource Operating System**

Potential future modules:

```text
Inventory
+
Reservation
+
Research Planning
+
Resource Coordination
+
Equipment Lifecycle
+
Maintenance
+
Analytics
+
Digital Lab Operations

```

---

# 64. Success Metrics

MVP success should be measured through operational metrics.

### Visibility

- percentage of resources with up-to-date availability;
- percentage of equipment with active schedules.

### Efficiency

- reduction in repetitive availability inquiries to PLP;
- request processing time;
- approval processing time.

### Coordination

- number of shared usage requests;
- percentage of shared usage requests successfully coordinated;
- number of avoided scheduling conflicts.

### Inventory

- stock discrepancy rate;
- number of stock adjustments;
- number of failed/overbooked requests.

### Accountability

- percentage of equipment usage with complete user/activity history;
- percentage of incidents with complete resolution trail.

---

# 65. Product Success Scenario

A successful Reaksan flow should look like this:

```text
Ahmad needs an oven.

Instead of asking PLP:

"Bu, oven kosong tidak?"

Ahmad opens Reaksan.

↓
Selects LAB 03.

↓
Selects OVN-001.

↓
Sees calendar.

↓
OVN-001 is occupied by Budi.

↓
Ahmad sees:

18 Sep
08:00–12:00
Budi
Drying Sample

12:00–16:00
Available

↓
Ahmad realizes he can use the 12:00–16:00 slot.

No unnecessary coordination through PLP is required.

If Ahmad needs part of Budi's occupied slot:

Request Shared Usage.

↓
Budi accepts.

↓
Shared usage is recorded.

↓
If Ahmad needs materials too:

HCl 250 mL
Ethanol 500 mL

↓
Ahmad creates one Research Activity Request.

↓
PLP reviews.

↓
PLP approves.

↓
Equipment reservation is locked.

Material stock becomes reserved.

↓
PLP issues equipment/material.

↓
Research takes place.

↓
Equipment is returned.

↓
PLP inspects.

↓
Condition is recorded.

↓
Request becomes COMPLETED.


```

This is the core Reaksan experience.

---

# 66. Product Definition Summary

Reaksan is fundamentally built around five interconnected systems:

```text
1. RESOURCE VISIBILITY
        ↓
2. RESEARCH PLANNING
        ↓
3. RESOURCE COORDINATION
        ↓
4. PLP OPERATIONAL FULFILLMENT
        ↓
5. ACCOUNTABILITY & HISTORY

```

The system should not be positioned merely as:

> "Digital laboratory inventory."

A more accurate product definition is:

> **Reaksan is a laboratory resource management and coordination platform that gives research students visibility into laboratory resources and schedules, enables coordinated resource usage, and helps PLP manage approval, fulfillment, inventory, equipment condition, and accountability.**

---

# 67. Final Product Boundary for v1

The MVP should answer five fundamental questions:

### For Student

**"Apa yang tersedia?"**

→ Inventory &amp; room visibility.

**"Kapan bisa saya gunakan?"**

→ Availability calendar.

**"Kalau sedang dipakai orang lain, apa yang sebenarnya sedang dilakukan?"**

→ Detailed usage plan.

**"Bisa nggak saya ikut menggunakan resource tersebut?"**

→ Shared usage workflow.

**"Bagaimana saya mendapatkan resource untuk penelitian saya?"**

→ Unified research request → PLP approval → fulfillment.

### For PLP

**"Siapa meminta apa, kapan, untuk penelitian apa, dan bagaimana saya memenuhinya?"**

→ Request + reservation + inventory + fulfillment.

### For Lecturer

**"Mahasiswa bimbingan saya sedang menggunakan resource apa untuk penelitiannya?"**

→ Activity + resource usage visibility.

### For Aslab

**"Aktivitas/resource apa yang berada dalam assignment saya?"**

→ Assignment-based operational visibility.

### For Admin

**"Bagaimana seluruh resource, user, assignment, dan aktivitas sistem dikelola?"**

→ Administration + audit.

---

# 68. Product North Star

> **Make laboratory resources visible, usable, coordinated, and accountable.**

Reaksan bukan menggantikan PLP.

Reaksan membuat informasi yang sebelumnya tersebar dan bergantung pada komunikasi manual menjadi **visible, structured, and actionable**.

PLP tetap menjadi operational authority.

Mahasiswa menjadi lebih mandiri dalam merencanakan penelitian.

Dosen memperoleh visibility terhadap aktivitas mahasiswa tanpa menjadi bottleneck approval.

Aslab memperoleh context sesuai assignment.

Dan setiap penggunaan resource memiliki jejak yang dapat ditelusuri.