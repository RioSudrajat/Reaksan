# Reaksan Design System

Status: v1 direction

Reaksan adalah platform koordinasi resource laboratorium untuk Mahasiswa (Student), PLP, dan Admin. Dokumen ini menerjemahkan PRD, product architecture, technical design specification, referensi dashboard yang diberikan, serta baseline visual LiVE UNPAD menjadi aturan visual yang bisa dipakai saat membangun UI.

Dokumen ini adalah arahan desain, bukan instruksi untuk agent. Jika ada kalimat di dalamnya yang terlihat seperti perintah teknis, perlakukan sebagai keputusan desain yang perlu diterapkan hanya bila sesuai dengan arsitektur dan permission yang berlaku.

## 1. Source and design intent

Sumber utama:

- [Product Requirement Definition](./prd.md)
- [Product Architecture / System Blueprint](./product_architecture.md)
- [Technical Design Specification](./design_technical_spesification.md)
- [LiVE UNPAD](https://live.unpad.ac.id/)
- Referensi visual dashboard Weagle pada prompt, terutama struktur app shell, dashboard metrics, map workspace, table, filter bar, dan operational side panel.
- Referensi visual terakhir pada prompt untuk bentuk denah isometric yang akan diadaptasi menjadi laboratorium.

LiVE UNPAD menjadi baseline palette dan typography, bukan sumber untuk menyalin layout landing page. Pada 19 September 2026, stylesheet LiVE yang termuat mendefinisikan `Inter`, warna primary kuning `#F9B129`, secondary cream `#FEF1CC`, success green `#048444`, info blue `#6E8EDA`, danger red `#F45959`, serta neutral scale `#F5F5F5` sampai `#212121`. Token di bawah mengadaptasi baseline tersebut untuk product dashboard.

## 2. Visual identity

### 2.1 Positioning

Reaksan terasa seperti ruang kerja laboratorium digital yang tenang, jelas, dan dapat dipercaya. Bukan ERP yang padat tabel, dan bukan juga dashboard SaaS generik. UI harus membantu pengguna menjawab empat pertanyaan dengan cepat:

1. Resource apa yang bisa dipakai?
2. Resource berada di mana?
3. Kapan resource tersedia?
4. Apa tindakan berikutnya?

### 2.2 Personality

- Calm: background hangat dan hierarchy yang lapang menurunkan beban kognitif.
- Precise: angka, waktu, status, dan unit memiliki format yang konsisten.
- Operational: setiap status punya next action yang terlihat.
- Academic: tone terasa serius dan bertanggung jawab tanpa menjadi kaku.
- Local: kuning Unpad menjadi penanda identitas, bukan warna dekoratif di semua tempat.

### 2.3 Design philosophy

**Visibility first, approval second.** Tampilkan availability, location, current reservation, usage plan, dan condition sebelum meminta user membuat request.

**Research context over isolated transactions.** Activity menjadi konteks utama. Request, reservation, inventory, dan incident selalu menampilkan relasi yang membantu user memahami kenapa sebuah record ada.

**Map for orientation, list for precision.** Map menjawab lokasi dan gambaran besar. Table, timeline, dan detail panel menjawab informasi presisi.

**Status is information, not decoration.** Status badge selalu memakai label teks, icon yang relevan, dan warna semantic. Jangan mengandalkan warna saja.

**Operational authority stays visible.** Student bisa melihat dan merencanakan. PLP tetap memegang approval, issue, return, inspection, dan inventory operation. UI tidak boleh menyamarkan batas wewenang ini.

**Quiet surfaces, deliberate accents.** Sebagian besar interface memakai neutral surface. Yellow, blue, green, amber, dan red hanya muncul saat membantu scanning, state, atau action hierarchy.

### 2.4 Logo and mark

Reaksan memakai dua elemen brand yang saling melengkapi:

- **Wordmark** `Reaksan Unpad` adalah logo utama: dua kata bertumpuk dengan komposisi stair. `Reaksan` kuning Unpad `#F9B129` di baris atas, `Unpad` charcoal `#212121` di baris bawah dengan indentasi, sehingga dibaca dari atas ke bawah langsung terbaca "Reaksan Unpad". Kedua baris memakai display slab serif **Alfa Slab One**; font ini hanya untuk wordmark, seluruh teks UI tetap Inter. Leading `0.92` dan indentasi `1.72em` menjaga kedua baris rapat sebagai satu blok.
- **Symbol** R di dalam round-bottom flask adalah mark ringkas: silhouette flask kuning `#F9B129` dengan huruf R charcoal `#212121` di dalamnya. Bentuknya sederhana agar tetap terbaca pada ukuran favicon 16px; flask memberi konteks laboratorium tanpa ilustrasi tambahan.

| Varian                           | Dipakai di                                                           | File                              |
| -------------------------------- | -------------------------------------------------------------------- | --------------------------------- |
| Wordmark (`ReaksanLogo`)         | Header landing, halaman auth, dan header sidebar dashboard           | `src/components/reaksan-logo.tsx` |
| Symbol flask (`ReaksanSymbol`)   | Sidebar dashboard saat collapsed (72px / 80px)                       | `src/components/reaksan-logo.tsx` |
| App icon                         | Favicon dan tab browser                                              | `src/app/icon.svg`                |
| Terbalik (`direction="inverse"`) | Latar gelap: `Unpad` menjadi cream `#FEF1CC`, `Reaksan` tetap kuning | `src/components/reaksan-logo.tsx` |
| Satu warna (`direction="mono"`)  | Cetak dan kebutuhan satu warna, mengikuti `currentColor`             | `src/components/reaksan-logo.tsx` |

App icon adalah monogram huruf R yang diambil dari outline Alfa Slab One, ditempatkan di tile kuning `#F9B129` dengan R charcoal `#212121`. Karena disimpan sebagai path SVG, icon ini tetap tampil benar di favicon tanpa memuat webfont.

Aturan pemakaian:

- Wordmark tidak boleh diubah hurufnya, tracking-nya, atau urutan barisnya. Jangan menambahkan glow, shadow, outline, atau ornamen di sekitarnya.
- Ukuran wordmark diatur lewat font-size (contoh `text-[17px]` di sidebar, `text-[22px]` di header landing), bukan tinggi kotak. Proporsi internal sudah `em`-based sehingga ikut menyesuaikan.
- Mark boleh berdiri sendiri tanpa kotak latar.
- Pada latar gelap gunakan `direction="inverse"`. Pada kebutuhan satu warna atau cetak gunakan `direction="mono"`.
- Beri `title` pada `ReaksanSymbol` hanya saat simbol menjadi satu-satunya identitas di layar; nav yang sudah punya teks cukup memakai `aria-hidden`.
- Jangan memakai kembali ikon FlaskConical generik sebagai brand mark. Ikon itu hanya untuk item navigasi Materials.

## 3. Color system

### 3.1 Core palette

Nama token mengikuti CSS variable LiVE UNPAD agar mudah dipetakan ke source reference. Reaksan memakai token semantic sebagai API utama component.

| Token                | Hex       | Peran                                           |
| -------------------- | --------- | ----------------------------------------------- |
| `brand.primary`      | `#F9B129` | Primary action, selected tab, active map marker |
| `brand.primary-soft` | `#FEF1CC` | Selected surface, subtle highlight              |
| `brand.primary-deep` | `#AE7C1D` | Text or icon on light yellow surfaces           |
| `brand.ink`          | `#212121` | Main text, strong heading                       |
| `brand.ink-muted`    | `#6B6B6B` | Supporting text, metadata                       |
| `surface.canvas`     | `#F5F5F5` | App background                                  |
| `surface.panel`      | `#FFFFFF` | Card, table, drawer, form surface               |
| `surface.subtle`     | `#EEEEEE` | Input background, inactive control              |
| `border.default`     | `#E1E1E1` | Card and control border                         |
| `border.strong`      | `#B7B7B7` | Focus-adjacent or structural border             |
| `state.success`      | `#048444` | Available, approved, completed, healthy         |
| `state.success-soft` | `#E5F5ED` | Success badge background                        |
| `state.info`         | `#6E8EDA` | Reserved, scheduled, informational              |
| `state.info-soft`    | `#E9EEFC` | Info badge background                           |
| `state.warning`      | `#F7B742` | Low stock, delayed, attention                   |
| `state.warning-soft` | `#FFF4D9` | Warning badge background                        |
| `state.danger`       | `#F45959` | Rejected, damaged, overdue, destructive         |
| `state.danger-soft`  | `#FDE9E9` | Error badge background                          |
| `state.neutral`      | `#929292` | Inactive, archived, unknown                     |

Use the deep variants for text and icon contrast. Do not put small white text directly on `#F9B129`, `#F7B742`, or `#FEF1CC` unless contrast has been checked.

### 3.2 Suggested CSS variables

```css
:root {
  --background: #f5f5f5;
  --foreground: #212121;
  --card: #ffffff;
  --card-foreground: #212121;
  --primary: #f9b129;
  --primary-foreground: #212121;
  --primary-soft: #fef1cc;
  --muted: #eeeeee;
  --muted-foreground: #6b6b6b;
  --border: #e1e1e1;
  --success: #048444;
  --info: #6e8eda;
  --warning: #f7b742;
  --danger: #f45959;
}
```

### 3.3 Usage rules

- Use `brand.primary` for one primary action per visible region.
- Use `state.success` for resource availability only when the resource is actually available for the selected time, not merely active in the catalog.
- Use `state.info` for reservations and scheduled states.
- Use `state.warning` for attention that is recoverable, such as low stock or due soon.
- Use `state.danger` for blocked, rejected, damaged, overdue, or destructive actions.
- Do not create a new color for every equipment type. Equipment type is identified by label and icon, not arbitrary color.
- Use neutral surfaces to create hierarchy before adding more accent colors.

## 4. Typography

### 4.1 Typeface

Use **Inter** as the single UI family, matching the LiVE UNPAD baseline. One family with controlled weights keeps the dense operational UI coherent and multilingual text predictable.

Pengecualian: wordmark logo memakai Alfa Slab One (lihat 2.4). Font display itu tidak dipakai untuk heading, label, atau teks UI mana pun.

```css
font-family:
  Inter,
  system-ui,
  -apple-system,
  "Segoe UI",
  Roboto,
  sans-serif;
```

Do not use a display font for dashboard headings. The product needs fast scanning, stable numerals, and readable Indonesian and English labels more than ornamental contrast.

### 4.2 Weight and scale

| Style           |   Size | Line height | Weight | Usage                            |
| --------------- | -----: | ----------: | -----: | -------------------------------- |
| Display         | `32px` |      `38px` |    700 | Rare page title on wide screens  |
| Page title      | `24px` |      `30px` |    700 | Dashboard, Inventory, Calendar   |
| Section title   | `18px` |      `24px` |    700 | Panel and card heading           |
| Body strong     | `14px` |      `20px` |    600 | Primary row label, key value     |
| Body            | `14px` |      `20px` |    400 | Default content                  |
| Compact         | `13px` |      `18px` |    400 | Table metadata, helper text      |
| Caption         | `12px` |      `16px` |    500 | Status metadata, timestamps      |
| Numeric display | `28px` |      `32px` |    700 | KPI values                       |
| Data mono       | `12px` |      `16px` |    500 | Asset ID, request ID, lot number |

Use `font-variant-numeric: tabular-nums` for quantities, dates, times, and KPI values. Use a monospace face only for identifiers, never for general UI copy.

### 4.3 Copy rules

- Use direct labels: `Reserve slot`, `Create activity`, `Review request`, `Report incident`.
- Show the actor in activity and audit language: `PLP approved request`, `Ahmad reserved Oven OVN-001`.
- Keep button labels specific to the action. Avoid generic `Learn more` or `Submit` when `Submit request` is clearer.
- Keep Indonesian as the default product language, while preserving domain labels users already recognize such as `Request`, `Reservation`, `Issue`, `Return`, and `Incident` where they are part of the information architecture.
- Never use color-only or icon-only copy for critical state.

## 5. Spacing, shape, and elevation

### 5.1 Spacing scale

Use a 4px base scale. The layout should feel spacious in the canvas but compact inside operational controls.

| Token      |  Value | Use                              |
| ---------- | -----: | -------------------------------- |
| `space-1`  |  `4px` | Icon gap, badge inset            |
| `space-2`  |  `8px` | Tight control gap                |
| `space-3`  | `12px` | Row padding, compact card        |
| `space-4`  | `16px` | Default control and card padding |
| `space-5`  | `20px` | Field group gap                  |
| `space-6`  | `24px` | Section and panel padding        |
| `space-8`  | `32px` | Page group separation            |
| `space-10` | `40px` | Dashboard band separation        |
| `space-12` | `48px` | Wide page section separation     |

Recommended page container: `24px` horizontal padding on desktop, `16px` on mobile. Maximum content width is fluid for map and table workspaces, with readable detail columns capped around `960px`.

### 5.2 Radius

- `radius-sm: 8px` for inputs, table controls, and compact badges.
- `radius-md: 12px` for cards, panels, and drawers.
- `radius-lg: 16px` for primary dashboard surfaces and map frame.
- `radius-pill: 999px` only for status badges, segmented controls, and compact filters.

Do not make every surface a pill. The reference dashboard works because controls are rounded while the workspace still has clear rectangular structure.

### 5.3 Borders and shadows

- Default border: 1px `border.default`.
- Use a stronger border for selected room, focused field, or active table row.
- Use one restrained shadow for elevated drawers, popovers, and the app shell. Cards should mostly rely on surface contrast and border.
- Avoid glow, glass blur, gradient mesh, and decorative background grids. They do not improve lab coordination.

## 6. App shell and navigation

### 6.1 Desktop shell

The desktop shell follows the useful parts of the supplied dashboard references:

- Left sidebar with Reaksan mark, role-aware navigation, and grouped destinations.
- Top header with page title, global search, filter/action area, notification, and account menu.
- Main canvas with one dominant workspace and supporting panels.
- Optional right rail only when it improves triage, such as pending requests, live incidents, or upcoming reservations.

Suggested widths:

- Sidebar: `240px` expanded, `72px` collapsed.
- Header: `64px` minimum height.
- Content gap: `16px` to `24px`.
- Right rail: `280px` to `320px` when present.

Sidebar labels must reflect the current role. Student navigation prioritizes Laboratory, My Research, Requests, Calendar, Incidents, Notifications. PLP prioritizes Requests, Reservations, Inventory, Issue / Return, Incidents, Schedule, History.

### 6.2 Navigation states

- Active destination uses `brand.primary-soft`, dark text, and a left-aligned icon treatment. Do not rely on a colored stripe alone.
- Pending counts use compact neutral or warning badges and must remain readable at 200% zoom.
- Destructive destinations are not colored red in the navigation. Red is reserved for an actual destructive or incident state.
- Every collapsed icon needs an accessible label and tooltip.

## 7. Component foundations

### 7.1 Buttons

Variants:

- Primary: yellow surface with dark text, one per action group.
- Secondary: white surface with border.
- Tertiary: transparent text action.
- Destructive: red surface only for confirmed destructive action.
- Quiet icon button: neutral surface or transparent, always with accessible name.

States:

- Default, hover, pressed, focus-visible, disabled, loading.
- Loading preserves button width and replaces label with a spinner plus `Memproses...` when the action takes more than a moment.

Minimum hit area: `44px` by `44px` on touch surfaces.

### 7.2 Inputs and filters

- Height `40px` desktop, `44px` mobile.
- Label stays visible above the field. Placeholder is not the label.
- Search field supports keyboard shortcut only if the shortcut is announced and does not conflict with browser behavior.
- Filter controls show active filter count and offer `Clear filters`.
- Date/time selectors always show timezone when the context can cross users or rooms.

### 7.3 Cards and panels

Card anatomy:

```text
Title + optional context
Primary value or content
Supporting metadata
Action or status
```

Do not turn every item into a card. Use a table for comparison, a timeline for history, a calendar for time, and a map for spatial orientation.

### 7.4 Status badge

Status badges must include text. Recommended mappings:

| Domain state                            | Visual token                                              |
| --------------------------------------- | --------------------------------------------------------- |
| Available, Approved, Completed, Healthy | success                                                   |
| Reserved, Scheduled, Pending PLP        | info                                                      |
| Low stock, Due soon, Request revision   | warning                                                   |
| Rejected, Damaged, Overdue, Failed      | danger                                                    |
| Draft, Archived, Retired, Unknown       | neutral                                                   |
| In use, Active                          | brand primary with dark text or info depending on context |

The same state must use the same color everywhere. `Available` on the map, inventory table, and detail page should be recognizably the same state.

### 7.5 Data table

Use tables for PLP inventory, request review, audit, and batch history.

- Sticky header only when the table is long enough to need it.
- Keep the first column identifying: asset name, request ID, material name.
- Use right alignment for quantities and currency-like numeric values.
- Keep row actions in an overflow menu with a visible label on focus.
- On mobile, turn rows into stacked record blocks or use a deliberate horizontal scroll container with a visible affordance. Never let the page itself overflow.

### 7.6 Timeline

Use timeline for request state, equipment lifecycle, incident, and audit history. Each event includes actor, action, timestamp, and relevant object. Use a vertical connector only to express chronology, not as decoration.

## 8. Dashboard patterns

### 8.1 Student dashboard

The student dashboard is an orientation page, not a report wall.

Recommended order:

1. Greeting and current research context.
2. Lab map preview as the visual entry point.
3. Upcoming reservations and resource availability.
4. My Activities and My Requests.
5. Pending actions and notifications.

Use a single KPI strip only when it helps answer a decision: upcoming reservations, pending requests, active resources, or unresolved incidents. Avoid decorative KPI cards with values that do not lead to action.

### 8.2 PLP dashboard

The PLP dashboard is a triage workspace:

- Pending requests requiring review.
- Today’s issue and return queue.
- Schedule conflicts and upcoming reservations.
- Low-stock materials and items under inspection.
- Open incidents.

The dominant panel should be the queue that needs attention. The right rail can show schedule and incident summaries. A map is useful as a secondary locator, not the main PLP action surface.

### 8.3 Admin
- Admin: configuration, users, roles, rooms, equipment types, assignments, and audit access.

MVP difokuskan secara ketat pada 3 role: Mahasiswa (Student), PLP, dan Admin. Reuse the same shell and component language, but do not show admin-density tables to students.

## 9. Laboratory map

### 9.1 Purpose

The map is a spatial index for the laboratory. It must make room selection and resource discovery faster than scanning a list.

### 9.2 Visual direction

Use an isometric or pseudo-3D top-down laboratory scene inspired by the supplied house-plan reference:

- The house becomes a lab facility with rooms, benches, storage, sinks, safety zones, and circulation paths.
- The camera angle is a stable 30 to 45 degree isometric view. Avoid perspective distortion that makes room size hard to compare.
- Walls and floor planes are warm neutral. Equipment and status overlays use the Reaksan semantic palette.
- The scene has enough detail to orient users but not enough detail to turn into a photorealistic game asset.
- Keep the map background quiet so labels, room selection, and status markers remain readable.

### 9.3 Map anatomy

```text
Map frame
├── room scene
├── room labels
├── equipment or status markers
├── search / filter controls
├── legend
├── zoom and reset controls
└── selected room summary
```

Room selection must work by click, keyboard, and touch. The selected room gets a visible outline, `brand.primary-soft` fill, and a summary panel with equipment count, available count, in-use count, maintenance count, and low-stock indicator.

### 9.4 Map interaction rules

- Default view shows rooms and broad availability, not every asset label.
- Zoom reveals equipment markers and storage detail progressively.
- Hover is supplementary. Every hover action has a click or focus equivalent.
- A marker never communicates status by color alone. Use a label, icon, or accessible description.
- Map filters include room, resource type, availability, and status.
- Deep-linking to a room or asset preserves the selected state in the URL where practical.
- On small screens, map becomes a horizontally contained viewport with a room list or bottom sheet. Do not shrink the whole scene until labels are unreadable.

### 9.5 Map statuses

Use low-saturation room surfaces and high-contrast status markers:

- Available: green marker with check icon.
- Reserved: blue marker with calendar icon.
- In use: yellow marker with activity icon.
- Maintenance or damaged: red marker with tool or alert icon.
- Selected: primary outline and `brand.primary-soft` halo, without hiding the status color.

## 10. Inventory

### 10.1 Student inventory

Student-facing inventory begins with search and availability, not administrative CRUD.

Each equipment result shows:

- Equipment name and asset ID.
- Room.
- Borrowable or usage-only.
- Current status and condition.
- Next available slot.
- Current usage plan when visibility rules allow it.
- Action: `View availability` or `Reserve slot`.

Material result shows physical, reserved, and available stock, unit, batch or expiry warning when relevant, and the configured dispensing rule.

### 10.2 PLP inventory

PLP inventory supports dense comparison:

- Equipment type and asset table.
- Material and batch table.
- Filters for room, status, condition, usage type, expiry, and stock threshold.
- Inline status is informative. Mutations happen through an explicit action flow with confirmation and audit context.

### 10.3 Inventory detail

Use a two-column desktop layout:

- Main: identity, status, condition, availability or stock details.
- Side panel: room, usage rules, current reservation, recent history, actions.

On mobile, the side panel moves below the primary content and actions become a sticky bottom action bar only when it does not cover content.

## 11. Calendar and availability

### 11.1 Calendar purpose

The calendar answers when a resource can be used and makes occupied time understandable. It is not a decorative monthly view.

### 11.2 Views

- Month: planning across an activity period.
- Week: default for reservation coordination.
- Day: precise equipment usage and issue / return operations.
- Resource timeline: compare one or more equipment assets.

Use color to separate state, not to identify people. Each event includes the resource, time, activity title, and user visibility permitted by the PRD.

### 11.3 Availability interaction

- Available slots are visibly distinct from occupied slots.
- Selecting an occupied slot offers `Request shared usage` only when the interval is valid.
- Selecting an available slot pre-fills the request builder with asset, room, date, and time.
- Conflict feedback is inline and specific: `OVN-001 is reserved from 14:00 to 17:00. Choose another slot.`
- Display timezone and local date clearly. Default display timezone is `Asia/Jakarta` when configured for the lab.

## 12. Request builder

The request builder implements the product principle `one research context, multiple requests` and `one request, multiple resource types`.

### 12.1 Structure

Use a stepper on desktop and a single scrollable form with anchored sections on mobile:

1. Research activity.
2. Purpose and practical plan.
3. Equipment and time slots.
4. Materials and quantities.
5. Review and submit.

The user must always see a persistent summary of selected equipment, material quantities, schedule, and validation state.

### 12.2 Form rules

- Explain why a field is needed before asking for it.
- Separate equipment reservation details from material quantity details while keeping one request context.
- Show configured minimum, increment, maximum, and unit for material dispensing.
- Show availability conflicts near the affected item, not only at final submit.
- Preserve draft input after recoverable validation or network error.
- Submit action is disabled only for a reason that is visible to the user.
- Review view exposes supervisor, activity, time range, resource items, usage plan, and expected next state.

### 12.3 Request state presentation

Show the state machine as a timeline, not only a badge:

```text
Draft → Submitted → Pending PLP → Approved → Ready for pickup → Active → Returned → Completed
```

Additional states such as rejected, revision requested, cancelled, expired, and overdue appear as branches with an explanation and next action.

## 13. Incident UI

Incident UI must make reporting safe and accountability traceable.

### 13.1 Report incident

Keep the form short:

- Equipment or resource.
- Related request or reservation when available.
- What happened.
- When it happened.
- Evidence upload.
- Immediate safety note if relevant.

Do not automatically mark equipment as damaged merely because a student submits a report. Show the current state and explain that PLP or an authorized inspector will assess it.

### 13.2 Incident detail

Desktop layout:

- Main column: description, evidence, assessment, resolution timeline.
- Side column: equipment identity, room, reporter, current status, assigned PIC, actions allowed by role.

Use strong warning or danger treatment only for actual risk, not for every open incident. Critical safety copy should be visible in the page, not only in a toast.

## 14. Responsive behavior

Responsive design is a reflow, not a squeezed desktop.

### 14.1 Layout states

- Narrow: one column, compact header, bottom navigation or labeled menu, map inside a contained viewport, tables become record blocks.
- Mid: two-column sections where content still reads, sidebar may collapse, right rail moves below the primary workspace.
- Wide: full app shell, map plus supporting panel, dense inventory tables, side-by-side request summary.

Choose breakpoints where content stops fitting, not from a device list. Verify at narrow phone, wide phone, tablet, small laptop, and large desktop widths.

### 14.2 Mobile rules

- No page-level horizontal overflow.
- Minimum interactive hit area `44px`.
- Keep a visible label for the menu when it is the only path to navigation.
- Reserve space for fixed bottom navigation and safe-area insets.
- Use `clamp()` or deliberate mobile type steps for page titles and display values.
- Reduce section padding and card density while keeping primary actions obvious.
- Do not hide critical status or next action inside hover-only UI.
- Long IDs wrap or expose a copy action. They must not force the viewport wider.

## 15. Accessibility

Accessibility is part of the design contract, especially because lab status and incident state can be safety-relevant.

- Meet WCAG AA contrast for normal text and controls. Check every semantic color pair before implementation.
- Never use color alone for availability, incident severity, or request state.
- Every icon button has an accessible name. Decorative icons are hidden from assistive technology.
- Use visible `:focus-visible` rings with at least 2px thickness and sufficient contrast.
- Keyboard order follows visual and task order. Map rooms, calendar events, drawers, menus, and table actions are keyboard reachable.
- Dialogs trap focus, restore focus to the trigger, and have a clear title.
- Tables expose headers and relationships. Do not encode critical data only through cell color.
- Use `aria-live` sparingly for submit results, async errors, and status changes that matter to the current task.
- Respect `prefers-reduced-motion` and provide an equivalent non-animated state.
- Do not use tiny captions as the only representation of a critical time, quantity, or warning.

## 16. Motion

Motion should explain spatial and state change.

### 16.1 Allowed motion

- Page or panel entrance: `160ms` to `220ms`, ease-out.
- Drawer and popover: translate from its origin, `180ms` to `240ms`.
- Map zoom and room selection: smooth transform when initiated by the user.
- Status update: subtle opacity or background transition, never a flashing color.
- Loading shimmer: only for skeleton regions, with reduced-motion fallback.

### 16.2 Avoid

- Animating every card on page load.
- Bounce, elastic scale, cursor-following decoration, or ornamental parallax.
- Moving a user’s focus or changing the position of a form while they type.
- Looping motion for a status that is not urgent.

Use Motion from the existing starter. Every motion path must have an instant or reduced-motion equivalent.

## 17. Loading, empty, and error states

### 17.1 Loading

Use contextual skeletons that match the final geometry:

- `DashboardSkeleton`: map frame, reservation list, activity cards.
- `TableSkeleton`: header, rows, pagination region.
- `EquipmentDetailSkeleton`: identity block, availability timeline, side panel.
- `CalendarSkeleton`: toolbar, calendar grid, event bars.
- `MapSkeleton`: quiet floor silhouette with room blocks, not fake data markers.

Do not show a blank screen. Keep existing data visible during background refetch when safe.

### 17.2 Empty

Every empty state explains what is missing and provides the next useful action.

- No activities: `Belum ada research activity. Buat activity untuk menghubungkan request dengan konteks penelitian.` Action: `Buat activity`.
- No equipment result: `Tidak ada equipment yang cocok dengan filter ini.` Action: `Clear filters`.
- No requests: `Belum ada request resource.` Action: `Buat resource request`.
- No incidents: `Tidak ada incident yang perlu ditindaklanjuti.`
- No map selection: `Pilih room untuk melihat equipment dan availability.`

Never use an empty state to imply that data was deleted unless the system confirms deletion.

### 17.3 Error

Distinguish:

- Network: `Tidak bisa terhubung ke Reaksan.` Action: `Coba lagi`.
- Permission: `Kamu tidak memiliki akses ke resource ini.`
- Business conflict: `OVN-001 tidak tersedia pada waktu yang dipilih.` Action: `Pilih slot lain`.
- Validation: show the issue beside the field and summarize it at the form top.
- Server: `Terjadi masalah saat memproses request.` Action: `Coba lagi` and preserve draft where possible.

Toast is only for short confirmation. Critical error and business conflict must also appear in the relevant page or form.

## 18. 3D lab map asset brief for Higgsfield

Higgsfield is the preferred asset-generation tool for the initial visual exploration. The generated image is a visual reference for the UI map, not the source of truth for room data. Room geometry, labels, status, and click targets must remain data-driven in the app.

### 18.1 Generation brief

```text
Create a clean isometric top-down 3D cutaway chemistry laboratory floor plan for Reaksan, an academic laboratory resource coordination dashboard. Adapt the supplied house floor-plan reference into a real laboratory, not a home.

Show five configurable laboratory rooms connected by clear circulation paths: organic chemistry lab, inorganic chemistry lab, biochemistry lab, analytical lab, and physics lab. Include lab benches, fume hoods, analytical balance stations, ovens, spectrophotometer stations, sinks, cabinets, safety shower, eyewash, and marked storage zones. Use warm neutral floors and walls, restrained realistic materials, soft studio lighting, and a clean asset-library look.

Camera: stable 35-degree isometric top-down, wide 16:9 composition, rooms readable at dashboard scale, no dramatic perspective. Style: polished 3D architectural visualization with simplified geometry and clear silhouettes. Palette: warm white and light gray structure, muted wood or tan accents, Reaksan yellow #F9B129, cream #FEF1CC, green #048444, blue #6E8EDA, amber #F7B742, red #F45959 used only as small status markers.

No people, no brand logos, no watermark, no text labels baked into the image, no floating UI, no fantasy elements, no neon glow, no excessive reflections, no clutter. Keep room boundaries and equipment positions stable across variations.
```

### 18.2 Asset acceptance criteria

- No home furniture or bedroom/living-room cues remain.
- Five room zones are legible without baked-in labels.
- A room can be cropped or isolated without losing its orientation.
- Equipment silhouettes are distinct enough for overlay markers.
- Lighting is neutral enough that semantic overlay colors remain accurate.
- Background can be removed or masked for use inside the map frame.
- Deliver a wide hero composition plus individual room or equipment crops when the tool supports variations.
- Keep a plain geometry version for interaction testing and a polished version for visual review.

### 18.3 Implementation boundary

The asset must not encode live status, inventory count, user identity, or availability. Those belong to HTML or canvas overlays and come from the server. This keeps the asset reusable when rooms, equipment, or status change.

## 19. Implementation mapping

Recommended component domains from the architecture:

```text
components/
├── ui/                    # primitive controls only
├── layout/                # AppShell, Sidebar, Header, PageContainer
├── navigation/            # role-aware navigation
├── laboratory/            # LabMap, RoomCard, RoomStats
├── equipment/             # EquipmentCard, AvailabilityCalendar, EquipmentTimeline
├── materials/             # MaterialCard, StockIndicator, BatchTable
├── activity/              # ActivityCard, ActivityForm, ActivityTimeline
├── request/               # RequestForm, RequestSummary, RequestStatus, RequestReview
├── fulfillment/           # IssuePanel, ReturnPanel, InspectionPanel
├── incident/              # IncidentForm, IncidentDetail, EvidenceUploader
└── notifications/         # NotificationList, NotificationItem
```

Keep primitives in `src/components/ui`. Keep domain decisions in domain components and services. Keep permission-aware actions server-authorized even when the UI hides them.

Recommended page-specific emphasis:

| Area              | Primary visual tool             | Secondary tool                   |
| ----------------- | ------------------------------- | -------------------------------- |
| Student dashboard | Lab map + upcoming reservations | Activity and request cards       |
| Room overview     | Isometric room view             | Resource stats and schedule      |
| Inventory         | Searchable table or record list | Detail drawer and history        |
| Calendar          | Resource timeline               | Availability filters             |
| Request builder   | Structured form + live summary  | Conflict and validation callouts |
| PLP dashboard     | Triage queue                    | Schedule, stock, incident rail   |
| Incident          | Timeline + evidence             | Equipment context panel          |

## 20. Design quality gate

Before a screen is considered ready:

- Can a user identify the next action without interpreting decoration?
- Does the screen show the relevant room, resource, time, and current state?
- Is the primary action specific and permission-appropriate?
- Are loading, empty, network, permission, validation, and business-error states designed?
- Does the layout reflow without page-level horizontal scroll?
- Are touch targets at least `44px`?
- Does every critical state survive grayscale, color-vision differences, and screen reader use?
- Does motion explain a transition and respect reduced motion?
- If the logo and product name were removed, would the combination of warm Unpad palette, lab map, resource language, and operational hierarchy still feel like Reaksan?

## 21. Decision log

- The color system is derived from the current LiVE UNPAD CSS baseline and adapted for dashboard semantics.
- Inter is used as one family for heading, body, and data UI because it matches the reference and supports dense operational reading.
- The supplied Weagle references inform composition and interaction patterns, not branding or copied content.
- The supplied house cutaway informs the map camera, room readability, and 3D visual language. The subject is converted into a chemistry laboratory.
- Higgsfield is specified for visual asset exploration. The application remains the source of truth for rooms, equipment, statuses, reservations, and inventory.
