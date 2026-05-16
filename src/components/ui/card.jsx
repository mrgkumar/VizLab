import React from "react";

export function Card({ className = "", ...props }) {
  return <div className={["rounded-2xl border bg-white text-slate-950 shadow-sm", className].join(" ")} {...props} />;
}

export function CardContent({ className = "", ...props }) {
  return <div className={className} {...props} />;
}
