"use client";

import { useEffect, useState } from "react";

export default function ClientOnly({
  children,
  fallback = (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  ),
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return fallback;
  }

  return children;
}
