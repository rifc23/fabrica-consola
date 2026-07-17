# Diseño — Consola web de la Fábrica ("Mission Control")

Página web para crear y dar seguimiento a proyectos de la Fábrica sin tocar terminal: formulario
amigable → repo nuevo desde el template → dashboard por proyecto con decisiones como inputs.

## ¿Dónde vive la consola? — En su PROPIO repo (no dentro del template)

La consola es un proyecto MÁS de la fábrica, no parte del template. Tres piezas, tres roles:

1. **`fabrica-agentes-template`** — el MOLDE. Pasivo: nunca corre, solo se copia. Todo lo que viva
   aquí se duplica en CADA proyecto hijo — por eso la consola no puede vivir adentro (cada
   calculadora cargaría el código de la consola).
2. **`fabrica-consola`** (repo nuevo, nacido DEL template) — la app web, desplegada en Vercel,
   corriendo 24/7. USA el template vía la API de GitHub (\`POST /repos/.../generate\`) para
   estampar repos nuevos. Guarda su \`GITHUB_PAT\` como env var server-side de su proyecto Vercel.
3. **Los repos de proyectos** (mi-calculadora, ...) — nacidos del template, cada uno con su motor.

**Bootstrap recursivo**: la consola se construye CON la fábrica — "Use this template" →
\`fabrica-consola\` → abrir Claude Code → pegar el bloque \`/fabrica\` del final de ESTE documento
(que viaja dentro del repo recién creado). La consola es el primer hijo del template, y luego la
madre de todos los demás.

## Conceptos clave

- **Un repo por proyecto** (no branches): cada proyecto nace del template vía la API de GitHub
  (`POST /repos/{owner}/fabrica-agentes-template/generate`).
- **Identificación para listarlos**: doble mecanismo —
  1. **Topic de GitHub `fabrica-agentes`** agregado al crear (la API lista repos por topic → el
     dropdown se llena solo, sin depender de prefijos de nombre).
  2. **Manifest `.fabrica.json`** en la raíz de cada repo — el archivo máquina-legible que la
     consola lee y la routine/orquestador mantiene:
     ```json
     {
       "id": "fab-<slug>",
       "nombre": "Mi Calculadora",
       "creado": "2026-07-14",
       "peldano": 3,
       "trigger_id": "trig_...",          // la routine cloud (para deep-link a claude.ai/code/routines/<id>)
       "preview_url": "https://...",
       "estado": "iterando|esperando-decisiones|completado"
     }
     ```

## 1. Formulario "Nuevo proyecto" (los inputs)

Mapea 1:1 a las 5 specs de la Fase 0 del método + configuración operativa:

| # | Campo | Tipo de input | Notas |
|---|-------|---------------|-------|
| 1 | Nombre del proyecto | text (validado a slug) | → nombre del repo |
| 2 | **Objetivo** | textarea | placeholder: "¿Qué problema resuelve y para quién?" |
| 3 | **Features MVP** | lista repetible (input + botón "＋ agregar") con drag para priorizar | cada fila: nombre corto + descripción |
| 4 | **Qué NO es v1** | textarea corta | evita el scope creep desde el día 0 |
| 5 | **Criterios de aceptación** | textarea por feature (colapsable), OPCIONAL | si se deja vacío: "la fábrica los propone y te los estaciona para aprobar" |
| 6 | **Stack** | dropdown | "🏭 Recomiéndame (menor costo)" (default) · Vite+Vercel · Next.js+Vercel · Estático (GitHub Pages) · Otro (text) |
| 7 | **Presupuesto** | radio | "Capa gratuita estricta" (default) · "Puedo pagar servicios si se justifica" |
| 8 | **Decisiones que me reservo** | checkboxes | ☑ diseño visual · ☑ nombre/textos · ☐ precios · ☐ modelo de datos · ＋ otra (text). Define los ÚNICOS puntos donde la fábrica se detiene a esperarte |
| 9 | Visibilidad del repo | radio | Private (default) / Public |
| 10 | Cadencia de la routine | dropdown | cada 2h (default) · 6h · diaria · "solo cuando yo la dispare" |
| 11 | Autoridad inicial | fijo (informativo) | "Peldaño 3: la fábrica deja ramas, tú apruebas merges. El push autónomo se gana después." |
| 12 | Notificaciones | text opcional | chat_id de Telegram para avisos de reportes/decisiones |

**Al enviar**, el backend: (1) crea el repo desde el template + topic + `.fabrica.json`;
(2) commitea `docs/SPECS.md` con las respuestas; (3) siembra el backlog P0 con las features;
(4) muestra la "pantalla de arranque" con los 2 pasos que aún son del humano: pegar el prompt de
routine en `/schedule` (pre-rellenado, botón copiar) — o disparar el bootstrap automático si está
configurado (ver §4).

## 2. Dashboard por proyecto (el seguimiento amigable)

Header: **dropdown de proyectos** (repos con el topic, nombre desde `.fabrica.json`) + badge de
estado + link al repo + preview_url.

Secciones (todas se LEEN de archivos del repo — la consola no tiene base de datos propia):

| Sección | Fuente | Render |
|---|---|---|
| **📊 Progreso** | checkboxes del backlog (`- [ ]`/`- [x]` en P0/P1) | barra de progreso + lista de features con ✅/⏳ |
| **🔔 Decisiones que te esperan** | sección `[USUARIO]`/estacionadas del backlog | **la killer feature**: cada decisión como card con la pregunta + un `input text`/botones → al responder, la consola COMMITEA la respuesta al backlog (vía GitHub API) → la routine la ejecuta en su próximo tick. Cero terminal. |
| **📝 Último reporte** | `docs/reportes/` más reciente | markdown renderizado (qué se hizo, gate, estacionado) |
| **🧑 Tus tareas manuales** | `docs/TAREAS-MANUALES.md` | lista con checkbox → marcar = commit del ✅ |
| **📜 Historial** | tabla "Registro de trabajo" del backlog + `git log` | timeline de merges con hashes |
| **▶️ Acciones** | — | botón "Disparar routine ahora" (deep-link a `claude.ai/code/routines/<trigger_id>` — el run-now vive allá) · "＋ Nueva tarea / feedback" (ver §2.1 — input inteligente) · "Pedir auditoría retrospectiva" (commitea la solicitud) |

**El principio que hace esto simple**: la consola nunca habla con la routine — **escribe y lee el
repo, igual que todos los demás trabajadores de la fábrica**. El backlog sigue siendo el bus; la
consola es solo una vista bonita + un editor guiado del bus.

## 2.1 Input inteligente de feedback (decisión del usuario, 2026-07-17 — subido a v1)

El usuario escribe feedback/ideas/specs sobre un proyecto ya creado en lenguaje natural, y el
input se trata "de forma inteligente" antes de aterrizar en el backlog. Patrón **Inbox + triaje**:

1. **Refinado instantáneo (si hay `ANTHROPIC_API_KEY` server-side):** el API route llama a la API
   de Claude para reescribir el input al formato de tarea del backlog (título, descripción,
   criterios de aceptación dado/cuando/entonces, prioridad sugerida) y muestra un **preview
   editable** — "así lo entendí, ¿lo agrego?". Al aprobar, se commitea a la sección `📥 Inbox` del
   `docs/backlog.md` del proyecto.
2. **Fallback crudo (sin API key):** el texto se commitea tal cual al Inbox, marcado
   `(sin refinar)`. La feature nunca depende de la key.
3. **Triaje final — siempre de la routine:** en su próximo tick, la routine orquestadora procesa
   el Inbox: pule wording si hace falta, deduplica contra tareas existentes, asigna prioridad
   definitiva y mueve cada entrada a P0/P1/P2 — o la estaciona como pregunta `[USUARIO]` si es
   ambigua. El Inbox queda vacío tras cada triaje.

Por qué así: el backlog conserva un ÚNICO escritor con criterio (la routine/orquestador); la
consola solo appendea en su buzón designado, así no hay conflictos de edición ni prioridades
decididas por dos cerebros distintos. El template define la sección `📥 Inbox` en su backlog y el
paso de triaje en `docs/plantilla-routine-prompt.md`.

## 3. Arquitectura mínima (principio de menor costo)

- **Frontend**: página estática (el stack que la fábrica recomiende) en Vercel.
- **Backend**: 1-2 serverless functions con un **fine-grained PAT de GitHub** (server-side, scope:
  repos propios) para: crear-desde-template, listar-por-topic, leer archivos (Contents API),
  commitear decisiones/tareas. Alternativa más elegante para multi-usuario futuro: GitHub OAuth App.
- **Sin base de datos** — el estado vive en los repos (`.fabrica.json` + backlog). La consola es
  stateless.
- **Lo que la consola NO puede hacer** (limitación honesta): crear/disparar la routine de claude.ai
  directamente (esa API es interna de la sesión de Claude). Mitigación: deep-links + prompt
  pre-rellenado con botón copiar; el humano pega en `/schedule` una vez por proyecto (~1 min).

## 4. Los dos motores de ejecución (la consola es agnóstica: el contrato es el repo)

### Motor A — Routine de claude.ai (el original)
Incluido en la suscripción, tick cada N horas. Instalación manual: pegar el prompt en /schedule
UNA vez por proyecto (~1 min). Sin estado en vivo (solo archivos). Ideal para uso personal.

### Motor B — GitHub Actions + Claude Agent SDK (instalación 100% automática) ⭐ para la consola
El template incluye .github/workflows/fabrica.yml: corre Claude headless (claude -p / Agent SDK)
leyendo el prompt orquestador desde .fabrica/prompt-orquestador.md del propio repo.
- **Instalación sin copy/paste**: crear el repo desde el template YA instala el workflow; la
  consola setea el secret ANTHROPIC_API_KEY vía la API de GitHub (cifrado con la llave pública del
  repo). El usuario pega su API key UNA vez en la consola (BYOK — la consola no la almacena, va
  directo al secret). Motor vivo, cero terminal.
- **Event-driven, no solo cron**: on: workflow_dispatch + on: schedule. La consola, al commitear
  una decisión/tarea, DISPARA el workflow al instante (POST a la API de Actions) — latencia cero;
  el cron queda como heartbeat. concurrency: groups da anti-solape nativo (reemplaza el Paso 0).
- **Estado en vivo**: la consola lee los runs por API (queued/in_progress/completed+conclusion) →
  indicador "🏭 trabajando ahora" real + logs completos de cada corrida descargables.
- **Peldaños con PRs**: peldaño 3 = el motor abre Pull Requests y la consola muestra "N mejoras
  esperando aprobación" con botón Merge (API); peldaño 4 = push directo. El peldaño vive en
  .fabrica.json.
- **Costo**: por token (API de pago) — el trade contra el Motor A (suscripción). Runner: instalar
  Java (setup-java) si el gate incluye emuladores; jobs hasta 6h.

| | Motor A (routine) | Motor B (Actions+SDK) |
|---|---|---|
| Instalación | manual 1 vez | 100% automática |
| Costo | suscripción | por token (BYOK) |
| Latencia | tick 2h | instantánea + cron respaldo |
| Estado en vivo | no | sí (API de runs) |
| Multi-usuario | no escala | escala |

## 4.5 Deploy autónomo a Vercel (cierra el último gap manual)

SÍ es posible sin intervención humana, con un segundo secret BYOK: **`VERCEL_TOKEN`**
(vercel.com/account/tokens — el usuario lo pega UNA vez en la consola, igual que la API key).

- **Vía API (la buena)**: `POST https://api.vercel.com/v9/projects` con `gitRepository` apuntando
  al repo recién creado → el proyecto queda CONECTADO al repo: cada push despliega solo y cada PR
  genera su preview URL, para siempre, sin CLI. (Prerequisito único y one-time por CUENTA, no por
  proyecto: tener instalada la integración GitHub↔Vercel.) Env vars del proyecto también se setean
  por API (`POST /v10/projects/{id}/env`).
- **Vía CLI (fallback en el workflow)**: `vercel link --yes --token ` +
  `vercel deploy --prod` desde el Motor B o desde el arquitecto-stack local.
- **Quién lo ejecuta**: el agente `arquitecto-stack` en la Fase 1 (esqueleto → URL real el día 0)
  o la consola misma al crear el proyecto. La `preview_url` resultante se escribe en
  `.fabrica.json` → el dashboard la muestra.
- **Sin token**: el paso queda en TAREAS-MANUALES con los comandos exactos (degradación elegante).

## 4.6 Agente `arquitecto-stack` (decide tecnologías Y las instala)

Nuevo rol en `.claude/agents/arquitecto-stack.md` — a diferencia del `arquitecto` (solo planes),
este tiene manos (Bash/Write/WebSearch): (1) ADR de stack contra las specs y el presupuesto
(defaults Node.js: Vite+Vercel; BD solo si hace falta, free tier); (2) **selección de paquetes por
capacidad** ("quiero usar la cámara") con regla plataforma-nativa-primero, tabla de evaluación
(mantenimiento/adopción/tamaño/licencia/seguridad) y prueba de humo real antes de comprometerse;
(3) instalación completa: scaffolding + gate en verde + CI + deploy conectado (§4.5). Las
decisiones de costo recurrente >$0 SIEMPRE se estacionan al usuario.

## 5. Roadmap de la propia consola (comerse su propia comida)

- **v1 (MVP)**: crear proyecto (form → repo+SPECS+topic+manifest) + dropdown + dashboard
  read-only (progreso, último reporte, decisiones visibles) + **"＋ Nueva tarea / feedback" con
  input inteligente** (§2.1 — única escritura permitida además de la creación: append al Inbox).
- **v2**: decisiones `[USUARIO]` respondibles desde la web (el editor guiado del backlog completo).
- **v3**: Motor B completo (workflow en el template + secrets por API + dispatch instantáneo + estado en vivo + PRs con botón Merge) — cada usuario 100% autónomo con su API key. + notificaciones Telegram + auditorías con un clic.

**Specs listas para arrancarla con `/fabrica`** (en una carpeta vacía):

```
/fabrica Consola web de la Fábrica de agentes. OBJETIVO: crear y dar seguimiento a proyectos
basados en rifc23/fabrica-agentes-template sin usar terminal. FEATURES MVP: (1) formulario "nuevo
proyecto" con los 12 campos de docs/diseno-consola-web.md §1 que crea el repo desde el template
vía GitHub API + topic fabrica-agentes + .fabrica.json + docs/SPECS.md + backlog sembrado;
(2) dropdown de proyectos existentes (repos por topic, nombre del manifest); (3) dashboard
read-only por proyecto: progreso desde checkboxes del backlog, último reporte de docs/reportes/
renderizado, decisiones [USUARIO] visibles, link a repo y preview. NO ES V1: commitear decisiones
desde la web, bootstrap automático, multi-usuario, notificaciones. CRITERIOS: crear un proyecto
de prueba end-to-end desde el form y verlo aparecer en el dropdown con su dashboard. STACK: el
más simple que cumpla (recomiéndame), deploy Vercel, serverless con fine-grained PAT de GitHub
como env var server-side (NUNCA en el cliente). ME RESERVO: diseño visual y el nombre del producto.
```
