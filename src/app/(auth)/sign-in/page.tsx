import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInSplitForm } from "@/components/sign-in-split-form";

export const metadata: Metadata = {
  title: "Login - Reaksan Unpad",
  description: "Masuk ke Sistem Manajemen Laboratorium Terpadu Kimia Unpad",
};

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInSplitForm />
    </Suspense>
  );
}
