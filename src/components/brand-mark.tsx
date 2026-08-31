export function BrandMark({
  align = "left",
  size = "display",
}: {
  align?: "center" | "left";
  size?: "display" | "compact";
}) {
  const display = size === "display";

  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <p
        className={`font-serif font-medium tracking-[0.35em] text-olive uppercase ${display ? "text-3xl" : "text-lg"}`}
      >
        Events
      </p>
      <p
        className={`font-script text-olive ${display ? "text-3xl -mt-1" : "text-xl -mt-0.5"}`}
      >
        by Vanessa
      </p>
    </div>
  );
}
