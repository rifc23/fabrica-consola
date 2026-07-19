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

- (vacío)

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
| 2026-07-19 | Tick 04:15 UTC: duodécimo disparo — Inbox `(vacío)`, sin triaje. Anti-solape: último commit de `main` (`a0366c1`, ~4 min de antigüedad) no coincide con el patrón de merges/reportes propios de la routine (commit de doc de arquitectura de sesión interactiva) y working tree/worktrees limpios → tick procedió con normalidad. Auditoría de estado real: único hallazgo, el commit `a0366c1` (plan del proxy de IA) sin fila en este Registro — agregada arriba junto con el bullet en Estado general. Entorno re-verificado con `npm ci` + gate real en verde: lint ✅, test:run **168/168** ✅ (sin cambio), build ✅ (Next.js 16.2.10/Turbopack, Node v22.22.2). P0/P1 sin cambios (todo `[x]`); P2 revisado ítem por ítem: sin ítems nuevos delegables (mismos bloqueos por decisión de usuario, más el proxy de IA que se suma a la lista de "aprobado pero fuera del alcance autónomo de esta routine"). Solo documentación. | claude/rutina-2026-07-19-0415-auditoria | (solo docs) | lint ✅ test:run 168/168 ✅ build ✅ | Pendiente de push (solo-estado, auto-mergeable por fabrica-sync) |
