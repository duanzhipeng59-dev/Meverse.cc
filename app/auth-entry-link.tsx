"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "./auth-context";

export default function AuthEntryLink({
  href,
  className,
  children,
  anonymousChildren,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  anonymousChildren?: ReactNode;
}) {
  const { status } = useAuth();
  const authenticated = status === "authenticated";
  const target = authenticated ? href : `/login?next=${encodeURIComponent(href)}`;

  return (
    <Link className={className} href={target}>
      {!authenticated && anonymousChildren !== undefined ? anonymousChildren : children}
    </Link>
  );
}
