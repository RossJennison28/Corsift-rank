import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
 
export const ResendOTP = Resend({
  id: "email-verify-otp",
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
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      // TODO: Replace with a verified sender domain in Resend for production.
      // Example: "My App <no-reply@yourdomain.com>"
      from: "My App <onboarding@resend.dev>",
      to: [email],
      subject: `Sign in to My App`,
      text: "Your code is " + token,
    });
 
    if (error) {
      throw new Error("Could not send");
    }
  },
});
