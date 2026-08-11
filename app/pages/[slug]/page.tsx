import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AnnouncementBar from "@/app/components/AnnouncementBar";
import Header from "@/app/components/Header";
import FooterFeatures from "@/app/components/FooterFeatures";
import ScrollingText from "@/app/components/ScrollingText";
import Footer from "@/app/components/Footer";
import PageSections from "@/app/components/pages/PageSections";
import { parseSections } from "@/lib/sections";

type Item = { image: string; link: string; alt: string };

function parseItems(json: string): Item[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.page.findUnique({ where: { slug } });
  return { title: page ? `${page.title} | Lavender Hill` : "Lavender Hill" };
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page || !page.active) notFound();

  const sections = parseSections(page.sections);
  const items = parseItems(page.items);
  const paragraphs = (page.intro || "").split("\n").map((p) => p.trim()).filter(Boolean);

  // A page built from sections renders those blocks (e.g. Our Story); otherwise
  // it falls back to the simple title + intro + image-card template (e.g. Press).
  if (sections.length > 0) {
    return (
      <>
        <AnnouncementBar />
        <Header />
        <main className="bg-cream">
          <PageSections sections={sections} />
        </main>
        <FooterFeatures />
        <ScrollingText />
        <Footer />
      </>
    );
  }

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="bg-cream">
        {/* section-spacing--tight: 2.5rem (mobile) / 4rem (≥1000px) */}
        <section className="py-10 lg:py-16">
          {/* container--xs (42.5rem), centred — matches the reference exactly */}
          <div className="mx-auto max-w-[42.5rem] px-5 text-center [overflow-wrap:anywhere]">
            {/* heading = .h2 token: clamp(1.375rem … 1.925rem) */}
            <h1 className="text-[clamp(1.375rem,1.17rem+0.86vw,1.925rem)] mb-6">{page.title}</h1>
            {paragraphs.map((p, i) => (
              <p key={i} className="text-espresso text-[0.9375rem] leading-[1.65] mb-3 last:mb-0">{p}</p>
            ))}
          </div>

          {/* Image cards — inside container--xs (42.5rem), 3-up like the reference
              table, so the logos are the right (smaller) size. section-stack gap. */}
          {items.length > 0 && (
            <div className="mx-auto mt-9 lg:mt-12 max-w-[42.5rem] px-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                {items.map((it, i) => {
                  const img = (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image}
                      alt={it.alt || ""}
                      className="h-auto w-full object-contain transition-opacity duration-300 hover:opacity-80"
                    />
                  );
                  return (
                    <div key={i} className="flex items-center justify-center">
                      {it.link ? (
                        <a
                          href={it.link}
                          target={it.link.startsWith("http") ? "_blank" : undefined}
                          rel={it.link.startsWith("http") ? "noreferrer" : undefined}
                          className="block w-full"
                        >
                          {img}
                        </a>
                      ) : (
                        img
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
