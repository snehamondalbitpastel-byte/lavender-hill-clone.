import Image from "next/image";

// "Discover What The Editors Say" — the live site's logo-list (press) section.
// Press quote cards live in /public; links point to # (no press page here).
const PRESS = [
  { name: "The Telegraph", src: "/press-telegraph-3.png" },
  { name: "Stylist Magazine", src: "/press-stylist.png" },
  { name: "The Telegraph", src: "/press-telegraph-4.png" },
  { name: "The Times", src: "/press-times.png" },
];

export default function PressLogos() {
  return (
    <section className="py-16 md:py-24 bg-cream">
      <div className="container-lh">
        <h2 className="text-2xl md:text-3xl text-center mb-10 md:mb-14">
          Discover What The Editors Say..
        </h2>

        {/* Swipe row on mobile; 3-up grid at >=700px, 4-up at >=1000px (each <=250px) */}
        <div className="flex min-[700px]:grid min-[700px]:grid-cols-[repeat(3,minmax(0,250px))] min-[1000px]:grid-cols-[repeat(4,minmax(0,250px))] min-[700px]:w-fit min-[700px]:mx-auto min-[700px]:justify-center gap-x-4 gap-y-8 overflow-x-auto min-[700px]:overflow-visible no-scrollbar snap-x snap-mandatory">
          {PRESS.map((p, i) => (
            <a
              key={i}
              href="#"
              className="shrink-0 snap-center flex items-center justify-center p-4 w-[70vw] min-[700px]:w-auto"
            >
              <Image
                src={p.src}
                alt={p.name}
                width={250}
                height={250}
                className="w-[220px] min-[700px]:w-[250px] h-auto object-contain"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
