# fabrica-consola — Guía para Claude Code y agentes

Leer esto completo antes de tocar cualquier archivo. Este documento es la fuente de verdad del
proyecto y crece con él: cada decisión, cada bug resuelto y cada regla nueva se documenta AQUÍ.

---

## Qué es este proyecto

Consola web para crear y dar seguimiento a proyectos de la Fábrica de agentes
(`rifc23/fabrica-agentes-template`) sin usar terminal. Un formulario crea un repo nuevo desde el
template vía la API de GitHub; un dashboard por proyecto muestra progreso, último reporte y
decisiones pendientes leyendo directamente los archivos del repo (backlog, `.fabrica.json`,
`docs/reportes/`). Es de uso personal (single-user, el dueño de los repos). Ver especificación
completa en `docs/diseno-consola-web.md`.

**Stack:** Next.js (App Router, TypeScript) · API routes serverless para el backend · sin base de
datos (el estado vive en los repos de GitHub) · hosting/deploy: Vercel.
**Deploy:** push a `main` despliega vía integración GitHub↔Vercel (deploy automático por push).

---

## REGLAS NO NEGOCIABLES

- **El PAT de GitHub (`GITHUB_PAT`) es server-side ÚNICAMENTE** — env var en Vercel, usado solo
  dentro de API routes (`app/api/**/route.ts`). NUNCA exponerlo a un componente cliente, NUNCA
  loguearlo, NUNCA commitearlo. En código/docs/git va SOLO el NOMBRE del secreto, nunca el valor.
- El PAT debe ser **fine-grained**, scope mínimo (repos propios: Contents, Administration para
  crear-desde-template, Metadata). No usar un PAT clásico de alcance total.
- **La consola es stateless**: no hay base de datos propia. Todo el estado persistente vive en los
  repos (`.fabrica.json`, `docs/backlog.md`, `docs/reportes/`). No introducir una BD "para
  cachear" sin decisión explícita del usuario.
- **Sanitizar todo render de markdown/HTML** proveniente de los repos leídos (reportes, backlog)
  antes de insertarlo en el DOM — los repos son del propio usuario pero el render pasa por HTML.
- v1 es **read-only** sobre los repos de proyectos con TRES excepciones exactas: (1) la creación
  inicial del repo; (2) el append DENTRO de la sección `📥 Inbox` del `docs/backlog.md` del
  proyecto (decisión del usuario 2026-07-17) — que cubre tareas/feedback Y respuestas a
  decisiones `[USUARIO]` (formato `Respuesta a decisión "...": ...`; la routine la aplica en su
  triaje); la consola NUNCA escribe fuera de esa sección: las cards de decisiones responden vía
  Inbox, no editando la sección `[USUARIO]` directamente; y (3) la **eliminación completa de un
  proyecto** (repo de GitHub + proyecto Vercel) solicitada explícitamente por el usuario desde la
  "⚠️ Zona de peligro" del dashboard (decisión del usuario, 2026-07-17) — SIEMPRE con
  confirmación escribiendo el nombre exacto del repo, re-validada server-side; irreversible; la
  routine huérfana (si había) se elimina a mano desde la UI de routines.
- **La consola no llama a ningún LLM en v1** (decisión del usuario, 2026-07-17): el tratamiento
  inteligente del feedback lo hace la routine en el cron (paso "TRIAJE DEL INBOX"). Si algún día
  se construye el refinado instantáneo (P2 del backlog), su `ANTHROPIC_API_KEY` seguirá las mismas
  reglas que el `GITHUB_PAT`: server-side únicamente, nunca en cliente/logs/git.
- **Multiplataforma SIEMPRE** (decisión del usuario, 2026-07-17, regla de toda la fábrica): la
  consola y toda su UI se construyen mobile-first/responsive — usable desde 360px hasta desktop,
  targets táctiles ≥44px, sin interacciones solo-hover, sin scroll horizontal. Los criterios de
  aceptación de CADA feature con UI (formulario, dropdown, dashboard, cola, brief, Inbox)
  incluyen su comportamiento en móvil, y el E2E de Playwright (P2) corre en viewport desktop Y
  móvil (~390×844). La consola es el hub que el usuario abre desde el celular para revisar
  proyectos y dejar feedback — el móvil no es un extra, es un caso de uso primario.

## Regla de despliegue seguro (SIEMPRE, para cualquier cambio)

Cada cambio en su **rama propia** (`fix/…`, `feat/…`, `refactor/…`) con este gate antes de merge:

```bash
# 1. Ancla de rollback ANTES de mergear:
git rev-parse main

# 2. Gate (los 3 deben pasar):
npm run lint
npm run build
npm run test:run    # cuando exista suite de tests (vitest)

# 3. Merge + push (el push DESPLIEGA a producción vía Vercel):
git checkout main && git merge --no-ff <rama> && git push
```

**Rollback:** `git revert <ancla>..HEAD` para la tanda; `git revert <hash>` puntual. Vercel también
permite "Instant Rollback" a un deploy previo desde su dashboard si el revert de git no es
suficientemente rápido.
**Cambios riesgosos = dos fases**: mecanismo nuevo desplegado APAGADO tras flag → activar
gradualmente → observar → demoler el viejo. Nunca ambos pasos en el mismo deploy.

## Decisiones Arquitectónicas — No Revertir

- **Next.js + Vercel, sin base de datos.** El repo de GitHub del proyecto ES la base de datos
  (`.fabrica.json` + backlog + reportes). Evita sincronización de estado duplicado y es gratis.
  Razón: principio de menor costo de la Fase 0 + "la consola nunca habla con la routine, escribe y
  lee el repo, igual que todos los demás trabajadores de la fábrica" (`docs/diseno-consola-web.md`).
- **PAT fine-grained server-side, no GitHub OAuth App.** Para v1 (single-user) es más simple que
  montar un OAuth App completo; migrar a OAuth App queda anotado como camino de escalado
  multi-usuario en `docs/diseno-consola-web.md` §3, no se implementa hasta que haga falta.
- **Identificación de proyectos por topic `fabrica-agentes` + manifest `.fabrica.json`.** No usar
  prefijos de nombre de repo ni una lista hardcodeada — el dropdown se llena solo vía GitHub API.
- **Decisiones reservadas al usuario**: diseño visual y el nombre del producto. No renombrar el
  proyecto ni comprometerse a un sistema de diseño elaborado sin preguntar — usar UI mínima
  funcional (sin librería de componentes pesada) hasta que el usuario decida.
- **Una SOLA consola multi-proyecto, nunca una consola por proyecto** (decisión del usuario,
  2026-07-17). El dropdown selecciona el proyecto y el dashboard opera sobre él. Razón: la consola
  es stateless y todo el estado vive en cada repo hijo — N consolas serían N deploys, N secretos y
  N codebases duplicados sin aportar nada.
- **Los usuarios de la consola NO tienen acceso a claude.ai/routines** (decisión del usuario,
  2026-07-17). Ninguna función de la consola puede depender de deep-links a claude.ai, de la UI
  de routines ni de que el usuario dispare nada a mano fuera de la consola. La reacción rápida al
  feedback la da el DESPACHADOR de la routine madre (revisa Inboxes cada hora a los :50 y dispara
  la routine del proyecto con fire_trigger si hay entradas pendientes — ≤1h de latencia) y, como
  evolución, Motor B (dispatch instantáneo vía GitHub Actions, v3). Los deep-links a routines son
  herramienta interna del dueño de la fábrica, solo en docs — nunca en la UI.
- **Peldaño 4 para fabrica-consola: el gate de CI reemplaza la revisión humana en los merges**
  (decisión del usuario, 2026-07-18 — "quiero que sea autónoma"). `fabrica-sync.yml` mergea a
  `main` TAMBIÉN las ramas `claude/**`/`fabrica/**` que tocan código: mergea localmente en el
  runner, corre el gate COMPLETO (npm ci + lint + test:run + build) sobre el resultado del merge
  y solo publica si todo pasa; si el gate falla o hay conflicto, main queda intacto y el run en
  rojo. El usuario supervisa por los reportes/consola y puede revertir (`git revert` del merge o
  Instant Rollback de Vercel). Excepción permanente: las ramas que tocan `.github/**` siguen
  requiriendo merge humano (GITHUB_TOKEN no puede pushear workflows).
- **Input inteligente = patrón "Inbox + triaje en el cron"** (decisión del usuario, 2026-07-17).
  La consola commitea el feedback/idea/spec del usuario TAL CUAL, SOLO dentro de la sección
  `📥 Inbox` del backlog del proyecto; toda la inteligencia (wording, criterios de aceptación,
  dedupe, prioridad, estacionar preguntas) vive en el paso "TRIAJE DEL INBOX" de la routine
  orquestadora, que ya corre con la suscripción. Razón: cero costo y cero secretos extra, la
  consola queda mínima, y el backlog conserva un único escritor con criterio (la routine). El
  refinado instantáneo con preview (API de Claude en el API route) es mejora opcional en P2 —
  solo UX, nunca autoridad de triaje.

## Errores Conocidos — No Repetir

- **(2026-07-17) Las sesiones de routine NO pueden pushear a `main`.** Síntoma: el primer tick
  terminó sin nada en main; `git push origin main` denegado por el clasificador de permisos del
  modo auto (el push nunca llega a GitHub — NO es problema del PAT ni de la GitHub App, no
  perseguir esa pista). Causa: las sesiones disparadas por triggers corren en modo auto y el
  clasificador bloquea pushes a la rama default. Solución: workflow
  `.github/workflows/fabrica-sync.yml` — las routines pushean SOLO su rama designada
  (`claude/...`) y el workflow auto-mergea a main las ramas cuyo diff toque únicamente estado
  (`docs/**`, `CLAUDE.md`, `.fabrica.json`). Actualización 2026-07-18: en fabrica-consola el
  mismo workflow también mergea las ramas con código tras correr el gate completo en CI
  (peldaño 4, ver Decisiones Arquitectónicas); solo las ramas que tocan `.github/**` requieren
  merge humano. **Regla: ningún prompt de routine debe instruir `git push origin main` — siempre
  la rama designada + fabrica-sync.**
- **(2026-07-17) Los triggers creados PROGRAMÁTICAMENTE generan sesiones SIN permiso de escritura
  en los repos.** Síntoma: el tick construyó y commiteó pero TODO push fue denegado ("falta de
  permiso de escritura"), incluso a su rama designada — el trabajo muere con el contenedor.
  Causa: la herramienta `create_trigger` no configura `outcomes` (las ramas con permiso de
  escritura de la sesión); solo las routines creadas desde la UI de claude.ai los llevan (Diván y
  la madre los tienen; las creadas por herramienta, no). Solución/regla: **toda routine que deba
  ESCRIBIR en un repo se crea desde la UI de routines** — la "pantalla de arranque" de la consola
  (prompt parametrizado + botón copiar, ~1 min/proyecto) es el mecanismo de instalación, no un
  fallback. La madre NO instala routines con `create_trigger` (nacerían rotas): detecta proyectos
  sin routine y deja el prompt listo como tarea manual; su despacho con `fire_trigger` SÍ
  funciona (dispara routines existentes creadas por UI, que corren con sus propios permisos).
- **(2026-07-17) El primer deploy de un proyecto recién creado fallaba: "No Next.js version
  detected".** Síntoma: al crear el primer proyecto real desde el formulario, Vercel no pudo
  buildear. Causa: el template era puro molde (docs, sin `package.json` ni app) mientras la
  consola crea el proyecto Vercel con preset `nextjs`. Solución: el template ahora incluye un
  **esqueleto Next.js mínimo** (placeholder "🏭 en construcción" + gate completo lint/build/test
  corrible) — todo proyecto nace con deploy verde y la routine construye el producto ENCIMA en su
  primer tick. Regla: el template siempre debe mantener su gate en verde; si un proyecto necesita
  otro stack, el arquitecto-stack lo reemplaza en Fase 1 (y ajusta el framework de Vercel como
  tarea manual).

- **(2026-07-17) El link de preview mostraba la app de un TERCERO.** Síntoma: el proyecto
  "calculadora" recién creado mostraba una calculadora funcional que no era nuestra. Causa: la
  consola construía `https://<nombre>.vercel.app` a mano — ese espacio de nombres es GLOBAL; el
  nombre estaba tomado por otra persona y Vercel asignó a nuestro proyecto un dominio distinto.
  Solución: `obtenerDominioProduccion` consulta `GET /v9/projects/{name}/domains` y tanto el
  crear-proyecto como el dashboard usan el dominio REAL (el dashboard lo prioriza sobre el
  manifest, auto-corrigiendo proyectos ya creados). Regla: NUNCA construir URLs de Vercel por
  concatenación — siempre preguntarle a la API.

- **(2026-07-18) `npm run lint` reporta miles de falsos positivos si quedan worktrees de
  subagentes con build propio.** Síntoma: gate final del orquestador con 640+ errores de lint que
  no existían en el diff real. Causa: `eslint.config.*` ignora `.next/**` anclado a la raíz del
  repo; los worktrees creados por `Agent(..., isolation:'worktree')` viven DENTRO del repo
  (`.claude/worktrees/agent-*/`) y, si un subagente corrió `npm run build` ahí, su `.next/` propio
  NO queda cubierto por ese ignore (haría falta `**/.next/**`) — el lint del checkout principal lo
  escanea igual. Solución/regla: antes de correr el gate final de un lote, el orquestador limpia
  con `git worktree remove` los worktrees de subagentes ya integrados (mergeados, sin cambios
  pendientes) — nunca antes de confirmar que su rama ya se mergeó. Corrección de raíz (ampliar el
  ignore de ESLint o excluir `.claude/**`) anotada en el backlog P2, no se toca en caliente durante
  un lote de features para no mezclar alcance.

## Modelo de datos

No hay base de datos. "Modelo de datos" = contrato de archivos leídos/escritos en los repos de
proyectos vía GitHub Contents API:

- **`.fabrica.json`** (raíz de cada repo hijo): `{ id, nombre, creado, peldano, trigger_id,
  cadencia_cron, ultimo_tick, preview_url, estado }` — ver esquema completo en
  `docs/diseno-consola-web.md` §"Conceptos clave". `cadencia_cron` permite calcular el countdown
  al próximo tick sin APIs; `ultimo_tick` lo actualiza la routine al iniciar cada tick con trabajo.
- **`docs/backlog.md`**: fuente de progreso (checkboxes `- [ ]`/`- [x]` en P0/P1), de decisiones
  estacionadas (sección `[USUARIO]`) y buzón de entradas del usuario (sección `📥 Inbox` — la
  ÚNICA parte del backlog donde la consola escribe; la routine la vacía en cada triaje). Además,
  **el orden del archivo ES la cola de la routine** (arriba = siguiente) y el marcador `🔄`
  antepuesto al título de una tarea significa "en el lote del tick actual" — la consola deriva de
  ahí la cola numerada, el "trabajando ahora" y las esperas estimadas (diseño en §2.2).
- **`docs/reportes/*.md`**: reportes de cada corrida de la routine/orquestador; la consola lee el
  más reciente por nombre de archivo (`<fecha>-<...>.md`).
- **`docs/TAREAS-MANUALES.md`**: tareas pendientes del humano, mostradas en el dashboard.

## Testing

- **Regla:** toda función pura nueva o modificada (parsers de backlog/manifest, helpers de la API
  de GitHub) lleva su test EN EL MISMO cambio.
- **Gate:** `npm run lint && npm run build && npm run test:run`.
- **E2E:** pendiente hasta que exista un framework instalado (Playwright recomendado cuando el
  formulario y el dashboard tengan flujo real); cada feature nueva agrega su spec desde entonces.

## Ancla de rollback (actualizar al cerrar cada sesión/campaña)

- **Último estado bueno (verificado 2026-07-18 06:xx UTC, primer tick real de
  `routine-fabrica-consola`):** `main` en `9c510d7` (diseño Motor A-pool) — las 5 P0 del MVP
  completas y mergeadas (formulario+Vercel, dropdown, dashboard, Inbox+decisiones, eliminar
  proyecto, esqueletos por stack), más el fix del dominio real de Vercel (Error Conocido #4) y el
  badge de estado del deploy en preview. Gate en verde: `npm run lint && npm run test:run &&
  npm run build` → lint ✅, test:run **107/107** ✅, build ✅ (Next.js 16.2.10 / Turbopack, Node
  v22.22.2). Corrección de este tick: el registro de trabajo del backlog daba por "pendiente de
  merge por el usuario" el lote del badge de deploy — ya estaba mergeado a main (`6520bd4`) desde
  el 2026-07-17; era un registro desactualizado, no un hecho falso (a diferencia del Error
  Conocido #2 de la routine).
