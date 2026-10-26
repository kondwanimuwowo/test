import Image from "next/image";
import { Container } from "@/components/container";
import { AdminTabs } from "./tabs";

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <>
      <section className="relative w-full overflow-hidden bg-hero">
        <Image src="/illustrations/hero.svg" alt="" fill priority unoptimized className="object-cover object-[center_40%]" />
        <Container className="relative pt-16 pb-32 md:pt-24 md:pb-40">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">Dashboard</h1>
            <p className="text-lg text-on-dark">Signed in as {email}</p>
          </div>
        </Container>
      </section>
      <div className="w-full bg-white shadow-sm">
        <Container>
          <AdminTabs />
        </Container>
      </div>
      <section className="w-full bg-surface py-16 md:py-24">
        <Container>{children}</Container>
      </section>
    </>
  );
}
