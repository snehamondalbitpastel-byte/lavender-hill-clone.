// "Discover What Our Customers Say" — the live site's multi-column section.
// Pure text; swipe carousel on mobile, 3-column grid at >=999px (no images).
const TESTIMONIALS = [
  {
    title: "The most perfect t-shirt",
    quote:
      "“I absolutely love this t-shirt! The quality is amazing and it fits perfectly. I've already ordered three more in different colours.”",
    name: "Sarah M.",
  },
  {
    title: "Finally found Holy Grail of white t-shirts!",
    quote:
      "“Finally found the Holy Grail of white t-shirts! It doesn't show sweat marks and the fabric is so soft. Highly recommend!”",
    name: "Kate T.",
  },
  {
    title: "Best t shirt ever!",
    quote:
      "“Best t-shirt ever! The attention to detail is incredible. Worth every penny and I'll definitely be a repeat customer.”",
    name: "Emma L.",
  },
];

export default function Testimonials() {
  return (
    <section className="py-16 md:py-24 bg-cream">
      {/* Full-width (.container = 100%) with the theme gutter — matches the live
          near-edge-to-edge layout instead of the narrow centered container. */}
      <div className="w-full px-6 md:px-12 lg:px-14">
        {/* Header — left aligned (justify-self-start / text-start) */}
        <div className="text-start max-w-2xl mb-10 md:mb-14">
          <p className="eyebrow text-espresso/60 mb-3">
            Tried and tested by thousands of happy customers.
          </p>
          <h2 className="text-3xl md:text-4xl">
            Discover What Our Customers Say..
          </h2>
        </div>

        {/* Columns — swipe carousel on mobile, 3-up grid at >=999px */}
        <div className="flex min-[999px]:grid min-[999px]:grid-cols-3 gap-[3.125rem] min-[999px]:gap-[4.375rem] overflow-x-auto min-[999px]:overflow-visible snap-x snap-mandatory no-scrollbar">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="shrink-0 w-[53vw] min-[700px]:w-[38vw] min-[999px]:w-auto snap-center text-start"
            >
              <h3 className="text-xl md:text-2xl mb-4">{t.title}</h3>
              <p className="text-[15px] md:text-base text-espresso/75 leading-relaxed">
                {t.quote}
                <br />
                <br />
                {"— "}
                {t.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
