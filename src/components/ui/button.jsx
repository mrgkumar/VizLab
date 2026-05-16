import React from "react";

const variants = {
  default: "bg-slate-950 text-white hover:bg-slate-800",
  outline: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  default: "h-10 px-4 text-sm",
};

export function Button({ className = "", variant = "default", size = "default", asChild = false, ...props }) {
  const Comp = asChild ? "span" : "button";
  return (
    <Comp
      className={[
        "inline-flex items-center justify-center rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant] ?? variants.default,
        sizes[size] ?? sizes.default,
        className,
      ].join(" ")}
      {...props}
    />
  );
}
