"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function LandingMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !root.current) return;

    const sections = root.current.querySelectorAll<HTMLElement>(".section, .trust-strip, .cta-section");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const section = entry.target as HTMLElement;
        gsap.fromTo(section.querySelectorAll(".section-kicker, .section-heading, .step-card, .bento, .industry-card, .price-card, .faq-list, .cta-section > *"),
          { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.06, ease: "power2.out" });
        observer.unobserve(section);
      });
    }, { threshold: 0.12 });
    sections.forEach((section) => observer.observe(section));

    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".topbar", { y: -8, opacity: 0, duration: 0.22 })
      .from(".hero-copy > *", { y: 10, opacity: 0, duration: 0.24, stagger: 0.025 }, "-=0.1")
      .from(".hero-stage", { x: 12, opacity: 0, duration: 0.3 }, "-=0.18");

    gsap.to(".call-card", { y: -6, duration: 1.65, ease: "sine.inOut", repeat: -1, yoyo: true });
    gsap.to(".float-top", { y: -5, duration: 1.4, ease: "sine.inOut", repeat: -1, yoyo: true });
    gsap.to(".float-bottom", { y: 5, duration: 1.8, ease: "sine.inOut", repeat: -1, yoyo: true });
    gsap.to(".orbit-two", { rotation: -360, duration: 16, ease: "none", repeat: -1 });
    gsap.to(".wave i", {
      scaleY: 0.58,
      duration: 0.3,
      ease: "sine.inOut",
      stagger: { each: 0.025, from: "center", repeat: -1, yoyo: true },
    });
    gsap.to(".brand-mark i", {
      scaleY: 0.45,
      duration: 0.32,
      ease: "sine.inOut",
      transformOrigin: "center center",
      stagger: { each: 0.12, repeat: -1, yoyo: true },
    });
    gsap.to(".visual-01 span", {
      scaleX: 0.58,
      duration: 0.7,
      ease: "sine.inOut",
      transformOrigin: "center center",
      stagger: { each: 0.14, repeat: -1, yoyo: true },
    });
    gsap.to(".visual-02 span", {
      scaleY: 0.48,
      duration: 0.42,
      ease: "sine.inOut",
      transformOrigin: "center center",
      stagger: { each: 0.1, repeat: -1, yoyo: true },
    });
    gsap.to(".visual-03 span:nth-child(1)", {
      x: -13,
      y: -10,
      duration: 1.2,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
    gsap.to(".visual-03 span:nth-child(2)", {
      x: 13,
      y: 10,
      duration: 1.2,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      delay: 0.2,
    });
    gsap.to(".visual-03 span:nth-child(3)", {
      scale: 1.18,
      duration: 0.65,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
    gsap.to(".mini-wave i", {
      scaleY: 0.35,
      duration: 0.34,
      ease: "sine.inOut",
      transformOrigin: "center center",
      stagger: { each: 0.045, repeat: -1, yoyo: true },
    });
    gsap.to(".voice-preview button", {
      scale: 1.06,
      duration: 0.8,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
    gsap.to(".industry-tag", {
      scale: 1.06,
      duration: 0.7,
      ease: "sine.inOut",
      transformOrigin: "center center",
      stagger: { each: 0.45, repeat: -1, yoyo: true },
    });
    gsap.to(".industry-card a span", {
      x: 3,
      duration: 0.65,
      ease: "sine.inOut",
      stagger: { each: 0.35, repeat: -1, yoyo: true },
    });
    gsap.to(".cta-orb span", {
      scaleY: 0.42,
      duration: 0.38,
      ease: "sine.inOut",
      transformOrigin: "center center",
      stagger: { each: 0.13, repeat: -1, yoyo: true },
    });
    gsap.to(".cta-orb", {
      scale: 1.04,
      duration: 1.15,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });

    return () => observer.disconnect();
  }, { scope: root });

  return <main ref={root}>{children}</main>;
}
