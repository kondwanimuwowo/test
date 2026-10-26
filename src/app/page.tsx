import Image from "next/image";
import { Container } from "@/components/container";
import { Compressor } from "@/components/compressor";
import { Reveal } from "@/components/reveal";

const STEPS = [
  {
    image: "/illustrations/step-add.svg",
    title: "Add your images",
    body: "Drag files in, paste from the clipboard or pick them from a folder. Full size camera photos are fine.",
  },
  {
    image: "/illustrations/step-size.svg",
    title: "Pick a size and format",
    body: "Set the longest edge in pixels and choose WebP, JPEG or PNG. Every file updates when you change a setting.",
  },
  {
    image: "/illustrations/step-browser.svg",
    title: "Compression runs on your device",
    body: "Your browser does the resizing and encoding. Nothing is sent to a server while you work.",
  },
  {
    image: "/illustrations/step-save.svg",
    title: "Download or save",
    body: "Download each file, or save it to your library and open it again later from the same browser.",
  },
];

const FORMATS = [
  {
    name: "WebP",
    body: "The smallest files for photos on the web. Supported by every current browser.",
  },
  {
    name: "JPEG",
    body: "Works everywhere, including email clients and older software. A good choice for photos you send to people.",
  },
  {
    name: "PNG",
    body: "Lossless, with transparency. Use it for screenshots, logos and graphics with flat color.",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative w-full overflow-hidden bg-hero">
        <Image
          src="/illustrations/hero.svg"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-bottom"
        />
        <Container className="relative flex min-h-[calc(100svh-4rem)] flex-col pt-24 pb-64 md:pt-32">
          <Reveal className="max-w-2xl space-y-8">
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
              Make large images small
            </h1>
            <p className="text-lg leading-relaxed text-on-dark md:text-xl">
              Resize and compress photos in your browser. Your originals stay on your device, and only the files you
              choose to save are uploaded.
            </p>
            <a
              href="#compress"
              className="inline-block rounded-full bg-white px-8 py-4 text-base font-semibold text-ink shadow-sm transition-colors duration-150 hover:bg-surface"
            >
              Choose images
            </a>
          </Reveal>
        </Container>
      </section>

      <section id="compress" className="w-full scroll-mt-16 bg-white py-24 md:py-32">
        <Container className="space-y-16">
          <Reveal className="max-w-2xl space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-ink md:text-5xl">Compress your images</h2>
            <p className="text-lg leading-relaxed text-muted">
              Settings apply to every file in the list. A 6 MB phone photo usually ends up under 500 KB at 2560px and
              quality 80.
            </p>
          </Reveal>
          <Compressor />
        </Container>
      </section>

      <section id="how" className="w-full scroll-mt-16 bg-surface py-24 md:py-32">
        <Container className="space-y-16">
          <Reveal className="max-w-2xl">
            <h2 className="text-4xl font-bold tracking-tight text-ink md:text-5xl">How it works</h2>
          </Reveal>
          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.08}>
                <article className="h-full overflow-hidden rounded-card bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
                  <div className="relative aspect-[8/5] w-full">
                    <Image src={step.image} alt="" fill unoptimized className="object-cover" />
                  </div>
                  <div className="space-y-4 p-8">
                    <h3 className="text-2xl font-bold tracking-tight text-ink">{step.title}</h3>
                    <p className="leading-relaxed text-muted">{step.body}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative w-full overflow-hidden bg-night">
        <Image src="/illustrations/dusk.svg" alt="" fill unoptimized className="object-cover object-bottom" />
        <Container className="relative py-32 md:py-40">
          <Reveal className="max-w-xl space-y-8 rounded-card bg-night p-8 md:p-12">
            <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">Your originals stay with you</h2>
            <p className="text-lg leading-relaxed text-on-dark">
              Compression uses the canvas built into your browser. Only the smaller file is uploaded, and only when you
              press Save. Saved files sit in private storage and open through links that expire after one hour.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="w-full bg-white py-24 md:py-32">
        <Container className="space-y-16">
          <Reveal className="max-w-2xl space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-ink md:text-5xl">Which format to pick</h2>
            <p className="text-lg leading-relaxed text-muted">
              If you are unsure, start with WebP at quality 80 and check the preview.
            </p>
          </Reveal>
          <div className="grid gap-8 md:grid-cols-3">
            {FORMATS.map((format, index) => (
              <Reveal key={format.name} delay={index * 0.08}>
                <article className="h-full space-y-4 rounded-card bg-surface p-8">
                  <h3 className="text-2xl font-bold tracking-tight text-ink">{format.name}</h3>
                  <p className="leading-relaxed text-muted">{format.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
