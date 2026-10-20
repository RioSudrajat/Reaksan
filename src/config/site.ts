import starter from "../../starter.config.json";

// Central site configuration for SEO, metadata, and routing.
export const siteConfig = {
  id: starter.id,
  name: "Reaksan Unpad",
  shortName: "Reaksan",
  description:
    "Sistem Manajemen Laboratorium Terpadu Departemen Kimia FMIPA Universitas Padjadjaran. Layanan digital untuk reservasi ruangan riset, instrumen analitik canggih, dan pengelolaan bahan kimia.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://reaksan.vercel.app",
  homePath: "/student",
  faculty: "Fakultas Matematika dan Ilmu Pengetahuan Alam (FMIPA)",
  department: "Departemen Kimia Universitas Padjadjaran",
  address: "Jl. Raya Bandung-Sumedang Km. 21, Jatinangor, Sumedang 45363",
  email: "kimia@unpad.ac.id",
  keywords: [
    "Reaksan",
    "Reaksan Unpad",
    "Laboratorium Kimia Unpad",
    "FMIPA Unpad",
    "Departemen Kimia Universitas Padjadjaran",
    "Peminjaman Alat Laboratorium Kimia",
    "Reservasi Laboratorium Riset Unpad",
    "LIMS Kimia Unpad",
    "Sistem Informasi Laboratorium Jatinangor",
  ],
} as const;
