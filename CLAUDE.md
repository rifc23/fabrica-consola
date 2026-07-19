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
  feedback la da el DESPACHADOR de la routine madre (revisa Inboxes cada hora a los :50 e
  intenta disparar la routine del proyecto con `fire_trigger` si hay entradas pendientes — ≤1h de
  latencia DISEÑADA; ver actualización 2026-07-19 más abajo sobre Motor A-pool: ese disparo está
  roto hoy en la práctica, así que la latencia real hasta que se resuelva es "próximo tick normal
  del proyecto", no ≤1h) y, como evolución, Motor B (dispatch instantáneo vía GitHub Actions, v3).
  Los deep-links a routines son
  herramienta interna del dueño de la fábrica, solo en docs — nunca en la UI.
- **Peldaño 4 para fabrica-consola: el gate de CI reemplaza la revisión humana en los merges**
  (decisión del usuario, 2026-07-18 — "quiero que sea autónoma"). `fabrica-sync.yml` mergea a
  `main` TAMBIÉN las ramas `claude/**`/`fabrica/**` que tocan código: mergea localmente en el
  runner, corre el gate COMPLETO (npm ci + lint + test:run + build) sobre el resultado del merge
  y solo publica si todo pasa; si el gate falla o hay conflicto, main queda intacto y el run en
  rojo. El usuario supervisa por los reportes/consola y puede revertir (`git revert` del merge o
  Instant Rollback de Vercel). Excepción permanente: las ramas que tocan `.github/**` siguen
  requiriendo merge humano (GITHUB_TOKEN no puede pushear workflows).
- **Motor A-pool es el motor DEFAULT para proyectos nuevos** (decisión del usuario, 2026-07-18 —
  implementado en sesión interactiva entre los ticks 16:15 y 18:15 UTC de `routine-fabrica-consola`,
  ver diseño completo en `docs/diseno-consola-web.md` §4 y `docs/routine-madre-prompt.md` v4). N
  routines genéricas (`rutina-despachadora` + `rutina-trabajadora-N`) reclaman cualquier proyecto
  del catálogo con trabajo pendiente vía **lock optimista**: campo `lock` en `.fabrica.json`
  (commit atómico con `sha`, la propia API de GitHub arbitra el empate si dos rutinas reclaman a la
  vez — helpers en `src/lib/github.ts`: `trabajadorasLibres` y compañía). Un proyecto nuevo nace
  SIN `trigger_id` y sin ningún paso manual: la despachadora lo descubre y asigna sola. La consola
  ya NO ofrece/promueve instalar una routine dedicada al crear un proyecto (se retiró de la UI de
  `/nuevo-proyecto`); una routine dedicada (bloque A de `docs/plantilla-routine-prompt.md`, la que
  usa esta propia fabrica-consola) sigue siendo válida para proyectos con volumen propio sostenido,
  pero es opt-in manual vía `/schedule`, no el camino ofrecido. Ciclo del pool: `5 * * * *`
  (despachadora) / offsets propios por trabajadora en `CRON_DESPACHADORA_POOL` y
  `CRON_TRABAJADORAS_POOL` (`src/lib/cron.ts`) — reducido de 2h a 1h el 2026-07-18 (1 tick/hora es
  el mínimo real de la plataforma de rutinas, confirmado con un 400 al intentar `*/5 * * * *`). La
  routine madre (v4) agrega un PASO 4 de **despacho de emergencia**: si un proyecto sin
  `trigger_id` tiene trabajo pendiente y ninguna trabajadora lo tiene bloqueado, la madre le asigna
  el lock ella misma y dispara con `fire_trigger` de inmediato. **Actualización 2026-07-19 (~10:52
  UTC) — el disparo (mitad `fire_trigger` del PASO 4, y por extensión el PASO 3 de despacho de
  routines DEDICADAS) está roto en la práctica:** `fire_trigger` rechaza disparar cualquier trigger
  que la sesión invocadora no haya creado ella misma vía `create_trigger` ("this routine was
  created via 'http_api', not by an agent"); TODOS los triggers reales de la fábrica se crearon
  desde la UI de routines (`http_api`, por la regla del Error Conocido de 2026-07-17 sobre permisos
  de escritura), así que la madre no puede disparar estructuralmente NINGUNO. La mitad del PASO 4
  que sí funciona es el commit del `lock` (vía API de GitHub, no depende de `fire_trigger`) — un
  proyecto sin trabajadora asignada SÍ se asigna, pero NO se acelera; solo avanza en su próximo tick
  normal del pool. Detalle completo en `docs/reportes/EXPERIMENTO-ROUTINE-MADRE-FALLIDO.md`; el
  mecanismo de disparo instantáneo necesita reemplazarse por otra vía (decisión pendiente del
  usuario, ver Decisiones estacionadas del backlog) — hasta entonces, tratar "≤1h de latencia" de
  esta misma sección como el techo real solo cuando coincide con el tick normal del proyecto, no
  como garantía del despacho de emergencia. El dashboard expone `EstadoPool`
  (quién tiene el lock y cuándo corre) y el botón **"🔧 Asignar ahora"** (`/api/asignar-proyecto`,
  helper puro `trabajadorasLibres`) para asignar manualmente un proyecto sin atender a la próxima
  trabajadora libre — no lo dispara al instante, solo lo deja listo para su próximo tick normal.
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

- **(2026-07-18, RESUELTO el mismo día en el tick 16:15 UTC) `npm run lint` reporta miles de
  falsos positivos si quedan worktrees de subagentes con build propio.** Síntoma: gate final del
  orquestador con 640+ errores de lint que no existían en el diff real. Causa: `eslint.config.*`
  ignora `.next/**` anclado a la raíz del repo; los worktrees creados por
  `Agent(..., isolation:'worktree')` viven DENTRO del repo (`.claude/worktrees/agent-*/`) y, si un
  subagente corrió `npm run build` ahí, su `.next/` propio NO quedaba cubierto por ese ignore
  (hacía falta `**/.next/**`) — el lint del checkout principal lo escaneaba igual. **Solución
  desplegada:** `eslint.config.mjs` amplía los patrones a `**/.next/**`/`**/out/**`/`**/build/**`
  y agrega `.claude/**` a `globalIgnores`. **Hallazgo hermano del mismo tick:** `vitest` tenía
  EXACTAMENTE el mismo problema — un worktree de agente presente duplicaba `npm run test:run` de
  143 a 286 tests (recolectaba también `.claude/worktrees/agent-*/src/**/*.test.ts` como si fueran
  tests propios del checkout principal). Corregido con
  `exclude: [...configDefaults.exclude, ".claude/**"]` en `vitest.config.ts`. Además, `.gitignore`
  gana `/.claude/worktrees/` — esos directorios son trabajo transitorio de subagentes y nunca deben
  aparecer como untracked/trackeados en el repo principal. **Regla vigente para el futuro:** el
  orquestador sigue limpiando con `git worktree remove` los worktrees de subagentes ya integrados
  antes del gate final (defensa en profundidad), pero el gate ya NO depende de esa limpieza para
  dar un resultado correcto — cualquier herramienta nueva que recorra el árbol del repo (linters,
  test runners, bundlers de análisis) debe excluir `.claude/**` explícitamente en su config, el
  mismo patrón que estos dos fixes establecieron.

- **(2026-07-18, tick 18:15 UTC) Segunda vez que un registro de "ya está hecho" resulta falso y
  tarda ticks/sesiones en detectarse.** Síntoma: `docs/backlog.md` afirmaba desde el 2026-07-18
  (hallazgo del trigger fantasma) que se había "agregado la sección `📥 Inbox` que faltaba en este
  backlog" — pero la sección nunca se agregó. Seis ticks consecutivos de `routine-fabrica-consola`
  (06:15 a 16:15 UTC del mismo día) reportaron "Inbox: (vacío)" sobre una sección que en realidad
  no existía (`src/lib/backlog.ts::insertarEnInbox` exige un encabezado `/^##\s.*Inbox/` y lanza
  error si falta). No causó daño porque fabrica-consola no lleva el topic `fabrica-agentes` (nunca
  aparece en su propio dropdown, así que nadie pudo intentar escribirle desde el dashboard), pero
  el patrón — declarar un fix como hecho sin verificar el resultado — es el mismo que el del
  trigger `trig_01XJA8ejJVsh1aQE4fZFdeN1` que nunca se creó. **Regla: ninguna sesión (routine o
  interactiva) marca algo como agregado/corregido/hecho en el backlog o en `CLAUDE.md` sin haber
  verificado el resultado en el diff real del commit** (grep/leer el archivo tras el cambio, no
  solo confiar en la intención de la instrucción que se le dio al agente/subagente).

- **(2026-07-18, ~19:47 UTC) `fabrica-sync.yml` commiteaba con un email de autor sin cuenta de
  GitHub real detrás — Vercel bloqueaba el deploy automático de los proyectos hijos EN SILENCIO.**
  Síntoma: detectado por el usuario en `calculadora` (el primer proyecto real creado desde el
  formulario) — el código llegaba a `main` correctamente (los merges de `fabrica-sync` sí
  aparecían en el historial), pero el sitio en producción nunca se actualizaba, mostrando siempre
  el placeholder "🏭 en construcción" del template. No es el mismo bug que "No Next.js version
  detected" (ese era de build; este es de que el deploy ni siquiera se disparaba). Causa: el
  workflow hacía `git config user.email "fabrica-sync@users.noreply.github.com"` — un email
  inventado, sin ninguna cuenta de GitHub detrás. Vercel exige que el email del autor del commit se
  pueda vincular a un colaborador real del repo para disparar el deploy automático por push, y
  rechazaba estos commits sin dejar ningún error visible en GitHub Actions ni en la consola (el
  workflow reportaba éxito). Solución: usar el email noreply REAL de GitHub del dueño de la fábrica
  (formato `<user-id>+<username>@users.noreply.github.com`, visible en
  github.com/settings/emails o vía `api.github.com/users/<username>`) — ese sí está vinculado a la
  cuenta y Vercel lo reconoce. Aplicado en `.github/workflows/fabrica-sync.yml` (`2b8e8dd`,
  integrado en `main` vía `21f0792`) y en el mismo workflow del template
  (`fabrica-agentes-template`, commit `979bc75`), para que los proyectos nuevos nazcan sin este
  bug. **Regla: cualquier workflow que commitee en nombre de la fábrica (no solo `fabrica-sync`)
  debe usar el email noreply real de una cuenta de GitHub existente — nunca inventar uno, aunque
  el formato `...@users.noreply.github.com` parezca genérico.** Toca `.github/**`: por la regla del
  primer Error Conocido de esta lista, ningún prompt de routine puede aplicar este tipo de fix por
  su cuenta — requiere sesión interactiva o merge humano.

- **(2026-07-19, ~10:52 UTC) `fire_trigger` no puede disparar NINGÚN trigger existente de la
  fábrica — rompe estructuralmente el despacho instantáneo del Motor A-pool.** Síntoma: en un tick
  normal de `routine-madre-fabrica`, `list_triggers` funcionó con normalidad (devolvió los 9
  triggers reales), pero `fire_trigger` sobre un trigger real (`rutina-trabajadora-1`, PASO 4 de
  despacho de emergencia para el proyecto `stocktracker`) devolvió: `"this routine was created via
  'http_api', not by an agent. Agents can only fire routines they created (via create_trigger)"`.
  Causa: TODOS los triggers reales de la cuenta se crearon desde la UI de routines de claude.ai
  (`http_api`) — por la regla ya vigente del Error Conocido de 2026-07-17 ("toda routine que deba
  ESCRIBIR en un repo se crea desde la UI, no con `create_trigger`, o nace sin permisos"). Pero
  `fire_trigger` solo permite disparar routines que la propia sesión-agente creó ella misma vía
  `create_trigger` — y la madre, por diseño, nunca crea triggers propios. Resultado: la madre puede
  seguir asignando el `lock` (commit vía API de GitHub, no usa `fire_trigger`) pero JAMÁS puede
  acelerar el disparo de ninguna trabajadora del pool (PASO 4) ni de ninguna routine DEDICADA vía
  Inbox (PASO 3) — ambos mecanismos de "despacho instantáneo" documentados en CLAUDE.md §
  Decisiones Arquitectónicas (Motor A-pool) quedan reducidos a "esperar el próximo tick normal del
  cron". Detalle completo: `docs/reportes/EXPERIMENTO-ROUTINE-MADRE-FALLIDO.md`. **Regla: ningún
  documento de la fábrica (CLAUDE.md, `docs/routine-madre-prompt.md`, UI de la consola) debe
  presentar el despacho vía `fire_trigger` de la madre como una garantía de latencia baja hasta que
  el usuario decida un mecanismo de reemplazo — es una asignación de `lock`, no un disparo real.**
  No corregido en `docs/routine-madre-prompt.md` por esta routine: ese archivo no es territorio de
  `routine-fabrica-consola` (documenta el prompt de OTRA routine) y su fix requiere decidir un
  mecanismo distinto, no solo anotar un hallazgo — queda para el usuario o la sesión que mantiene la
  routine madre.

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

- **Último estado bueno (verificado 2026-07-19 22:15 UTC, vigésimo primer tick de
  `routine-fabrica-consola`):** base `main` en `f6af442` (merge de `fabrica-sync` del tick 20:15
  UTC: `claude/rutina-2026-07-19-2015-auditoria`, solo docs/CLAUDE.md/manifest). Gate en verde:
  `npm run lint && npm run test:run && npm run build` →
  lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10 / Turbopack, Node
  v22.22.2). Este tick: anti-solape con `git fetch` (último commit `f6af442`, ~1h57min de
  antigüedad en el momento del fetch, es el propio merge de `fabrica-sync` del tick anterior) sin
  working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) →
  tick procedió con normalidad. Inbox `(vacío)` sin triaje. Único hallazgo: la fila del tick 20:15
  UTC en el Registro de trabajo de `docs/backlog.md` decía "pendiente de push" pese a que
  `fabrica-sync` ya la había integrado en `f6af442` — corregida. Sin trabajo P1/P2 nuevo
  delegable — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y
  Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de
  proyecto, proxy de IA Paquetes 1 y 2 fuera del alcance autónomo, y el mecanismo de reemplazo de
  `fire_trigger` para el despacho instantáneo, que sigue sin decisión del usuario). Décimo tick
  consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo nuevo delegable — la cola sigue vacía de
  ítems accionables sin decisión del usuario.
