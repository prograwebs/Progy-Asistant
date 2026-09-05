"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "../ProgyDashboard.module.css";

gsap.registerPlugin(useGSAP);

export default function BrandMark() {
  const mark = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.to("i", {
      scaleY: 0.42,
      duration: 0.34,
      ease: "sine.inOut",
      transformOrigin: "center center",
      stagger: { each: 0.12, from: "center", repeat: -1, yoyo: true },
    });
  }, { scope: mark });

  return <span ref={mark} className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>;
}
