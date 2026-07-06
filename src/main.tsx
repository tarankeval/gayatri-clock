import '@vly-ai/integrations';
import { ConvexConfigMissing } from "@/components/ConvexConfigMissing";
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { getConvexUrl } from "@/lib/convex-config";
import { LanguageProvider } from "@/lib/i18n";
import { StrictMode, useEffect, lazy, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

const convexUrl = getConvexUrl();
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function AppProviders({ children }: { children: ReactNode }) {
  if (!convex) {
    console.error(
      "Missing VITE_CONVEX_URL. Convex auth is disabled for this build.",
    );
    return <>{children}</>;
  }

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <LanguageProvider>
      <AppProviders>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={
                  convex ? (
                    <AuthPage redirectAfterAuth="/" />
                  ) : (
                    <ConvexConfigMissing />
                  )
                }
              /> {/* TODO: change redirect after auth to correct page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </AppProviders>
      </LanguageProvider>
    </InstrumentationProvider>
  </StrictMode>,
);
