import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { Container } from "@/components/container";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in | Shrink" };

export default function LoginPage() {
  return (
    <section className="relative w-full overflow-hidden bg-hero">
      <Image src="/illustrations/hero.svg" alt="" fill priority unoptimized className="object-cover object-bottom" />
      <Container className="relative flex min-h-[calc(100svh-4rem)] items-start pt-24 pb-64 md:pt-32">
        <div className="w-full max-w-md space-y-8 rounded-card bg-white p-8 shadow-md md:p-12">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-ink">Sign in</h1>
            <p className="leading-relaxed text-muted">Keep your saved images on any device you sign in from.</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </Container>
    </section>
  );
}
