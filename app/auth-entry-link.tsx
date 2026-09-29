"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "./auth-context";

export default function AuthEntryLink({
  href,
  className,
  children,
  anonymousChildren,
  anonymousNext,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  anonymousChildren?: ReactNode;
  anonymousNext?: string;
}) {
  const { status } = useAuth();
  const pathname = usePathname();
  const authenticated = status === "authenticated";
  const target = authenticated
    ? href
    : `/login?next=${encodeURIComponent(anonymousNext ?? href)}&from=${encodeURIComponent(pathname)}`;

  return (
    <Link className={className} href={target}>
      {!authenticated && anonymousChildren !== undefined ? anonymousChildren : children}
    </Link>
  );
}
