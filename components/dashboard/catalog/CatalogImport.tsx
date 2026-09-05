"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { exceedsPayloadLimit, MAX_PAYLOAD_MB } from "@/lib/shared/config/limits";
import styles from "./CatalogImport.module.css";

type PreviewItem = {
  id: string;
  kind: "product" | "service";
  name: string;
  description: string | null;
  price: number | null;
  durationMinutes: number | null;
  category: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  selected: boolean;
};

type AnalyzeResponse = {
  preview?: boolean;
  fileName?: string;
  items?: PreviewItem[];
  warnings?: string[];
  error?: string;
  code?: string;
  upgradeRequired?: boolean;
};

export default function CatalogImport({
  businessId,
  onImported,
}: {
  businessId: string;
  onImported: () => Promise<void> | void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState<"" | "analyze" | "save">("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(() => items.filter((item) => item.selected), [items]);
  const invalidSelected = selected.some((item) => item.price === null || !Number.isFinite(Number(item.price)) || Number(item.price) < 0 || !item.name.trim());

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] || null;
    if (next && exceedsPayloadLimit(next.size)) {
      event.target.value = "";
      setFile(null);
      setItems([]);
      setWarnings([]);
      setSuccess("");
      setError(`El archivo supera el límite de ${MAX_PAYLOAD_MB} MB.`);
      return;
    }
    setFile(next);
    setItems([]);
    setWarnings([]);
    setError("");
    setSuccess("");
  }

  async function analyze() {
    if (!file) {
      inputRef.current?.click();
      return;
    }
    setBusy("analyze");
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.set("businessId", businessId);
      form.set("file", file);
      const response = await fetch("/api/catalog/import", { method: "POST", body: form });
      const result = await response.json().catch(() => ({})) as AnalyzeResponse;
      if (!response.ok) throw new Error(result.error || "No pudimos analizar el documento.");
      setItems(result.items || []);
      setWarnings(result.warnings || []);
      setSuccess(`${result.items?.length || 0} elementos encontrados. Revísalos antes de guardar.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos analizar el documento.");
    } finally {
      setBusy("");
    }
  }

  function updateItem(id: string, patch: Partial<PreviewItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function save() {
    if (!selected.length) {
      setError("Selecciona al menos un elemento para importar.");
      return;
    }
    if (invalidSelected) {
      setError("Revisa los elementos seleccionados que todavía no tienen nombre o precio válido.");
      return;
    }

    setBusy("save");
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          items: selected.map((item) => ({
            kind: item.kind,
            name: item.name,
            description: item.description,
            price: item.price,
            durationMinutes: item.durationMinutes,
            isAvailable: true,
          })),
        }),
      });
      const result = await response.json().catch(() => ({})) as { imported?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "No pudimos guardar el catálogo.");
      setSuccess(`${result.imported || selected.length} elementos agregados al catálogo.`);
      setItems([]);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await onImported();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar el catálogo.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h3>Importar desde un documento</h3>
          <p>Sube un PDF, DOCX, TXT o CSV. Progy identifica productos o servicios y precios, y tú revisas todo antes de guardarlo.</p>
        </div>
        <span className={styles.tag}>Revisión antes de publicar</span>
      </div>

      {!items.length && (
        <div className={styles.dropzone}>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.csv,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={choose} />
          <label onClick={() => inputRef.current?.click()}>
            <strong>{file ? file.name : "Seleccionar catálogo o lista de precios"}</strong>
            <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : `PDF, DOCX, TXT o CSV · máximo ${MAX_PAYLOAD_MB} MB`}</span>
          </label>
        </div>
      )}

      {!items.length && file && (
        <div className={styles.fileRow}>
          <div><b>{file.name}</b><small>Progy no guardará nada hasta que revises el resultado.</small></div>
          <button className={styles.button} onClick={() => void analyze()} disabled={busy === "analyze"}>
            {busy === "analyze" ? "Analizando…" : "Analizar documento"}
          </button>
        </div>
      )}

      {!!items.length && (
        <div className={styles.preview}>
          <div className={styles.previewHead}>
            <span>{items.length} elementos detectados</span>
            <span>{selected.length} seleccionados</span>
          </div>
          {items.map((item) => (
            <div className={styles.row} key={item.id}>
              <input type="checkbox" checked={item.selected} onChange={(event) => updateItem(item.id, { selected: event.target.checked })} aria-label={`Importar ${item.name}`} />
              <input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} placeholder="Nombre" />
              <select value={item.kind} onChange={(event) => updateItem(item.id, { kind: event.target.value === "service" ? "service" : "product" })}>
                <option value="product">Producto</option>
                <option value="service">Servicio</option>
              </select>
              <input type="number" min="0" step="0.01" value={item.price ?? ""} onChange={(event) => updateItem(item.id, { price: event.target.value === "" ? null : Number(event.target.value), needsReview: event.target.value === "" })} placeholder="Precio" />
              <span className={item.needsReview ? styles.review : styles.ready}>{item.needsReview ? "Revisar" : "Listo"}</span>
            </div>
          ))}
          <div className={styles.footer}>
            <button className={styles.ghost} onClick={() => { setItems([]); setWarnings([]); setSuccess(""); }}>Elegir otro archivo</button>
            <button className={styles.button} onClick={() => void save()} disabled={busy === "save" || !selected.length || invalidSelected}>
              {busy === "save" ? "Guardando…" : `Importar ${selected.length} elementos`}
            </button>
          </div>
        </div>
      )}

      {!!warnings.length && <div className={styles.warning}>{warnings.slice(0, 4).join(" · ")}</div>}
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}
    </section>
  );
}
