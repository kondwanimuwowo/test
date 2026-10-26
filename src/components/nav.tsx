import Link from "next/link";
import { Container } from "./container";
import { NavAccount } from "./nav-account";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight text-ink">
          Shrink
        </Link>
        <nav className="flex items-center gap-6 text-sm md:gap-8 font-medium">
          <Link href="/#how" className="hidden text-muted transition-colors duration-150 hover:text-ink sm:inline">
            How it works
          </Link>
          <Link href="/library" className="text-muted transition-colors duration-150 hover:text-ink">
            Library
          </Link>
          <NavAccount />
          <Link
            href="/#compress"
            className="rounded-full bg-accent px-5 py-2 text-white transition-colors duration-150 hover:bg-accent-hover"
          >
            Compress
          </Link>
        </nav>
      </Container>
    </header>
  );
}
