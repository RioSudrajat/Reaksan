import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInSplitForm } from "@/components/sign-in-split-form";

export const metadata: Metadata = {
  title: "Login Sistem - Reaksan Unpad",
  description:
    "Portal Masuk Sistem Manajemen Laboratorium Terpadu Departemen Kimia FMIPA Universitas Padjadjaran.",
  alternates: {
    canonical: "/sign-in",
  },
};

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInSplitForm />
    </Suspense>
  );
}
