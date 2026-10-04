import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackToSettings() {
  return (
    <Link href="/settings" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary">
      <ChevronLeft className="size-4" />Settings
    </Link>
  );
}
