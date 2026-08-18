import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Get a password reset link by email.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
