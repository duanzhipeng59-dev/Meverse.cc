"use client";

import { ReactNode } from "react";

interface InviteMenuLinkProps {
  children: ReactNode;
  className?: string;
}

export default function InviteMenuLink({
  children,
  className,
}: InviteMenuLinkProps) {
  return (
    <a className={className} href="/invitations">
      {children}
    </a>
  );
}
