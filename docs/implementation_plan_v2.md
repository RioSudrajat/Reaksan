# Implementation Plan: Schedule Event History, PDF Download, Multi-Day Calendar Spanning, & User Deletion

## Ringkasan Perubahan
Menindaklanjuti permintaan perbaikan dan peningkatan fitur:
1. **List History di bawah Schedule**: Menyesuaikan daftar riwayat agar strictly memfilter sesuai bulan yang aktif pada kalender (misal: jika melihat Oktober, hanya tampilkan agenda bulan Oktober). Tampilan disederhanakan (clean, antislop, tipografi jelas, tidak ramai dengan tumpukan badge bertingkat).
2. **Cetak & Unduh PDF**: Memperbaiki layout cetak agar tidak melebihi lembar (page fit, `@page` margin teratur, auto-wrap tabel) dan menambahkan fungsionalitas **Save / Unduh PDF (.pdf)** langsung di semua tempat cetak (History Jadwal, Daily Run Sheet, Berita Acara Stok Opname) menggunakan teknik sub-canvas per-page slicing.
3. **Multi-day Schedule Continuous Spanning**: Memperbaiki pemotongan bar event berhari-hari oleh garis putih dan bug judul berulang (seperti pada "Uji Viskositas Fluida Non-Newtonian Gliserol"). Event multi-hari kini dirender menyatu dalam satu bentangan bar yang kontinu dengan penanganan cross-month date parsing yang akurat.
4. **Calendar Overflow (+N Lainnya) & Day Selection Overview**: Jika dalam satu tanggal jumlah request melebihi kapasitas kalender (`MAX_LANES = 2`), tampilkan indikator `+N lainnya`. Saat tanggal tersebut dipilih (atau diklik bar event), tampilkan overview daftar semua request pada hari itu terlebih dahulu (`PlpDayOverviewCard`), dengan kemampuan membuka detail operasional dan tombol kembali yang konsisten.
5. **Admin Delete User Account**: Mengaktifkan penghapusan akun pengguna dari UI hingga tuntas ke database PostgreSQL (termasuk penanganan relasi foreign key 26 tabel dan audit log).

---

## Task Breakdown

### Task 1: Schedule Event History Bulan Aktif & UI Simpel
- [x] Sinkronkan active month antara `ScheduleCalendar` dan `ScheduleEventHistory` di `src/app/(protected)/plp/schedule/page.tsx` & komponen kalender (`PlpScheduleSection`).
- [x] Tambahkan filter bulan di `ScheduleEventHistory` (`src/components/plp/schedule-event-history.tsx`) menggunakan `parseJakartaDate`.
- [x] Refactor UI `ScheduleEventHistory` agar lebih bersih, elegan, dan informatif (antislop design system).

### Task 2: Cetak & Simpan / Unduh PDF
- [x] Implementasikan utilitas unduh PDF (`exportElementToPdf` / jsPDF & html2canvas) di `src/lib/pdf-export.ts` dengan sub-canvas per-page slicing tanpa negative bleed.
- [x] Perbaiki styling CSS cetak (`@media print` dan `@page`) di `schedule-event-history.tsx`, `daily-run-sheet.tsx`, dan `opname/[id]/sheet/page.tsx` agar pas dalam batas kertas A4 tanpa overflow horizontal maupun vertikal.
- [x] Perbarui tombol di `print-button.tsx` dan halaman terkait agar menyediakan opsi **Unduh PDF (.pdf)** dan **Cetak Dokumen**.

### Task 3: Visual Multi-Day Event Bar Spanning & Bug Judul Berulang
- [x] Refactor render bar minggu di `src/components/schedule-calendar.tsx`: buat bar event sebagai elemen CSS grid yang membentang (`grid-column: start / end`) melintasi hari tanpa terpotong batas kolom harian.
- [x] Selesaikan bug parsing tanggal cross-month (`eventStartDate` / `eventEndDate` & `view.service.ts`) agar event dari akhir bulan sebelumnya tidak meluap ke seluruh bulan aktif.
- [x] Perbaiki logika rendering judul agar hanya tampil sekali di awal bentangan bar (mengatasi bug "Uji Viskositas Fluida Non-Newtonian Gliserol").

### Task 4: Calendar Overflow (+N lainnya) & Day Overview Modal
- [x] Tampilkan `+{count} lainnya` di sel tanggal jika jumlah event melebihi batas tampilan kalender (`MAX_LANES = 2`).
- [x] Saat tanggal di-select/di-klik (atau saat klik `+N lainnya`), tampilkan panel / dialog Day Overview (`PlpDayOverviewCard`) yang memuat seluruh request pada tanggal tersebut.
- [x] Sediakan navigasi dari item di Day Overview ke detail masing-masing permohonan, serta tombol kembali yang selalu aktif.
- [x] Berikan penanda visual jika event tertentu diklik langsung dari bar kalender.

### Task 5: Admin Delete User Account Fungsional hingga Database
- [x] Buat fungsi `deleteUserAccount` di `src/services/admin.service.ts` yang menangani pembersihan relasi 26 tabel, penghapusan dari tabel `user`, dan pencatatan audit log.
- [x] Buat API handler `DELETE /api/admin/users/[id]` di `src/app/api/admin/users/[id]/route.ts`.
- [x] Tambahkan tombol hapus & dialog konfirmasi pada `UserRoleForm` / `src/app/(protected)/admin/users/page.tsx`.

---

## Verifikasi
- Jalankan test dan typecheck (`npm run check`): 10/10 test PostgreSQL unit lulus, 0 error lint/typecheck.
- Jalankan `npm run build`: 76 routes terkompilasi sukses dengan Turbopack.
- Verifikasi kalender dan riwayat bulan Oktober dengan data seeding realistis (`scripts/seed-fisik-requests.mjs`).
- Uji ekspor/unduh PDF di ketiga lokasi lembar cetak (History, Run Sheet, Berita Acara Opname).
- Uji hapus akun pengguna di Admin Users via API dan verifikasi penghapusan permanen dari database.
