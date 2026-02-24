import type { AuthConfig } from "convex/server";

const clientId = process.env.WORKOS_CLIENT_ID;

if (!clientId) {
  throw new Error("Missing WORKOS_CLIENT_ID");
}

export default {
  providers: [
    // WorkOS organization/session JWT issuer.
    {
      type: "customJwt",
      issuer: "https://api.workos.com/",
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      applicationID: clientId,
    },
    // WorkOS user management JWT issuer (email/password + social auth flows).
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
} satisfies AuthConfig;
