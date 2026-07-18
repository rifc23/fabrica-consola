"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./nuevo-proyecto.module.css";
import ProgresoCreacion, { type ProyectoCreado } from "@/components/ProgresoCreacion";
import { featuresBlueprintGem, type Cadencia, type FeatureMVP, type FormularioProyecto } from "@/lib/formulario-proyecto";

interface FeatureFormulario extends FeatureMVP {
  id: string;
}

const DECISIONES_DEFECTO = [
  { texto: "diseño visual", marcada: true },
  { texto: "nombre/textos del producto", marcada: true },
  { texto: "precios", marcada: false },
  { texto: "modelo de datos", marcada: false },
];

const OPCIONES_STACK = [
  "🏭 Recomiéndame (menor costo)",
  "Vite + Vercel",
  "Next.js + Vercel",
  "Estático (GitHub Pages)",
  "Otro",
];

let contadorFeature = 0;
function nuevaFeature(): FeatureFormulario {
  contadorFeature += 1;
  return { id: `f${contadorFeature}`, nombre: "", descripcion: "", criterios: "" };
}

export default function NuevoProyectoPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [esGem, setEsGem] = useState(false);
  const [rolGem, setRolGem] = useState("");
  const [features, setFeatures] = useState<FeatureFormulario[]>([nuevaFeature()]);
  const [queNoEsV1, setQueNoEsV1] = useState("");
  const [stackSeleccionado, setStackSeleccionado] = useState(OPCIONES_STACK[0]);
  const [stackOtro, setStackOtro] = useState("");
  const [presupuesto, setPresupuesto] = useState<"Capa gratuita estricta" | "Puedo pagar servicios si se justifica">(
    "Capa gratuita estricta",
  );
  const [decisiones, setDecisiones] = useState(DECISIONES_DEFECTO);
  const [decisionOtra, setDecisionOtra] = useState("");
  const [visibilidad, setVisibilidad] = useState<"private" | "public">("private");
  const [cadencia, setCadencia] = useState<Cadencia>("cada-2h");
  const [notificacionesTelegram, setNotificacionesTelegram] = useState("");

  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [payload, setPayload] = useState<FormularioProyecto | null>(null);

  function actualizarFeature(id: string, cambios: Partial<FeatureMVP>) {
    setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, ...cambios } : f)));
  }

  function agregarFeature() {
    setFeatures((prev) => [...prev, nuevaFeature()]);
  }

  function quitarFeature(id: string) {
    setFeatures((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev));
  }

  function alternarDecision(texto: string) {
    setDecisiones((prev) => prev.map((d) => (d.texto === texto ? { ...d, marcada: !d.marcada } : d)));
  }

  function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    setErrorValidacion(null);

    const featuresLimpias = features
      .map((f) => ({ nombre: f.nombre.trim(), descripcion: f.descripcion.trim(), criterios: f.criterios?.trim() || undefined }))
      .filter((f) => f.nombre);

    if (!nombre.trim()) {
      setErrorValidacion("El nombre del proyecto es obligatorio.");
      return;
    }
    if (!objetivo.trim()) {
      setErrorValidacion("El objetivo es obligatorio.");
      return;
    }
    if (esGem && !rolGem.trim()) {
      setErrorValidacion("El rol del bot es obligatorio para un proyecto Gem.");
      return;
    }
    if (!esGem && featuresLimpias.length === 0) {
      setErrorValidacion("Agrega al menos una feature MVP con nombre.");
      return;
    }

    const decisionesReservadas = decisiones.filter((d) => d.marcada).map((d) => d.texto);
    if (decisionOtra.trim()) decisionesReservadas.push(decisionOtra.trim());

    const stack = stackSeleccionado === "Otro" ? stackOtro.trim() || "Otro (sin especificar)" : stackSeleccionado;

    setPayload({
      nombre: nombre.trim(),
      objetivo: objetivo.trim(),
      features: featuresLimpias,
      queNoEsV1: queNoEsV1.trim(),
      stack,
      presupuesto,
      decisionesReservadas,
      visibilidad,
      cadencia,
      notificacionesTelegram: notificacionesTelegram.trim() || undefined,
      esGem,
      rolGem: esGem ? rolGem.trim() : undefined,
    });
    setEnviando(true);
  }

  function manejarExito(proyecto: ProyectoCreado) {
    const params = new URLSearchParams({
      creado: "1",
      degradado: proyecto.degradadoVercel ? "1" : "0",
    });
    if (proyecto.previewUrl) params.set("preview", proyecto.previewUrl);
    router.push(`/proyectos/${proyecto.repo}?${params.toString()}`);
  }

  return (
    <div className={`container ${styles.pagina}`}>
      <h1>＋ Nuevo proyecto</h1>
      <p>
        Llena el formulario y la Fábrica crea el repo desde el template, lo conecta a Vercel (si
        hay <code>VERCEL_TOKEN</code>) y siembra su backlog P0 con estas features. Al terminar te
        llevamos directo a su dashboard.
      </p>

      {!enviando && (
        <form onSubmit={manejarEnvio}>
          <div className={styles.campo}>
            <label htmlFor="nombre">1. Nombre del proyecto</label>
            <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>

          <div className={styles.campo}>
            <label htmlFor="objetivo">2. Objetivo</label>
            <span className={styles.ayuda}>¿Qué problema resuelve y para quién?</span>
            <textarea id="objetivo" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} required />
          </div>

          <div className={styles.campo}>
            <label className={styles.opcionCheckbox}>
              <input type="checkbox" checked={esGem} onChange={(e) => setEsGem(e.target.checked)} />
              🤖 Gem (chatbot con rol)
            </label>
            <span className={styles.ayuda}>
              Chatbot con un rol persistente (p. ej. &quot;entrenador fitness&quot;). Siembra el
              proyecto con el blueprint Gem fijo (CRUD de Gems, chat con streaming, botón
              &quot;Mejorar rol&quot;, capa de abstracción de IA) en vez de las features MVP a
              mano — igual puedes agregar features extra abajo.
            </span>
            {esGem && (
              <div className={styles.campo}>
                <label htmlFor="rol-gem">Rol del bot</label>
                <textarea
                  id="rol-gem"
                  placeholder="Eres un entrenador fitness y me darás dietas con estos ingredientes: aguacate, cebolla…"
                  value={rolGem}
                  onChange={(e) => setRolGem(e.target.value)}
                  required
                />
                <ul className={styles.blueprintGem}>
                  {featuresBlueprintGem().map((f) => (
                    <li key={f.nombre}>✅ {f.nombre}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={styles.campo}>
            <label>3. Features MVP{esGem ? " extra (opcional — el blueprint Gem ya cubre las P0)" : ""}</label>
            {features.map((f, i) => (
              <div className={styles.feature} key={f.id}>
                <div className={styles.featureCabecera}>
                  <strong>Feature #{i + 1}</strong>
                  <button type="button" onClick={() => quitarFeature(f.id)} disabled={features.length === 1}>
                    Quitar
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Nombre corto"
                  value={f.nombre}
                  onChange={(e) => actualizarFeature(f.id, { nombre: e.target.value })}
                />
                <textarea
                  placeholder="Descripción"
                  value={f.descripcion}
                  onChange={(e) => actualizarFeature(f.id, { descripcion: e.target.value })}
                />
                <details>
                  <summary>5. Criterios de aceptación (opcional — si lo dejas vacío, la fábrica los propone y te los estaciona para aprobar)</summary>
                  <textarea
                    placeholder='dado X, cuando Y, entonces Z'
                    value={f.criterios ?? ""}
                    onChange={(e) => actualizarFeature(f.id, { criterios: e.target.value })}
                  />
                </details>
              </div>
            ))}
            <button type="button" onClick={agregarFeature}>
              ＋ agregar feature
            </button>
          </div>

          <div className={styles.campo}>
            <label htmlFor="que-no-es-v1">4. Qué NO es v1</label>
            <span className={styles.ayuda}>Evita el scope creep desde el día 0.</span>
            <textarea id="que-no-es-v1" value={queNoEsV1} onChange={(e) => setQueNoEsV1(e.target.value)} />
          </div>

          <div className={styles.campo}>
            <label htmlFor="stack">6. Stack</label>
            <select id="stack" value={stackSeleccionado} onChange={(e) => setStackSeleccionado(e.target.value)}>
              {OPCIONES_STACK.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            {stackSeleccionado === "Otro" && (
              <input
                type="text"
                placeholder="¿Cuál?"
                value={stackOtro}
                onChange={(e) => setStackOtro(e.target.value)}
              />
            )}
          </div>

          <div className={styles.campo}>
            <label>7. Presupuesto</label>
            <div className={styles.grupoRadio} role="radiogroup" aria-label="Presupuesto">
              {(["Capa gratuita estricta", "Puedo pagar servicios si se justifica"] as const).map((op) => (
                <label className={styles.opcionRadio} key={op}>
                  <input
                    type="radio"
                    name="presupuesto"
                    checked={presupuesto === op}
                    onChange={() => setPresupuesto(op)}
                  />
                  {op}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.campo}>
            <label>8. Decisiones que me reservo</label>
            <span className={styles.ayuda}>Define los ÚNICOS puntos donde la fábrica se detiene a esperarte.</span>
            <div className={styles.grupoCheckbox}>
              {decisiones.map((d) => (
                <label className={styles.opcionCheckbox} key={d.texto}>
                  <input type="checkbox" checked={d.marcada} onChange={() => alternarDecision(d.texto)} />
                  {d.texto}
                </label>
              ))}
              <input
                type="text"
                placeholder="＋ otra decisión (opcional)"
                value={decisionOtra}
                onChange={(e) => setDecisionOtra(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.campo}>
            <label>9. Visibilidad del repo</label>
            <div className={styles.grupoRadio} role="radiogroup" aria-label="Visibilidad">
              {(["private", "public"] as const).map((op) => (
                <label className={styles.opcionRadio} key={op}>
                  <input type="radio" name="visibilidad" checked={visibilidad === op} onChange={() => setVisibilidad(op)} />
                  {op === "private" ? "Privado" : "Público"}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.campo}>
            <label htmlFor="cadencia">10. Cadencia de la routine</label>
            <select id="cadencia" value={cadencia} onChange={(e) => setCadencia(e.target.value as Cadencia)}>
              <option value="cada-2h">Cada 2 horas</option>
              <option value="cada-6h">Cada 6 horas</option>
              <option value="diaria">Diaria</option>
              <option value="manual">Solo cuando yo la dispare</option>
            </select>
          </div>

          <div className={styles.campo}>
            <label>11. Autoridad inicial</label>
            <p className={styles.autoridad}>
              Peldaño 3: la fábrica deja ramas, tú apruebas merges. El push autónomo se gana
              después.
            </p>
          </div>

          <div className={styles.campo}>
            <label htmlFor="telegram">12. Notificaciones (opcional)</label>
            <span className={styles.ayuda}>chat_id de Telegram para avisos de reportes/decisiones.</span>
            <input
              id="telegram"
              type="text"
              value={notificacionesTelegram}
              onChange={(e) => setNotificacionesTelegram(e.target.value)}
            />
          </div>

          {errorValidacion && (
            <div className={styles.errorForm} role="alert">
              {errorValidacion}
            </div>
          )}

          <div className={styles.acciones}>
            <button type="submit">Crear proyecto</button>
          </div>
        </form>
      )}

      {enviando && payload && <ProgresoCreacion payload={payload} onExito={manejarExito} />}
    </div>
  );
}
