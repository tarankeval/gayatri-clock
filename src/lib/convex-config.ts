const isLikelyCapacitorRuntime = () => {
  if (typeof window === "undefined") return false;

  return (
    window.location.protocol === "capacitor:" ||
    window.location.hostname === "localhost"
  );
};

export const getConvexUrl = () => {
  const viteUrl = import.meta.env.VITE_CONVEX_URL;
  const capacitorUrl = import.meta.env.VITE_CAPACITOR_CONVEX_URL;
  const fallbackUrl = isLikelyCapacitorRuntime() ? capacitorUrl : undefined;
  const url = viteUrl || fallbackUrl;

  return typeof url === "string" ? url.trim() : "";
};

export const isConvexConfigured = () => getConvexUrl().length > 0;

