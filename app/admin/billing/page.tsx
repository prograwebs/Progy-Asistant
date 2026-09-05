import { redirect } from "next/navigation";
import { getSupabaseUser } from "@/lib/server/auth/supabase";
import {
  assertAdmin,
  listPendingInvoices,
  type BillingInvoice,
} from "@/lib/server/billing/invoices";
import { SupabaseDataError } from "@/lib/server/data/supabase";
import AdminBillingTable from "./AdminBillingTable";
import styles from "./billing.module.css";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const user = await getSupabaseUser();
  if (!user) redirect("/acceso?mode=login");

  let invoices: BillingInvoice[];
  try {
    await assertAdmin();
    invoices = await listPendingInvoices();
  } catch (error) {
    if (error instanceof SupabaseDataError && error.status === 403) redirect("/panel");
    throw error;
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>ADMINISTRACIÓN</p>
          <h1>Billing interno</h1>
          <p className={styles.description}>
            Registra pagos recibidos y revisa los períodos pendientes. Esta pantalla no procesa tarjetas ni genera factura electrónica.
          </p>
        </div>
        <a className={styles.backLink} href="/panel">Volver al panel</a>
      </div>
      <AdminBillingTable initialInvoices={invoices} />
    </main>
  );
}
