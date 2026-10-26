import Link from "next/link";
import { Container } from "./container";

export function Footer() {
  return (
    <footer className="w-full bg-ink py-16 text-white">
      <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-lg font-bold tracking-tight">Shrink</p>
          <p className="text-sm text-surface-strong">Image compression that runs in your browser.</p>
        </div>
        <nav className="flex gap-8 text-sm font-medium text-surface-strong">
          <Link href="/#compress" className="transition-colors duration-150 hover:text-white">
            Compress
          </Link>
          <Link href="/#how" className="transition-colors duration-150 hover:text-white">
            How it works
          </Link>
          <Link href="/library" className="transition-colors duration-150 hover:text-white">
            Library
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
