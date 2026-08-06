// Footer scrolling-content marquee — continuous left scroll of a repeated line,
// mirroring the live site's <marquee-text>. Sits between the trust bar and footer.
const MESSAGE =
  "Find your perfect t-shirt today and experience timeless comfort and style for years to come.";

// One half of the track. Rendered twice; the -50% keyframe loops it seamlessly.
function Half() {
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center gap-[clamp(80px,8vw,120px)] pr-[clamp(80px,8vw,120px)]"
    >
      {Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          className="eyebrow text-[16px] font-normal whitespace-nowrap text-cream"
        >
          {MESSAGE}
        </span>
      ))}
    </div>
  );
}

export default function ScrollingText() {
  return (
    <section className="bg-espresso text-cream py-9 overflow-hidden">
      <div className="flex w-max animate-[marquee-scroll_65s_linear_infinite]">
        <Half />
        <Half />
      </div>
    </section>
  );
}
