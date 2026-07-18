# Tareas manuales del usuario — fabrica-consola

Todo lo que SOLO el humano puede hacer (credenciales, consolas, decisiones, pruebas en prod).
Ordenado por prioridad. Los agentes NO toman nada de aquí — está estacionado esperándote.

Formato de cada entrada:
```
## <emoji-prioridad> N. <Título>
**Qué:** <contexto en 1-2 líneas — por qué importa>
**Cómo:** <pasos/comandos exactos>
**Tiempo:** <estimado>
```

Convención de prioridades: 🔴 bloqueante · 🟠 destraba trabajo de agentes · 🟡 cuando puedas · ⚪ hábito.
Al completar una: marcarla ✅ con fecha y el resultado (el orquestador la usa para destrabar tareas gated).

---

✅ Repo remoto ya existía (`rifc23/fabrica-consola`, nacido de "Use this template") y el esqueleto
andante quedó pusheado a `main` el 2026-07-14 (commit `cafebd9`).

## ✅ 1. Crear el `GITHUB_PAT` fine-grained y configurarlo en Vercel

**Completada 2026-07-17:** PAT fine-grained creado (Contents R/W + Administration R/W + Metadata,
All repositories) y configurado como env var `GITHUB_PAT` en Vercel. Verificado: `/api/proyectos`
en producción responde 200 con lista vacía (aún no hay repos con el topic `fabrica-agentes`).

**Qué:** la consola necesita un Personal Access Token server-side para leer/crear repos vía la API
de GitHub (listar por topic, leer `.fabrica.json`, crear-desde-template). Nunca debe vivir en el
cliente ni en el repo — solo el NOMBRE del secreto va en código/docs.
**Cómo:**
1. GitHub → Settings → Developer settings → Fine-grained personal access tokens → Generate new token.
2. Resource owner: tu cuenta/org. Repository access: "All repositories" (o selecciona
   `fabrica-agentes-template` + los repos hijos que vayan naciendo) — necesitas poder crear repos
   nuevos desde el template, así que si restringes a repos existentes, el alcance de creación debe
   cubrir la organización/cuenta.
3. Permisos mínimos: **Contents** (read/write), **Administration** (read/write — necesario para
   `generate` desde template y para crear el topic), **Metadata** (read, automático).
4. Copia el token (solo se muestra una vez).
5. En Vercel → tu proyecto → Settings → Environment Variables → agrega `GITHUB_PAT` con el valor,
   scope "Production" (y "Preview"/"Development" si quieres probar en esos entornos).
**Tiempo:** 5 min.

## ✅ 2. Conectar el repo a Vercel (deploy automático por push)

**Completada 2026-07-17:** `rifc23/fabrica-consola` importado en Vercel con preset Next.js y
deploy en verde. Desde ahora cada push a `main` despliega a producción y cada PR genera su
preview URL.

**Qué:** sin esto, los push a `main` no despliegan nada — el "esqueleto andante" queda solo local.
**Cómo:**
1. vercel.com → Add New → Project → importa `rifc23/fabrica-consola` desde GitHub (requiere la
   integración GitHub↔Vercel instalada una vez por cuenta).
2. Framework preset: Next.js (autodetectado). Build command/output: defaults.
3. Agrega la env var `GITHUB_PAT` (ver tarea 2) antes del primer deploy si ya la tienes.
4. Deploy. Cada push a `main` despliega a producción desde entonces; cada PR genera su preview URL.
**Tiempo:** 3 min.

## 🟡 3. Decidir diseño visual y nombre del producto

**Qué:** te reservaste estas dos decisiones en la Fase 0 (ver `docs/backlog.md` § Decisiones
estacionadas). La UI actual es intencionalmente mínima hasta que decidas.
**Cómo:** responde en el backlog (o dile al agente `disenador-ui` que te proponga 2-3 direcciones)
si quieres iterar sobre lo mínimo o invertir en un sistema de diseño antes del formulario real.
**Tiempo:** cuando puedas — no bloquea el desarrollo de las features P0.

## ✅ 4. Crear `routine-fabrica-consola` (corregido 2026-07-18 — creada de verdad vía API)

**Completada 2026-07-18:** creada vía `/schedule` (API `RemoteTrigger`, no la UI manual — la API
sí puede crear triggers con escritura cuando el usuario la invoca interactivamente desde Claude
Code, a diferencia de `create_trigger` llamado por OTRA routine sin supervisión, que es lo que
falló en el Error Conocido #2). Trigger real: `trig_01NduNpiSB2NsJNuCPxmpQQp`, cron `15 */2 * * *`,
modelo `claude-sonnet-5`, conector `Claude_Code_Remote` adjunto automáticamente. Primer disparo:
2026-07-18 06:15 UTC. URL: https://claude.ai/code/routines/trig_01NduNpiSB2NsJNuCPxmpQQp

**Historia del error previo:** el backlog había documentado esta routine como "instalada"
(`trig_01XJA8ejJVsh1aQE4fZFdeN1`) desde el 2026-07-17, pero era un registro falso — una sesión
anterior documentó la intención como si fuera un hecho. El tick de la routine madre de las 11:50
del 2026-07-17 lo detectó por `list_triggers`. Verificar en su primer tick real (06:15 UTC) que
deja reporte en `docs/reportes/` y actualiza `.fabrica.json` de este repo si aplica.

<details>
<summary>Prompt completo para pegar en /schedule</summary>

```
Eres el orquestador continuo de fabrica-consola (repo https://github.com/rifc23/fabrica-consola).
SEPARACIÓN DE MODELOS OBLIGATORIA: tú (la sesión raíz) corres en el modelo orquestador y eres quien
audita, decide y redacta — NUNCA implementas código tú mismo. Para CUALQUIER trabajo de código
lanza un subagente 'implementador' vía la herramienta Agent con model:'sonnet' explícito e
isolation:'worktree', con prompt autocontenido (el subagente no ve esta conversación).

PASO 0 — ANTI-SOLAPE (antes de leer nada más): 'git fetch origin main' y revisa el timestamp del
último commit; si tiene <12 minutos Y coincide con el patrón de tus propios merges o reportes,
verifica explícitamente si hay trabajo a medias (working tree sucio, worktree con cambios sin
commit, rama a medio mergear). Todo limpio → continúa. Cualquier indicio de trabajo a medias →
escribe docs/reportes/<fecha>-<hora>-rutina-SALTADA.md y termina sin tocar nada.

MEMORIA: lee PRIMERO docs/backlog.md completo (el protocolo de cabecera es LEY: territorio,
escritor único, serialización, y la sección 📥 Inbox) + docs/TAREAS-MANUALES.md (no dupliques ni
tomes lo del usuario) + CLAUDE.md ("REGLAS NO NEGOCIABLES", "Regla de despliegue seguro", "Errores
Conocidos" — especialmente el bloqueo de push a main y los triggers programáticos sin permisos —,
"Ancla de rollback"). Tu memoria entre disparos ES el repo git — no hay estado externo.

TRIAJE DEL INBOX (antes de tomar tareas nuevas del backlog, en cada disparo): si la sección
📥 Inbox de docs/backlog.md tiene entradas reales (no "(vacío)"), procésalas TODAS antes de avanzar
con P0/P1/P2: por cada entrada, mejora el wording, redacta criterios de aceptación, deduplica
contra tareas ya existentes, y decide su prioridad (P0/P1/P2) o, si es una pregunta que solo el
usuario puede resolver, estaciónala en "Decisiones estacionadas [USUARIO]" con la pregunta EXACTA.
Las entradas con formato 'Respuesta a decisión "...": ...' resuelven la decisión citada — aplica
la respuesta a la tarea/backlog correspondiente y quita la decisión de la sección [USUARIO]. Al
terminar el triaje, vacía el Inbox dejando solo "(vacío)". Commitea este triaje igual que
cualquier otro cambio de backlog (tú eres el único escritor de docs/backlog.md).

GATE OBLIGATORIO por merge, corriendo DE VERDAD: npm run lint + npm run test:run + npm run build.
Al inicio de cada disparo verifica que el gate completo puede correr en este entorno; si falta
algo, resolverlo es tu PRIMERA tarea (subagente) antes de mergear nada; si el entorno genuinamente
no puede, documentarlo en el backlog y reintentar cada disparo.

MISIÓN POR DISPARO: si el Inbox tenía entradas, el triaje de arriba cuenta como el trabajo del
disparo (puede ser tu única acción). Si no, UN lote de 2-6 tareas delegables del backlog que NO
compartan archivos fuente (si comparten → en serie vía el mismo subagente con SendMessage). Antes
de tomar tareas, audita el estado real (ramas vs backlog con git merge-base --is-ancestor;
CLAUDE.md vs código) y corrige entradas desactualizadas — si encuentras un hecho documentado que
no puedes verificar en el repo/API (ej. una routine o secret que el backlog da por creado pero no
existe), CORRÍGELO explícitamente en el backlog con la fecha del hallazgo, no lo dejes pasar.
Antes de tomar una tarea del backlog, antepón 🔄 a su título y actualiza ultimo_tick en
.fabrica.json (commit + push de inicio de tick); al cerrar el lote, las completadas pasan a [x] y
las no terminadas pierden el 🔄. Al terminar cada subagente: revisa su reporte y su diff, corre el
gate completo tú en el checkout principal, y SOLO con gate verde y diff del alcance esperado →

[Peldaño 3] NUNCA 'git push origin main' — está bloqueado para sesiones de routine (Error
Conocido: el clasificador de modo auto lo deniega). En su lugar: push a TU rama designada
claude/<algo-descriptivo> (la misma en todo el disparo) y documenta en el backlog "pendiente de
merge por el usuario". Si tu diff toca ÚNICAMENTE docs/**, CLAUDE.md o .fabrica.json, el workflow
fabrica-sync.yml lo auto-mergea a main solo con ese push — no necesitas hacer nada más. Si toca
código, el usuario lo mergea a mano.

RESTRICCIONES SIEMPRE VIGENTES: nunca migraciones de datos contra la BD real; nunca deploys de
configuración/reglas/secretos; nunca actives flags de producción (decisión del usuario); cada
subagente en su worktree, nunca tocando el checkout principal; solo tú editas docs/backlog.md y
CLAUDE.md; decisiones de producto/riesgo que no puedas tomar → estaciónalas con la pregunta EXACTA
y sigue con lo siguiente. Commits en español, revertibles por unidad.

AL TERMINAR EL LOTE: consolida backlog + CLAUDE.md (qué se mergeó con hashes, gate real incluido,
qué quedó estacionado con la acción exacta, qué triaje del Inbox se aplicó), escribe
docs/reportes/<fecha>-<hora>-rutina.md y pushea la documentación (rama designada). Si ya NO queda
ningún ítem delegable sin decisión de usuario Y el Inbox está vacío: entrega el reporte final
(lista A completado con hashes / lista B estacionado con acción por ítem), escríbelo TAMBIÉN en
docs/reportes/CAMPANA-<fecha>-FINAL.md, dilo explícitamente, y el usuario decidirá si deshabilitar
la routine. Una entrada nueva en el Inbox reabre la campaña en el siguiente disparo.
```

</details>

## ✅ 6. Crear la routine madre desde la UI de routines (experimento — instalación autónoma)

**Completada 2026-07-17:** `routine-madre-fabrica` creada desde la UI (trigger
`trig_01GKMxZGYkU5TqkS3pPcC5Mc`, cron `50 * * * *`, modelo Sonnet 5). Confirmado que conserva el
conector Claude_Code_Remote (el que trae `create_trigger`) — buen augurio para el experimento.
**Verificación PASADA (2026-07-17 06:15):** primer tick corrió a las 05:50 y NO dejó
`EXPERIMENTO-ROUTINE-MADRE-FALLIDO.md` — las sesiones de la madre SÍ reciben las herramientas de
triggers; el experimento es un éxito. Prompt actualizado a v2 por el usuario (instaladora +
despachadora de Inboxes, ver `docs/routine-madre-prompt.md`). Prueba end-to-end final: el primer
proyecto creado desde el formulario.

**Qué:** una routine que detecta proyectos nuevos sin `trigger_id` en su `.fabrica.json` y les
instala su routine orquestadora automáticamente (elimina el paso manual de la pantalla de
arranque). DEBE crearse desde la UI de routines de claude.ai — creada programáticamente nace sin
las herramientas de triggers. Análisis en `docs/diseno-consola-web.md` §4 Motor A.
**Cómo:** seguir `docs/routine-madre-prompt.md` (prompt listo para pegar + pasos + verificación).
Cadencia: `50 * * * *`. Si el primer tick deja `EXPERIMENTO-ROUTINE-MADRE-FALLIDO.md` en
`docs/reportes/`, borrar la routine de la UI — el flujo manual sigue funcionando igual.
**Tiempo:** 3 min + verificar el primer tick.

## ✅ 5. `VERCEL_TOKEN` en Vercel (deploy autónomo de proyectos nuevos — subida de ⚪ a 🟠)

**Completada 2026-07-17:** `VERCEL_TOKEN` configurado como env var server-side en el proyecto
Vercel de la consola. El formulario "Nuevo proyecto" (P0) puede crear proyectos Vercel conectados
vía API — deploy autónomo de punta a punta habilitado.

**Qué:** con este token, el formulario "Nuevo proyecto" deja cada repo recién creado YA conectado
a Vercel vía API (deploy automático por push + preview URL en el manifest, §4.5 del diseño) — sin
él, cada proyecto nuevo te deja la conexión como tarea manual en su propio TAREAS-MANUALES
(degradación elegante). Decisión del usuario 2026-07-17: el deploy autónomo va en la P0 del
formulario, así que este token la habilita de punta a punta.
**Cómo:** vercel.com/account/tokens → Create Token (scope: tu cuenta; expiración a tu criterio) →
en Vercel → proyecto `fabrica-consola` → Settings → Environment Variables → agrega `VERCEL_TOKEN`
(Production y Preview). Server-side únicamente, mismas reglas que `GITHUB_PAT`: nunca en
cliente/logs/git — solo el NOMBRE del secreto se documenta.
**Tiempo:** 2 min.

(Retirada 2026-07-17: la tarea de crear `ANTHROPIC_API_KEY` para el refinado instantáneo del
feedback ya no aplica en v1 — el refinado lo hace la routine en el cron. Se repondrá solo si se
construye la mejora opcional P2 del backlog.)
