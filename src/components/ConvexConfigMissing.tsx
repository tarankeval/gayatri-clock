export function ConvexConfigMissing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md rounded-lg border bg-card p-5">
        <h1 className="text-lg font-semibold">Convex is not configured</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set VITE_CONVEX_URL in .env.local before building the Android APK.
        </p>
      </div>
    </div>
  );
}

