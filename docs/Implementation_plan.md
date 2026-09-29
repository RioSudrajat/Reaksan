# Revisi Plan Finishing PLP &amp; Admin Workspace

## Ringkasan

Plan ini berangkat dari implementasi yang sudah ada, bukan membangun ulang. Student workspace menjadi baseline: route `/student/*`, katalog berbasis room, request database, shared usage, incident, notifikasi, dan kalender. UX form request Student tetap dipertahankan; perubahan di sana dibatasi pada regression check.

## Status implementasi (23 September 2026)

Revisi ini sudah dieksekusi. Ringkasnya:

- **Stabilisasi UI:** crash `/admin/materials/batches` dan `/admin/assignments` diperbaiki (helper tanggal dipindah ke `src/lib/date-input.ts` agar tidak dipanggil dari modul `"use client"` di Server Component). Guard halaman dan API diselaraskan per resource, dan grafik risiko/status ditambahkan ke dashboard serta inventory.
- **Identitas:** logo SVG R + flask (`src/components/reaksan-logo.tsx`), favicon `src/app/icon.svg`, dipakai di Brand, sidebar Student/PLP/Admin, halaman auth, dan didokumentasikan di `docs/DESIGN.md` bagian 2.4.
- **Visualisasi:** komponen `src/components/charts.tsx` (bar horizontal, stacked bar, status list) dengan legenda, tabel sr-only, empty state, dan tautan ke daftar terfilter. Agregat dihitung di `src/services/analytics.service.ts` dari data nyata.
- **Admin:** Assignment memakai pilihan laboratory/room/activity, bukan ID bebas, dengan validasi role, scope, periode, dan duplikasi di server. Dashboard menambah KPI assignment aktif, batch expiry, dan stok menipis.
- **Media, opname, export:** upload `POST /api/admin/uploads` dengan driver local/S3 dan `GET /api/media/[id]` untuk user terautentikasi; sesi hitung stok (`/plp/inventory/opname`) menyimpan baseline dan hitungan fisik tanpa memposting adjustment; CSV diekspor lewat `/api/exports/[report]` dengan audit; lembar hitung dicetak lewat browser print-to-PDF.

Batas yang masih berlaku: driver S3 belum diuji tanpa kredensial, bukti incident belum diupload (baru gambar katalog), hard delete master data tidak disediakan (deaktivasi lewat flag `active`), dan PDF dihasilkan lewat print browser, bukan library server.

Di repo, PLP/Admin sudah punya banyak halaman dan API, tetapi masih ada pekerjaan UI, integrasi, dan CRUD. `docs/Implementation_[plan.md](http://plan.md)` perlu diganti agar mencerminkan keadaan sebenarnya. Prioritas pertama adalah halaman Admin Material Batches dan Assignments yang dilaporkan gagal dibuka, serta audit teks/komponen yang terpotong.

Arah brand mengikuti design system Reaksan yang sudah ada: kuning `#F9B129`, hitam/charcoal `#212121`, dan aksen netral yang tenang. Riset produk lab/inventory juga menguatkan manfaat hitung stok per lokasi, expiry, histori alat, serta laporan yang dapat dicetak. Untuk stock opname, keputusan scope-nya adalah **catat hitungan fisik dan tampilkan laporan selisih; jangan mengubah ledger stok secara otomatis**. Export menggunakan CSV untuk analisis dan PDF untuk lembar hitung/ringkasan tertentu. \[Odoo: hitung stok dan cycle count\]([https://www.odoo.com/documentation/18.0/applications/inventory\_and\_mrp/inventory/warehouses\_storage/inventory\_management/count\_products.html](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management/count_products.html)), \[Odoo: PDF count sheet\]([https://www.odoo.com/documentation/18.0/applications/inventory\_and\_mrp/inventory/warehouses\_storage/inventory\_management/cycle\_counts.html](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management/cycle_counts.html)), \[Labguru: inventory dan pengelolaan alat lab\]([https://www.labguru.com/inventory](https://www.labguru.com/inventory)). Rekomendasi ini mengambil pola yang cocok untuk konteks Reaksan, bukan menganggap semua fitur produk tersebut wajib.

## Perubahan utama

### 1. Audit dan stabilisasi UI — prioritas tertinggi

- Revisi `docs/Implementation_[plan.md](http://plan.md)` berdasarkan implementasi Student, PLP, Admin, API, dan schema yang benar-benar ada. Jangan mengulang pekerjaan yang sudah selesai.

- Reproduksi error di `/admin/materials/batches` dan `/admin/assignments` pada akun Admin; telusuri error render, query, data kosong/tidak lengkap, dan request API sebelum menentukan perbaikannya.

- Audit semua halaman PLP/Admin untuk teks terpotong dan overflow di berbagai lebar layar, termasuk zoom 200% dan label panjang. Screenshot yang dikirim belum menunjukkan konteks cukup untuk menyimpulkan penyebabnya, jadi audit mencakup shell, navigasi, tab, tabel, heading, dan tombol.

- Lengkapi state loading, empty, error, dan success; berikan pesan yang jelas dan aksi pemulihan jika memungkinkan.

### 2. Logo dan identitas Reaksan

Sekarang brand memakai ikon FlaskConical generik, sementara favicon memakai simbol berbeda. Satukan sebagai satu identitas:

- Buat logo berbasis SVG: wordmark “Reaksan” dengan simbol custom yang menggabungkan bentuk huruf **R** dan elemen alat/flask lab secara sederhana. Simbol harus tetap terbaca pada ukuran favicon; wordmark memakai charcoal dan aksen kuning Unpad/Reaksan.

- Sediakan varian horizontal untuk header/login, simbol saja untuk sidebar collapsed/favicon, dan varian satu warna untuk latar atau kebutuhan cetak.

- Terapkan logo yang sama ke `Brand`, sidebar workspace, halaman auth, favicon/app icon, serta panduan visual di `docs/[DESIGN.md](http://DESIGN.md)`. Jangan mengubah palet yang sudah ditetapkan atau menambahkan dekorasi yang tidak membantu identitas.

### 3. PLP workspace sebagai alat kerja harian

Pertahankan route yang ada dan rapikan hubungan antaralur:

- **Dashboard:** KPI tetap ada sebagai ringkasan, tetapi diikuti grafik tren request, antrean prioritas, return/inspection, low stock/expiry, dan incident terbuka. Klik visual atau bar membawa PLP ke daftar terfilter yang relevan.

- **Request review:** daftar dengan search/filter; detail menampilkan Student, activity, room, alat/material, stok, konflik jadwal, dan timeline. Approve, reject, dan revision harus konsisten memperbarui reservation, stock reservation, notifikasi, dan audit.

- **Issue/return:** bedakan equipment borrowable dan usage-only; catat penerima, jumlah aktual material, kondisi saat issue, hasil inspeksi saat return, dan alasan untuk selisih. Cegah transaksi ganda akibat klik ulang atau request bersamaan.

- **Schedule:** kalender global dengan filter room, alat, tanggal, dan status; shared usage tetap terlihat dalam reservation induk. Kalender dipakai untuk melihat dan menelusuri jadwal, bukan melewati permission untuk mutasi.

- **Inventory alat:** sediakan daftar dan detail per unit dengan kondisi, lokasi, histori, reservation, dan incident terkait. Maintenance dasar dicatat sebagai event yang dapat ditelusuri; maintenance/calibration berulang otomatis menjadi tahap berikutnya bila aturan institusi sudah tersedia.

- **Inventory material:** tampilkan physical/reserved/available per room dan batch; tandai stok rendah serta batch mendekati atau melewati expiry. Pastikan stok tak tersedia/expired tidak ditawarkan untuk issue.

- **Incident, history, notification:** hubungan ke alat, request, reservation, aktivitas, pelapor, asesmen, dan resolusi tetap terlihat. Riwayat transaksi tidak bisa dihapus lewat CRUD biasa.

### 4. Visualisasi data yang membantu keputusan

Jangan menambahkan chart hanya agar dashboard terlihat penuh. Setiap grafik harus memakai data nyata, menjawab pertanyaan operasional, dan bisa ditelusuri ke record sumber.

| Lokasi | Visualisasi | Keputusan yang dibantu |

|---|---|---|

| PLP Dashboard | Stacked bar request per minggu, dipisah status utama, dengan rentang 7/30/90 hari | Apakah antrean/volume request meningkat dan status mana yang menumpuk |

| PLP Dashboard | Bar horizontal jumlah material/batch berisiko per room: low stock dan expiry | Room mana yang perlu ditinjau lebih dahulu |

| PLP Inventory Materials | Bar per batch untuk satu material terpilih, memakai unit yang sama, serta garis ambang minimum bila tersedia | Batch mana yang tersedia, menipis, atau perlu ditinjau |

| PLP Inventory Equipment | Bar jumlah alat per status/kondisi, dapat difilter per room/type | Di mana alat tidak tersedia, rusak, atau menunggu inspeksi |

| Admin Dashboard | Tren request per minggu dan status | Gambaran beban serta alur sistem lintas lab |

| Admin Dashboard | Stacked bar jumlah equipment per room/lab dan status | Lokasi yang memiliki konsentrasi alat unavailable atau bermasalah |

| Admin/PLP Reports | Tren batch yang segera/terlewat expiry per periode | Perencanaan pemeriksaan stok dan tindak lanjut |

- Tetap pertahankan KPI angka sebagai ringkasan dan daftar antrean sebagai tempat bertindak; grafik menjadi konteks tambahan.

- Jangan menjumlahkan kuantitas material dengan unit berbeda pada satu sumbu. Untuk agregasi lintas material gunakan jumlah item/batch berisiko; perbandingan jumlah hanya dilakukan pada material dengan unit yang sama.

- Gunakan komponen chart SVG/HTML yang reusable untuk pola bar dan stacked bar pada scope awal; tidak perlu menambah library chart hanya untuk beberapa visual ini. Data agregat dihitung lewat service/server, bukan angka buatan di client.

- Setiap chart menampilkan judul, rentang tanggal, label nilai/status, empty state, dan tautan ke data sumber. Sediakan tabel ringkas atau alternatif tekstual yang bisa diakses keyboard/screen reader; jangan mengandalkan warna saja.

- Jika metrik memakai reservation, beri label sebagai jadwal/pemakaian tercatat—jangan menyebutnya pemakaian aktual alat bila data penggunaan fisik belum direkam.

### 5. Admin: master data, CRUD, assignment, akses

- Konsistenkan pola daftar, pencarian/filter, tambah, edit, detail, validasi, dan konfirmasi untuk laboratory, room, equipment type, asset/unit, material, batch, dan assignment.

- Sediakan deaktivasi untuk master data yang sudah punya transaksi; hard delete hanya jika tidak memiliki referensi. Request, reservation, stock transaction, incident, dan audit tidak dihapus normal.

- Ganti input Scope ID bebas pada Assignment dengan pilihan data laboratory/room/activity yang sesuai. Validasi role pengguna, tipe assignment, masa berlaku, scope, dan duplikasi.

- Dashboard Admin berfokus pada kesehatan data: akun dan role, lab/room, inventaris, batch expiry, assignment aktif, tren request, serta audit terbaru. KPI dan grafik dapat ditelusuri ke halaman sumber.

- Pertahankan Roles/Permissions sebagai matriks baca-saja. Admin mengatur role per akun melalui Users; tidak ada editor permission runtime. Assignment membatasi konteks akses role operasional sesuai scope yang ditugaskan.

- Permission harus diperiksa server-side di setiap halaman/API; menyembunyikan tombol saja tidak cukup.

### 6. Gambar katalog, hitung stok, dan export

- Tambahkan upload gambar untuk equipment type dengan opsi gambar khusus per asset, dan satu gambar utama per material. Tampilkan di katalog Student serta halaman inventory/detail PLP; gunakan placeholder jika belum ada.

- Tambahkan `POST /api/admin/uploads` untuk upload, lalu simpan referensi media melalui endpoint create/update master yang sesuai. Terapkan local storage saat development dan S3-compatible object storage saat production, sesuai dokumentasi teknis. Validasi tipe/ukuran file di server; upload dan perubahan referensi hanya untuk Admin yang berwenang. Baca gambar untuk user terautentikasi dan bersihkan file yatim dengan aman.

- Tambahkan sesi hitung stok PLP per room/batch. Simpan baseline jumlah sistem saat sesi mulai dan jumlah hitung fisik, lalu tampilkan selisih dan pelaku. PDF lembar hitung secara default tidak menampilkan baseline; laporan selisih menampilkan perbandingan setelah hitungan.

- Hasil hitung **tidak mem-posting adjustment**. Bila perlu koreksi, operator memakai adjustment yang ada secara terpisah dengan alasan; tindakan itu mencatat stock transaction dan audit.

- Sediakan CSV untuk daftar inventaris/batch, stok rendah/expiry, histori transaksi, issue/return, incident, audit, dan laporan selisih. PDF dibatasi untuk lembar hitung dan ringkasan inventory/selisih terpilih. Terapkan filter, akses role, timezone, dan audit export yang konsisten.

## Verifikasi dan batas scope

- Uji halaman Admin yang dilaporkan bermasalah dengan data kosong dan terisi; uji CRUD/deaktivasi, validasi Assignment, dan batas hard delete.

- Uji alur PLP request → approval/revision/rejection → issue → return/inspection → completion, termasuk race condition dan pencegahan transaksi duplikat.

- Uji selisih hitung stok tidak mengubah ledger, sedangkan adjustment manual tetap tercatat; uji ekspor CSV/PDF dengan filter dan hak akses.

- Uji gambar valid, file tidak valid, akses user, dan placeholder; uji Student tetap menampilkan katalog dan request seperti sebelumnya.

- Uji chart dengan data kosong, data besar, filter periode, keyboard, screen reader/teks alternatif, serta tautan dari grafik ke daftar terfilter.

- Jalankan `npm run check`, `npm run build`, dan E2E semua role; audit visual pada desktop, tablet, mobile, teks panjang, fokus keyboard, dan zoom 200%.

- QR/barcode scanning, procurement, dashboard BI kustom, permission editor dinamis, scheduler otomatis, dan posting stock opname otomatis tidak menjadi syarat finishing tahap ini. Lampiran SDS dapat menyusul setelah infrastruktur media tersedia.

