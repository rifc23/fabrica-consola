# Backlog — fabrica-consola

Fuente única de tareas para los agentes (`implementador`, `arquitecto`, `auditor-seguridad`,
`qa-funcional`, `producto`) y la routine orquestadora. La memoria del proyecto ES este archivo +
`docs/reportes/` + CLAUDE.md — no hay estado fuera de git.

**Protocolo obligatorio para todo agente que trabaje este backlog:**
1. **Prod intocable** — nunca push/merge a la rama principal (despliega a producción); todo en
   ramas; sin migraciones de datos ni deploys de configuración (esos los ejecuta el usuario u
   orquestador autorizado).
2. **Paquetes completos** — una tarea se toma entera o no se toma: código + tests + gate en verde
   + reporte. Prohibido dejar ramas a medias o en estado inconsistente.
3. **Checkpoint de contexto** — antes de iniciar cada tarea, evaluar el contexto de sesión
   restante; si no alcanza para completarla y reportar, NO iniciarla: cerrar en estado consistente
   y dejar el estado exacto en el reporte.
4. **Territorio y escritor único** — cada agente escribe SOLO dentro de su worktree. Este archivo
   y CLAUDE.md los edita ÚNICAMENTE el orquestador; los agentes entregan su reporte en
   `docs/reportes/<YYYY-MM-DD>-<rama>.md` (commiteado en su rama, nombre único) con una sección
   "Propuestas para CLAUDE.md/backlog" que el orquestador consolida tras el merge.
5. **Serialización por archivos compartidos** — nunca dos tareas en paralelo que toquen los mismos
   archivos fuente; van en serie (o el mismo agente vía SendMessage). Un agente que detecte solape
   no contemplado lo reporta y NO toma la tarea.
6. **El orden es la cola** — dentro de P0 y luego P1, el orquestador toma tareas de ARRIBA hacia
   ABAJO: reordenar el backlog = repriorizar la cola (solo el orquestador/triaje reordena). Al
   iniciar un lote, el orquestador marca cada tarea tomada anteponiendo `🔄` a su título y
   actualiza `ultimo_tick` en `.fabrica.json` (commit + push de inicio de tick); al cerrar el
   lote, las completadas pasan a `[x]` y las no terminadas pierden el `🔄`. La consola lee estos
   marcadores para mostrar cola, "trabajando ahora" y tiempos de espera.

## Estado general

- 2026-07-14: proyecto arrancado con la Fábrica (`/fabrica`). Esqueleto andante: Next.js 16
  (App Router, TypeScript) + Vitest, endpoint `/api/proyectos` funcional (lee repos por topic
  `fabrica-agentes` vía GitHub API server-side) con 6 tests unitarios sobre `src/lib/github.ts`.
  Gate en verde local (lint + test:run + build). CI en `.github/workflows/gate.yml`. Pusheado a
  `main` (commit `cafebd9`). Deploy a Vercel: pendiente de conexión (ver TAREAS-MANUALES.md).
- 2026-07-17: decisión del usuario: una SOLA consola multi-proyecto (dropdown, no una consola por
  proyecto) y la consola también recibe inputs sobre proyectos ya creados. El "＋ Nueva tarea /
  feedback" sube de P1 a P0 con tratamiento inteligente del input (patrón Inbox + triaje de la
  routine, ver la tarea P0 y CLAUDE.md § Decisiones Arquitectónicas). El template gana la sección
  `📥 Inbox` en su backlog y el paso de triaje en la plantilla de routine.
- 2026-07-17 (más tarde): simplificación por decisión del usuario — la consola NO llama a ningún
  LLM en v1: commitea el feedback crudo al Inbox y el refinado completo lo hace la routine en el
  cron (triaje). El refinado instantáneo con preview (`ANTHROPIC_API_KEY`) baja a P2 como mejora
  opcional de UX; se retiró la tarea manual de la key.
- 2026-07-17: tareas manuales 1 y 2 completadas por el usuario — `GITHUB_PAT` fine-grained en
  Vercel y repo conectado (deploy automático por push activo). Verificado en producción:
  `/api/proyectos` responde 200 con `[]`. Las features P0 quedan totalmente desbloqueadas,
  incluida la prueba end-to-end contra la API real de GitHub.
- ~~2026-07-17: routine orquestadora instalada (`routine-fabrica-consola`,
  `trig_01XJA8ejJVsh1aQE4fZFdeN1`, ...)~~ — **CORREGIDO 2026-07-18: este registro era falso.**
  El tick de la routine madre de las 11:50 del 2026-07-17 confirmó por `list_triggers` que solo
  existen 3 triggers reales en la cuenta (madre, "Diván", un `send_later` ya disparado) —
  `routine-fabrica-consola` NUNCA se creó. Una sesión anterior documentó una intención como si
  fuera un hecho. Consecuencia: nadie ha iterado el backlog P1/P2 de forma autónoma; todo el
  avance de P0 lo hizo la sesión interactiva. Aprovechado el mismo hallazgo para agregar la
  sección `📥 Inbox` que faltaba en este backlog (la madre también notó que no existía).
  **CORRECCIÓN 2026-07-18 (tick 18:15 UTC): esa frase también era falsa.** La sección nunca se
  agregó — seis ticks consecutivos de `routine-fabrica-consola` (06:15 a 16:15 UTC) reportaron
  "Inbox: (vacío)" sobre una sección que, en realidad, no existía en el archivo (`insertarEnInbox`
  en `src/lib/backlog.ts` exige un encabezado `/^##\s.*Inbox/` y lanza error si falta). No era
  explotable hoy: este repo no lleva el topic `fabrica-agentes` (confirmado vía API en este mismo
  tick), así que `obtenerProyectos`/`FABRICA_TOPIC` nunca lista a fabrica-consola en su propio
  dropdown y `POST /api/tareas` la bloquea igual — pero la afirmación era falsa y quedó sin
  detectar seis ticks. Agregada de verdad esta vez (ver sección abajo); regla para el futuro:
  ninguna sesión (routine o interactiva) declara "agregado"/"hecho" sin verificar el resultado en
  el propio diff del commit.
- 2026-07-18: `routine-fabrica-consola` creada de verdad vía `/schedule`
  (`trig_01NduNpiSB2NsJNuCPxmpQQp`, cron `15 */2 * * *`, peldaño 3, conector Claude_Code_Remote).
  Primer disparo: 06:15 UTC del mismo día. A partir de su primer tick con reporte en
  `docs/reportes/`, el backlog P1 (Gems, cola/tiempos, burndown) puede avanzar de forma autónoma.
- 2026-07-17: decisión del usuario — el dashboard incluye "🧑 Tareas manuales" como documento
  vivo y un "📋 Brief" hecho/pendiente derivado por parsing (sin LLM), ambos con botón
  "↻ Actualizar" que re-lee del repo sin caché. Ampliada la spec del dashboard P0 y §2 del
  diseño.
- 2026-07-17: tareas manuales 5 y 6 completadas — `VERCEL_TOKEN` configurado (deploy autónomo de
  proyectos nuevos habilitado para la P0 del formulario) y routine madre activa
  (`trig_01GKMxZGYkU5TqkS3pPcC5Mc`, cron `50 * * * *`). TODAS las tareas manuales bloqueantes o
  habilitadoras están cerradas: la P0 del formulario puede implementarse y probarse end-to-end
  (repo + Vercel + routine) sin intervención del usuario.
- 2026-07-17: decisión del usuario — regla **Multiplataforma SIEMPRE** (mobile-first/responsive,
  E2E en viewport móvil) agregada a las REGLAS NO NEGOCIABLES de la consola Y del template: toda
  UI de la fábrica funciona en celular. Aplica a TODAS las tareas P0/P1 con UI de este backlog.
- 2026-07-17: PRIMER ERROR CONOCIDO resuelto — el tick de las 06:15 no pudo publicar: las
  sesiones de routine tienen bloqueado el push a main por el clasificador del modo auto (ver
  CLAUDE.md § Errores Conocidos). Solución desplegada: workflow `fabrica-sync.yml` (consola y
  template) que auto-mergea a main las ramas de solo-estado; las routines ahora pushean
  únicamente su rama designada. El merge de la documentación de hoy a main lo hizo el usuario
  vía sesión interactiva (`9f9af34` consola, `862c483` template).
- 2026-07-17: ERROR CONOCIDO #2 — los triggers creados programáticamente generan sesiones SIN
  permiso de escritura (sin `outcomes`); el tick disparado a las 13:45 construyó pero no pudo
  pushear ni su rama designada y su trabajo se perdió. Consecuencias aplicadas: la routine de la
  consola DEBE crearse desde la UI de routines (tarea manual nueva), la madre pasa a v3
  (preparadora de prompts + despachadora, ya no instaladora), y la pantalla de arranque del
  formulario vuelve a ser el mecanismo oficial de instalación de routines. Las 5 P0 las está
  implementando la sesión interactiva del usuario (que sí tiene escritura) para no perder otro
  ciclo.
- 2026-07-17: decisión del usuario — regla **Primer tick = producto funcional** en la plantilla
  de routine del template y en la routine de la consola: el primer disparo de un proyecto no
  entrega un lote incremental sino la idea principal funcionando de punta a punta (las P0 que
  constituyen el corazón, en serie donde compartan archivos); al backlog solo queda lo no
  esencial. Para la consola: las 4 P0 son UN producto y van juntas en el primer tick.

- 2026-07-17 (cierre del lote v1): las 5 P0 implementadas y con gate en verde (lint ✅ build ✅
  test:run 74/74 ✅) en la rama `claude/factory-console-backlog-7jafgw` — pendiente de merge por
  el usuario (peldaño 3). Revisión del orquestador: secretos solo server-side, markdown con
  sanitizador propio (escape-first), escritura únicamente en sección 📥 Inbox con reintento por
  SHA, countdown sin links a claude.ai, UI mobile-first. Reporte:
  `docs/reportes/2026-07-17-lote-v1-consola.md`. Verificado además fabrica-sync en vivo: main
  recibió `7f1fe03` automáticamente.
- 2026-07-18: diseño nuevo — **Motor A-pool** (docs/diseno-consola-web.md §4): N routines
  genéricas ("rutinas-trabajadora-N") que reclaman CUALQUIER proyecto de la fábrica con trabajo
  pendiente vía lock optimista (campo `lock` nuevo en `.fabrica.json` — commit atómico con `sha`,
  la propia API de GitHub arbitra el empate si dos rutinas reclaman a la vez). Alternativa a
  instalar una routine dedicada por cada proyecto nuevo — mejor para proyectos chicos/intermitentes;
  convive con routines dedicadas (`trigger_id`) para proyectos con volumen propio. Prompt B en
  `docs/plantilla-routine-prompt.md`. Aún NO implementado (helpers de lock en `src/lib/github.ts`,
  UI del dashboard mostrando `lock` — queda en P1/P2, priorizar cuando el catálogo de proyectos
  hijos crezca lo suficiente para justificarlo). Documentado también en el template
  (`fabrica-agentes-template`) para que cualquier proyecto nuevo herede el diseño ya explicado.
- 2026-07-18 (06:15 UTC): primer disparo real de `routine-fabrica-consola`. Inbox vacío → sin
  triaje que hacer. Auditoría del estado real: `main` no tenía trabajo a medias (working tree
  limpio, sin worktrees ni ramas huérfanas), gate completo corrido de verdad en el entorno (lint
  ✅, test:run **107/107** ✅, build ✅ con Node v22.22.2) — el entorno SÍ puede correr el gate,
  ninguna instalación previa necesaria más allá de `npm install`. Hallazgo corregido: la fila del
  Registro de trabajo del lote "estado del deploy en preview" decía "pendiente de merge por el
  usuario" pero `git log` confirma que ya está en `main` desde el 2026-07-17 (`6520bd4`) — fila
  corregida con el hash real. `CLAUDE.md` § Ancla de rollback también estaba desactualizado
  (apuntaba al commit inicial de Fase 0-1); actualizado al HEAD real de `main`. No hay
  `.fabrica.json` en la raíz de este repo (correcto: la consola no se autogestiona como proyecto
  hijo, ese manifest es para los repos que ELLA crea) — el paso "actualizar `ultimo_tick`" de la
  plantilla de routine no aplica aquí y se omite sin sustituto. Toma el lote P1 completo (única
  cola no-P0 pendiente): Gem, Vista de cola/tiempos, Burn-down — las tres marcadas 🔄, sin archivos
  fuente compartidos entre sí (`formulario-proyecto.ts`+`nuevo-proyecto/page.tsx` / `backlog.ts`+
  `cron.ts`+`ColaProyecto.tsx` / `burndown.ts`+`github.ts`+`Burndown.tsx`), delegadas en paralelo a
  tres subagentes `implementador` en worktrees separados.
- 2026-07-18 (cierre del lote P1): las tres tareas completadas con gate en verde (lint ✅
  test:run 143/143 ✅ build ✅) en `claude/rutina-2026-07-18-0615-p1-batch` — pendiente de merge
  por el usuario (peldaño 3, la rama toca código). Hallazgo durante la integración: `src/lib/cron.ts`
  YA existía (creado en el P0 de "Cards de decisiones respondibles" para el countdown de
  `DecisionCard`) — el subagente de cola/tiempos lo detectó y extendió (`derivarCadenciaMinutos`)
  en vez de duplicarlo, siguiendo la regla de fuente única. El conflicto esperado en
  `src/app/proyectos/[id]/page.tsx` (cola/tiempos y burndown añadiendo cada uno su sección) se
  resolvió de forma aditiva por un cuarto subagente `implementador` — ambas secciones conviven,
  orden final: Progreso → Cola y tiempos → Burndown → Decisiones → Brief → Reporte → Tareas
  manuales → Inbox → Zona de peligro. Nota para el futuro (del reporte de la tarea Gem,
  `docs/reportes/2026-07-18-feat-gem-tipo-proyecto.md`): el campo `tipo:"gem"` del manifest se
  tipó localmente en `crear-proyecto/route.ts` (`FabricaManifest & { tipo?: "gem" }`) para no
  arriesgar colisión con las tareas hermanas sobre `github.ts`; si se agregan más tipos de
  proyecto, promoverlo a campo real de `FabricaManifest` (anotado como P2 abajo). También se
  detectó y limpió infraestructura: los worktrees de los subagentes (`.claude/worktrees/agent-*`,
  con sus propios `.next/` de build) viven DENTRO del repo y no están cubiertos por el
  `globalIgnores(".next/**")` de `eslint.config.*` (patrón anclado a raíz, no `**/.next/**`) — un
  `npm run lint` corrido con worktrees de agentes aún presentes reporta miles de falsos positivos
  sobre esos artefactos de build ajenos. Este tick los limpió (`git worktree remove`, ya sin
  cambios pendientes) antes de correr el gate real; si el problema reaparece, la corrección de
  raíz es ampliar el ignore de ESLint (o excluir `.claude/**` directamente) — queda anotado en P2
  en vez de tocarlo en este tick para no mezclarlo con el lote de features.
- 2026-07-18 (08:15 UTC): segundo disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`fe0a2d6`, el sync docs-only del tick anterior) con ~2h de antigüedad, working
  tree limpio, sin worktrees huérfanos → tick procedió con normalidad. Inbox: `(vacío)` → sin
  triaje. Entorno verificado de nuevo (`npm install` + gate completo): lint ✅, test:run
  **107/107** ✅, build ✅ — coincide con el estado real de `main` (el lote P1 del tick de 06:15
  sigue sin mergear, ver fila de Registro de trabajo actualizada abajo con su estado real). Cola
  no-P0 revisada: P1 no tiene ítems nuevos (los tres ya están `[x]` en la rama pendiente); P2 se
  evaluó ítem por ítem y ninguno es delegable sin decisión/acción del usuario ahora mismo:
  "Refinado instantáneo" requiere reponer la tarea manual de `ANTHROPIC_API_KEY` (retirada
  explícitamente); "Playwright E2E del flujo completo" implicaría crear un repo de GitHub y un
  proyecto Vercel REALES de prueba vía la API — un efecto de lado externo y difícil de revertir
  que esta routine no está autorizada a decidir sola (no es una migración de datos ni un deploy de
  config, pero sí "actúa sobre recursos reales fuera del repo propio" en un sentido análogo);
  queda estacionada como pregunta para el usuario en vez de ejecutarse a ciegas; "Motor B" está
  marcado explícitamente "no es v1". Resultado: **sin trabajo nuevo delegable este disparo** —
  no es cierre de campaña porque sigue pendiente el merge del lote P1 y la decisión de Playwright
  E2E podría reabrir la cola. Reporte: `docs/reportes/2026-07-18-0815-rutina.md`.
- 2026-07-18 (10:15 UTC): tercer disparo — mismo diagnóstico que el de las 08:15: Inbox `(vacío)`,
  sin triaje; trigger verificado contra `list_triggers` sin discrepancias; gate real en verde
  (lint ✅, test:run 107/107 ✅, build ✅); sin trabajo P1/P2 nuevo delegable. El lote P1
  (`claude/rutina-2026-07-18-0615-p1-batch`) sigue sin mergear — van 3 ticks consecutivos
  (~3h39min desde su cierre en `21ca51a`) esperando el merge manual del usuario, el único paso que
  falta para reabrir la cola. Reporte: `docs/reportes/2026-07-18-1015-rutina.md`.
- 2026-07-18 (12:15 UTC): cuarto disparo — mismo diagnóstico que los dos anteriores: Inbox
  `(vacío)`, sin triaje; trigger verificado contra `list_triggers` sin discrepancias; gate real en
  verde (lint ✅, test:run 107/107 ✅, build ✅); sin trabajo P1/P2 nuevo delegable (P1 ya `[x]`
  en la rama pendiente, P2 sin ítems delegables sin decisión del usuario). El lote P1
  (`claude/rutina-2026-07-18-0615-p1-batch`) sigue sin mergear — van 4 ticks consecutivos
  (~5h39min desde su cierre en `21ca51a`) esperando el merge manual del usuario; sigue siendo el
  único paso que falta para reabrir la cola. Reporte: `docs/reportes/2026-07-18-1215-rutina.md`.
- 2026-07-18 (14:15 UTC): quinto disparo — mismo diagnóstico que los tres anteriores: Inbox
  `(vacío)`, sin triaje; trigger verificado contra `list_triggers` sin discrepancias; gate real en
  verde (lint ✅, test:run 107/107 ✅, build ✅); sin trabajo P1/P2 nuevo delegable (P1 ya `[x]`
  en la rama pendiente, P2 sin ítems delegables sin decisión del usuario). El lote P1
  (`claude/rutina-2026-07-18-0615-p1-batch`) sigue sin mergear — van **5 ticks consecutivos**
  (~7h39min desde su cierre en `21ca51a`, casi 8h) esperando el merge manual del usuario; sigue
  siendo el único paso que falta para reabrir la cola. Dado el tiempo transcurrido, este tick
  notificó al usuario fuera de banda (push/email) en vez de esperar un sexto tick silencioso.
  Reporte: `docs/reportes/2026-07-18-1415-rutina.md`.
- 2026-07-18 (sesión interactiva, ~15 UTC): **lote P1 mergeado a `main` (`399111d`)** por la
  sesión interactiva con gate local en verde sobre el resultado del merge (lint ✅, test:run
  143/143 ✅, build ✅; conflicto de docs/backlog.md resuelto conservando ambas historias). Y
  decisión del usuario — **peldaño 4**: "quiero que sea autónoma" → `fabrica-sync.yml` ahora
  también auto-mergea a main las ramas con código, corriendo el gate completo en CI (npm ci +
  lint + test:run + build) sobre el resultado del merge; solo publica si pasa. El merge manual
  del usuario deja de ser cuello de botella; las ramas que tocan `.github/**` siguen siendo
  merge humano (límite de GITHUB_TOKEN). Ver CLAUDE.md § Decisiones Arquitectónicas.
- 2026-07-18 (16:15 UTC): sexto disparo — Inbox `(vacío)`, sin triaje; trigger verificado contra
  `list_triggers` sin discrepancias (`trig_01NduNpiSB2NsJNuCPxmpQQp`, `last_fired_at` coincide con
  este tick); entorno verificado de nuevo con `npm install` + gate real en verde (lint ✅,
  test:run 143/143 ✅, build ✅) sobre el HEAD real de `main` (`15cebdb`, ya incluye el lote P1 y
  el peldaño 4 — confirmado con `git branch -r` + `git merge-base --is-ancestor` que las 6 ramas
  `claude/*` viejas ya están contenidas en `main`, sin trabajo huérfano). Auditoría de P2: el único
  ítem delegable sin decisión de usuario es el fix de `globalIgnores` de ESLint (los demás siguen
  bloqueados/estacionados — ver fila de abajo); tomado como el lote de este disparo (marcado 🔄).
  Corregido además el `Ancla de rollback` de CLAUDE.md, que seguía apuntando a `9c510d7` pese a que
  `main` ya llevaba el lote P1 y el peldaño 4 mergeados desde la sesión interactiva.
- 2026-07-18: **decisión del usuario — el Motor A-pool (despachadora + rutinas trabajadoras) es
  ahora el motor DEFAULT para proyectos nuevos, no una alternativa opcional.** Se retira de la
  consola todo el flujo de "instalar routine dedicada" como paso esperado tras crear un proyecto:
  quitada la sección "🏭 Instalar la routine" del dashboard (y el cálculo de `promptRoutine` que
  la alimentaba), y corregido el banner post-creación — ya NO dice "falta 1 paso, instala la
  routine (~1 min)"; ahora dice "ya está en el catálogo, la despachadora lo tomará sola". Motivo:
  con el pool activo, un proyecto nuevo no necesita ningún trigger propio — nace con el topic
  `fabrica-agentes` y sin `trigger_id`, y cualquier tick de `rutina-despachadora` (corriendo desde
  hoy, ver §4 Motor A-pool) lo descubre y asigna automáticamente. Cero trabajo manual. La routine
  DEDICADA (bloque A de `docs/plantilla-routine-prompt.md`, `parametrizarPromptRoutine` en
  `src/lib/routine-prompt.ts`) NO se elimina del código — sigue siendo una opción válida para
  proyectos con volumen propio sostenido (ej. la propia fabrica-consola, que la usa) — pero deja
  de ofrecerse/promoverse en la UI de la consola: quien la quiera, la crea a mano vía `/schedule`
  como ya se hizo aquí. `EstadoPool` (dashboard) queda como la única señal de estado del proyecto
  para quien no tiene routine dedicada.
- 2026-07-18: **`routine-madre-fabrica` actualizada a v4** (prompt reescrito en
  `docs/routine-madre-prompt.md` y aplicado en vivo al trigger real vía `RemoteTrigger`/`update`).
  Se retiran los PASOs 2-3 de v3 (preparar prompt de instalación de routine dedicada como tarea
  manual) — ya no aplican con el pool como default. Se agrega un PASO 4 nuevo: **despacho de
  emergencia para el pool** — si un proyecto SIN `trigger_id` tiene trabajo pendiente y ninguna
  rutina lo tiene asignado (`lock`), la madre (que corre cada hora) le asigna el `lock` ella misma
  a una `rutina-trabajadora-N` libre y la dispara con `fire_trigger` de inmediato — baja la
  latencia para proyectos recién creados o con feedback nuevo. El PASO 3 (despacho de routines
  DEDICADAS vía Inbox) se mantiene sin cambios. Historia completa de v1-v4 documentada en el
  propio `routine-madre-prompt.md`.
- 2026-07-18: **decisión del usuario — ciclo del pool reducido de 2h a 1h.** `rutina-despachadora`
  ahora corre a `:05` de cada hora, `rutina-trabajadora-1` a `:10`, `rutina-trabajadora-2` a `:40`
  (antes `*/2` en todos). Motivo: bajar la espera normal del pool sin chocar con el mínimo real de
  la plataforma de rutinas (1 tick/hora — confirmado con un 400 real al intentar `*/5 * * * *`,
  ningún cron por debajo de esa cadencia es válido). Actualizadas las constantes en `src/lib/
  cron.ts` (`CRON_DESPACHADORA_POOL`, `CRON_TRABAJADORAS_POOL`) para que `EstadoPool` siga
  calculando el countdown correcto.
- 2026-07-18: **botón "🔧 Asignar ahora" en el dashboard** (endpoint `/api/asignar-proyecto`,
  helper puro `trabajadorasLibres` en `src/lib/github.ts`). Como la consola no tiene acceso a
  `list_triggers`/`fire_trigger` (esa API requiere el token OAuth de la sesión de claude.ai, que
  nunca puede vivir en un servidor público), "trabajadora libre" se infiere leyendo el `lock` de
  todos los proyectos del catálogo — si ninguno tiene el nombre de una `rutina-trabajadora-N` con
  lock vigente, esa trabajadora está libre. El botón deja el proyecto ASIGNADO (escribe el `lock`)
  para que esa trabajadora lo tome en su PRÓXIMO tick normal — no lo dispara al instante; el
  usuario ve de inmediato "asignado a rutina-trabajadora-N — corre en ~X min" en vez de "esperando
  asignación". Visible solo para proyectos sin routine dedicada y sin asignación vigente.
- 2026-07-18 (18:15 UTC): séptimo disparo de `routine-fabrica-consola`. Anti-solape: último commit
  de `main` (`3155ca3`, ~28 min de antigüedad) sin working tree sucio ni worktrees huérfanos → tick
  procedió con normalidad. Auditoría de estado real (regla del prompt: corregir hechos
  documentados que no se puedan verificar): `main` había avanzado 20 commits desde la última ancla
  de rollback verificada (tick 16:15, `15cebdb`) sin que `CLAUDE.md` lo reflejara — el Motor A-pool
  completo (lock optimista, estado del pool en el dashboard, pool como motor DEFAULT, routine
  madre v4, botón "Asignar ahora", ciclo del pool a 1h) se implementó y mergeó a `main` en una
  sesión interactiva del usuario entre el cierre del tick anterior y este disparo — sin reporte de
  routine porque no la ejecutó la routine. Ya estaba narrado en los bullets de arriba, pero la
  tabla de Registro de trabajo y la Ancla de rollback de `CLAUDE.md` no tenían ninguna fila/mención
  — ambas corregidas en este tick. Hallazgo más importante: **la sección `📥 Inbox` de este mismo
  backlog no existía** pese a que el protocolo de cabecera, `CLAUDE.md` y seis reportes de tick
  previos (06:15 a 16:15 UTC) la daban por existente y "(vacío)" — ver la corrección exacta más
  arriba y la sección nueva agregada este tick. Entorno re-verificado con `npm install` + gate
  completo real: lint ✅, test:run **161/161** ✅ (subieron de 143 por el Motor A-pool), build ✅
  sobre Node v22.22.2. P1/P2 revisados ítem por ítem: sin trabajo nuevo delegable (mismos bloqueos
  por decisión de usuario que los ticks anteriores — ver Decisiones estacionadas). Reporte:
  `docs/reportes/2026-07-18-1815-rutina.md`.
- 2026-07-18 (20:15 UTC): octavo disparo — Inbox `(vacío)`, sin triaje; trigger verificado contra
  `list_triggers` sin discrepancias (`trig_01NduNpiSB2NsJNuCPxmpQQp`, `last_fired_at` coincide con
  este tick). `main` sin ramas huérfanas (solo `origin/main` en el remoto — todo el trabajo previo,
  incluido el lote del tick 18:15, ya está integrado). Entorno re-verificado con `npm ci` + gate
  real en verde (lint ✅, test:run **161/161** ✅, build ✅, Node v22.22.2). P1/P2 revisados ítem
  por ítem: sin trabajo nuevo delegable — mismo estado que documenta
  `docs/reportes/CAMPANA-2026-07-18-FINAL.md` (cerrada en el tick 16:15): las 5 P0 + 3 P1 en
  producción, único P2 accionable (fix ESLint/Vitest de worktrees) ya resuelto, el resto
  estacionado en espera de decisión del usuario. Ningún cambio de estado desde el tick anterior —
  no se reabre la campaña. Reporte: `docs/reportes/2026-07-18-2015-rutina.md`.
- 2026-07-18: **2 bugs corregidos en la creación de proyectos** (detectados por el usuario en
  `calculadora`, el primer proyecto real creado desde el formulario):
  1. **`CLAUDE.md` y `docs/TAREAS-MANUALES.md` nacían con los placeholders `<...>` del template
     SIN rellenar** (`<NOMBRE-PROYECTO>`, `<2-3 párrafos: qué hace...>`, comandos del gate, etc.)
     — el flujo de creación nunca ejecutaba el paso "Fase 1: cimientos" del método `/fabrica`.
     Fix: nuevo paso "cimientos" en `/api/crear-proyecto` (`personalizarClaudeMd` /
     `personalizarTareasManuales` en `src/lib/formulario-proyecto.ts`) que reemplaza los
     placeholders con dato no ambiguo (nombre, objetivo, stack, rama `main`, comandos reales del
     gate) justo después de crear el repo — no aborta la creación si falla, solo lo reporta.
  2. **"📝 Último reporte" mostraba `docs/reportes/README.md`** (el doc explicativo que viaja en
     el template) como si fuera un reporte real, porque el filtro solo exigía `.endsWith(".md")` y
     ese README es el único `.md` de la carpeta hasta el primer tick real. Fix: el dashboard ahora
     filtra por el patrón real de un reporte (`<YYYY-MM-DD>-...md`).
- 2026-07-18: **hallazgo adicional al corregir `calculadora` a mano**: los 7 agentes de
  `.claude/agents/` también nacían con `<NOMBRE-PROYECTO>` sin rellenar — el fix anterior del paso
  "cimientos" no los cubría. Corregido `calculadora` directamente (commit `2027af1` en ese repo) y
  extendido el paso "cimientos" de `/api/crear-proyecto` para que también reemplace el placeholder
  en los 7 agentes (`personalizarAgente` nueva en `src/lib/formulario-proyecto.ts`, 2 tests). Con
  esto, todo proyecto creado desde el formulario nace con sus cimientos (CLAUDE.md,
  TAREAS-MANUALES.md, y los 7 agentes) completamente libres de placeholders del template.
- 2026-07-18: **decisión del usuario — "expansión del requerimiento antes de implementar"** en
  `docs/plantilla-routine-prompt.md` (bloques A y B), motivada por un caso concreto: una feature
  cruda tipo "una calculadora con 20 dígitos y un botón de borrar" tomada LITERAL se satisface con
  una interfaz sin operaciones aritméticas — cumple la letra, incumple la intención evidente del
  objetivo ("Crea una calculadora..."). Nueva regla obligatoria para TODA tarea (no solo el primer
  tick): antes de implementar, la rutina lee `docs/SPECS.md` completo (el objetivo original, no
  solo el ítem P0 aislado), redacta ELLA MISMA criterios de aceptación que cubran la intención
  completa del dominio, y solo entonces delega al subagente 'implementador' — nunca le pasa el
  texto crudo del usuario esperando que él haga la expansión. Límite explícito: expandir intención
  ≠ agregar features no pedidas (gold-plating sigue prohibido, va a P1/P2 como sugerencia). Prompt
  real actualizado en vivo (`rutina-trabajadora-1` `trig_01TsS9F4RyUip1fnes4Usu8B` y
  `rutina-trabajadora-2` `trig_016W7TsmYFgbRx7ABgLQ21x9`, vía RemoteTrigger/update) — aplica desde
  ya al proyecto `calculadora`, que tiene el lock de `rutina-trabajadora-1` vigente.
- 2026-07-18 (22:15 UTC): noveno disparo de `routine-fabrica-consola` — auditoría encontró que los
  2 fixes de personalización de proyectos nuevos y la decisión "expansión del requerimiento"
  (mergeados directo a `main` por la sesión interactiva entre el tick de 20:15 y este) no tenían
  fila en el Registro de trabajo ni el `CLAUDE.md` § Ancla de rollback los reflejaba. Corregido
  (ver filas nuevas abajo y CLAUDE.md). Gate real en verde sobre el HEAD actual: lint ✅, test:run
  **168/168** ✅ (subieron de 161), build ✅. Sin trabajo P1/P2 nuevo delegable.
- 2026-07-18 (~19:47 UTC): **bug de producción corregido en `fabrica-sync.yml` — Vercel bloqueaba
  en silencio el deploy de proyectos hijos.** Detectado por el usuario en `calculadora` (el primer
  proyecto real): el código llegaba a `main` correctamente vía `fabrica-sync`, pero el sitio en
  vivo nunca se actualizaba, mostrando siempre el placeholder del template. Causa: el workflow
  commiteaba con un email inventado (`fabrica-sync@users.noreply.github.com`, sin cuenta de GitHub
  real detrás) — Vercel exige que el email del autor del commit se pueda vincular a un colaborador
  del repo para disparar el deploy automático, y lo rechazaba sin error visible. Fix: usar el email
  noreply REAL de GitHub del dueño de la fábrica (`262635924+rifc23@users.noreply.github.com`).
  Mismo fix aplicado al template (`fabrica-agentes-template`, commit `979bc75`) para que los
  proyectos nuevos nazcan sin este bug. Mergeado directo a `main` por la sesión interactiva
  (`2b8e8dd` sobre `.github/workflows/fabrica-sync.yml`, integrado en `21f0792`) — toca `.github/**`,
  así que `fabrica-sync` no podía auto-mergearlo. Documentado como Error Conocido nuevo en
  `CLAUDE.md` (no encajaba en ninguno de los 5 existentes: es sobre el AUTOR del commit de sync,
  no sobre permisos de push ni sobre el contenido del repo).
- 2026-07-19 (00:15 UTC): décimo disparo de `routine-fabrica-consola`. Anti-solape: último commit
  de `main` (`21f0792`, ~27 min de antigüedad) sin working tree sucio ni worktrees/ramas huérfanas
  (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox: `(vacío)` →
  sin triaje. Auditoría de estado real: confirmado que el lote del tick 22:15
  (`claude/rutina-2026-07-18-2215-auditoria`) sí se mergeó vía `fabrica-sync` (`7e4764f`) — la fila
  correspondiente en el Registro de trabajo decía "pendiente de push", corregida abajo. Hallazgo
  nuevo (no reflejado en `CLAUDE.md` ni en este Registro): el fix de email de `fabrica-sync.yml`
  (`2b8e8dd`/`21f0792`, ver bullet de arriba) — mismo patrón de "merge directo sin fila" de ticks
  anteriores, corregido en este tick con la fila nueva abajo y el Error Conocido nuevo en
  `CLAUDE.md`. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run
  **168/168** ✅ (sin cambio — el fix es YAML puro, sin cobertura de vitest), build ✅ (Next.js
  16.2.10/Turbopack, Node v22.22.2). P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin
  ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado
  instantáneo y Playwright E2E siguen estacionados en "Decisiones estacionadas [USUARIO]", Motor B
  no es v1, promover `tipo:"gem"` sigue condicionado a un segundo tipo de proyecto). Solo
  documentación.
- 2026-07-19 (02:15 UTC): undécimo disparo de `routine-fabrica-consola`. Anti-solape: último commit
  de `main` (`9670efd`, ~2h de antigüedad) sin working tree sucio ni worktrees/ramas huérfanas →
  tick procedió con normalidad. Inbox: `(vacío)` → sin triaje. Auditoría de estado real: la fila
  del tick 00:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync`
  ya la había integrado en `9670efd` (autoreferencial: el push de ese mismo tick fue lo que generó
  el commit que la ancla anterior citaba como base) — corregida, junto con la ancla de rollback de
  `CLAUDE.md`. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run
  **168/168** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). P0/P1 sin
  cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos
  por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E siguen
  estacionados en "Decisiones estacionadas [USUARIO]", Motor B no es v1, promover `tipo:"gem"`
  sigue condicionado a un segundo tipo de proyecto). Solo documentación.
- 2026-07-19 (~00:44–00:11 UTC, sesión interactiva del usuario): **plan de arquitectura aprobado —
  proxy central de IA (`fabrica-ia-proxy`)** para que Gems y futuros proyectos consumidores de LLM
  (ej. "tickets con OCR") usen un token de proyecto propio en vez de pegar la key real del
  proveedor a mano en cada repo hijo. Documento completo en `docs/plan-proxy-ia-central.md`
  (`a0366c1`) — el propio documento aclara "no modifica CLAUDE.md/backlog/código, solo este
  documento; la implementación es trabajo futuro". Decisiones del usuario ya resueltas ahí: repo
  nuevo `fabrica-ia-proxy` (privado, fuera del template de agentes, SIN `.fabrica.json`/routine —
  no es un "proyecto de la fábrica", es infraestructura), Gemini como proveedor default (sin
  adaptador doble en v1), gobernanza **manual/interactiva sin routine automática** (razón
  explícita del usuario: secreto de IA compartido por TODOS los proyectos hijos, más sensible que
  cualquier proyecto existente — el patrón de peldaño 4/gate-de-CI-reemplaza-revisión-humana no
  está probado todavía a ese nivel de sensibilidad). Paquete 1 (repo+servicio del proxy) es
  autocontenido y NO toca `fabrica-consola`; Paquete 2 (integración — campo `usaProxyIA` en el
  formulario, nuevo paso en `crear-proyecto/route.ts`, `IA_PROXY_ADMIN_TOKEN`/`IA_PROXY_URL`) SÍ
  toca este repo pero está explícitamente bloqueado hasta que el Paquete 1 esté "verificado en
  producción de forma independiente" — fuera del alcance de `routine-fabrica-consola` mientras la
  gobernanza siga siendo manual (ni el repo `fabrica-ia-proxy` está en el scope de GitHub de esta
  sesión ni la decisión del usuario autoriza automatizar esta pieza). Sin acción de este tick más
  allá de documentar el commit en el Registro de trabajo (no tenía fila, mismo patrón de "merge
  directo sin registro" de ticks anteriores) — no hay tarea delegable aquí para P1/P2 hasta que el
  usuario o una sesión interactiva impulse el Paquete 1.
- 2026-07-19 (04:15 UTC): duodécimo disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`a0366c1`, ~4 min de antigüedad) NO coincide con el patrón de merges/reportes
  propios de esta routine (es un commit de doc de arquitectura de la sesión interactiva del
  usuario, ver bullet de arriba) y el working tree/worktrees estaban limpios → tick procedió con
  normalidad. Inbox: `(vacío)` → sin triaje. Auditoría de estado real: único hallazgo, el commit
  `a0366c1` (plan del proxy de IA) sin fila en el Registro de trabajo — agregada abajo junto con el
  bullet de arriba. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run
  **168/168** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). P0/P1 sin
  cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos
  por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E siguen
  estacionados en "Decisiones estacionadas [USUARIO]", Motor B no es v1, promover `tipo:"gem"`
  sigue condicionado a un segundo tipo de proyecto, y ahora el proxy de IA Paquete 1/2 se suma a la
  lista de "aprobado pero fuera del alcance autónomo de esta routine por gobernanza explícita del
  usuario"). Solo documentación.
- 2026-07-19 (~00:19 UTC, sesión interactiva del usuario): **2 bugs de producción corregidos en la
  creación de proyectos**, detectados por el usuario al crear un proyecto real: (1) GitHub rechaza
  con 422 ("Description control characters are not allowed") cualquier repo cuya `description`
  traiga saltos de línea/tabs — el objetivo del formulario es un textarea multilínea y viajaba con
  solo `.slice(0, 200)`, sin sanitizar; fix: `descripcionRepoDesdeObjetivo` (función pura nueva en
  `src/lib/formulario-proyecto.ts`, con tests) sanea caracteres de control antes de usarlo como
  `description`. (2) Tras ese error, el formulario ocultaba el `<form>` por completo
  (`enviando=true`) sin forma de volver a verlo — el usuario quedaba atascado, y solo recargar la
  página recuperaba el formulario, lo cual borraba de verdad lo escrito (estado solo en memoria);
  fix: botón "Volver al formulario" en `ProgresoCreacion` (restaura `enviando=false` sin tocar
  estado) + persistencia del borrador en `localStorage` en cada cambio
  (`src/lib/borrador-nuevo-proyecto.ts`, funciones puras + 9 tests; se borra al crear con éxito).
  Ambos mergeados directo a `main` por la sesión interactiva (no pasan por `fabrica-sync`). Sin fila
  en el Registro de trabajo ni mención en `CLAUDE.md` § Ancla de rollback — mismo patrón de "merge
  directo sin registro" de ticks anteriores, corregido en el tick 06:15 UTC (ver filas nuevas abajo
  y ancla actualizada).
- 2026-07-19 (06:15 UTC): decimotercer disparo de `routine-fabrica-consola`. Anti-solape: `main`
  estaba 67 commits detrás del local (`git fetch` + fast-forward); el commit más reciente de origin
  (`df8c9db`, ~1h49min de antigüedad en el momento del fetch) no coincidía con el patrón propio de
  esta routine (merge de sesión interactiva) y el working tree/worktrees estaban limpios sin ramas
  huérfanas (`git branch -r` solo `origin/main`) → tick procedió con normalidad. Inbox: `(vacío)` →
  sin triaje. Auditoría de estado real: los 2 merges directos descritos arriba (sanitización de
  `description` + no perder el formulario) sin fila en el Registro de trabajo — agregadas abajo.
  Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (subieron
  de 168 por los 35 tests nuevos de ambos fixes), build ✅ (Next.js 16.2.10/Turbopack). P0/P1 sin
  cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por
  decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados,
  Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes
  1/2 fuera del alcance autónomo por gobernanza explícita). Solo documentación.
- 2026-07-19 (08:15 UTC): decimocuarto disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`a66088a`, ~1h57min de antigüedad en el momento del fetch) es el merge de
  `fabrica-sync` del propio tick anterior (06:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanas (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox:
  `(vacío)` → sin triaje. Auditoría de estado real: único hallazgo, la `Ancla de rollback` de
  `CLAUDE.md` seguía apuntando a `df8c9db` pese a que `main` ya incluye el merge de `fabrica-sync`
  del tick 06:15 (`c9a79b2`/`a66088a`, un commit de documentación del propio tick anterior, sin
  código nuevo) — corregida abajo. Entorno re-verificado con `npm ci` + gate real en verde: lint
  ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2).
  P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos
  bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E
  estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de
  IA Paquetes 1/2 fuera del alcance autónomo por gobernanza explícita). Solo documentación.
- 2026-07-19 (10:15 UTC): decimoquinto disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`16fc65e`, ~1h57min de antigüedad) es el merge de `fabrica-sync` del propio
  tick anterior (08:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanas (`git branch -r`
  solo devuelve `origin/main`) → tick procedió con normalidad. Inbox: `(vacío)` → sin triaje.
  Auditoría de estado real: único hallazgo, la fila del tick 08:15 UTC en el Registro de trabajo
  decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `16fc65e` — corregida
  abajo, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `a66088a`, un commit
  desactualizada). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run
  **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md`
  revisado: sin tareas nuevas, solo la 🟡 3 (diseño/nombre) sigue pendiente sin bloquear. P0/P1 sin
  cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por
  decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados,
  Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2
  fuera del alcance autónomo por gobernanza explícita). Solo documentación.
- 2026-07-19 (~10:52 UTC, sesión interactiva/routine madre): **hallazgo estructural — `fire_trigger`
  no puede disparar ningún trigger real de la fábrica**, documentado en
  `docs/reportes/EXPERIMENTO-ROUTINE-MADRE-FALLIDO.md` (`39bf9e4`, mergeado directo a `main`, no pasa
  por `fabrica-sync`). Causa: todos los triggers reales se crean desde la UI de routines
  (`http_api`), y `fire_trigger` solo permite a un agente disparar triggers que ÉL MISMO creó vía
  `create_trigger` — la madre nunca instala routines, así que no puede disparar ninguna. Rompe el
  despacho instantáneo del PASO 4 (pool) y PASO 3 (dedicadas) de `routine-madre-fabrica` v4: el
  `lock` sí se asigna (usa la API de GitHub, no `fire_trigger`), pero el disparo acelerado no ocurre
  — cada proyecto solo avanza en su tick normal de cron. Afecta directamente promesas documentadas en
  este mismo backlog y en `CLAUDE.md` § Decisiones Arquitectónicas/Errores Conocidos (latencia "≤1h"
  del despachador) — corregidas en este tick (ver fila nueva abajo y nueva Decisión estacionada). No
  se modifica `docs/routine-madre-prompt.md` desde esta routine: no es su territorio (prompt de OTRA
  routine) y el fix requiere decidir un mecanismo de reemplazo, no solo anotar el hallazgo.
- 2026-07-19 (12:15 UTC): decimosexto disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`39bf9e4`, ~1h21min de antigüedad) es de la sesión interactiva del usuario (no un
  patrón propio de esta routine) sin working tree sucio ni ramas/worktrees huérfanas (`git branch -r`
  solo devuelve `origin/main`) → tick procedió con normalidad. Inbox: `(vacío)` → sin triaje.
  Auditoría de estado real: el hallazgo de `fire_trigger` de arriba, sin fila en el Registro de
  trabajo ni reflejo en `CLAUDE.md` — agregado (ver bullet de arriba, fila nueva abajo, nueva
  Decisión estacionada y correcciones en CLAUDE.md § Decisiones Arquitectónicas/Errores Conocidos).
  También corregida la fila del tick 10:15 UTC, que decía "pendiente de push" pese a que
  `fabrica-sync` ya la había integrado en `e4f2a49`. Entorno re-verificado con `npm ci` + gate real
  en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node
  v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin
  bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables —
  mismos bloqueos por decisión de usuario que ticks anteriores, más el mecanismo de reemplazo de
  `fire_trigger` (nuevo, no es tarea de código de este repo).
- 2026-07-19 (14:15 UTC): decimoséptimo disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`dfcc726`, ~1h54min de antigüedad en el momento del fetch) es el merge de
  `fabrica-sync` del propio tick anterior (12:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox:
  `(vacío)` → sin triaje. Auditoría de estado real: único hallazgo, la fila del tick 12:15 UTC en
  el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado
  en `dfcc726` — corregida, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a
  `39bf9e4`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run
  **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2).
  `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear.
  P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos
  bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E
  estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de
  IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión
  del usuario). Solo documentación.
- 2026-07-19 (16:15 UTC): decimoctavo disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`418a36c`, ~1h57min de antigüedad en el momento del fetch) es el merge de
  `fabrica-sync` del propio tick anterior (14:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox:
  `(vacío)` → sin triaje. Auditoría de estado real: único hallazgo, la fila del tick 14:15 UTC en
  el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado
  en `418a36c` — corregida, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a
  `dfcc726`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run
  **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2).
  `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear.
  P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos
  bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E
  estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de
  IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión
  del usuario). Solo documentación.
- 2026-07-19 (18:15 UTC): decimonoveno disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`54d13da`, ~1h56min de antigüedad en el momento del fetch) es el merge de
  `fabrica-sync` del propio tick anterior (16:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox:
  `(vacío)` → sin triaje. Auditoría de estado real: único hallazgo, la fila del tick 16:15 UTC en
  el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado
  en `54d13da` — corregida, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a
  `418a36c`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run
  **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2).
  `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear.
  P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos
  bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E
  estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de
  IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión
  del usuario). Solo documentación.
- 2026-07-19 (20:15 UTC): vigésimo disparo de `routine-fabrica-consola`. Anti-solape: último commit
  de `main` (`be06ae1`, ~1h57min de antigüedad en el momento del fetch) es el merge de
  `fabrica-sync` del propio tick anterior (18:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox:
  `(vacío)` → sin triaje. Auditoría de estado real: único hallazgo, la fila del tick 18:15 UTC en
  el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado
  en `be06ae1` — corregida, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a
  `54d13da`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run
  **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2).
  `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear.
  P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos
  bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E
  estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de
  IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión
  del usuario). Este es el noveno disparo consecutivo (desde el tick 12:15 UTC del 2026-07-18) sin
  trabajo P1/P2 nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario;
  no se reabre campaña porque no es un estado nuevo, solo su continuación. Solo documentación.
- 2026-07-19 (22:15 UTC): vigésimo primer disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`f6af442`, ~1h57min de antigüedad en el momento del fetch) es el merge de
  `fabrica-sync` del propio tick anterior (20:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox
  `(vacío)` sin triaje. Único hallazgo: la fila del tick 20:15 UTC en el Registro de trabajo decía
  "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `f6af442` — corregida. Sin
  trabajo P1/P2 nuevo delegable — mismos bloqueos por decisión de usuario que ticks anteriores
  (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a
  un segundo tipo de proyecto, proxy de IA Paquetes 1 y 2 fuera del alcance autónomo, y el mecanismo
  de reemplazo de `fire_trigger` para el despacho instantáneo, que sigue sin decisión del usuario).
  Décimo tick consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo nuevo delegable — la cola sigue
  vacía de ítems accionables sin decisión del usuario.
- 2026-07-20 (00:15 UTC): vigésimo segundo disparo de `routine-fabrica-consola`. Anti-solape:
  último commit de `main` (`e85528a`, ~1h57min de antigüedad en el momento del fetch) es el merge
  de `fabrica-sync` del propio tick anterior (22:15 UTC del 2026-07-19) — sin working tree sucio ni
  ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con
  normalidad. Inbox `(vacío)` sin triaje. Único hallazgo: la fila del tick 22:15 UTC en el Registro
  de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en
  `e85528a` — corregida, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a
  `f6af442`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run
  **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2).
  `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear.
  P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos
  bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E
  estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de
  IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión
  del usuario). Undécimo disparo consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo nuevo
  delegable — la cola sigue vacía de ítems accionables sin decisión del usuario.
- 2026-07-20 (02:15 UTC): vigésimo tercer disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`2473392`, ~1h57min de antigüedad en el momento del fetch) es el merge de
  `fabrica-sync` del propio tick anterior (00:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox
  `(vacío)` sin triaje. Único hallazgo: la fila del tick 00:15 UTC en el Registro de trabajo decía
  "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `2473392` — corregida.
  Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin
  cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin
  tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. Sin trabajo P1/P2 nuevo delegable —
  mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright
  E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto,
  proxy de IA Paquetes 1 y 2 fuera del alcance autónomo, y el mecanismo de reemplazo de
  `fire_trigger` para el despacho instantáneo, que sigue sin decisión del usuario). Duodécimo tick
  consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo nuevo delegable — la cola sigue vacía de
  ítems accionables sin decisión del usuario.
- 2026-07-20 (04:15 UTC): vigésimo cuarto disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`cb220ec`, ~1h57min de antigüedad en el momento del fetch) es el merge de
  `fabrica-sync` del propio tick anterior (02:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox
  `(vacío)` sin triaje. Único hallazgo: la fila del tick 02:15 UTC en el Registro de trabajo decía
  "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `cb220ec` — corregida.
  Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin
  cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin
  tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. Sin trabajo P1/P2 nuevo delegable —
  mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright
  E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto,
  proxy de IA Paquetes 1 y 2 fuera del alcance autónomo, y el mecanismo de reemplazo de
  `fire_trigger` para el despacho instantáneo, que sigue sin decisión del usuario). Décimo tercer
  tick consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo nuevo delegable — la cola sigue vacía
  de ítems accionables sin decisión del usuario.
- 2026-07-20 (06:15 UTC): vigésimo quinto disparo de `routine-fabrica-consola`. Anti-solape:
  último commit de `main` (`d0fb9c0`, ~1h57min de antigüedad en el momento del fetch) es el merge
  de `fabrica-sync` del propio tick anterior (04:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox
  `(vacío)` sin triaje. Único hallazgo: la fila del tick 04:15 UTC en el Registro de trabajo decía
  "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `d0fb9c0` — corregida.
  Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin
  cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin
  tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. Sin trabajo P1/P2 nuevo delegable —
  mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright
  E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto,
  proxy de IA Paquetes 1 y 2 fuera del alcance autónomo, y el mecanismo de reemplazo de
  `fire_trigger` para el despacho instantáneo, que sigue sin decisión del usuario). Décimo cuarto
  tick consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo nuevo delegable — la cola sigue vacía
  de ítems accionables sin decisión del usuario.
- 2026-07-20 (08:15 UTC): vigésimo sexto disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`54e9241`, ~1h57min de antigüedad en el momento del fetch) es el merge de
  `fabrica-sync` del propio tick anterior (06:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox
  `(vacío)` sin triaje. Único hallazgo: la fila del tick 06:15 UTC en el Registro de trabajo decía
  "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `54e9241` — corregida. Sin
  trabajo P1/P2 nuevo delegable — mismos bloqueos por decisión de usuario que ticks anteriores
  (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a
  un segundo tipo de proyecto, proxy de IA Paquetes 1 y 2 fuera del alcance autónomo, y el mecanismo
  de reemplazo de `fire_trigger` para el despacho instantáneo, que sigue sin decisión del usuario).
  Décimo quinto tick consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo nuevo delegable — la cola
  sigue vacía de ítems accionables sin decisión del usuario.
- 2026-07-20 (10:15 UTC): vigésimo séptimo disparo de `routine-fabrica-consola`. Anti-solape:
  último commit de `main` (`db90d09`, ~1h56min de antigüedad en el momento del fetch) es el merge
  de `fabrica-sync` del propio tick anterior (08:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox
  `(vacío)` sin triaje. Único hallazgo: la fila del tick 08:15 UTC en el Registro de trabajo decía
  "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `db90d09` — corregida.
  Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin
  cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). Sin trabajo P1/P2 nuevo delegable —
  mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright
  E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto,
  proxy de IA Paquetes 1 y 2 fuera del alcance autónomo, y el mecanismo de reemplazo de
  `fire_trigger` para el despacho instantáneo, que sigue sin decisión del usuario). Décimo sexto
  tick consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo nuevo delegable — la cola sigue vacía
  de ítems accionables sin decisión del usuario.
- 2026-07-20 (12:15 UTC): vigésimo octavo disparo de `routine-fabrica-consola`. Anti-solape:
  último commit de `main` (`f21a4fa`, ~1h56min de antigüedad en el momento del fetch) es el merge
  de `fabrica-sync` del propio tick anterior (10:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox
  `(vacío)` sin triaje. Único hallazgo: la fila del tick 10:15 UTC en el Registro de trabajo decía
  "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `f21a4fa` — corregida, junto
  con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `db90d09`). Entorno re-verificado
  con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅
  (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas,
  solo la 🟡 3 sigue pendiente sin bloquear. Sin trabajo P1/P2 nuevo delegable — mismos bloqueos por
  decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados,
  Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1
  y 2 fuera del alcance autónomo, y el mecanismo de reemplazo de `fire_trigger` para el despacho
  instantáneo, que sigue sin decisión del usuario). Décimo séptimo tick consecutivo (desde
  2026-07-18 12:15 UTC) sin trabajo nuevo delegable — la cola sigue vacía de ítems accionables sin
  decisión del usuario.
- 2026-07-20 (14:15 UTC): vigésimo noveno disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`57cbc2e`, ~1h55min de antigüedad en el momento del fetch) es el merge de
  `fabrica-sync` del propio tick anterior (12:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox
  `(vacío)` sin triaje. Único hallazgo: la fila del tick 12:15 UTC en el Registro de trabajo decía
  "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `57cbc2e` — corregida.
  Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin
  cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin
  tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2
  revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que
  ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1,
  `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1 y 2 fuera del
  alcance autónomo, y el mecanismo de reemplazo de `fire_trigger` para el despacho instantáneo, que
  sigue sin decisión del usuario). Décimo octavo tick consecutivo (desde 2026-07-18 12:15 UTC) sin
  trabajo nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario.
- 2026-07-20 (16:15 UTC): trigésimo disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`9a5345b`, ~1h57min de antigüedad) es el merge de `fabrica-sync` del tick
  anterior (14:15 UTC) sin working tree sucio ni ramas/worktrees huérfanos → tick procedió con
  normalidad. Inbox `(vacío)` sin triaje. Único hallazgo: la fila del tick 14:15 UTC en el Registro
  de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en
  `9a5345b` — corregida. Gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅
  (Next.js 16.2.10/Turbopack, Node v22.22.2). Sin trabajo P1/P2 nuevo delegable — mismos bloqueos
  por decisión de usuario que ticks anteriores. Décimo noveno tick consecutivo (desde 2026-07-18
  12:15 UTC) sin trabajo nuevo delegable — la cola sigue vacía de ítems accionables sin decisión
  del usuario.
- 2026-07-24 (08:15 UTC): trigésimo primer disparo de `routine-fabrica-consola`. Anti-solape:
  `git fetch origin main` sin cambios respecto al HEAD local (`2807634`, el merge de `fabrica-sync`
  del tick 16:15 UTC del 2026-07-20) — working tree limpio, sin worktrees/ramas huérfanas
  (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox `(vacío)` sin
  triaje. Único hallazgo en el propio backlog: la fila del tick 16:15 UTC (2026-07-20) en el
  Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en
  `2807634` — corregida abajo. **Hallazgo operativo nuevo, distinto a los de ticks anteriores:**
  entre ese tick (2026-07-20 16:15 UTC) y este (2026-07-24 08:15 UTC) pasaron ~88 horas sin un solo
  commit nuevo en `main` ni un solo reporte en `docs/reportes/` — con la cadencia `15 */2 * * *`
  (cada 2h) debieron ocurrir ~44 disparos en ese lapso, y ninguno dejó rastro (tampoco ningún
  `*-rutina-SALTADA.md` del PASO 0, que sí habría explicado un salto intencional por anti-solape).
  Verificado vía `list_triggers`: el trigger `trig_01NduNpiSB2NsJNuCPxmpQQp` sigue `enabled: true`,
  sin `suspension_reason`, `next_run_at` consistente con el cron normal, y `updated_at` idéntico a
  `created_at` (2026-07-18) — es decir, nada indica que el usuario lo haya deshabilitado ni que la
  plataforma lo marque suspendido; simplemente no hay evidencia de que haya disparado en ese lapso.
  No se puede determinar la causa raíz desde este repo (es infraestructura de la plataforma de
  routines, no código de `fabrica-consola`) — se documenta como hallazgo puro, sin acción de código
  posible, y se notifica al usuario fuera de banda por si quiere revisarlo (podría afectar también a
  `rutina-despachadora`/`rutina-trabajadoras`/`routine-madre-fabrica`, que este repo no puede
  auditar). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅
  (sin cambio), build ✅ (Next.js 16.2.10/Turbopack). `TAREAS-MANUALES.md` revisado: sin tareas
  nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado
  ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que el tick
  anterior (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"`
  condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo,
  mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Solo documentación.
- 2026-07-24 (10:15 UTC): trigésimo segundo disparo. La cadencia del cron volvió a la normalidad
  (este tick disparó ~2h después del anterior, como espera `15 */2 * * *`) — el gap de ~88h
  reportado por el tick de las 08:15 UTC no se repitió; se mantiene documentado como hallazgo sin
  causa raíz confirmada, no como problema recurrente. Único trabajo del tick: corregir la fila del
  Registro de trabajo del tick 08:15 UTC (ya mergeada en `906a023`, no "pendiente de push") y la
  ancla de rollback de `CLAUDE.md`. Gate real en verde (lint ✅, test:run 182/182 ✅, build ✅). Sin
  Inbox, sin P0/P1/P2 nuevo delegable — mismos bloqueos por decisión de usuario de siempre (ver
  Decisiones estacionadas). Vigésimo primer tick consecutivo (desde 2026-07-18 12:15 UTC) sin
  trabajo nuevo delegable.
- 2026-07-24 (12:15 UTC): trigésimo tercer disparo. Anti-solape: último commit de `main`
  (`426d99b`, ~1h56min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del
  tick anterior (10:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r`
  solo devuelve `origin/main`) → tick procedió con normalidad. Inbox `(vacío)` sin triaje.
  Auditoría de estado real: dos hallazgos. (1) la fila del tick 10:15 UTC en el Registro de
  trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `426d99b`
  — corregida abajo, junto con la `Ancla de rollback` de `CLAUDE.md`. (2) **hallazgo nuevo**: una
  línea huérfana `- (vacío)` al final de esta misma sección "Estado general" (justo antes del
  encabezado `## 📥 Inbox`), sin relación con ningún ítem — arrastrada desde el commit `68f23dd`
  (tick 18:15 UTC del 2026-07-18, cuando se agregó la sección Inbox real) y sin detectar durante
  ~24 ticks consecutivos. No afectaba el parsing (`insertarEnInbox` exige el encabezado `##.*Inbox`,
  y esta línea vive antes de él) ni el conteo de checkboxes del Brief, pero era ruido documental
  incorrecto — eliminada en este tick. Gate real en verde: lint ✅, test:run **182/182** ✅ (sin
  cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin
  tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2
  revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que
  ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1,
  `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del
  alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Vigésimo
  segundo tick consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo P1/P2 nuevo delegable — la cola
  sigue vacía de ítems accionables sin decisión del usuario.
- 2026-07-24 (14:15 UTC): trigésimo cuarto disparo — Inbox `(vacío)` sin triaje. Anti-solape:
  último commit de `main` (`25d08b4`, ~1h55min de antigüedad en el momento del fetch) es el merge
  de `fabrica-sync` del propio tick anterior (12:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Único
  hallazgo: la fila del tick 12:15 UTC en el Registro de trabajo decía "pendiente de push" pese a
  que `fabrica-sync` ya la había integrado en `25d08b4` — corregida, junto con la `Ancla de
  rollback` de `CLAUDE.md`. Gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio),
  build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas
  nuevas, solo la 🟡 3 sigue pendiente sin bloquear. Sin trabajo P0/P1/P2 nuevo delegable — mismos
  bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E
  estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de
  IA Paquetes 1 y 2 fuera del alcance autónomo, y el mecanismo de reemplazo de `fire_trigger` para
  el despacho instantáneo, que sigue sin decisión del usuario). Vigésimo tercer tick consecutivo
  (desde 2026-07-18 12:15 UTC) sin trabajo nuevo delegable — la cola sigue vacía de ítems
  accionables sin decisión del usuario.
- 2026-07-24 (16:15 UTC): trigésimo quinto disparo — **rompe la racha de 23 ticks sin trabajo
  delegable: `npm audit` reveló 3 vulnerabilidades de severidad ALTA** (9 CVEs propios de
  `next@16.2.10` — bypass de middleware/proxy Turbopack, DoS en Server Actions, SSRF en Server
  Actions y rewrites, confusión de caché de response bodies x2, payload sin límite en Edge, DoS en
  Image Optimization vía SVG, exposición no autenticada de Server Functions — más `postcss` y
  `sharp` transitivas). Delegado a un subagente `implementador` en worktree: bump de PATCH
  `next` `16.2.10` → `16.2.11` (elimina las 9 CVEs propias de Next; `postcss`/`sharp` quedan
  pineadas por el propio Next y no se resuelven así — ver fila nueva en P2 arriba, incluida la
  advertencia de que `npm audit fix --force` intenta downgradear next a `9.3.3` y EMPEORA todo a 92
  vulnerabilidades, probado y revertido por el subagente). Verificado el diff (solo `package.json`
  +`package-lock.json`, 2+80 líneas) y corrido el gate completo YO MISMO sobre el resultado en
  `claude/rutina-2026-07-24-1615-security-patch`: lint ✅, test:run **182/182** ✅ (sin cambio),
  build ✅ (Next.js 16.2.11/Turbopack, Node v22.22.2). Toca `package.json`/`package-lock.json`
  (código, no solo `docs/**`/`CLAUDE.md`/`.fabrica.json`) → **no auto-mergeable por
  `fabrica-sync`, pendiente de merge manual del usuario** (peldaño 3). Anti-solape: `main` en
  `eb1990a` (~1h56min de antigüedad, sync del tick 14:15) sin working tree sucio ni ramas/worktrees
  huérfanos antes de empezar → tick procedió con normalidad. Inbox `(vacío)` sin triaje.
  `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear.
- 2026-07-24 (18:15 UTC): trigésimo sexto disparo. **Corrección al registro del tick anterior
  (16:15 UTC):** ese tick declaró el bump de seguridad de Next.js "no auto-mergeable por
  `fabrica-sync`, pendiente de merge manual (peldaño 3)" sin verificarlo contra el workflow real —
  `.github/workflows/fabrica-sync.yml` no tiene ninguna excepción para `package.json`/
  `package-lock.json`: el peldaño 4 mergea CUALQUIER diff de código tras el gate en CI. `fabrica-sync`
  SÍ lo auto-mergeó (`9d44feb`, "peldaño 4 — gate completo en verde en CI"). Mismo patrón de "hecho
  declarado sin verificar" que la regla del tick 18:15 UTC del 2026-07-18 pide corregir — fila del
  Registro de trabajo corregida. **Segundo hallazgo:** entre el cierre de ese tick y este, una sesión
  interactiva del usuario implementó y mergeó directo a `main` un pedido de 2026-07-19 — panel
  colapsable con `docs/SPECS.md` al inicio del dashboard de cada proyecto, para ver de un vistazo con
  qué formulario/specs se creó (`84a6b87`/`b177025`) — sin fila en el Registro ni mención en
  `CLAUDE.md`; agregada fila y actualizada la ancla de rollback. Inbox `(vacío)` sin triaje. Gate real
  en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack, Node
  v22.22.2; `npm audit` sigue en 3 vulnerabilidades altas de `postcss`/`sharp` pineadas por Next, sin
  acción disponible — ver P2, sin cambio desde el tick 16:15). `TAREAS-MANUALES.md` revisado: sin
  tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2
  revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que
  ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1,
  `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance
  autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario).
- 2026-07-24 (22:15 UTC): trigésimo octavo disparo — Inbox `(vacío)` sin triaje. Corregida la fila
  del tick 20:15 UTC (ya mergeada por `fabrica-sync` en `8bc1fda`, no "pendiente"). Hallazgo nuevo:
  `npm audit --audit-level=high` subió de 3 a 12 vulnerabilidades altas — 9 de `brace-expansion`
  (GHSA-mh99-v99m-4gvg) por la cadena de tooling de lint (`eslint`/`eslint-config-next`). Delegado a
  un subagente `implementador` en worktree; investigó con repro-primero y descartó un fix seguro:
  la única corrección real (`brace-expansion@5.0.8`) rompe `npm run lint` en la rama que usa
  `eslint@9.39.5` (API vieja de `minimatch@3.1.5`), y el único camino sin romper nada es un bump
  MAYOR de `eslint` a `10.8.0` — que la tarea delegada prohibió explícitamente por riesgo. El
  subagente revirtió todo sin commit (working tree limpio) en vez de dejar un fix parcial o roto.
  Nuevo ítem P2 + pregunta estacionada para el usuario (ver abajo). Sin código nuevo en producción
  este tick — solo documentación. Gate real en verde sobre el HEAD real de `main` (sin el intento
  revertido): lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack,
  Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin
  bloquear. P0/P1 sin cambios (todo `[x]`). Reporte: `docs/reportes/2026-07-24-2215-rutina.md`.
- 2026-07-25 (00:15 UTC): trigésimo noveno disparo de `routine-fabrica-consola`. Anti-solape:
  último commit de `main` (`45ec0f1`, ~1h48min de antigüedad en el momento del fetch) es el merge
  de `fabrica-sync` del propio tick anterior (22:15 UTC del 2026-07-24) — sin working tree sucio ni
  ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con
  normalidad. Inbox `(vacío)` sin triaje. Auditoría de estado real: dos filas del Registro de
  trabajo (ticks 18:15 y 22:15 UTC del 2026-07-24) decían "pendiente de push"/"pendiente de
  fabrica-sync" pese a que `fabrica-sync` ya las había integrado (`04ab8a1` y `45ec0f1`
  respectivamente) — corregidas, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando
  a `8bc1fda`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run
  **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack, Node v22.22.2). `npm audit
  --audit-level=high` sigue en **12** vulnerabilidades altas (3 `postcss`/`sharp` pineadas por
  Next, 9 `brace-expansion` por la cadena de `eslint`), sin cambio desde el tick 22:15 — ambas sin
  acción de código posible sin decisión del usuario (ver P2/Decisiones estacionadas). `TAREAS-MANUALES.md`
  revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo
  `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de
  usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es
  v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, `postcss`/`sharp` pineados por Next
  sin acción posible, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario, cadencia de
  `rutina-trabajadora-1` sin decisión del usuario, bump mayor de `eslint` sin decisión del usuario).
  Vigésimo quinto tick consecutivo con solo housekeeping documental — sin trabajo de código nuevo
  delegable. Solo documentación.
- 2026-07-25 (02:15 UTC): cuadragésimo disparo de `routine-fabrica-consola`. Anti-solape: último
  commit de `main` (`122d5d7`, ~1h56min de antigüedad en el momento del fetch) es el merge de
  `fabrica-sync` del propio tick anterior (00:15 UTC) — sin working tree sucio ni ramas/worktrees
  huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Inbox
  `(vacío)` sin triaje. Único hallazgo: la fila del tick 00:15 UTC en el Registro de trabajo decía
  "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `122d5d7` — corregida,
  junto con la `Ancla de rollback` de `CLAUDE.md`. Entorno re-verificado con `npm ci` + gate real en
  verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack, Node
  v22.22.2). `npm audit --audit-level=high` sigue en **12** vulnerabilidades altas, sin cambio desde
  el tick 22:15 UTC del 2026-07-24 — sin acción de código posible sin decisión del usuario (ver
  P2/Decisiones estacionadas). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue
  pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems
  nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado
  instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un
  segundo tipo de proyecto, `postcss`/`sharp` pineados por Next sin acción posible, mecanismo de
  reemplazo de `fire_trigger` sin decisión del usuario, cadencia de `rutina-trabajadora-1` sin
  decisión del usuario, bump mayor de `eslint` sin decisión del usuario). Vigésimo sexto tick
  consecutivo con solo housekeeping documental — sin trabajo de código nuevo delegable. Solo
  documentación.
- 2026-07-25 (06:15 UTC): cuadragésimo segundo disparo de `routine-fabrica-consola`. Inbox
  `(vacío)` sin triaje. Único hallazgo: la fila del tick 04:15 UTC en el Registro de trabajo decía
  "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `9645622` — corregida,
  junto con la `Ancla de rollback` de `CLAUDE.md`. `list_triggers` verificado sin discrepancias en
  ninguno de los 5 triggers reales (`routine-fabrica-consola`, `rutina-despachadora`,
  `rutina-trabajadora-1/2`, `routine-madre-fabrica`). Gate real en verde: lint ✅, test:run
  **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack, Node v22.22.2). `npm audit
  --audit-level=high` sigue en **12** vulnerabilidades altas, sin cambio. `TAREAS-MANUALES.md`
  revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1/P2 revisados ítem
  por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks
  anteriores. Vigésimo octavo tick consecutivo (desde 2026-07-18 12:15 UTC) con solo housekeeping
  documental. Solo documentación.
- 2026-07-25 (10:15 UTC): cuadragésimo cuarto disparo de `routine-fabrica-consola`. Inbox `(vacío)`
  sin triaje. Único hallazgo: la fila del tick 08:15 UTC en el Registro de trabajo decía "pendiente
  de push" pese a que `fabrica-sync` ya la había integrado en `6dab8a3` — corregida, junto con la
  `Ancla de rollback` de `CLAUDE.md`. `list_triggers` verificado sin discrepancias en los 5
  triggers reales (`routine-fabrica-consola`, `rutina-despachadora`, `rutina-trabajadora-1/2`,
  `routine-madre-fabrica`). Gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio),
  build ✅ (Next.js 16.2.11/Turbopack, Node v22.22.2). `npm audit --audit-level=high` sigue en
  **12** vulnerabilidades altas, sin cambio. `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo
  la 🟡 3 sigue pendiente sin bloquear. P0/P1/P2 revisados ítem por ítem: sin ítems nuevos
  delegables — mismos bloqueos por decisión de usuario que ticks anteriores. Trigésimo tick
  consecutivo (desde 2026-07-18 12:15 UTC) con solo housekeeping documental. Solo documentación.
- 2026-07-25 (12:15 UTC): cuadragésimo quinto disparo de `routine-fabrica-consola`. Inbox `(vacío)`
  sin triaje. Único hallazgo: la fila del tick 10:15 UTC en el Registro de trabajo decía "pendiente
  de push" pese a que `fabrica-sync` ya la había integrado en `f8cc702` — corregida, junto con la
  `Ancla de rollback` de `CLAUDE.md`. `list_triggers` verificado sin discrepancias en los 5
  triggers reales (`routine-fabrica-consola`, `rutina-despachadora`, `rutina-trabajadora-1/2` —esta
  última sigue en cadencia de 2h, sin respuesta a la pregunta estacionada—, `routine-madre-fabrica`).
  Gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js
  16.2.11/Turbopack, Node v22.22.2). `npm audit --audit-level=high` sigue en **12** vulnerabilidades
  altas, sin cambio. `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente
  sin bloquear. P0/P1/P2 revisados ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por
  decisión de usuario que ticks anteriores. Trigésimo primer tick consecutivo (desde 2026-07-18
  12:15 UTC) con solo housekeeping documental. Solo documentación.

## 📥 Inbox — entradas del usuario (sin triaje)

Buzón donde la consola commitea TAL CUAL (sin LLM) el feedback/idea/spec que el usuario deja desde
el dashboard de un proyecto, y las respuestas a decisiones `[USUARIO]` (formato `Respuesta a
decisión "...": ...`). La única inteligencia sobre estas entradas la aplica el paso "TRIAJE DEL
INBOX" de la routine orquestadora en su siguiente disparo (mejora wording, redacta criterios de
aceptación, deduplica, prioriza o estaciona) — nunca la consola. Agregada 2026-07-18 (tick 18:15
UTC): esta sección no existía realmente en este archivo pese a que el protocolo de cabecera y seis
reportes de tick previos la daban por existente y vacía (ver corrección en Estado general arriba).
Hoy no es alcanzable desde el dashboard propio (fabrica-consola no lleva el topic
`fabrica-agentes`, así que no aparece en su propio dropdown) — queda lista para cuando/si este repo
se gestione a sí mismo como proyecto.

- (vacío)

## P0 — Features MVP (sembradas desde las specs de la Fase 0)

- [x] **Formulario "Nuevo proyecto".** Página con los 12 campos de `docs/diseno-consola-web.md`
  §1 (nombre, objetivo, features MVP repetibles, qué NO es v1, criterios de aceptación opcionales,
  stack, presupuesto, decisiones reservadas, visibilidad, cadencia de routine, autoridad inicial
  informativa, notificaciones opcionales). Al enviar, un API route server-side: (1) crea el repo
  desde `rifc23/fabrica-agentes-template` vía `POST /repos/{owner}/{template}/generate` +
  agrega el topic `fabrica-agentes`; (2) **conecta el repo a Vercel** (decisión del usuario,
  2026-07-17 — deploy autónomo §4.5 del diseño): si `VERCEL_TOKEN` está configurado (env var
  server-side, mismas reglas que `GITHUB_PAT`), `POST https://api.vercel.com/v9/projects` con
  `gitRepository` apuntando al repo nuevo → cada push despliega y cada PR genera preview, sin CLI;
  la `preview_url` resultante va al manifest. Sin token: degradación elegante — los pasos de
  conexión manual se escriben en el `TAREAS-MANUALES.md` del proyecto nuevo; (3) commitea
  `.fabrica.json` inicial (`peldano: 3`, `estado: "iterando"`, `cadencia_cron`, `preview_url` si
  hubo Vercel) y `docs/SPECS.md` con las respuestas del form; (4) siembra `docs/backlog.md` del
  repo nuevo con las features MVP como paquetes P0 — este push dispara el primer deploy.
  **Flujo post-creación (decisión del usuario, 2026-07-17):** al enviar, el botón se deshabilita
  y aparece un indicador de progreso por pasos con el estado REAL de cada uno (creando repo →
  conectando Vercel → sembrando backlog y manifest); al terminar, la consola redirige
  AUTOMÁTICAMENTE al dashboard del proyecto nuevo (`/proyectos/<id>`), con el dropdown ya
  revalidado (sin caché) y el proyecto nuevo seleccionado, un banner de éxito con la liga al repo
  y la `preview_url` de Vercel, y el estado de la routine: "🏭 la routine madre la instalará
  automáticamente (≤1h)" mientras el manifest no tenga `trigger_id` — el prompt manual de
  `/schedule` queda como fallback colapsable por si la madre no está activa. Si un paso falla, se
  muestra el error de ESE paso, qué alcanzó a crearse y cómo reintentar — nunca un fallo
  silencioso. Desde ahí, el dashboard (cola, brief, Inbox, tareas manuales) es el **hub de mejora
  continua** del proyecto.
  **Criterios de aceptación:** dado un usuario que llena el formulario con nombre+objetivo+≥1
  feature MVP, cuando lo envía, entonces ve el progreso por pasos y al completarse es redirigido
  al dashboard del proyecto nuevo con el dropdown incluyéndolo y seleccionado, la liga al repo y
  la `preview_url` visibles; y existe el repo nuevo en GitHub con el topic `fabrica-agentes`,
  `.fabrica.json` válido y `docs/SPECS.md` commiteado; y dado que `VERCEL_TOKEN` está
  configurado, entonces existe además el proyecto Vercel conectado al repo y el manifest contiene
  su `preview_url`. El cron generado lleva **offset de minutos escalonado** (0/15/30/45, rotando
  entre proyectos — ver §4 Motor A del diseño) y se guarda en `cadencia_cron` del manifest, para
  que N routines no se disparen todas a la misma hora.
  **Archivos previstos:** `src/app/nuevo-proyecto/page.tsx`, `src/app/api/crear-proyecto/route.ts`,
  `src/lib/github.ts` (extender con `crearDesdeTemplate`, `commitearArchivo`),
  `src/lib/vercel.ts` (crear-proyecto-conectado, con tests),
  `src/components/ProgresoCreacion.tsx`, tests en `src/lib/github.test.ts`.

- [x] **Dropdown de proyectos existentes.** Usa `GET /api/proyectos` (ya implementado en el
  esqueleto — `src/app/api/proyectos/route.ts` + `src/lib/github.ts::obtenerProyectos`) para
  listar repos por topic con nombre desde el manifest. Selector en el header que navega al
  dashboard del proyecto elegido.
  **Criterios de aceptación:** dado que existen N repos con el topic `fabrica-agentes`, cuando se
  carga la consola, entonces el dropdown muestra los N proyectos por su `nombre` de manifest (o el
  nombre del repo si el manifest falta) y seleccionar uno navega a `/proyectos/<id>`; y dado que
  se acaba de crear un proyecto, cuando la consola redirige a su dashboard, entonces el dropdown
  ya lo incluye y lo muestra seleccionado (lectura sin caché tras la creación).
  **Archivos previstos:** `src/app/layout.tsx` o un `src/components/SelectorProyectos.tsx`,
  `src/app/proyectos/[id]/page.tsx` (ruta destino).

- [x] **Dashboard read-only por proyecto.** Página `/proyectos/[id]` que lee (vía Contents API)
  y renderiza: progreso desde checkboxes de `docs/backlog.md` (barra + lista ✅/⏳), el reporte
  más reciente de `docs/reportes/` (markdown renderizado, sanitizado), decisiones `[USUARIO]`
  visibles del backlog, link al repo y a `preview_url` del manifest. Además (decisión del usuario,
  2026-07-17): sección **"🧑 Tareas manuales" como documento vivo** (render sanitizado de
  `docs/TAREAS-MANUALES.md` del proyecto) y sección **"📋 Brief"** con qué-se-hizo / qué-falta
  derivado POR PARSING, sin LLM (regla no negociable de v1): completadas recientes (`[x]` +
  Registro de trabajo), en curso (tareas `🔄`), pendientes con su posición en la cola y conteos
  por prioridad. **Frescura:** todas las lecturas del dashboard con `cache: 'no-store'` y botón
  **"↻ Actualizar"** (componente compartido, en el header del dashboard y en las secciones
  Tareas manuales y Brief) que re-lee del repo al instante (`router.refresh()`), mostrando
  "actualizado hace Xs" en cada sección; además **auto-refresh suave** (decisión del usuario,
  2026-07-17): polling cada ~60s mientras la pestaña está visible (`document.visibilityState`),
  para que cuando la routine commitee (triaje de respuestas, inicio/cierre de tick) el dashboard
  se actualice solo sin tocar nada.
  **Criterios de aceptación:** dado un proyecto con backlog y al menos un reporte, cuando se abre
  su dashboard, entonces se ve la barra de progreso con el conteo real de checkboxes, el reporte
  más reciente renderizado, la lista de decisiones estacionadas (vacía si no hay ninguna), las
  tareas manuales del proyecto y el brief hecho/pendiente; y dado que el repo cambió después de
  cargar la página (ej. la routine commiteó), cuando el usuario pulsa "↻ Actualizar", entonces
  las secciones reflejan el contenido más reciente del repo sin recargar manualmente el navegador.
  **Archivos previstos:** `src/app/proyectos/[id]/page.tsx`, `src/lib/backlog.ts` (parser de
  checkboxes, `🔄`, sección `[USUARIO]` y Registro de trabajo, con tests), `src/lib/markdown.ts`
  (render sanitizado), `src/lib/brief.ts` (derivar hecho/en-curso/falta, con tests),
  `src/components/BotonActualizar.tsx`.

- [x] **"＋ Nueva tarea / feedback" → Inbox (subido de P1 a P0 por decisión del usuario,
  2026-07-17; simplificado el mismo día: el refinado lo hace la routine en el cron, no la
  consola).** En el dashboard de cada proyecto, un textarea donde el usuario escribe feedback, una
  idea o una spec en lenguaje natural. Al enviar, el API route commitea el texto TAL CUAL (con
  fecha) DENTRO de la sección `📥 Inbox` del `docs/backlog.md` del proyecto — la consola no llama
  a ningún LLM ni decide prioridades. El tratamiento inteligente ocurre en el siguiente tick de la
  routine orquestadora (paso "TRIAJE DEL INBOX" de la plantilla): mejora el wording, redacta
  criterios de aceptación, deduplica, prioriza a P0/P1/P2 o estaciona como pregunta `[USUARIO]`.
  **Criterios de aceptación:** dado un proyecto existente, cuando el usuario envía un feedback
  desde su dashboard, entonces aparece un commit nuevo en el repo del proyecto cuyo diff agrega la
  entrada SOLO dentro de la sección `📥 Inbox` de `docs/backlog.md`, y la UI confirma mostrando el
  link al commit.
  **Archivos previstos:** `src/app/proyectos/[id]/NuevaTarea.tsx`,
  `src/app/api/tareas/route.ts`, `src/lib/backlog.ts` (helper `insertarEnInbox`, con tests),
  `src/lib/github.ts` (extender con append/commit de archivo existente, con tests).

- [x] **Cards de decisiones respondibles + "Disparar routine ahora" (subido de P1/v2 a P0 por
  decisión del usuario, 2026-07-17 — cierre rápido del ciclo de feedback).** El dashboard muestra
  cada decisión estacionada `[USUARIO]` del backlog como card con la pregunta EXACTA + input de
  respuesta (+ botones si la pregunta es de opción). Al responder: (1) la consola commitea la
  respuesta AL INBOX del proyecto con el formato `Respuesta a decisión "<primeras palabras de la
  pregunta>": <respuesta>` — así se mantiene la regla de que la consola SOLO escribe en la
  sección `📥 Inbox`; la routine aplica la respuesta en su triaje (despeja la decisión, ajusta la
  tarea, repriorísa); (2) la card pasa a estado "respondida — la fábrica la tomará
  automáticamente" con **countdown al próximo despacho**: el mínimo entre el próximo tick del
  proyecto (`cadencia_cron` del manifest) y el próximo paso del despachador de la routine madre
  (cada hora a los :50). IMPORTANTE (decisión del usuario, 2026-07-17): **los usuarios de la
  consola NO tienen acceso a claude.ai/routines** — nada en la UI puede depender de deep-links a
  claude.ai ni de disparar routines a mano; la inmediatez la da el despachador de la madre
  (≤1h) y, en el futuro, Motor B (instantáneo). Lo mismo aplica al envío de feedback normal.
  **Criterios de aceptación:** dado un proyecto con ≥1 decisión `[USUARIO]`, cuando el usuario
  responde desde la card, entonces existe un commit nuevo cuyo diff agrega la respuesta SOLO
  dentro de la sección `📥 Inbox`, y la card muestra "respondida — la fábrica la tomará en ~X
  min" con el countdown calculado de `cadencia_cron` y el horario del despachador — sin ningún
  link a claude.ai en la UI.
  **Archivos previstos:** `src/components/DecisionCard.tsx`, reutiliza `src/app/api/tareas/route.ts`
  (mismo endpoint del Inbox), `src/lib/backlog.ts` (parser de decisiones ya previsto en el
  dashboard P0), `src/lib/cron.ts` (próximo disparo, compartido con la vista de cola).

- [x] **Eliminar proyecto ("⚠️ Zona de peligro" del dashboard).** (Decisión del usuario,
  2026-07-17, motivada por el proyecto fallido del Error Conocido #3; implementada el mismo día.)
  Sección colapsada al final del dashboard: borra el repo de GitHub (`DELETE /repos`) y el
  proyecto Vercel (`DELETE /v9/projects`, 404 tolerado y degradación sin token), con confirmación
  escribiendo el nombre EXACTO del repo (re-validada server-side), botón deshabilitado hasta
  coincidir, targets ≥44px. Redirige al home con el dropdown refrescado. Tercera excepción a la
  regla read-only de v1 (ver CLAUDE.md). Archivos: `src/app/api/eliminar-proyecto/route.ts`,
  `src/components/EliminarProyecto.tsx`, `eliminarRepo`/`eliminarProyectoVercel` en libs con 6
  tests nuevos.

- [x] **Esqueletos por stack en el formulario (decisión del usuario, 2026-07-17 — extiende el fix
  del Error Conocido #3 a TODOS los stacks del dropdown).** La consola siembra el esqueleto del
  stack elegido al crear el repo: Recomiéndame/Next → esqueleto del template; Vite y Estático →
  esqueleto Vite vanilla-TS (borra los archivos Next vía Contents API y siembra los propios;
  Vercel con `framework: "vite"`; verificado con npm install + gate real en proyecto de prueba);
  Otro → placeholder Next + tarea manual 🟠 para que arquitecto-stack instale el stack en Fase 1.
  **Invariante de fábrica:** todo esqueleto expone los MISMOS scripts `dev/build/lint/test:run` —
  el gate es uniforme para cualquier routine. Archivos: `src/lib/esqueletos.ts` (+tests),
  `borrarArchivo` en github.ts (+tests), paso "esqueleto" en crear-proyecto y ProgresoCreacion.
  Gate: lint ✅ build ✅ test:run 100/100 ✅.

## P1 — Siguientes

- [x] **Tipo de proyecto "Gem" en el formulario (decisión del usuario, 2026-07-17 — primera de
  la cola P1).** Checkbox "🤖 Gem (chatbot con rol)" en `/nuevo-proyecto`; al marcarse muestra
  textarea "Rol del bot" y las features MVP manuales se sustituyen por el blueprint Gem de
  `docs/diseno-consola-web.md` §1.1 (CRUD de Gems, chat streaming con el rol SIEMPRE como
  parámetro `system` fuera del historial, "✨ Mejorar rol" con preview, localStorage sin BD; el
  usuario puede agregar features extra). El blueprint incluye OBLIGATORIAMENTE la **capa de
  abstracción de IA** (decisión del usuario, 2026-07-17): interfaz `ProveedorIA` server-side con
  un adaptador por proveedor (`src/lib/ia/` en el repo nuevo), proveedor activo por env var
  `IA_PROVEEDOR` (`gemini` | `anthropic`, **default `gemini`** con su capa gratuita de Google AI
  Studio); ningún componente/endpoint llama a un proveedor directamente, y agregar una IA futura
  = escribir UN adaptador nuevo. Al crear: `docs/SPECS.md` del repo nuevo se genera desde
  el blueprint con el rol del usuario TAL CUAL (sección "Rol inicial"), el backlog se siembra con
  las P0 del blueprint (incluida la capa de IA como P0), `.fabrica.json` lleva `tipo: "gem"`, y
  el `TAREAS-MANUALES.md` del repo nuevo incluye la tarea 🔴 de crear la `GEMINI_API_KEY`
  gratuita (aistudio.google.com) y configurarla en Vercel — o la key del proveedor elegido si
  cambia `IA_PROVEEDOR`. El refinado del rol es trabajo del primer tick de la routine del
  proyecto (la consola no llama a LLM).
  **Criterios de aceptación:** dado el checkbox marcado y un rol escrito, cuando se crea el
  proyecto, entonces el repo nuevo tiene SPECS.md tipo Gem con el rol textual íntegro (y la capa
  de abstracción de IA especificada), backlog sembrado con las P0 del blueprint y `tipo:"gem"` en
  el manifest; dado el checkbox sin marcar, el formulario se comporta exactamente como hoy (cero
  campos de rol); todo usable en móvil.
  **Archivos previstos:** `src/app/nuevo-proyecto/page.tsx` (checkbox+textarea),
  `src/lib/formulario-proyecto.ts` (blueprint Gem + generación de SPECS/backlog, con tests),
  `src/lib/github.test.ts`/`formulario-proyecto.test.ts` (casos gem y no-gem); en el repo Gem
  sembrado: `src/lib/ia/proveedor.ts` (interfaz), `src/lib/ia/gemini.ts`, `src/lib/ia/anthropic.ts`
  (adaptadores — los construye la routine del proyecto siguiendo el blueprint).

- [x] **Vista de cola y tiempos en el dashboard** (decisión del usuario, 2026-07-17; requiere el
  dashboard P0). Renderiza los pendientes del backlog como cola numerada en su orden real (el
  orden del archivo ES la cola — regla 6 del protocolo del template); badge "🏭 trabajando ahora"
  cuando hay tareas marcadas `🔄` (con `ultimo_tick` del manifest como inicio); countdown al
  próximo tick calculado desde `cadencia_cron` del manifest (sin APIs extra); espera estimada por
  posición: `ceil(posición/4) × cadencia`. Ver diseño en `docs/diseno-consola-web.md` §2.2.
  **Criterios de aceptación:** dado un proyecto cuyo manifest tiene `cadencia_cron` y un backlog
  con N pendientes (alguno marcado `🔄`), cuando se abre su dashboard, entonces se ve la cola
  numerada en el orden del archivo, el badge de trabajo en curso, el countdown correcto al
  próximo disparo del cron y la espera estimada junto a cada pendiente.
  **Archivos previstos:** `src/lib/backlog.ts` (extender parser: orden + marcador `🔄`, tests),
  `src/lib/cron.ts` (próximo disparo de una expresión cron de 5 campos, tests),
  `src/components/ColaProyecto.tsx`.
- [x] **Burn-down del backlog** (decisión del usuario, 2026-07-17). Gráfica de tareas pendientes
  vs tiempo para ver desde cuándo "se rebaja" el backlog: historial de commits de
  `docs/backlog.md` (GitHub Commits API, muestreado — máx ~30 puntos), conteo de checkboxes
  pendientes por versión, render SVG propio sin librería de gráficas.
  **Criterios de aceptación:** dado un proyecto con ≥2 commits que cambian checkboxes del
  backlog, cuando se abre su dashboard, entonces la gráfica muestra la serie de pendientes por
  fecha con al menos esos puntos.
  **Archivos previstos:** `src/lib/burndown.ts` (con tests), `src/components/Burndown.tsx`,
  `src/lib/github.ts` (extender: historial de commits de un archivo).
(Las cards de decisiones y el botón "Disparar routine ahora" subieron a P0 el 2026-07-17.)

## P2 — Deuda / mejoras

- [ ] Refinado instantáneo del feedback (mejora de UX, opcional): el API route llama a la API de
  Claude server-side (`ANTHROPIC_API_KEY`, mismas reglas que `GITHUB_PAT`) para reescribir el
  input al formato de tarea y mostrar un preview editable ANTES del commit al Inbox. Solo cambia
  CUÁNDO se ve el wording mejorado — el triaje del cron sigue siendo la única autoridad de
  prioridades. Requiere reponer la tarea manual de crear la key en Vercel.
- [ ] Playwright E2E del flujo completo (crear proyecto → verlo en dropdown → dashboard) una vez
  exista el formulario real contra un repo de prueba. Cada spec de UI corre en DOS viewports:
  desktop y móvil ~390×844 (regla Multiplataforma de CLAUDE.md).
- [ ] Motor B (GitHub Actions + Agent SDK) — instalación 100% automática, ver §4 de
  diseno-consola-web.md. No es v1.
- [ ] Promover `tipo?: "gem"` (hoy tipado localmente en `src/app/api/crear-proyecto/route.ts` como
  `FabricaManifest & { tipo?: "gem" }`) a campo real en `FabricaManifest` (`src/lib/github.ts`) si
  se agregan más tipos de proyecto además de "gem" — hallazgo del lote P1, 2026-07-18.
- [ ] **`postcss` (≤8.5.11) y `sharp` (<0.35.0) siguen con vulnerabilidad alta en `npm audit`
  tras el bump de Next.js a 16.2.11 (tick 16:15 UTC, 2026-07-24).** Son dependencias que el propio
  `next@16.2.11` pinea en SU `package.json` (postcss como directa exacta, sharp como opcional) —
  no se resuelven con un bump de nuestro lado. `npm audit fix --force` las "arregla" haciendo un
  DOWNGRADE catastrófico de next a `9.3.3` (2019) que sube el conteo a 92 vulnerabilidades (26
  altas, 1 crítica) — probado y revertido en este mismo tick, NO REPETIR ese comando en este repo.
  Sin acción disponible de nuestro lado hasta que Next.js publique un release que actualice sus
  propias versiones internas de postcss/sharp — revisar en el próximo bump de Next.
- [ ] **`brace-expansion` (GHSA-mh99-v99m-4gvg, DoS por expansión no acotada) — 9 vulnerabilidades
  altas nuevas en `npm audit`, hallazgo del tick 22:15 UTC, 2026-07-24.** Solo dependencia de
  DESARROLLO (cadena de tooling de lint: `eslint`→`@eslint/config-array`/`@eslint/eslintrc`→
  `minimatch@3.1.5`→`brace-expansion@1.1.16`, más `eslint-plugin-import`/`jsx-a11y`/`react` y
  `eslint-config-next` por la misma ruta) — no llega al bundle ni al runtime desplegado. Intentado
  y **descartado** un fix acotado este mismo tick: `brace-expansion` publica 5 líneas mayores
  paralelas sin interoperar; el patch real (`5.0.8`) solo existe en la línea `5.x`, y la rama que
  usa `eslint@9.39.5` (la única `9.x` disponible hoy) sigue atada a `minimatch@3.1.5`→
  `brace-expansion@1.1.16` con la API vieja (`require('brace-expansion')` como función). Forzar
  `5.0.8` ahí rompe `npm run lint` de verdad (`TypeError: expand is not a function`, probado y
  revertido). Un override acotado solo a la instancia de `@typescript-eslint/typescript-estree`
  (que sí usa `minimatch@10.x` compatible) deja el gate en verde pero `npm audit` sigue reportando
  las 9 igual (el advisory se dispara por paquete, no por instancia individual). El único camino
  real es un bump MAYOR de `eslint` a `10.8.0` (breaking change, riesgo de reglas de lint
  cambiadas) — ver pregunta nueva en Decisiones estacionadas. Mientras no haya respuesta: sin
  acción de código, riesgo residual aceptado (dev-only, DoS solo explotable si algo le pasa
  patrones glob maliciosos a `eslint`/`minimatch`, no es el caso de este repo).
- [x] **`CRON_TRABAJADORAS_POOL`/`CRON_DESPACHADORA_POOL` en `src/lib/cron.ts` desincronizados de
  los triggers reales del Motor A-pool — hallazgo del tick 20:15 UTC, 2026-07-24.** `list_triggers`
  muestra `rutina-trabajadora-1` con `cron_expression: "15 */2 * * *"` (cada 2h) y
  `rutina-trabajadora-2` con `"15 */1 * * *"` (cada hora) — ambas con `updated_at` en
  `2026-07-24T04:58–04:59 UTC` (~15h antes de este tick, cambio real hecho por fuera de este
  código, no atribuible a ningún commit de este repo). El código sigue con los valores del
  2026-07-18 (`{1: "10 * * * *", 2: "40 * * * *"}`, `CRON_DESPACHADORA_POOL = "5 * * * *"` — este
  último SÍ coincide con el real). Consecuencia verificada: `EstadoPool` del dashboard calcula el
  countdown de ambas trabajadoras con una cadencia que ya no es la real desde hace ~15h — dato
  visible incorrecto para CUALQUIER proyecto en el pool, no solo fabrica-consola. Además,
  `rutina-trabajadora-1` volvió a `*/2` (cada 2h), lo que contradice la decisión del usuario
  2026-07-18 de "reducir el ciclo del pool de 2h a 1h" para AMBAS trabajadoras — no hay forma de
  saber desde este repo si ese cambio fue intencional o un error, así que se estaciona como
  pregunta (ver Decisiones estacionadas). Acción tomada este tick: actualizar la CONSTANTE del
  código para que refleje la cadencia REAL vigente hoy (deja de mentirle al dashboard), sin tocar
  ningún trigger real — eso es decisión de producto/riesgo fuera de este repo. **Resuelto en el
  mismo tick:** `CRON_TRABAJADORAS_POOL` actualizado a `{1: "15 */2 * * *", 2: "15 * * * *"}` (commit
  `f579703` en `fix/cron-pool-sync-trabajadoras`, mergeado a la rama del tick en `0e57922`), tests de
  `cronDeTrabajadoraPool` actualizados a los valores reales, gate en verde (lint ✅, test:run
  182/182 ✅, build ✅).
- [x] `eslint.config.*` usa `globalIgnores(".next/**")` (anclado a raíz, no `**/.next/**`): los
  builds hechos dentro de worktrees de subagentes (`.claude/worktrees/agent-*/.next/`) no quedan
  ignorados y contaminan `npm run lint` corrido desde el checkout principal si esos worktrees
  siguen presentes. Ampliar el patrón (o excluir `.claude/**`) para que el gate sea robusto sin
  depender de que el orquestador limpie los worktrees a mano antes de lintear — hallazgo del lote
  P1, 2026-07-18. **Resuelto 2026-07-18 (tick 16:15 UTC):** `eslint.config.mjs` amplía a
  `**/.next/**`/`**/out/**`/`**/build/**` y agrega `.claude/**` a `globalIgnores`. Auditoría del
  mismo tick encontró que `vitest` tenía EXACTAMENTE el mismo problema (un worktree de agente
  presente duplicaba `npm run test:run` de 143 a 286 tests, recolectando también sus
  `src/**/*.test.ts`) — se corrigió también `vitest.config.ts` con
  `exclude: [...configDefaults.exclude, ".claude/**"]`, y `.gitignore` gana
  `/.claude/worktrees/` (esos directorios nunca deben trackearse en el repo principal). Ver
  CLAUDE.md § Errores Conocidos.

## Decisiones estacionadas [USUARIO]

- **Diseño visual**: la UI actual del esqueleto es intencionalmente mínima (sin sistema de diseño,
  sin librería de componentes). ¿Quieres que el `disenador-ui` proponga 2-3 direcciones antes de
  construir el formulario y el dashboard, o prefieres iterar sobre lo mínimo primero y refinar
  después?
- **Nombre del producto**: el repo y el `package.json` usan el nombre técnico "fabrica-consola".
  ¿Hay un nombre de producto distinto que prefieras mostrar en la UI (título, `<title>`, etc.)?
- **Playwright E2E del flujo completo (P2, estacionada 2026-07-18):** la tarea tal como está
  escrita implica correr el formulario contra un repo de prueba real — es decir, crear un repo de
  GitHub y (si hay `VERCEL_TOKEN`) un proyecto Vercel reales vía la API en cada corrida del spec.
  ¿Autorizas que la routine cree y reutilice/limpie un repo de prueba dedicado (p. ej.
  `fabrica-consola-e2e-fixture`, sin topic `fabrica-agentes` para que no aparezca en el dropdown
  real) para este fin, o prefieres que el E2E use mocks de la API de GitHub/Vercel en vez de
  recursos reales?
- **Reemplazo del despacho instantáneo vía `fire_trigger` (estacionada 2026-07-19, hallazgo de
  `routine-madre-fabrica` ~10:52 UTC — no es tarea de código de ESTE repo, pero afecta la promesa de
  latencia que este backlog y CLAUDE.md documentan para el Motor A-pool):**
  `docs/reportes/EXPERIMENTO-ROUTINE-MADRE-FALLIDO.md` confirma que `fire_trigger` rechaza disparar
  cualquier trigger que la sesión invocadora no haya creado ella misma — y como TODOS los triggers
  reales de la fábrica se crean desde la UI (regla vigente desde 2026-07-17 para tener permisos de
  escritura), la madre nunca puede disparar ninguno. El PASO 4 (pool) y el PASO 3 (dedicadas) quedan
  reducidos a "asignar/no acelerar" — cada proyecto avanza solo en su tick normal de cron. ¿Qué
  mecanismo de reemplazo prefieres para el despacho instantáneo (p. ej. Motor B adelantado desde P2,
  algún webhook, o aceptar la latencia del tick normal como techo real y retirar la promesa de "≤1h"
  de la UI/documentación)? Ver CLAUDE.md § Errores Conocidos y § Decisiones Arquitectónicas (Motor
  A-pool) para el detalle ya corregido.
- **`rutina-trabajadora-1` volvió a cadencia de 2h — ¿intencional? (estacionada 2026-07-24, ~20:15
  UTC, hallazgo de este tick):** `list_triggers` confirma que `rutina-trabajadora-1` corre hoy con
  `cron_expression: "15 */2 * * *"` (cada 2h), revirtiendo la decisión del usuario del 2026-07-18 de
  bajar el ciclo del pool a 1h para AMBAS trabajadoras (`rutina-trabajadora-2` sí sigue en
  `"15 */1 * * *"`, cada hora). `updated_at` de ambos triggers marca `2026-07-24T04:58–04:59 UTC`,
  fuera de cualquier commit de este repo. ¿Fue deliberado (ej. bajar la carga de esa trabajadora en
  particular) o quieres revertirlo a `15 * * * *` (cada hora, como la trabajadora-2)? Mientras no
  haya respuesta, este tick solo actualizó la CONSTANTE de `src/lib/cron.ts` para que el dashboard
  muestre el countdown real (cada 2h para la trabajadora-1) — no tocó el trigger en sí.
- **Bump mayor de `eslint` (9→10.8.0) para cerrar 9 vulnerabilidades altas de `brace-expansion`
  (estacionada 2026-07-24, ~22:15 UTC, hallazgo de este tick):** `npm audit` marca 9 altas por
  `brace-expansion@1.1.16` (GHSA-mh99-v99m-4gvg, DoS) arrastrado por la cadena de tooling de lint
  (`eslint`, `eslint-config-next` y sus plugins). Es dependencia de DESARROLLO únicamente — no
  llega a producción. El único fix real requiere saltar `eslint` de la línea `9.x` a `10.8.0`
  (major, breaking change potencial en reglas de lint activas). Un subagente `implementador`
  confirmó que NO existe un fix acotado sin ese salto (probado y revertido: forzar solo
  `brace-expansion@5.0.8` rompe `npm run lint`). ¿Autorizas que un `implementador` intente el bump
  a `eslint@10.8.0` como tarea dedicada (con su propio gate y revisión de si `eslint.config.mjs`/
  reglas activas cambian de comportamiento), o prefieres aceptar el riesgo residual (dev-only, DoS
  no explotable en este contexto) hasta que `eslint` publique un patch en la línea `9.x` o
  `brace-expansion` backportee el fix a su línea `1.x`?

## Registro de trabajo

| Fecha | Tarea | Rama | Commits | Gate | Estado |
|-------|-------|------|---------|------|--------|
| 2026-07-14 | Fase 0-1: kit, esqueleto andante, gate | main | (inicial) | lint ✅ test:run 6/6 ✅ build ✅ | Completado |
| 2026-07-17 | Lote v1: las 5 P0 (formulario+Vercel, dropdown, dashboard, Inbox, decisiones) | claude/factory-console-backlog-7jafgw | 5cd4910..3f20eb1 | lint ✅ test:run 74/74 ✅ build ✅ | Mergeado a main (7f2644f) |
| 2026-07-17 | Eliminar proyecto (Zona de peligro) | claude/factory-console-backlog-7jafgw | bcd92e7 | lint ✅ test:run 80/80 ✅ build ✅ | Mergeado a main (488cab0) |
| 2026-07-17 | Esqueletos por stack (vite/estático/otro) | claude/factory-console-backlog-7jafgw | 61d7ceb..f129c0a | lint ✅ test:run 100/100 ✅ build ✅ | Mergeado a main (2ac3276) |
| 2026-07-17 | Estado del deploy en preview + aviso claro de routine pendiente | claude/factory-console-backlog-7jafgw | 22967ec / 6520bd4 | lint ✅ test:run 104/104 ✅ build ✅ | Mergeado a main (6520bd4) — corregido 2026-07-18, el registro anterior lo daba por pendiente |
| 2026-07-18 | Tick 06:15 UTC: primer disparo real de `routine-fabrica-consola` — lote P1 completo (Gem, cola/tiempos, burndown), 3 subagentes + 1 de integración de conflicto | claude/rutina-2026-07-18-0615-p1-batch | 8158d1d (Gem) · 69ba763 (cola/tiempos) · f80f0f5 (burndown+integración) · 21ca51a (cierre) | lint ✅ test:run 143/143 ✅ build ✅ | Completo en la rama — **pendiente de merge por el usuario** (toca código, `fabrica-sync.yml` no la auto-mergea) |
| 2026-07-18 | Tick 08:15 UTC: segundo disparo — Inbox vacío, sin trabajo P1 nuevo (ya `[x]` en rama pendiente), P2 auditado sin ítems delegables (E2E estacionado, ver Decisiones [USUARIO]); solo documentación | claude/rutina-2026-07-18-0815-auditoria | (solo docs) | lint ✅ test:run 107/107 ✅ build ✅ | Solo-estado, auto-mergeable por fabrica-sync |
| 2026-07-18 | Tick 10:15 UTC: tercer disparo — mismo diagnóstico (Inbox vacío, sin P1/P2 nuevo delegable); lote P1 sigue sin mergear (~3h39min); trigger verificado sin discrepancias; solo documentación | claude/rutina-2026-07-18-1015-auditoria | (solo docs) | lint ✅ test:run 107/107 ✅ build ✅ | Solo-estado, auto-mergeable por fabrica-sync |
| 2026-07-18 | Tick 12:15 UTC: cuarto disparo — mismo diagnóstico (Inbox vacío, sin P1/P2 nuevo delegable); lote P1 sigue sin mergear (~5h39min); trigger verificado sin discrepancias; solo documentación | claude/rutina-2026-07-18-1215-auditoria | (solo docs) | lint ✅ test:run 107/107 ✅ build ✅ | Solo-estado, auto-mergeable por fabrica-sync |
| 2026-07-18 | Tick 14:15 UTC: quinto disparo — mismo diagnóstico (Inbox vacío, sin P1/P2 nuevo delegable); lote P1 sigue sin mergear (~7h39min, casi 8h); trigger verificado sin discrepancias; usuario notificado fuera de banda por el tiempo transcurrido; solo documentación | claude/rutina-2026-07-18-1415-auditoria | (solo docs) | lint ✅ test:run 107/107 ✅ build ✅ | Solo-estado, auto-mergeable por fabrica-sync |
| 2026-07-18 | Merge del lote P1 a main + activación peldaño 4 (autopiloto en fabrica-sync.yml) | main / claude/factory-console-backlog-7jafgw | 399111d (merge) | lint ✅ test:run 143/143 ✅ build ✅ (local, sobre el merge) | Completado — en producción |
| 2026-07-18 | Tick 16:15 UTC: sexto disparo — Inbox vacío; fix de `globalIgnores` de ESLint (P2) + hallazgo hermano del mismo tick en `vitest.config.ts` (misma causa raíz: worktrees de agentes duplicaban tests), + `.gitignore` para `.claude/worktrees/`; 2 subagentes `implementador` en worktrees separados (sin archivos compartidos), commits reautorados en el checkout principal tras integrar; ancla de rollback y Errores Conocidos actualizados | claude/rutina-2026-07-18-1615-eslint-ignore | 921b772 (marca 🔄 + ancla) · bd01f2d (.gitignore) · b8e2933 (fix eslint) · 88579dd (fix vitest) | lint ✅ test:run 143/143 ✅ build ✅ | Toca código — peldaño 4: `fabrica-sync.yml` la mergea a main tras gate completo en CI, sin acción del usuario |
| 2026-07-18 (~16:18–17:47 UTC) | **Motor A-pool implementado** (sesión interactiva del usuario, fuera de un tick de routine — sin reporte en `docs/reportes/`): helpers de lock optimista (`trabajadorasLibres` + lock por SHA en `src/lib/github.ts`), estado del pool en la cola del dashboard (`EstadoPool`), decisión "el pool es el motor DEFAULT" (quita el flujo de instalar routine dedicada de la UI de creación), `routine-madre-fabrica` a v4 (PASO 4: despacho de emergencia — asigna lock y dispara con `fire_trigger` si un proyecto sin `trigger_id` no tiene trabajadora asignada), botón "🔧 Asignar ahora" (`/api/asignar-proyecto`) y ciclo del pool reducido de 2h a 1h (`CRON_DESPACHADORA_POOL`/`CRON_TRABAJADORAS_POOL` en `src/lib/cron.ts`, mínimo real de la plataforma de rutinas confirmado en 1 tick/hora). Mergeado directo a `main` por la sesión interactiva (no pasa por `fabrica-sync`). Narrado ya en Estado general arriba; fila agregada aquí en el tick 18:15 UTC porque no tenía registro en esta tabla. | main (merges directos) | 0a29aa2 (lock) · f3ea492/b0181c7 (merges lock+dashboard) · 40ef813/0f74141 (estado del pool) · df09850/29bfb96 (pool DEFAULT) · 878b80d/52626e7 (madre v4) · 3180ac2/3155ca3 (Asignar ahora + ciclo 1h) | lint ✅ test:run 161/161 ✅ build ✅ (verificado por este tick sobre el HEAD real) | Completado — en producción |
| 2026-07-18 | Tick 18:15 UTC: séptimo disparo — Inbox: la sección `📥 Inbox` **no existía** en este archivo (bug real, no explotable hoy — ver corrección en Estado general y sección Inbox nueva arriba); agregada de verdad, sin entradas que triajar. Auditoría de estado real: `main` había avanzado 20 commits desde la última ancla de rollback documentada (Motor A-pool completo, fila de arriba) sin que `CLAUDE.md` lo reflejara — ancla de rollback y Decisiones Arquitectónicas corregidas. P1/P2 revisados: sin ítems nuevos delegables (mismos bloqueos por decisión de usuario que ticks anteriores). Solo documentación. | claude/rutina-2026-07-18-1815-auditoria | (solo docs) | lint ✅ test:run 161/161 ✅ build ✅ | Solo-estado, auto-mergeable por fabrica-sync |
| 2026-07-18 | Tick 20:15 UTC: octavo disparo — Inbox vacío, sin triaje; trigger verificado sin discrepancias; sin ramas huérfanas (todo el trabajo previo ya integrado en `main`); sin P1/P2 nuevo delegable, mismo estado que `CAMPANA-2026-07-18-FINAL.md`; solo documentación | claude/rutina-2026-07-18-2015-auditoria | (solo docs) | lint ✅ test:run 161/161 ✅ build ✅ | Solo-estado, auto-mergeable por fabrica-sync |
| 2026-07-18 (~17:35–17:49 UTC) | 2 bugs de creación de proyectos corregidos (sesión interactiva del usuario, sin reporte en `docs/reportes/`): (1) `CLAUDE.md`/`docs/TAREAS-MANUALES.md` nacían con placeholders `<...>` sin rellenar — nuevo paso "cimientos" en `/api/crear-proyecto` (`personalizarClaudeMd`/`personalizarTareasManuales`) + fix del filtro de "Último reporte" que mostraba `reportes/README.md`; (2) los 7 agentes de `.claude/agents/` tampoco se personalizaban — `personalizarAgente` nueva, paso "cimientos" extendido para listarlos y reemplazar en paralelo. Mergeados directo a `main` por la sesión interactiva (no pasa por `fabrica-sync`). Narrado ya en Estado general; fila agregada en el tick 22:15 UTC porque no tenía registro en esta tabla. | main (merges directos) | b3715bc/1b84ae5 (CLAUDE.md+TAREAS-MANUALES+filtro reportes) · a96626f/1daa877 (7 agentes) | lint ✅ test:run 168/168 ✅ build ✅ (verificado por este tick sobre el HEAD real) | Completado — en producción |
| 2026-07-18 (~18:10 UTC) | Decisión del usuario — "expansión del requerimiento antes de implementar": nueva regla obligatoria en `docs/plantilla-routine-prompt.md` (bloques A y B) para que toda routine de proyecto lea `docs/SPECS.md` completo y redacte ella misma criterios de aceptación que cubran la intención del dominio antes de delegar al `implementador`, en vez de pasar el texto crudo del usuario. Aplicada en vivo a `rutina-trabajadora-1`/`rutina-trabajadora-2` vía `RemoteTrigger`/`update`. Mergeada directo a `main` por la sesión interactiva; solo toca `docs/backlog.md`/`docs/plantilla-routine-prompt.md`, no código de esta consola. Fila agregada en el tick 22:15 UTC por el mismo motivo que la anterior. | main (merge directo) | 4d67f2a/893bcc4 | lint ✅ test:run 168/168 ✅ build ✅ (verificado por este tick sobre el HEAD real) | Completado — en producción |
| 2026-07-18 | Tick 22:15 UTC: noveno disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`893bcc4`, ~5 min de antigüedad) sin working tree sucio ni worktrees huérfanos → tick procedió con normalidad (commit directo de sesión interactiva, no un tick de routine a medias). Auditoría de estado real: 3 merges directos a `main` desde el tick 20:15 (2 fixes de creación de proyectos + decisión "expansión del requerimiento") no tenían fila en este Registro de trabajo ni el `CLAUDE.md` § Ancla de rollback los reflejaba — mismo patrón de "hecho documentado sin verificar" de ticks anteriores, corregido con las 2 filas de arriba y la ancla actualizada. Entorno re-verificado con `npm ci` + gate real en verde (lint ✅, test:run **168/168** ✅, build ✅, subieron de 161 por los fixes de personalización). P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables (mismos bloqueos por decisión de usuario — Refinado instantáneo y Playwright E2E siguen estacionados, Motor B no es v1, promover `tipo:"gem"` sigue condicionado a un segundo tipo de proyecto). Solo documentación. | claude/rutina-2026-07-18-2215-auditoria | (solo docs) | lint ✅ test:run 168/168 ✅ build ✅ | Mergeado a main por fabrica-sync (`7e4764f`) — confirmado en el tick 00:15 UTC del 2026-07-19 |
| 2026-07-18 (~19:47 UTC) | Fix de producción: `fabrica-sync.yml` commiteaba con un email inventado sin cuenta de GitHub real detrás — Vercel bloqueaba en silencio el deploy automático de los proyectos hijos (detectado en `calculadora`). Cambia al email noreply real del dueño de la fábrica. Toca `.github/**`, mergeado directo a `main` por la sesión interactiva (no pasa por `fabrica-sync`). Fila agregada en el tick 00:15 UTC del 2026-07-19 porque no tenía registro en esta tabla. | main (merge directo) | 2b8e8dd/21f0792 | lint ✅ test:run 168/168 ✅ build ✅ (verificado por este tick sobre el HEAD real) | Completado — en producción |
| 2026-07-19 | Tick 00:15 UTC: décimo disparo — Inbox `(vacío)`, sin triaje; sin ramas/worktrees huérfanos; auditoría encontró el fix de email de `fabrica-sync.yml` (fila de arriba) sin registro y la fila del tick 22:15 marcada "pendiente de push" pese a ya estar mergeada — ambas corregidas. Sin P1/P2 nuevo delegable (mismos bloqueos por decisión de usuario). Solo documentación. | claude/rutina-2026-07-19-0015-auditoria | (solo docs) | lint ✅ test:run 168/168 ✅ build ✅ | Mergeado a main por fabrica-sync (`9670efd`) — confirmado en el tick 02:15 UTC |
| 2026-07-19 | Tick 02:15 UTC: undécimo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`9670efd`, ~2h de antigüedad) sin working tree sucio ni worktrees/ramas huérfanas (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: única corrección encontrada fue la fila de arriba (tick 00:15), que decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `9670efd` — corregida. Ancla de rollback de `CLAUDE.md` actualizada al HEAD real. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **168/168** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismo estado que `CAMPANA-2026-07-18-FINAL.md` (Refinado instantáneo y Playwright E2E estacionados en "Decisiones estacionadas [USUARIO]", Motor B no es v1, promover `tipo:"gem"` sigue condicionado a un segundo tipo de proyecto). Solo documentación. | claude/rutina-2026-07-19-0215-auditoria | (solo docs) | lint ✅ test:run 168/168 ✅ build ✅ | Mergeado a main por fabrica-sync (`5f2f361`) — confirmado en el tick 04:15 UTC |
| 2026-07-19 (~00:11–00:44 UTC) | Plan de arquitectura aprobado por el usuario — proxy central de IA (`fabrica-ia-proxy`, repo nuevo, gobernanza manual sin routine automática por la sensibilidad del secreto compartido). Documento `docs/plan-proxy-ia-central.md`, aclara explícitamente que no modifica CLAUDE.md/backlog/código todavía — implementación (Paquete 1) es trabajo futuro fuera del alcance de esta routine. Mergeado directo a `main` por la sesión interactiva (no pasa por `fabrica-sync`). Fila agregada en el tick 04:15 UTC porque no tenía registro en esta tabla. | main (merge directo) | a0366c1 | lint ✅ test:run 168/168 ✅ build ✅ (verificado por este tick sobre el HEAD real) | Completado — plan aprobado, sin código nuevo |
| 2026-07-19 | Tick 04:15 UTC: duodécimo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`a0366c1`, ~4 min de antigüedad) no coincide con el patrón de merges/reportes propios de la routine (commit de doc de arquitectura de sesión interactiva) y working tree/worktrees limpios → tick procedió con normalidad. Auditoría de estado real: único hallazgo, el commit `a0366c1` (plan del proxy de IA) sin fila en este Registro — agregada arriba junto con el bullet en Estado general. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **168/168** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables (mismos bloqueos por decisión de usuario, más el proxy de IA que se suma a la lista de "aprobado pero fuera del alcance autónomo de esta routine"). Solo documentación. | claude/rutina-2026-07-19-0415-auditoria | (solo docs) | lint ✅ test:run 168/168 ✅ build ✅ | Mergeado a main por fabrica-sync (`11c250c`) — confirmado en el tick 06:15 UTC |
| 2026-07-19 (~00:19 UTC) | Fix de producción: GitHub rechazaba con 422 la creación de repos cuyo objetivo (textarea multilínea) traía caracteres de control en la `description` — `descripcionRepoDesdeObjetivo` (función pura + tests) sanea antes de enviar. Mergeado directo a `main` por la sesión interactiva (no pasa por `fabrica-sync`). Fila agregada en el tick 06:15 UTC porque no tenía registro en esta tabla. | main (merge directo) | 2ffe055/40717a4 | lint ✅ test:run 182/182 ✅ build ✅ (verificado por este tick sobre el HEAD real) | Completado — en producción |
| 2026-07-19 (~00:25 UTC) | Fix de producción: el formulario "Nuevo proyecto" ocultaba el `<form>` sin retorno tras un error de creación (atascaba al usuario, y recargar borraba lo escrito). Botón "Volver al formulario" en `ProgresoCreacion` + persistencia del borrador en `localStorage` (`src/lib/borrador-nuevo-proyecto.ts`, 9 tests). Mergeado directo a `main` por la sesión interactiva (no pasa por `fabrica-sync`). Fila agregada en el tick 06:15 UTC porque no tenía registro en esta tabla. | main (merge directo) | 01325e4/df8c9db | lint ✅ test:run 182/182 ✅ build ✅ (verificado por este tick sobre el HEAD real) | Completado — en producción |
| 2026-07-19 | Tick 06:15 UTC: decimotercer disparo — Inbox `(vacío)`, sin triaje. Anti-solape: local 67 commits detrás de origin/main, fast-forward limpio; último commit (`df8c9db`, ~1h49min de antigüedad) sin working tree sucio ni ramas/worktrees huérfanos → tick procedió con normalidad. Auditoría de estado real: los 2 merges directos de arriba (sanitización de `description` + no perder el formulario) sin fila en este Registro — agregadas. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (subieron de 168), build ✅ (Next.js 16.2.10/Turbopack). P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables (mismos bloqueos por decisión de usuario que ticks anteriores). Solo documentación. | claude/rutina-2026-07-19-0615-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`a66088a`) — confirmado en el tick 08:15 UTC |
| 2026-07-19 | Tick 08:15 UTC: decimocuarto disparo — Inbox `(vacío)`, sin triaje; sin ramas/worktrees huérfanos; único hallazgo la ancla de rollback de `CLAUDE.md` un commit desactualizada (apuntaba a `df8c9db`, `main` ya en `a66088a` tras el sync del tick anterior) — corregida; sin P1/P2 nuevo delegable (mismos bloqueos por decisión de usuario que ticks anteriores). Solo documentación. | claude/rutina-2026-07-19-0815-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`16fc65e`) — confirmado en el tick 10:15 UTC |
| 2026-07-19 | Tick 10:15 UTC: decimoquinto disparo — Inbox `(vacío)`, sin triaje; sin ramas/worktrees huérfanos; único hallazgo la fila del tick 08:15 marcada "pendiente de push" pese a ya estar mergeada (`16fc65e`) — corregida, junto con la ancla de rollback de `CLAUDE.md`; sin P1/P2 nuevo delegable (mismos bloqueos por decisión de usuario que ticks anteriores). Solo documentación. | claude/rutina-2026-07-19-1015-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`e4f2a49`) — confirmado en el tick 12:15 UTC |
| 2026-07-19 (~10:52 UTC) | Hallazgo estructural (sesión interactiva/routine madre, sin reporte de esta routine): `fire_trigger` no puede disparar ningún trigger real de la fábrica (todos creados vía UI/`http_api`; un agente solo dispara triggers que él mismo creó vía `create_trigger`) — rompe el despacho instantáneo del PASO 4 (pool) y PASO 3 (dedicadas) de `routine-madre-fabrica` v4; el `lock` sigue asignándose bien. Detalle en `docs/reportes/EXPERIMENTO-ROUTINE-MADRE-FALLIDO.md`. Mergeado directo a `main` (no pasa por `fabrica-sync`). Fila agregada en el tick 12:15 UTC porque no tenía registro en esta tabla. | main (merge directo) | 39bf9e4 | N/A (solo doc, sin código) | Documentado — mecanismo de reemplazo pendiente de decisión del usuario (ver Decisiones estacionadas) |
| 2026-07-19 | Tick 12:15 UTC: decimosexto disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`39bf9e4`, ~1h21min de antigüedad) es de la sesión interactiva del usuario, no un patrón propio de esta routine, sin working tree sucio ni ramas/worktrees huérfanos → tick procedió con normalidad. Auditoría de estado real: el hallazgo de `fire_trigger` (fila de arriba) sin registro en `CLAUDE.md`/este Registro — corregido (Decisiones Arquitectónicas del Motor A-pool, nuevo Error Conocido, ancla de rollback, nueva Decisión estacionada); también corregida la fila del tick 10:15 marcada "pendiente de push". Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables (mismos bloqueos por decisión de usuario, más el mecanismo de reemplazo de `fire_trigger`, que no es tarea de código de este repo). Solo documentación. | claude/rutina-2026-07-19-1215-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`dfcc726`) — confirmado en el tick 14:15 UTC |
| 2026-07-19 | Tick 14:15 UTC: decimoséptimo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`dfcc726`, ~1h54min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (12:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 12:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `dfcc726` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `39bf9e4`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Solo documentación. | claude/rutina-2026-07-19-1415-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`418a36c`) — confirmado en el tick 16:15 UTC |
| 2026-07-19 | Tick 16:15 UTC: decimoctavo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`418a36c`, ~1h57min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (14:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 14:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `418a36c` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `dfcc726`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Solo documentación. | claude/rutina-2026-07-19-1615-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`54d13da`) — confirmado en el tick 18:15 UTC |
| 2026-07-19 | Tick 18:15 UTC: decimonoveno disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`54d13da`, ~1h56min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (16:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 16:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `54d13da` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `418a36c`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Solo documentación. | claude/rutina-2026-07-19-1815-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`be06ae1`) — confirmado en el tick 20:15 UTC |
| 2026-07-19 | Tick 20:15 UTC: vigésimo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`be06ae1`, ~1h57min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (18:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 18:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `be06ae1` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `54d13da`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Solo documentación. | claude/rutina-2026-07-19-2015-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`f6af442`) — confirmado en el tick 22:15 UTC |
| 2026-07-19 | Tick 22:15 UTC: vigésimo primer disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`f6af442`, ~1h57min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (20:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 20:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `f6af442` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `be06ae1`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Este es el décimo disparo consecutivo (desde el tick 12:15 UTC del 2026-07-18) sin trabajo P1/P2 nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario; no se reabre campaña porque no es un estado nuevo, solo su continuación. Solo documentación. | claude/rutina-2026-07-19-2215-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`e85528a`) — confirmado en el tick 00:15 UTC del 2026-07-20 |
| 2026-07-20 | Tick 00:15 UTC: vigésimo segundo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`e85528a`, ~1h57min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (22:15 UTC del 2026-07-19) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 22:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `e85528a` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `f6af442`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Undécimo disparo consecutivo (desde el tick 12:15 UTC del 2026-07-18) sin trabajo P1/P2 nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario; no se reabre campaña porque no es un estado nuevo, solo su continuación. Solo documentación. | claude/rutina-2026-07-20-0015-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`2473392`) — confirmado en el tick 02:15 UTC |
| 2026-07-20 | Tick 02:15 UTC: vigésimo tercer disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`2473392`, ~1h57min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (00:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 00:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `2473392` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `e85528a`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Duodécimo disparo consecutivo (desde el tick 12:15 UTC del 2026-07-18) sin trabajo P1/P2 nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario; no se reabre campaña porque no es un estado nuevo, solo su continuación. Solo documentación. | claude/rutina-2026-07-20-0215-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`cb220ec`) — confirmado en el tick 04:15 UTC |
| 2026-07-20 | Tick 04:15 UTC: vigésimo cuarto disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`cb220ec`, ~1h57min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (02:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 02:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `cb220ec` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `2473392`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Décimo tercer disparo consecutivo (desde el tick 12:15 UTC del 2026-07-18) sin trabajo P1/P2 nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario; no se reabre campaña porque no es un estado nuevo, solo su continuación. Solo documentación. | claude/rutina-2026-07-20-0415-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`d0fb9c0`) — confirmado en el tick 06:15 UTC |
| 2026-07-20 | Tick 06:15 UTC: vigésimo quinto disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`d0fb9c0`, ~1h57min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (04:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 04:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `d0fb9c0` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `cb220ec`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Décimo cuarto disparo consecutivo (desde el tick 12:15 UTC del 2026-07-18) sin trabajo P1/P2 nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario; no se reabre campaña porque no es un estado nuevo, solo su continuación. Solo documentación. | claude/rutina-2026-07-20-0615-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`54e9241`) — confirmado en el tick 08:15 UTC |
| 2026-07-20 | Tick 08:15 UTC: vigésimo sexto disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`54e9241`, ~1h57min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (06:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 06:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `54e9241` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `d0fb9c0`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Décimo quinto disparo consecutivo (desde el tick 12:15 UTC del 2026-07-18) sin trabajo P1/P2 nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario; no se reabre campaña porque no es un estado nuevo, solo su continuación. Solo documentación. | claude/rutina-2026-07-20-0815-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`db90d09`) — confirmado en el tick 10:15 UTC |
| 2026-07-20 | Tick 10:15 UTC: vigésimo séptimo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`db90d09`, ~1h56min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (08:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 08:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `db90d09` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `54e9241`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Décimo sexto disparo consecutivo (desde el tick 12:15 UTC del 2026-07-18) sin trabajo P1/P2 nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario; no se reabre campaña porque no es un estado nuevo, solo su continuación. Solo documentación. | claude/rutina-2026-07-20-1015-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`f21a4fa`) — confirmado en el tick 12:15 UTC |
| 2026-07-20 | Tick 12:15 UTC: vigésimo octavo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`f21a4fa`, ~1h56min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (10:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 10:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `f21a4fa` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `db90d09`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Décimo séptimo disparo consecutivo (desde el tick 12:15 UTC del 2026-07-18) sin trabajo P1/P2 nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario; no se reabre campaña porque no es un estado nuevo, solo su continuación. Solo documentación. | claude/rutina-2026-07-20-1215-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`57cbc2e`) — confirmado en el tick 14:15 UTC |
| 2026-07-20 | Tick 14:15 UTC: vigésimo noveno disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`57cbc2e`, ~1h55min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (12:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 12:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `57cbc2e` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `db90d09`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Décimo octavo disparo consecutivo (desde el tick 12:15 UTC del 2026-07-18) sin trabajo P1/P2 nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario; no se reabre campaña porque no es un estado nuevo, solo su continuación. Solo documentación. | claude/rutina-2026-07-20-1415-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`9a5345b`) — confirmado en el tick 16:15 UTC |
| 2026-07-20 | Tick 16:15 UTC: trigésimo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`9a5345b`, ~1h57min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (14:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 14:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `9a5345b` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md` (seguía apuntando a `57cbc2e`). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Décimo noveno disparo consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario; no se reabre campaña porque no es un estado nuevo, solo su continuación. Solo documentación. | claude/rutina-2026-07-20-1615-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`2807634`) — confirmado en el tick 08:15 UTC del 2026-07-24 (gap de ~88h sin disparos entre ambos ticks, ver hallazgo operativo en Estado general y este Registro) |
| 2026-07-24 | Tick 08:15 UTC: trigésimo primer disparo — Inbox `(vacío)`, sin triaje. Anti-solape: `main` sin cambios desde el tick anterior (`2807634`), working tree limpio, sin ramas/worktrees huérfanos → procedió con normalidad. Corregida la fila de arriba ("pendiente de push" → confirmado mergeado). **Hallazgo operativo:** ~88h/~44 disparos esperados (cron `15 */2 * * *`) sin ningún commit/reporte entre el tick 16:15 UTC del 2026-07-20 y este — sin `*-SALTADA.md` que lo explique, trigger verificado `enabled` y sin `suspension_reason` vía `list_triggers`; causa raíz no determinable desde este repo (infraestructura de la plataforma de routines). Notificado al usuario fuera de banda. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que el tick anterior. Solo documentación. | claude/rutina-2026-07-24-0815-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`906a023`) — confirmado en el tick 10:15 UTC |
| 2026-07-24 | Tick 10:15 UTC: trigésimo segundo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`906a023`, ~1h54min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (08:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 08:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `906a023` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md`. **Sobre el gap operativo del tick anterior (~88h sin disparos entre el 2026-07-20 16:15 UTC y el 2026-07-24 08:15 UTC):** este tick disparó normalmente ~2h después del anterior (cadencia esperada del cron `15 */2 * * *`) — no hay un segundo gap; el hallazgo del tick 08:15 UTC sigue documentado como incidente pasado, no como problema recurrente confirmado, pero se mantiene sin causa raíz determinada (no hay forma de saber desde este repo si fue un incidente puntual de la plataforma o si podría repetirse). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que el tick anterior (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Solo documentación. | claude/rutina-2026-07-24-1015-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`426d99b`) — confirmado en el tick 12:15 UTC |
| 2026-07-24 | Tick 12:15 UTC: trigésimo tercer disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`426d99b`, ~1h56min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (10:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: (1) la fila del tick 10:15 UTC decía "pendiente de push" pese a ya estar mergeada en `426d99b` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md`; (2) hallazgo nuevo — línea huérfana `- (vacío)` al final de "Estado general" (arrastrada desde el commit `68f23dd` del tick 18:15 UTC del 2026-07-18, ~24 ticks sin detectarse), sin efecto en el parsing del Inbox ni en el conteo de checkboxes del Brief pero incorrecta como documentación — eliminada. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Vigésimo segundo tick consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo nuevo delegable. | claude/rutina-2026-07-24-1215-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`25d08b4`) — confirmado en el tick 14:15 UTC |
| 2026-07-24 | Tick 14:15 UTC: trigésimo cuarto disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`25d08b4`, ~1h55min de antigüedad en el momento del fetch) es el merge de `fabrica-sync` del propio tick anterior (12:15 UTC) — sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real: único hallazgo, la fila del tick 12:15 UTC en el Registro de trabajo decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `25d08b4` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md`. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Vigésimo tercer tick consecutivo (desde 2026-07-18 12:15 UTC) sin trabajo nuevo delegable — la cola sigue vacía de ítems accionables sin decisión del usuario. | claude/rutina-2026-07-24-1415-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`eb1990a`) — confirmado en el tick 16:15 UTC |
| 2026-07-24 | Tick 16:15 UTC: trigésimo quinto disparo — fix de seguridad: bump de patch `next` `16.2.10`→`16.2.11` (elimina 9 CVEs altos propios de Next.js reportados por `npm audit`; `postcss`/`sharp` quedan pineados por el propio Next y no se resuelven así, ver P2). Delegado a subagente `implementador` en worktree, diff verificado (solo `package.json`+`package-lock.json`), gate completo corrido por el orquestador sobre el resultado | claude/rutina-2026-07-24-1615-security-patch | f59f229 (cherry-pick de 7a0bf5f) | lint ✅ test:run 182/182 ✅ build ✅ (Next.js 16.2.11/Turbopack) | **Corregido en el tick 18:15 UTC:** el propio `fabrica-sync.yml` NO tiene excepción para `package.json`/`package-lock.json` (peldaño 4 mergea CUALQUIER diff de código tras gate en CI, sin distinguir por archivo) — la fila anterior decía "peldaño 3, no auto-mergeable" por error de este mismo tick, sin verificar contra el workflow real. `fabrica-sync` SÍ la auto-mergeó: commit `9d44feb` ("peldaño 4 — gate completo en verde en CI"), confirmado en `main`. |
| 2026-07-24 (13:30–13:40 UTC) | Feature de usuario (sesión interactiva, pedido original 2026-07-19): panel colapsable `<details>/<summary>` con `docs/SPECS.md` al inicio del dashboard de cada proyecto — ver de un vistazo con qué formulario/specs se creó sin ocupar espacio permanente. Sin escritura nueva (lee un archivo que ya se commitea sin cambios desde la creación). Mergeado directo a `main` por la sesión interactiva (no pasa por `fabrica-sync`). Fila agregada en el tick 18:15 UTC porque no tenía registro en esta tabla. | main (merge directo) | 84a6b87/b177025 | lint ✅ test:run 182/182 ✅ build ✅ (verificado por este tick sobre el HEAD real) | Completado — en producción |
| 2026-07-24 | Tick 18:15 UTC: trigésimo sexto disparo — Inbox `(vacío)`, sin triaje. Anti-solape: `main` avanzó a `b177025` (~35 min de antigüedad en el momento del fetch, patrón de sesión interactiva, no de esta routine) sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Auditoría de estado real, dos hallazgos: (1) la fila del tick 16:15 UTC (bump de seguridad de Next.js) decía "pendiente de merge por el usuario (peldaño 3)" pero `fabrica-sync.yml` no distingue `package.json`/`package-lock.json` del resto del código — sí lo auto-mergeó vía peldaño 4 (`9d44feb`), corregido arriba; (2) el panel colapsable de specs originales (`84a6b87`/`b177025`, sesión interactiva, pedido 2026-07-19) llegó a `main` sin fila en este Registro ni mención en `CLAUDE.md` — agregada arriba y ancla de rollback actualizada. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, proxy de IA Paquetes 1/2 fuera del alcance autónomo, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario). Solo documentación. | claude/rutina-2026-07-24-1815-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`04ab8a1`) — confirmado en el tick 00:15 UTC (2026-07-25) |
| 2026-07-24 | Tick 20:15 UTC: trigésimo séptimo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: `main` en `04ab8a1` (~2h de antigüedad, sin working tree sucio ni ramas/worktrees huérfanos) → tick procedió con normalidad. Auditoría de estado real (verificación cruzada `list_triggers` vs `src/lib/cron.ts`, no solo el trigger propio): halló que `CRON_TRABAJADORAS_POOL` estaba desincronizado de la cadencia real de `rutina-trabajadora-1`/`rutina-trabajadora-2` desde ~2026-07-24T04:58 UTC (cambio hecho fuera de este repo) — corregido con un subagente `implementador` en worktree (commit `f579703`), gate en verde (lint ✅ test:run 182/182 ✅ build ✅). Estacionada pregunta nueva: si el retorno de `rutina-trabajadora-1` a cadencia de 2h fue intencional. `routine-fabrica-consola` verificada contra `list_triggers` sin discrepancias propias (`trig_01NduNpiSB2NsJNuCPxmpQQp`, `last_fired_at` coincide con este tick). Push a `claude/rutina-2026-07-24-2015-cron-pool-sync` | claude/rutina-2026-07-24-2015-cron-pool-sync | b4f528a (hallazgo+estación) · f579703 (fix cron.ts, subagente) · 0e57922 (merge) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`8bc1fda`) — confirmado en el tick 22:15 UTC |
| 2026-07-24 | Tick 22:15 UTC: trigésimo octavo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: `main` en `8bc1fda` (~1h50min de antigüedad, sin working tree sucio ni ramas/worktrees huérfanos) → tick procedió con normalidad, `git log 04ab8a1..8bc1fda` confirmó que solo el trabajo esperado del tick 20:15 UTC llegó a `main`. Corregida la fila de arriba (decía "pendiente de fabrica-sync", ya mergeado). `npm audit --audit-level=high` mostró **12 vulnerabilidades altas, no 3** — hallazgo nuevo: 9 vienen de `brace-expansion` (GHSA-mh99-v99m-4gvg, DoS por expansión no acotada) arrastrado por TODA la cadena de tooling de lint (`eslint`→`@eslint/config-array`→`minimatch`→`brace-expansion@1.1.16`, y también vía `@typescript-eslint/typescript-estree`/`eslint-config-next`). Delegado a un subagente `implementador` en worktree para investigar y aplicar un override seguro (`brace-expansion@5.0.8`, el patch que corrige el CVE) — el subagente hizo repro-primero y encontró que la premisa era falsa: `brace-expansion` publica 5 líneas mayores paralelas sin interoperar, la rama que usa `eslint@9.39.5` (única `9.x` disponible) sigue en `brace-expansion@1.1.16` vía `minimatch@3.1.5` con la API vieja (`require('brace-expansion')` como función, no exportación nombrada) — forzar `5.0.8` ahí rompe `npm run lint` en caliente (`TypeError: expand is not a function`, verificado). Un override acotado solo a la rama de `@typescript-eslint/typescript-estree` (que sí usa `minimatch@10.x` compatible) deja el gate en verde pero el conteo de `npm audit` sigue en 12 (el advisory se dispara por paquete, no por instancia). El único camino real para las 9 es `eslint@10.8.0` (major, breaking change) — la propia tarea delegada lo prohibió explícitamente por el riesgo. El subagente revirtió TODO (sin commit, working tree limpio, rama `fix/brace-expansion-override` sin cambios sobre el checkpoint) en vez de dejar un fix parcial o roto — correcto según el protocolo de repro-primero y "código completo o revertir a estado consistente". Ver P2 y Decisiones estacionadas nuevas abajo. Entorno re-verificado con `npm ci` + gate real en verde sobre el HEAD real de `main` (sin el intento revertido): lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack, Node v22.22.2). `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); resto de P2 sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, `postcss`/`sharp` pineados por Next sin acción posible, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario, cadencia de `rutina-trabajadora-1` sin decisión del usuario, y ahora el bump mayor de `eslint` sin decisión del usuario). Solo documentación — sin código nuevo mergeado este tick (el intento de fix se revirtió por seguridad). | claude/rutina-2026-07-24-2215-audit-deps-security | (solo docs, intento de fix revertido sin commit) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`45ec0f1`) — confirmado en el tick 00:15 UTC (2026-07-25) |
| 2026-07-25 | Tick 00:15 UTC: trigésimo noveno disparo — Inbox `(vacío)`, sin triaje. Auditoría de estado real: 2 filas de este Registro (ticks 18:15 y 22:15 UTC del 2026-07-24) decían "pendiente" pese a estar ya mergeadas por fabrica-sync (`04ab8a1`, `45ec0f1`) — corregidas, junto con la ancla de rollback de CLAUDE.md. Gate real en verde: lint ✅ test:run 182/182 ✅ build ✅ (Next.js 16.2.11/Turbopack, Node v22.22.2). `npm audit` sigue en 12 altas, sin cambio. P0/P1/P2 sin ítems nuevos delegables — mismos bloqueos por decisión de usuario. Solo documentación. | claude/rutina-2026-07-25-0015-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`122d5d7`) — confirmado en el tick 02:15 UTC |
| 2026-07-25 | Tick 02:15 UTC: cuadragésimo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: `main` en `122d5d7` (~1h56min de antigüedad en el momento del fetch, merge de fabrica-sync del tick anterior 00:15 UTC) sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`) → tick procedió con normalidad. Único hallazgo: la fila del tick 00:15 UTC decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `122d5d7` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md`. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack, Node v22.22.2). `npm audit --audit-level=high` sigue en **12** vulnerabilidades altas (3 `postcss`/`sharp` pineadas por Next, 9 `brace-expansion` por la cadena de `eslint`), sin cambio desde el tick 22:15 UTC del 2026-07-24 — ambas sin acción de código posible sin decisión del usuario. `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, `postcss`/`sharp` pineados por Next sin acción posible, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario, cadencia de `rutina-trabajadora-1` sin decisión del usuario, bump mayor de `eslint` sin decisión del usuario). Vigésimo sexto tick consecutivo (desde 2026-07-18 12:15 UTC) con solo housekeeping documental — sin trabajo de código nuevo delegable. Solo documentación. | claude/rutina-2026-07-25-0215-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`f65f394`) — confirmado en el tick 04:15 UTC |
| 2026-07-25 | Tick 04:15 UTC: cuadragésimo primer disparo — Inbox `(vacío)`, sin triaje. Anti-solape: `main` en `f65f394` (~1h57min de antigüedad en el momento del fetch, merge de fabrica-sync del tick anterior 02:15 UTC) sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`, sin worktrees adicionales) → tick procedió con normalidad. Único hallazgo: la fila del tick 02:15 UTC decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `f65f394` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md`. `list_triggers` verificado sin discrepancias: `routine-fabrica-consola` (`trig_01NduNpiSB2NsJNuCPxmpQQp`) enabled, cron `15 */2 * * *`, `next_run_at` 06:15 UTC — coincide con este disparo; `rutina-trabajadora-1` sigue en `15 */2 * * *` (cadencia de 2h, pregunta sin responder en Decisiones estacionadas, sin cambio). Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack). `npm audit --audit-level=high` sigue en **12** vulnerabilidades altas (mismos paquetes: `postcss`/`next`/`sharp` pineados por Next — el rango de `postcss` subió de `≤8.5.11` a `≤8.5.17` sin cambiar el conteo total ni agregar CVEs nuevos de fondo distinto; 9 de `brace-expansion` por la cadena de `eslint`), sin cambio desde el tick 22:15 UTC del 2026-07-24. `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, `postcss`/`sharp` pineados por Next sin acción posible, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario, cadencia de `rutina-trabajadora-1` sin decisión del usuario, bump mayor de `eslint` sin decisión del usuario). Vigésimo séptimo tick consecutivo (desde 2026-07-18 12:15 UTC) con solo housekeeping documental — sin trabajo de código nuevo delegable. Solo documentación. | claude/rutina-2026-07-25-0415-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`9645622`) — confirmado en el tick 06:15 UTC |
| 2026-07-25 | Tick 06:15 UTC: cuadragésimo segundo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: `main` en `9645622` (~1h57min de antigüedad en el momento del fetch, merge de fabrica-sync del tick anterior 04:15 UTC) sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`, `git worktree list` sin entradas extra) → tick procedió con normalidad. Único hallazgo: la fila del tick 04:15 UTC decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `9645622` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md`. `list_triggers` verificado sin discrepancias: `routine-fabrica-consola` (`trig_01NduNpiSB2NsJNuCPxmpQQp`) enabled, cron `15 */2 * * *`, `next_run_at` 08:15 UTC — coincide con este disparo; `rutina-trabajadora-1` sigue en `15 */2 * * *` (cadencia de 2h, pregunta sin responder en Decisiones estacionadas, sin cambio); `rutina-trabajadora-2` (`15 * * * *`), `rutina-despachadora` (`5 * * * *`) y `routine-madre-fabrica` (`50 * * * *`) sin discrepancias. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack, Node v22.22.2). `npm audit --audit-level=high` sigue en **12** vulnerabilidades altas (3 `postcss`/`sharp` pineadas por Next, 9 `brace-expansion` por la cadena de `eslint`), sin cambio desde el tick 22:15 UTC del 2026-07-24. `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, `postcss`/`sharp` pineados por Next sin acción posible, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario, cadencia de `rutina-trabajadora-1` sin decisión del usuario, bump mayor de `eslint` sin decisión del usuario). Vigésimo octavo tick consecutivo (desde 2026-07-18 12:15 UTC) con solo housekeeping documental — sin trabajo de código nuevo delegable. Solo documentación. | claude/rutina-2026-07-25-0615-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`5d0f6b5`) — confirmado en el tick 08:15 UTC |
| 2026-07-25 | Tick 08:15 UTC: cuadragésimo tercer disparo — Inbox `(vacío)`, sin triaje. Anti-solape: `main` en `5d0f6b5` (~1h55min de antigüedad en el momento del fetch, merge de fabrica-sync del tick anterior 06:15 UTC) sin working tree sucio ni ramas/worktrees huérfanos (`git branch -a` solo devuelve `main` + `origin/main`, `git worktree list` sin entradas extra) → tick procedió con normalidad. Único hallazgo: la fila del tick 06:15 UTC decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `5d0f6b5` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md`. `list_triggers` verificado sin discrepancias en los 5 triggers reales: `routine-fabrica-consola` (`trig_01NduNpiSB2NsJNuCPxmpQQp`) enabled, cron `15 */2 * * *`, `next_run_at` 10:15 UTC — coincide con este disparo; `rutina-trabajadora-1` sigue en `15 */2 * * *` (cadencia de 2h, pregunta sin responder en Decisiones estacionadas, sin cambio); `rutina-trabajadora-2` (`15 * * * *`), `rutina-despachadora` (`5 * * * *`) y `routine-madre-fabrica` (`50 * * * *`) sin discrepancias. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack). `npm audit --audit-level=high` sigue en **12** vulnerabilidades altas (3 `postcss`/`sharp` pineadas por Next, 9 `brace-expansion` por la cadena de `eslint`), sin cambio desde el tick 22:15 UTC del 2026-07-24. `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, `postcss`/`sharp` pineados por Next sin acción posible, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario, cadencia de `rutina-trabajadora-1` sin decisión del usuario, bump mayor de `eslint` sin decisión del usuario). Vigésimo noveno tick consecutivo (desde 2026-07-18 12:15 UTC) con solo housekeeping documental. Solo documentación. | claude/rutina-2026-07-25-0815-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`6dab8a3`) — confirmado en el tick 10:15 UTC |
| 2026-07-25 | Tick 10:15 UTC: cuadragésimo cuarto disparo — Inbox `(vacío)`, sin triaje. Anti-solape: `main` en `6dab8a3` (~1h56min de antigüedad en el momento del fetch, merge de fabrica-sync del tick anterior 08:15 UTC) sin working tree sucio ni ramas/worktrees huérfanos (`git branch -a` solo devuelve `main` + `origin/main`, `git worktree list` sin entradas extra) → tick procedió con normalidad. Único hallazgo: la fila del tick 08:15 UTC decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `6dab8a3` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md`. `list_triggers` verificado sin discrepancias en los 5 triggers reales: `routine-fabrica-consola` (`trig_01NduNpiSB2NsJNuCPxmpQQp`) enabled, cron `15 */2 * * *`, `next_run_at` 12:15 UTC — coincide con el disparo tras este; `rutina-trabajadora-1` sigue en `15 */2 * * *` (cadencia de 2h, pregunta sin responder en Decisiones estacionadas, sin cambio); `rutina-trabajadora-2` (`15 * * * *`), `rutina-despachadora` (`5 * * * *`) y `routine-madre-fabrica` (`50 * * * *`) sin discrepancias. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack, Node v22.22.2). `npm audit --audit-level=high` sigue en **12** vulnerabilidades altas (3 `postcss`/`sharp` pineadas por Next, 9 `brace-expansion` por la cadena de `eslint`), sin cambio desde el tick 22:15 UTC del 2026-07-24. `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, `postcss`/`sharp` pineados por Next sin acción posible, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario, cadencia de `rutina-trabajadora-1` sin decisión del usuario, bump mayor de `eslint` sin decisión del usuario). Trigésimo tick consecutivo (desde 2026-07-18 12:15 UTC) con solo housekeeping documental — sin trabajo de código nuevo delegable. Solo documentación. | claude/rutina-2026-07-25-1015-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Mergeado a main por fabrica-sync (`f8cc702`) — confirmado en el tick 12:15 UTC |
| 2026-07-25 | Tick 12:15 UTC: cuadragésimo quinto disparo — Inbox `(vacío)`, sin triaje. Anti-solape: `main` en `f8cc702` (~1h57min de antigüedad en el momento del fetch, merge de fabrica-sync del tick anterior 10:15 UTC) sin working tree sucio ni ramas/worktrees huérfanos (`git branch -r` solo devuelve `origin/main`, `git worktree list` sin entradas extra) → tick procedió con normalidad. Único hallazgo: la fila del tick 10:15 UTC decía "pendiente de push" pese a que `fabrica-sync` ya la había integrado en `f8cc702` — corregida arriba, junto con la `Ancla de rollback` de `CLAUDE.md`. `list_triggers` verificado sin discrepancias en los 5 triggers reales: `routine-fabrica-consola` (`trig_01NduNpiSB2NsJNuCPxmpQQp`) enabled, cron `15 */2 * * *`, `next_run_at` 14:15 UTC — coincide con el disparo tras este; `rutina-trabajadora-1` sigue en `15 */2 * * *` (cadencia de 2h, pregunta sin responder en Decisiones estacionadas, sin cambio); `rutina-trabajadora-2` (`15 * * * *`), `rutina-despachadora` (`5 * * * *`) y `routine-madre-fabrica` (`50 * * * *`) sin discrepancias. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **182/182** ✅ (sin cambio), build ✅ (Next.js 16.2.11/Turbopack, Node v22.22.2). `npm audit --audit-level=high` sigue en **12** vulnerabilidades altas (3 `postcss`/`sharp` pineadas por Next, 9 `brace-expansion` por la cadena de `eslint`), sin cambio desde el tick 22:15 UTC del 2026-07-24. `TAREAS-MANUALES.md` revisado: sin tareas nuevas, solo la 🟡 3 sigue pendiente sin bloquear. P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables — mismos bloqueos por decisión de usuario que ticks anteriores (Refinado instantáneo y Playwright E2E estacionados, Motor B no es v1, `tipo:"gem"` condicionado a un segundo tipo de proyecto, `postcss`/`sharp` pineados por Next sin acción posible, mecanismo de reemplazo de `fire_trigger` sin decisión del usuario, cadencia de `rutina-trabajadora-1` sin decisión del usuario, bump mayor de `eslint` sin decisión del usuario). Trigésimo primer tick consecutivo (desde 2026-07-18 12:15 UTC) con solo housekeeping documental — sin trabajo de código nuevo delegable. Solo documentación. | claude/rutina-2026-07-25-1215-auditoria | (solo docs) | lint ✅ test:run 182/182 ✅ build ✅ | Pendiente de push (solo-estado, auto-mergeable por fabrica-sync) |
