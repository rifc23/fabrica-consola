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
- v1 es **read-only** sobre los repos de proyectos con DOS excepciones exactas: (1) la creación
  inicial del repo y (2) el append de tareas/feedback del usuario DENTRO de la sección `📥 Inbox`
  del `docs/backlog.md` del proyecto (decisión del usuario 2026-07-17). La consola NUNCA escribe
  fuera de esa sección — responder decisiones `[USUARIO]` desde la web sigue siendo v2 (roadmap en
  `docs/diseno-consola-web.md` §5).
- **La consola no llama a ningún LLM en v1** (decisión del usuario, 2026-07-17): el tratamiento
  inteligente del feedback lo hace la routine en el cron (paso "TRIAJE DEL INBOX"). Si algún día
  se construye el refinado instantáneo (P2 del backlog), su `ANTHROPIC_API_KEY` seguirá las mismas
  reglas que el `GITHUB_PAT`: server-side únicamente, nunca en cliente/logs/git.

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
- **Input inteligente = patrón "Inbox + triaje en el cron"** (decisión del usuario, 2026-07-17).
  La consola commitea el feedback/idea/spec del usuario TAL CUAL, SOLO dentro de la sección
  `📥 Inbox` del backlog del proyecto; toda la inteligencia (wording, criterios de aceptación,
  dedupe, prioridad, estacionar preguntas) vive en el paso "TRIAJE DEL INBOX" de la routine
  orquestadora, que ya corre con la suscripción. Razón: cero costo y cero secretos extra, la
  consola queda mínima, y el backlog conserva un único escritor con criterio (la routine). El
  refinado instantáneo con preview (API de Claude en el API route) es mejora opcional en P2 —
  solo UX, nunca autoridad de triaje.

## Errores Conocidos — No Repetir

<Lista viva. Cada bug resuelto deja: síntoma → causa → solución → regla. Empieza vacía.>

## Modelo de datos

No hay base de datos. "Modelo de datos" = contrato de archivos leídos/escritos en los repos de
proyectos vía GitHub Contents API:

- **`.fabrica.json`** (raíz de cada repo hijo): `{ id, nombre, creado, peldano, trigger_id,
  preview_url, estado }` — ver esquema completo en `docs/diseno-consola-web.md` §"Conceptos clave".
- **`docs/backlog.md`**: fuente de progreso (checkboxes `- [ ]`/`- [x]` en P0/P1), de decisiones
  estacionadas (sección `[USUARIO]`) y buzón de entradas del usuario (sección `📥 Inbox` — la
  ÚNICA parte del backlog donde la consola escribe; la routine la vacía en cada triaje).
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

- **Último estado bueno:** commit inicial de Fase 0-1 (2026-07-14) — kit + esqueleto andante
  (Next.js 16 App Router + TypeScript + Vitest, endpoint `/api/proyectos` funcional) + CI. Gate en
  verde: `npm run lint && npm run test:run && npm run build`.
