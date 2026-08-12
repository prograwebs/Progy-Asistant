import { Suspense } from "react";
import AccessClient from "./AccessClient";

export default function AccessPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#080a0c" }} />}>
      <AccessClient />
    </Suspense>
  );
}
