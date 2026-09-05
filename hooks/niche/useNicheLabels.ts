"use client";

import { useMemo } from "react";
import type { NicheProfile } from "@/lib/shared/niche/profile";
import type { SelectedWorkspace } from "@/lib/shared/types/workspace";

const defaults = {
  bookingSingular: "cita",
  bookingPlural: "citas",
  orderSingular: "pedido",
  orderPlural: "pedidos",
  resourceLabel: "recurso",
};

export function useNicheLabels(workspace?: Pick<SelectedWorkspace, "nicheProfile"> | null) {
  return useMemo(() => {
    const terminology = (workspace?.nicheProfile as NicheProfile | null | undefined)?.terminology;
    return {
      bookingSingular: terminology?.booking_singular || defaults.bookingSingular,
      bookingPlural: terminology?.booking_plural || defaults.bookingPlural,
      orderSingular: terminology?.order_singular || defaults.orderSingular,
      orderPlural: terminology?.order_plural || defaults.orderPlural,
      resourceLabel: terminology?.resource_label || defaults.resourceLabel,
    };
  }, [workspace?.nicheProfile]);
}
