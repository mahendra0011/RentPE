import { Link } from "react-router-dom";

import SiteHeader from "@/components/SiteHeader.jsx";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <p className="text-7xl font-black text-brand">404</p>
        <h1 className="mt-4 text-2xl font-black">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The page you are looking for does not exist or has moved.
        </p>
        <Link
          to="/"
          className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-black text-background"
        >
          Go home
        </Link>
      </main>
    </div>
  );
}
