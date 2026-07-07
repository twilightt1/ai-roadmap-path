import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập để đồng bộ tiến độ học AI Engineer Roadmap.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md items-center px-4 py-12 sm:px-6">
      <LoginForm />
    </div>
  );
}
