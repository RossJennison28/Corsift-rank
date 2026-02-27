import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./components/theme-provider";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const workosClientId = import.meta.env.VITE_WORKOS_CLIENT_ID as string;
const workosRedirectUri =
  (import.meta.env.VITE_WORKOS_REDIRECT_URI as string | undefined) ??
  `${window.location.origin}/callback`;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Provider order: theme -> router -> WorkOS auth -> Convex client with auth bridge. */}
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <BrowserRouter>
        <AuthKitProvider
          clientId={workosClientId}
          redirectUri={workosRedirectUri}
          onRedirectCallback={({ state }) => {
            const returnTo = typeof state?.returnTo === "string" ? state.returnTo : "/review";
            window.location.replace(returnTo);
          }}
        >
          <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
            <App />
          </ConvexProviderWithAuthKit>
        </AuthKitProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
