"use client";

import NextLink from "next/link";
import {
  useRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from "next/navigation";
import React from "react";

export function Link({ to, href, children, ...props }) {
  return (
    <NextLink href={to || href || "#"} {...props}>
      {children}
    </NextLink>
  );
}

export function NavLink({ to, href, className, children, ...props }) {
  const pathname = usePathname() || "/";
  const target = to || href || "#";
  const isActive = pathname === target;
  const resolvedClass = typeof className === "function" ? className({ isActive }) : className;

  return (
    <NextLink href={target} className={resolvedClass} {...props}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useRouter();
  return (path, options) => {
    if (typeof path === "number") {
      if (path === -1) router.back();
      return;
    }
    if (options?.replace) {
      router.replace(path);
    } else {
      router.push(path);
    }
  };
}

export function useLocation() {
  const pathname = usePathname() || "/";
  const searchParams = useNextSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  return { pathname, search };
}

export function useParams() {
  return useNextParams() || {};
}

export function useSearchParams() {
  const searchParams = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setSearchParams = React.useCallback(
    (updater) => {
      let nextParams;
      if (typeof updater === "function") {
        nextParams = updater(new URLSearchParams(searchParams?.toString() || ""));
      } else if (updater instanceof URLSearchParams) {
        nextParams = updater;
      } else if (typeof updater === "object" && updater !== null) {
        nextParams = new URLSearchParams(updater);
      } else {
        nextParams = new URLSearchParams(String(updater || ""));
      }
      const str = nextParams.toString();
      router.push(`${pathname}${str ? `?${str}` : ""}`);
    },
    [pathname, router, searchParams],
  );

  return [searchParams || new URLSearchParams(), setSearchParams];
}

export function Navigate({ to, replace }) {
  const router = useRouter();
  React.useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [router, to, replace]);
  return null;
}

export function Outlet({ children }) {
  return children || null;
}

export default {
  Link,
  NavLink,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
  Navigate,
  Outlet,
};
