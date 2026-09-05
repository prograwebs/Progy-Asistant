"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function AccessMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.timeline({ defaults: { ease: "power2.out" } })
      .from(".access-copy", { x: -22, opacity: 0, duration: 0.6 })
      .from(".access-card", { x: 22, opacity: 0, duration: 0.6 }, "-=0.4")
      .from(".access-brand", { y: -12, opacity: 0, duration: 0.35 }, "-=0.45");
    gsap.to(".brand-mark i", {
      scaleY: 0.45,
      duration: 0.32,
      ease: "sine.inOut",
      transformOrigin: "center center",
      stagger: { each: 0.12, repeat: -1, yoyo: true },
    });
  }, { scope: root });

  return <main ref={root} className="access-page">{children}</main>;
}
