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
       "cadencia_cron": "0 */2 * * *",    // cadencia de la routine — la consola calcula el próximo tick sin APIs
       "ultimo_tick": "2026-07-17T06:00:00Z", // lo actualiza la routine al INICIAR cada tick con trabajo
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

**Al enviar**, el backend: (1) crea el repo desde el template + topic; (2) conecta el proyecto a
Vercel vía API si hay `VERCEL_TOKEN` (§4.5); (3) commitea `.fabrica.json` + `docs/SPECS.md` y
siembra el backlog P0 con las features.

## 1.1 Tipo de proyecto "Gem" — chatbot con rol persistente (decisión del usuario, 2026-07-17)

No todos los proyectos son iguales: el formulario ofrece un **checkbox "🤖 Gem (chatbot con
rol)"** que, al marcarse, muestra un **textarea "Rol del bot"** (placeholder: *"Eres un
entrenador fitness y me darás dietas con estos ingredientes: aguacate, cebolla…"*). Sin marcar,
el formulario funciona exactamente como siempre. Marcado, la consola siembra el proyecto con el
**blueprint Gem** en vez de pedir features MVP a mano:

- **Features MVP fijas del blueprint** (el usuario puede agregar extras): (a) CRUD de Gems
  (nombre + rol en textarea; lista como pantalla principal; "Asistente general" sin rol por
  default); (b) chat con streaming contra la API de Claude server-side (`ANTHROPIC_API_KEY` env
  var del proyecto — queda como tarea manual 🔴 del repo nuevo) donde el rol viaja como parámetro
  `system` en CADA llamada, fuera del historial — si hay que truncar contexto se truncan mensajes
  viejos, JAMÁS el rol (esa es la garantía de que "no se pierde"); historial y Gems en
  localStorage (sin BD); (c) botón "✨ Mejorar rol": reescribe el rol con la API de Claude
  (identidad/tono/reglas/datos fijos) en preview editable — nunca se guarda sin aprobación.
- **El rol del usuario viaja TAL CUAL** al `docs/SPECS.md` del repo nuevo (sección "Rol
  inicial"), y `.fabrica.json` gana `tipo: "gem"`. **El refinado del rol lo hace la routine del
  proyecto en su primer tick** (mismo patrón que el triaje del Inbox: mejora wording/estructura;
  si el cambio es sustancial lo estaciona como decisión `[USUARIO]`, si es pulido lo aplica) —
  la consola sigue sin llamar a ningún LLM.
- **Qué NO es v1 de un Gem**: multi-usuario, sync en la nube, compartir Gems, archivos/voz.
- Multiplataforma como siempre: el Gem se usa desde el celular.
**UX del flujo (decisión del usuario, 2026-07-17):** durante la creación, botón deshabilitado +
indicador de progreso por pasos con el estado real (creando repo → conectando Vercel → sembrando
backlog); al terminar, **redirección automática al dashboard del proyecto nuevo** con el dropdown
revalidado y el proyecto seleccionado, banner de éxito con la liga al repo y la `preview_url`, y
estado de la routine ("🏭 la routine madre la instalará automáticamente, ≤1h" mientras el
manifest no tenga `trigger_id`; el prompt de `/schedule` pre-rellenado con botón copiar queda
como fallback colapsable). Errores por paso con detalle y reintento — nunca fallos silenciosos.
Desde ese momento el dashboard del proyecto (cola, brief, Inbox, tareas manuales) es el hub de
mejora continua.

## 2. Dashboard por proyecto (el seguimiento amigable)

Header: **dropdown de proyectos** (repos con el topic, nombre desde `.fabrica.json`) + badge de
estado + link al repo + preview_url.

Secciones (todas se LEEN de archivos del repo — la consola no tiene base de datos propia):

| Sección | Fuente | Render |
|---|---|---|
| **📊 Progreso** | checkboxes del backlog (`- [ ]`/`- [x]` en P0/P1) | barra de progreso + lista de features con ✅/⏳ |
| **🕐 Cola y tiempos** | orden del backlog + marcador `🔄` + `cadencia_cron`/`ultimo_tick` del manifest | cola numerada de pendientes en su orden real, badge "🔄 trabajando ahora", countdown al próximo tick y espera estimada por posición (ver §2.2) |
| **🔔 Decisiones que te esperan** | sección `[USUARIO]`/estacionadas del backlog | **la killer feature** (subida a v1 el 2026-07-17): cada decisión como card con la pregunta + `input text`/botones → al responder, la consola commitea la respuesta AL INBOX (`Respuesta a decisión "...": ...` — única zona de escritura) → card en "respondida — la fábrica la tomará en ~X min" (countdown al mínimo entre el tick del proyecto y el despachador de la madre a los :50). **Sin deep-links a claude.ai: los usuarios de la consola no tienen acceso a routines** — el despacho lo hace la routine madre (fire_trigger) o, en v3, Motor B al instante. |
| **📝 Último reporte** | `docs/reportes/` más reciente | markdown renderizado (qué se hizo, gate, estacionado) |
| **📋 Brief hecho/pendiente** | backlog (checkboxes, `🔄`, Registro de trabajo) + último reporte | resumen derivado POR PARSING, sin LLM: completadas recientes, en curso, pendientes con posición en cola y conteos por prioridad; botón ↻ Actualizar |
| **🧑 Tus tareas manuales** | `docs/TAREAS-MANUALES.md` | documento vivo: render sanitizado + botón ↻ Actualizar; marcar ✅ desde la web (commit) queda para v2 |
| **📜 Historial** | tabla "Registro de trabajo" del backlog + `git log` | timeline de merges con hashes |
| **▶️ Acciones** | — | botón "Disparar routine ahora" (deep-link a `claude.ai/code/routines/<trigger_id>` — el run-now vive allá) · "＋ Nueva tarea / feedback" (ver §2.1 — input inteligente) · "Pedir auditoría retrospectiva" (commitea la solicitud) |

**El principio que hace esto simple**: la consola nunca habla con la routine — **escribe y lee el
repo, igual que todos los demás trabajadores de la fábrica**. El backlog sigue siendo el bus; la
consola es solo una vista bonita + un editor guiado del bus.

**Frescura (decisión del usuario, 2026-07-17):** el dashboard es un documento vivo — todas sus
lecturas a la API de GitHub van con `cache: 'no-store'`, y un botón **"↻ Actualizar"**
(componente compartido: en el header y en las secciones Brief y Tareas manuales) fuerza la
re-lectura inmediata del repo (`router.refresh()`), con "actualizado hace Xs" por sección. Así,
en cuanto la routine commitea (inicio de tick, cierre de lote, reporte nuevo), un clic trae lo
último sin recargar el navegador.

## 2.1 Input inteligente de feedback (decisión del usuario, 2026-07-17 — subido a v1)

El usuario escribe feedback/ideas/specs sobre un proyecto ya creado en lenguaje natural desde el
dashboard. Patrón **Inbox + triaje en el cron** — la consola es tonta a propósito; la
inteligencia ya está pagada en la routine:

1. **La consola commitea tal cual:** el API route agrega el texto (con fecha) DENTRO de la
   sección `📥 Inbox` del `docs/backlog.md` del proyecto. Sin LLM, sin secretos nuevos, sin
   decidir prioridades.
2. **La routine hace el triaje en su próximo tick** (paso "TRIAJE DEL INBOX" de
   `docs/plantilla-routine-prompt.md`): mejora el wording, redacta criterios de aceptación
   (dado/cuando/entonces), deduplica contra tareas existentes, asigna prioridad y mueve cada
   entrada a P0/P1/P2 — o la estaciona como pregunta `[USUARIO]` si es ambigua. El Inbox queda
   vacío tras cada triaje.

Por qué así: el backlog conserva un ÚNICO escritor con criterio (la routine/orquestador); la
consola solo appendea en su buzón designado, así no hay conflictos de edición ni prioridades
decididas por dos cerebros distintos; y no se configura ni paga nada nuevo (la routine ya corre
con la suscripción). Trade-off aceptado: el wording mejorado se ve en el siguiente tick, no al
instante. **Mejora opcional futura (P2):** refinado instantáneo con preview editable llamando a
la API de Claude desde el API route (`ANTHROPIC_API_KEY` server-side) — solo UX; el triaje del
cron sigue siendo la única autoridad.

## 2.2 Cola por proyecto y tiempos de espera (decisión del usuario, 2026-07-17)

Todo se deriva de archivos del repo — cero estado nuevo, cero APIs extra:

- **El backlog ES la cola.** El orden del archivo (P0 arriba→abajo, luego P1) es el orden en que
  la routine toma tareas (regla 6 del protocolo del backlog). La consola numera los pendientes:
  "#1 entra en el próximo tick". Repriorizar = el triaje reordena el archivo.
- **"Trabajando ahora" con el marcador `🔄`.** Al iniciar un tick con trabajo, la routine
  commitea el backlog anteponiendo `🔄` a las tareas del lote y actualiza `ultimo_tick` en
  `.fabrica.json`; al cerrar el lote los retira (`[x]` si completó). Si la consola ve tareas `🔄`,
  muestra el badge "🏭 trabajando ahora (desde <ultimo_tick>)".
- **Countdown al próximo tick.** `cadencia_cron` en el manifest → la consola calcula el próximo
  disparo de la expresión cron en el cliente y muestra "próximo tick en ~Xm".
- **Espera estimada por tarea.** posición en la cola y lotes de 2-6 por tick →
  `ceil(posición / 4) × cadencia` como estimado grueso, mostrado junto a cada tarea pendiente.
- **Burn-down ("cuándo se empieza a rebajar").** Historial de commits de `docs/backlog.md`
  (GitHub Commits API, muestreado) → conteo de checkboxes pendientes por fecha → gráfica SVG
  ligera de pendientes vs tiempo en el dashboard.

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

**Escala multi-proyecto (aclaración 2026-07-17): UNA routine POR proyecto, nunca una routine
para todos.** Cada repo tiene su backlog (su cola) y su routine propia con su cadencia (campo 10
del formulario); N proyectos = N routines independientes en paralelo, cada una tomando su lote de
2-6 tareas de SU cola. Reglas de escala:
- **Escalonar los ticks**: la consola asigna a cada proyecto nuevo un offset de minutos distinto
  (`0 */2 * * *`, `15 */2 * * *`, `30 */2 * * *`, `45 */2 * * *`, y rota) para que no se disparen
  todas a la misma hora — reparte el consumo de la suscripción y las sesiones concurrentes. El
  cron elegido se guarda en `cadencia_cron` del manifest.
- **Proyectos sin trabajo cuestan ~cero**: el candado `CAMPANA-*-FINAL.md` hace que sus ticks
  terminen en segundos (o la routine quede deshabilitada); dejar feedback en su `📥 Inbox` los
  reabre solo. En la práctica solo los proyectos con backlog vivo consumen ticks completos.
- **El límite es la suscripción, no la arquitectura**: si los proyectos activos simultáneos
  superan lo que la suscripción aguanta (ticks que se encolan, cuota agotada), ese es el
  disparador para migrar esos proyectos a Motor B (abajo) — por token, sin límite de sesiones.

**Despachador de Inboxes (v2 de la madre, 2026-07-17):** como los usuarios de la consola NO
tienen acceso a claude.ai/routines, la reacción rápida al feedback no puede depender de deep-links
ni de "run now" manual. La routine madre, en cada tick horario (:50), revisa el `📥 Inbox` de
todos los proyectos de la fábrica y dispara con `fire_trigger` la routine de los que tengan
entradas pendientes (con anti-duplicado: no dispara si la routine corrió hace <15 min o su tick
está a <10 min). Latencia máxima del feedback: ~1h; Motor B (v3) la bajará a segundos con
`workflow_dispatch` desde la propia consola.

**¿Instalación autónoma de la routine al crear el proyecto? (análisis 2026-07-17)** La consola
NO puede crear routines de claude.ai desde sus API routes (no hay API pública — la limitación
honesta de §3). Dos caminos:
1. **"Routine madre" (experimento, costo cero):** una única routine creada UNA vez por el usuario
   desde la UI de routines de claude.ai (las creadas desde la UI pueden conservar las
   herramientas de gestión de triggers; las creadas programáticamente nacen sin ellas —
   verificado 2026-07-17). En cada tick: busca repos con topic `fabrica-agentes` cuyo
   `.fabrica.json` no tenga `trigger_id`, crea la routine del proyecto desde la plantilla (con
   offset escalonado) y escribe el `trigger_id` de vuelta en el manifest. Su PRIMER tick debe
   verificar si realmente dispone de la herramienta create_trigger: si no, reportarlo y
   autodeshabilitarse — el experimento se descarta sin daño.
2. **Motor B (garantizado):** la instalación 100% automática sin depender de internals de
   claude.ai — el workflow viaja en el template y la consola solo setea el secret por API de
   GitHub. Por token (v3 del roadmap).
Mientras tanto, v1 mantiene la pantalla de arranque (prompt pre-rellenado + copiar/pegar en
/schedule, ~1 min por proyecto, una vez).

### Motor B — GitHub Actions + Claude Agent SDK (instalación 100% automática) ⭐ para la consola

**Arquitectura de secreto único (decisión del usuario, 2026-07-17): la `ANTHROPIC_API_KEY`
NUNCA se distribuye a los repos de proyectos.** La versión original de esta sección ("la consola
setea el secret ANTHROPIC_API_KEY vía la API de GitHub" en cada repo nuevo) queda DESCARTADA:
N repos donde escriben agentes = N copias del secreto × N superficies de exfiltración (los
workflows de un repo pueden leer sus secrets, y el Inbox acepta texto libre — vector de prompt
injection). Diseño correcto: **un runner central** — UN solo repo (`fabrica-runner`, intocable
para las routines, solo el usuario lo modifica) guarda la única copia de la key + el PAT; su
workflow recibe `workflow_dispatch` con el proyecto objetivo, clona ese repo, corre Claude
headless contra él y pushea las ramas al repo del proyecto. Los repos de proyectos no llevan
ningún secret jamás. Complementos obligatorios: workspace dedicado de Anthropic con límite de
gasto mensual (hard cap) + key propia revocable + alertas de uso.

**Hallazgo verificado (2026-07-17): Motor B SIN API key no es viable.** Existe la vía oficial
Pro/Max (`claude setup-token` → `CLAUDE_CODE_OAUTH_TOKEN` en el workflow, consumo por
suscripción), PERO el token OAuth expira en ~1 día y su renovación exige navegador humano —
inviable para cron autónomo (sería renovación manual diaria de todos los repos, peor que el
1 min/proyecto del Motor A). Conclusión: Motor B = `ANTHROPIC_API_KEY` (por token) o nada; la
autonomía con suscripción es Motor A + pantalla de arranque.
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

**Decisión del usuario (2026-07-17): incluido en la P0 del formulario "Nuevo proyecto"** — al
crear el repo, la consola crea también el proyecto Vercel conectado (si `VERCEL_TOKEN` está
configurado; sin él, degradación elegante a tarea manual del proyecto nuevo).

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
