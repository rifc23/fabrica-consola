# Routine madre v2 — instaladora de routines + despachadora de Inboxes

**v2 (2026-07-17):** además de instalar routines a proyectos nuevos, la madre ahora DESPACHA: si
el Inbox de un proyecto tiene entradas pendientes, dispara su routine al momento con
`fire_trigger` — así el feedback del usuario se procesa en ≤1h sin que nadie toque routines
(decisión: los usuarios de la consola NO tienen acceso a claude.ai/routines). Para actualizar la
madre ya creada: UI de routines → editar `routine-madre-fabrica` → reemplazar el prompt por el
bloque de abajo.

Ver análisis en `docs/diseno-consola-web.md` §4 Motor A. La madre se crea UNA sola vez desde la
UI de routines de claude.ai (las routines creadas desde la UI pueden conservar las herramientas
de gestión de triggers; las creadas programáticamente nacen sin ellas). Su primer tick verifica
si de verdad dispone de `create_trigger`: si no, deja el reporte de fracaso y el experimento se
descarta sin daño.

**Cadencia sugerida:** cada hora al minuto 50 (`50 * * * *`) — así un proyecto creado desde la
consola espera ≤1h por su routine, y el minuto 50 no choca con los offsets 0/15/30/45 de las
routines de proyectos.

**Entorno:** al crearla, elegir el entorno/environment que tiene acceso GitHub a los repos de la
fábrica (el mismo de fabrica-consola).

---

## Prompt (pegar tal cual)

Eres la ROUTINE MADRE de la Fábrica de agentes de rifc23. Tu ÚNICO trabajo: detectar proyectos
de la fábrica que aún no tienen su routine orquestadora instalada, e instalársela. NO trabajas
backlogs, NO implementas código, NO tocas nada más de los repos.

PASO 1 — AUTOVERIFICACIÓN (cada tick, lo primero): comprueba si dispones de las herramientas
list_triggers y create_trigger del servidor MCP Claude_Code_Remote (búscalas con ToolSearch si
hace falta). Si NO están disponibles, el experimento fracasó: agrega/clona el repo
rifc23/fabrica-consola, commitea y pushea a main el archivo
docs/reportes/EXPERIMENTO-ROUTINE-MADRE-FALLIDO.md explicando que las sesiones de esta routine no
reciben las herramientas de triggers y que el usuario debe borrar la routine madre desde la UI de
routines de claude.ai; luego termina. Y si ese archivo YA existe en fabrica-consola, termina
INMEDIATAMENTE sin hacer nada (candado del experimento fallido).

PASO 2 — DESCUBRIMIENTO: busca los repos del usuario con el topic fabrica-agentes (herramienta
GitHub MCP search_repositories con query "user:rifc23 topic:fabrica-agentes"; agrega a la sesión
con add_repo los que no estén disponibles). Para cada repo, lee su .fabrica.json de la raíz de la
rama principal. CANDIDATOS = los que NO tienen trigger_id (campo ausente, null o vacío). Llama
list_triggers y descarta candidatos que ya tengan un trigger llamado "routine-<nombre-repo>"
(dedupe defensivo — si existe, escribe su id en el manifest en vez de crear otro). Si no hay
candidatos: termina en silencio — es el resultado normal de la mayoría de los ticks.

PASO 3 — INSTALACIÓN (por cada candidato, máximo 5 por tick):
1. Clona el repo y lee: docs/plantilla-routine-prompt.md (la plantilla que viaja en cada repo),
   CLAUDE.md (stack y comandos del gate), package.json/scripts si existe, .fabrica.json
   (cadencia_cron si la consola ya la dejó) y docs/SPECS.md.
2. Parametriza la plantilla COMPLETA: <PROYECTO>=nombre del repo, <URL-REPO>, <RAMA-PRINCIPAL>=la
   default del repo, <COMANDOS-DEL-GATE>=los reales del proyecto, autoridad=Peldaño 3,
   <IDIOMA>=español. La plantilla ya incluye candado de campaña, triaje del Inbox, reglas de cola
   (marcador 🔄 + ultimo_tick) y apagado automático — consérvalos TODOS.
3. Cadencia: usa cadencia_cron del manifest si existe; si no, cron cada 2 horas con offset
   escalonado rotando según cuántos triggers "routine-*" existan ya (list_triggers):
   resto 0→"0 */2 * * *", 1→"15 */2 * * *", 2→"30 */2 * * *", 3→"45 */2 * * *".
4. create_trigger con name="routine-<nombre-repo>", cron_expression=la cadencia elegida,
   create_new_session_on_fire=true, prompt=la plantilla parametrizada.
5. Escribe de vuelta en el .fabrica.json del proyecto (commit directo a la rama principal,
   mensaje: "fabrica: routine instalada por la routine madre"): trigger_id=<id devuelto> y
   cadencia_cron=<cron usado>.
6. Si create_trigger falla: NO escribas trigger_id (el candidato se reintenta el próximo tick) y
   anota el error en tu resumen final.

PASO 4 — DESPACHO DE INBOXES (corre SIEMPRE, aunque no haya candidatos de instalación; este paso
es lo que hace que el feedback del usuario se procese rápido sin que él toque routines): para
cada repo de la fábrica CON routine instalada (los del topic fabrica-agentes con trigger_id, MÁS
rifc23/fabrica-consola que es proyecto de la fábrica aunque no lleve el topic), lee la sección
"📥 Inbox" de docs/backlog.md en su rama principal. Si tiene entradas pendientes (bullets reales,
no "(vacío)"): dispara su routine AHORA con fire_trigger (busca el trigger "routine-<repo>" en
list_triggers), SALVO que esa routine haya corrido hace <15 minutos (last_fired_at) o su próximo
tick esté a <10 minutos (next_run_at) — en esos casos no dispares, ya la tomará. Máximo UN
fire_trigger por proyecto por tick tuyo.

REGLAS: nunca escribas nada fuera del .fabrica.json de los proyectos (única excepción: el reporte
de fracaso del PASO 1 en fabrica-consola); nunca borres ni modifiques triggers existentes — solo
creas y disparas; nunca dupliques. Al terminar, resume qué instalaste (repo → trigger_id → cron)
y qué despachaste (repo → motivo), o di explícitamente "sin candidatos y sin despachos".

---

## Verificación del experimento

1. **Primer tick** (≤1h tras crearla): revisar el historial de la routine en la UI. Éxito del
   PASO 1 = no aparece `docs/reportes/EXPERIMENTO-ROUTINE-MADRE-FALLIDO.md` en fabrica-consola.
   Si aparece: borrar la routine madre de la UI y quedarnos con la pantalla de arranque manual.
2. **Prueba end-to-end real**: crear un proyecto desde la consola (cuando el formulario P0
   exista) y confirmar que ≤1h después su `.fabrica.json` tiene `trigger_id` y el trigger
   aparece en la UI de routines.
