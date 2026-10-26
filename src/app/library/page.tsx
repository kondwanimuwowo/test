import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/container";
import { Library } from "@/components/library";

export const metadata: Metadata = {
  title: "Library | Shrink",
};

export default function LibraryPage() {
  return (
    <>
      <section className="relative w-full overflow-hidden bg-hero">
        <Image src="/illustrations/hero.svg" alt="" fill priority unoptimized className="object-cover object-bottom" />
        <Container className="relative pt-24 pb-48 md:pt-32">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-5xl font-bold tracking-tight text-white md:text-6xl">Your library</h1>
            <p className="text-lg leading-relaxed text-on-dark">
              Images saved from this browser. Download links are created fresh each time you open this page.
            </p>
          </div>
        </Container>
      </section>
      <section className="w-full bg-white py-24 md:py-32">
        <Container>
          <Library />
        </Container>
      </section>
    </>
  );
}
