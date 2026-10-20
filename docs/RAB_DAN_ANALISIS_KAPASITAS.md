# 📋 Rencana Anggaran Biaya (RAB) & Analisis Kapasitas Sistem Reaksan

**Sistem Informasi Manajemen Laboratorium Kimia**  
_Studi Kelayakan Infrastruktur Cloud: Opsi Bebas Biaya (Free Tier) vs Skala Penuh_

---

## 1. Analisis Demografi & Estimasi Pengguna (Departemen Kimia UNPAD)

Berdasarkan data kuota penerimaan mahasiswa baru Program Studi S1 Kimia FMIPA Universitas Padjadjaran (jalur SNBP, SNBT, dan SMUP Mandiri), rata-rata penerimaan berkisar antara **100 – 110 mahasiswa per tahun**.

### A. Perhitungan Basis Pengguna Aktif (4 Angkatan)

- **4 Angkatan Mahasiswa Aktif (Semester 1 – 8):**  
  4 angkatan × 105 mahasiswa = **420 mahasiswa**
- **Mahasiswa Tingkat Akhir (Tugas Akhir/Riset Lab):** ~**50 mahasiswa**
- **Tenaga Pendidik & Kependidikan (Dosen, PLP, Laboran, Admin):** ~**40 staf**
- **Total Estimasi Pengguna Terdaftar:** **~510 pengguna**

### B. Pola Akses & Beban Puncak (_Concurrency_)

Pengguna tidak membuka website secara bersamaan selama 24 jam. Beban puncak (_concurrency_) terjadi pada momen tertentu:

1. **Peminjaman Alat/Bahan Mingguan (Praktikum):** 1–2 kelas praktikum paralel = **30 – 60 concurrent users**.
2. **Awal Semester (Pendaftaran Akun / Verifikasi Massal):** **60 – 100 concurrent users**.
3. **Penggunaan Harian Normal (PLP update stok, cek approval):** **5 – 15 concurrent users**.

---

## 2. Pemetaan Batasan Paket Gratis (_Free Tier Limits_)

Infrastruktur yang dirancang memanfaatkan kombinasi 3 layanan cloud industri terkemuka:

- **Aplikasi Web & API:** Vercel (Hobby Plan)
- **Penyimpanan Dokumen & Foto Bukti Lab:** Cloudflare R2 (S3-Compatible)
- **Database Relasional:** Neon PostgreSQL / Supabase (Free Tier)

| Komponen Cloud                           | Batasan Kuota Gratis (_Free Tier_)                                                                                                                                        | Biaya Tambahan Jika Melebihi Kuota                                                                                |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------- |
| **Cloudflare R2** _(Object Storage)_     | • **10 GB** Storage/bulan<br>• **1.000.000** Operasi Tulis (Kelas A)/bulan<br>• **10.000.000** Operasi Baca (Kelas B)/bulan<br>• **Egress Fee: $0.00 (Gratis Selamanya)** | • Storage: **$0.015 / GB** (~Rp 245/GB/bln)<br>• Kelas A: **$4.50 / juta ops**<br>• Kelas B: **$0.36 / juta ops** |
| **Vercel** _(Frontend & API Serverless)_ | • **100 GB** Bandwidth/bulan<br>• **1.000.000** Edge/Serverless Requests/bulan<br>• Unlimited deployments                                                                 | • Upgrade ke Vercel Pro: **$20 / bulan** (~Rp 325.000/bln)                                                        |
| **Neon PostgreSQL** _(Database Utama)_   | • **0.5 GB (512 MB)** Storage data<br>• **100 Compute Unit-hours** (dengan auto-suspend saat idle)<br>• Unlimited database branches                                       | • Upgrade ke Launch Plan: **$19 / bulan** (~Rp 310.000/bln) untuk 10 GB storage                                   |

---

## 3. Simulasi & Uji Kelayakan (_Feasibility Calculation_)

### A. Analisis Cloudflare R2 (10 GB Free Storage)

- **Penggunaan:** Foto kondisi alat saat serah terima/pengembalian, foto bahan kimia, dan lampiran berita acara insiden/pecah.
- **Ukuran Rata-rata File (dengan kompresi WebP otomatis):** ~**500 KB / foto**.
- **Kapasitas 10 GB:** Mampu menampung hingga **~20.000 foto**.
- **Simulasi 1 Semester (6 Bulan):**
  - Estimasi peminjaman: 1.500 transaksi peminjaman.
  - Tiap peminjaman ada 2 foto bukti (sebelum & sesudah) = 3.000 foto.
  - Total storage yang terpakai = 3.000 × 500 KB = **~1,5 GB per semester**.
- **Simulasi Operasi:**
  - Upload per bulan: ~500–1.000 request (Jauh di bawah limit 1.000.000 Class A).
  - View foto per bulan: ~5.000–10.000 request (Jauh di bawah limit 10.000.000 Class B).
- **Kesimpulan R2:** **Sangat aman (Hanya terpakai <15% dari kuota gratis di tahun pertama).**

---

### B. Analisis Vercel Bandwidth (100 GB Free)

- **Penggunaan:** Mengirimkan aset halaman web (HTML, CSS, JS) ke browser mahasiswa dan memproses request API peminjaman.
- **Ukuran Halaman Web Reaksan:** Karena aset statis di-cache oleh browser, per sesi pengguna aktif hanya membutuhkan data transfer sekitar **1,5 – 2,5 MB**.
- **Simulasi 1 Bulan Aktif Praktikum:**
  - 500 mahasiswa membuka web 12 kali per bulan = 6.000 kunjungan.
  - 6.000 kunjungan × 2,5 MB = **~15 GB bandwidth / bulan**.
- **Kesimpulan Vercel:** **Sangat aman (Hanya terpakai ~15% dari batas 100 GB/bulan).**

---

### C. Analisis Database Neon (512 MB Free)

- **Penggunaan:** Menyimpan data teks (user, riwayat login, inventaris alat, katalog bahan, log transaksi peminjaman). _Catatan: Gambar fisik tidak disimpan di database, hanya string URL Cloudflare R2._
- **Ukuran per Baris Transaksi:** ~**1 – 2 KB**.
- **Kapasitas 512 MB:** Mampu menampung lebih dari **250.000 transaksi/baris data**.
- **Simulasi 1 Tahun Akademik:**
  - 510 user + 5 lab + 200 alat + 100 bahan + 5.000 log peminjaman = **~15 – 30 MB data**.
- **Kesimpulan Database:** **Sangat aman untuk operasional 2 hingga 3 tahun ke depan.**

---

### D. Analisis Beban Puncak (_Concurrency Handling_)

Apakah sistem akan _down_ jika 50–80 mahasiswa mengakses web secara bersamaan sebelum praktikum?

- **Next.js di Vercel** berjalan di atas infrastruktur _Serverless Edge_. Ketika ada 80 request bersamaan, Vercel secara otomatis melakukan _auto-scale_ instan ke puluhan mikro-kontainer tanpa antrean server.
- **Database Connection Pooling:** Menggunakan connection pooler bawaan PostgreSQL agar lonjakan koneksi bersamaan tidak membuat database _overload_.

---

## 4. Rincian Anggaran Biaya (RAB)

### Opsi A: Tahap Implementasi & Demo (Tahun ke-1) — 100% BEBAS BIAYA

_Opsi ini direkomendasikan untuk tahap pengujian, demo klien, dan implementasi awal di lingkungan Jurusan Kimia UNPAD._

|    No     | Komponen Layanan                  | Penyedia               | Estimasi Biaya / Bulan | Estimasi Biaya / Tahun |
| :-------: | :-------------------------------- | :--------------------- | :--------------------: | :--------------------: |
|     1     | Hosting Frontend & Serverless API | Vercel (Hobby Tier)    |          Rp 0          |          Rp 0          |
|     2     | Cloud Database PostgreSQL         | Neon / Supabase (Free) |          Rp 0          |          Rp 0          |
|     3     | Object Storage Media/Foto (10 GB) | Cloudflare R2          |          Rp 0          |          Rp 0          |
|     4     | SSL Certificate & CDN Protection  | Cloudflare & Vercel    |          Rp 0          |          Rp 0          |
| **TOTAL** | **BIAYA SERVER & INFRASTRUKTUR**  |                        |        **Rp 0**        |        **Rp 0**        |

---

### Opsi B: Estimasi Biaya Jika Melebihi Kuota (_Scale-Up / Future Expansion_)

_Diterapkan hanya jika di masa depan ada kebijakan integrasi ke seluruh prodi di FMIPA (misal Biologi, Fisika, Farmasi) sehingga melampaui limit gratis._

| Komponen          | Pemicu Upgrade                                           | Biaya Satuan    | Estimasi Tambahan / Bulan                |
| :---------------- | :------------------------------------------------------- | :-------------- | :--------------------------------------- |
| **Cloudflare R2** | Penyimpanan foto melebihi 10 GB                          | $0.015 / GB     | Tambahan +10 GB = **~$0.15 (~Rp 2.450)** |
| **Neon Database** | Data transaksi melebihi 512 MB                           | Launch Tier     | **~$19 (~Rp 310.000)**                   |
| **Vercel Web**    | Bandwidth melebihi 100 GB / butuh SLA tim                | Pro Tier        | **~$20 (~Rp 325.000)**                   |
| **Domain Resmi**  | Menggunakan domain kampus (misal: `reaksan.unpad.ac.id`) | Subdomain UNPAD | **Rp 0 (Diajukan ke DSTI UNPAD)**        |

---

## 5. Kesimpulan & Rekomendasi Teknis untuk Klien

1. **Kelayakan Finansial:** Untuk skala 1 jurusan (~500 pengguna aktif dengan 4 angkatan), sistem Reaksan **100% mencukupi kebutuhan tanpa mengeluarkan biaya server bulanan**.
2. **Kinerja & Keamanan:** Penggunaan Cloudflare R2 menjamin tidak ada lonjakan tagihan mendadak (_zero egress fees_), sedangkan Vercel menjamin stabilitas saat jam sibuk praktikum.
3. **Rekomendasi Tindakan:**
   - Terapkan arsitektur **Vercel + Neon + Cloudflare R2** untuk deployment produksi/demo saat ini.
   - Pasang kompresi otomatis sisi klien (client-side image compression) sebelum foto diunggah ke R2 agar konsumsi ruang penyimpanan tetap di bawah 1 GB per semester.
