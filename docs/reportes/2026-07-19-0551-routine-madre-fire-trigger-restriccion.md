# Tick routine-madre-fabrica — 2026-07-19 05:51 UTC

## Hallazgo crítico: `fire_trigger` rechaza disparar routines que la sesión no creó

PASO 1 (autoverificación) pasó: `list_triggers` y `fire_trigger` están disponibles como
herramientas — no aplica el candado del experimento fallido (ese es para ausencia total de las
herramientas, no para este caso).

PASO 2 (descubrimiento): un solo repo con topic `fabrica-agentes` — `rifc23/stocktracker`
(POOL, sin `trigger_id`, `lock: null`). Su Inbox tenía una entrada real pendiente ("Cualquier
operación de Yahoo Finance me está regresando 401..."). `rifc23/fabrica-consola` es DEDICADO
(`routine-fabrica-consola`) pero su Inbox está `(vacío)` — sin despacho de PASO 3 este tick.

PASO 4 (emergencia de pool): con `stocktracker` como POOL-libre-con-trabajo y ambas
`rutina-trabajadora-1`/`-2` libres (sin lock vigente en toda la fábrica), se siguió el
procedimiento:

1. Lock escrito con éxito en `.fabrica.json` de `stocktracker`: `lock.rutina =
   "rutina-trabajadora-1"`, `desde = "2026-07-19T05:51:55Z"` — commit
   [`9f531df`](https://github.com/rifc23/stocktracker/commit/9f531dfeb632d61914c6ae9fe88c38ab670951e1).
2. `fire_trigger` sobre `trig_01TsS9F4RyUip1fnes4Usu8B` (`rutina-trabajadora-1`) **falló**:

   ```
   fire_trigger: this routine was created via "http_api", not by an agent. Agents can only fire
   routines they created (via create_trigger).
   ```

### Por qué esto no es un problema puntual de esta rutina

Se revisó el `job_config` completo de los 5 triggers relevantes de la fábrica vía `list_triggers`
(`rutina-trabajadora-1`, `rutina-trabajadora-2`, `rutina-despachadora`, `routine-fabrica-consola`,
`routine-madre-fabrica`). Ninguno fue creado por un agente vía la herramienta `create_trigger` —
todos nacieron desde la UI de routines de claude.ai (o `/schedule`), que registra el origen como
`http_api`. La política de la plataforma solo permite a un agente disparar (`fire_trigger`)
triggers que ÉL MISMO creó en su propia sesión con `create_trigger` — nunca triggers creados por
un humano desde la UI, sin importar cuál sea el nombre o el propósito del trigger.

Esto confirma algo que el propio diseño de `rutina-despachadora` ya anticipaba en su prompt:
*"NUNCA disparas nada con `fire_trigger` — asignar es suficiente, la propia trabajadora corre en
su cron normal y encuentra su asignación."* La despachadora del pool (ciclo normal, `5 * * * *`)
nunca intenta disparar; solo el PASO 4 de v4 de esta routine madre (agregado 2026-07-18,
pensado exactamente para achicar la latencia por debajo del tick normal) intenta el disparo
inmediato — y es exactamente esa pieza la que la plataforma bloquea.

**Impacto:** el PASO 3 (routines DEDICADAS) y el disparo inmediato del PASO 4 (emergencia de
pool) de esta routine madre están inoperantes para TODAS las routines existentes de la fábrica,
no solo para `rutina-trabajadora-1`. La asignación del lock en PASO 4 sigue funcionando bien
(paso 1, escritura en `.fabrica.json`) — la trabajadora igual encontrará su asignación en su
próximo tick normal (`rutina-trabajadora-1` corre cada hora en el minuto `:10`, próximo tick
`2026-07-19T06:10:00Z`, ~18 min después de este hallazgo). Lo que se pierde es exclusivamente la
ACELERACIÓN que el PASO 4 estaba diseñado para dar — el mismo objetivo original de la routine
madre completa (ver historial de decisiones en `CLAUDE.md`: "acelerar la reacción al feedback").

### Estado dejado

- `stocktracker` queda con el lock puesto y su Inbox sin tocar (la routine madre nunca escribe
  fuera de `lock`) — lo tomará `rutina-trabajadora-1` en su tick normal de las 06:10 UTC.
- No se intentó ningún otro `fire_trigger` esta corrida para no repetir el mismo rechazo sin
  necesidad (Inbox de `fabrica-consola` estaba vacío, así que PASO 3 no tenía nada que disparar
  de todos modos).

### Recomendación para el usuario

Revisar si existe alguna forma de crear las routines trabajadoras/dedicadas de manera que una
sesión de la routine madre SÍ pueda dispararlas (por ejemplo, si `create_trigger` permite algún
modo de "adoptar" un trigger existente, o si el propio diseño del pool debe renunciar
definitivamente a la aceleración por `fire_trigger` y aceptar la latencia del cron normal como
techo real — que es, en la práctica, lo que ya viene ocurriendo). Mientras tanto, el PASO 4 sigue
teniendo valor: aunque no acelere, asigna el lock en cuanto detecta trabajo pendiente en vez de
esperar a que `rutina-despachadora` lo haga en su propio ciclo horario — así que conviene
mantenerlo, quitando de su texto la expectativa de que el `fire_trigger` vaya a tener éxito.

## Resumen final

- **DEDICADAS despachadas:** ninguna (Inbox de `routine-fabrica-consola`, la única DEDICADA,
  vacío).
- **Asignaciones de emergencia:** `stocktracker` → `rutina-trabajadora-1` → commit
  `9f531dfeb632d61914c6ae9fe88c38ab670951e1` → **disparada: NO** (rechazado por la plataforma,
  ver hallazgo arriba; la asignación queda vigente para el tick normal de las 06:10 UTC).
