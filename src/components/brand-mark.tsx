export function BrandMark({
  align = "center",
}: {
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <p className="font-serif text-3xl font-medium tracking-[0.35em] text-olive uppercase">
        Events
      </p>
      <p className="font-script text-3xl text-olive -mt-1">by Vanessa</p>
    </div>
  );
}
