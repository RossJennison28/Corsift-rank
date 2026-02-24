import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { generateRandomString } from "@oslojs/crypto/random";
import type { RandomReader } from "@oslojs/crypto/random";
 
export const ResendOTPPasswordReset = Resend({
  id: "password-reset-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
 
    const alphabet = "0123456789";
    const length = 8;
    return generateRandomString(random, alphabet, length);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    if (!provider.apiKey) {
      throw new Error("AUTH_RESEND_KEY is not configured");
    }
    const resend = new ResendAPI(provider.apiKey);
    const from = process.env.AUTH_RESEND_FROM ?? "My App <onboarding@resend.dev>";
    const { error } = await resend.emails.send({
      // TODO: Replace with a verified sender domain in Resend for production.
      // Example: "My App <no-reply@yourdomain.com>"
      from,
      to: [email],
      subject: `Reset your password in My App`,
      text: "Your password reset code is " + token,
    });
 
    if (error) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? (typeof (error as { message?: unknown }).message === "string"
              ? (error as { message?: string }).message
              : "")
          : "";
      throw new Error(`Could not send password reset email: ${message || "Unknown Resend error"}`);
    }
  },
});
