import { Suspense } from "react";
import AccessClient from "./AccessClient";
import { AccessMotion } from "@/components/public/AccessMotion";

export default function AccessPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#080a0c" }} />}>
      <AccessMotion><AccessClient /></AccessMotion>
    </Suspense>
  );
}
