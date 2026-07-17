# Reporte — Lote v1 completo de la consola (2026-07-17)

**Rama:** `claude/factory-console-backlog-7jafgw` · **Autoridad:** peldaño 3 (pendiente de merge
por el usuario) · **Ejecutor:** subagente implementador (Sonnet) orquestado por la sesión
interactiva del usuario (las routines no pudieron ejecutar el lote — ver Errores Conocidos #1 y
#2 en CLAUDE.md).

## Qué se construyó (las 5 P0, producto completo)

1. **Formulario "Nuevo proyecto"** (`/nuevo-proyecto` + `POST /api/crear-proyecto`): 12 campos
   del diseño §1; crea repo desde el template (`generate`) + topic `fabrica-agentes` + proyecto
   Vercel conectado vía API si hay `VERCEL_TOKEN` (degradación: pasos manuales al
   TAREAS-MANUALES del repo nuevo) + commitea `.fabrica.json` (con `cadencia_cron` de offset
   escalonado 0/15/30/45 rotado) y `docs/SPECS.md` + siembra el backlog P0 del proyecto.
   Progreso por pasos con estado real, errores por paso, redirect al dashboard del proyecto.
2. **Dropdown de proyectos** (`SelectorProyectos` en el layout): lista por topic con nombre del
   manifest, navegación a `/proyectos/[id]`, lectura sin caché.
3. **Dashboard por proyecto** (`/proyectos/[id]`): progreso real por checkboxes, brief
   hecho/en-curso/pendiente POR PARSING (sin LLM), último reporte y tareas manuales renderizados
   con sanitizador propio (escape-first), decisiones `[USUARIO]`, links repo/preview, botón
   "↻ Actualizar" + auto-refresh (~60s con pestaña visible), pantalla de arranque colapsable con
   el prompt de routine parametrizado y botón copiar.
4. **"＋ Nueva tarea / feedback"** (`NuevaTarea` + `POST /api/tareas`): commit del texto tal cual
   SOLO dentro de la sección `📥 Inbox` del backlog del proyecto (inserción por parser dedicado,
   reintento ante 409 con SHA fresco), confirmación con link al commit.
5. **Cards de decisiones respondibles** (`DecisionCard`): responde vía el mismo endpoint del
   Inbox con el formato exacto `Respuesta a decisión "...": ...`; estado "respondida — la
   fábrica la tomará en ~X min" con countdown del mínimo entre `cadencia_cron` y el despachador
   de la madre (:50). Sin links a claude.ai en la UI.

## Gate (corrido DOS veces: por el implementador y por el orquestador)

- `npm run lint` ✅ · `npm run build` ✅ (5/5 páginas) · `npm run test:run` ✅ **74/74** (8
  archivos; 68 tests nuevos sobre backlog/brief/cron/markdown/github/vercel/formulario/prompt).

## Revisión del orquestador (cumplimiento de REGLAS NO NEGOCIABLES)

- `GITHUB_PAT`/`VERCEL_TOKEN` solo en route handlers/server (ningún `process.env` en cliente).
- Markdown sanitizado con renderer propio sin dependencias (escape total antes de re-emitir
  subset seguro). Cero dependencias nuevas en package.json.
- Escritura remota exclusivamente dentro de `📥 Inbox`; resto del flujo read-only.
- Mobile-first: layout fluido, targets ≥44px, sin hover-only (verificado en revisión de código;
  E2E de viewports queda en P2 como estaba previsto).

## Estacionado / siguiente

- Merge a main: decisión del usuario (peldaño 3). El merge despliega la consola v1 a Vercel.
- P1 en cola: vista de cola y tiempos, burn-down. P2: refinado instantáneo, Playwright E2E.
- Tarea manual 🔴 4 reabierta: crear `routine-fabrica-consola` desde la UI (post-merge).
- Propuesta para CLAUDE.md: ninguna adicional — los Errores Conocidos #1 y #2 ya quedaron
  documentados durante el lote.
