"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

import { DialogOverlay } from "@/components/ui/dialog";

// Slide-in drawer built on the same @radix-ui/react-dialog primitives as
// dialog.tsx, for cases (mobile nav, future mobile-only overlays) that need
// an edge-anchored panel instead of a centered modal.
const Sheet = DialogPrimitive.Root;
const SheetPortal = DialogPrimitive.Portal;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <SheetPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-[85vw] max-w-[300px] flex-col border-r border-folio-sage-border bg-folio-sidebar shadow-lg transition-transform duration-200 data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 ${className ?? ""}`}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

export { Sheet, SheetClose, SheetContent, SheetPortal };
