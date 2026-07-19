# EXPERIMENTO FALLIDO — routine madre no puede disparar ninguna routine existente

**Tick:** 2026-07-19, ~10:52 UTC (disparo normal de `routine-madre-fabrica`, cron `50 * * * *`).

## Síntoma

A diferencia del fallo anticipado en el prompt de la routine madre (herramientas `list_triggers`/
`fire_trigger` ausentes de la sesión), esta vez **ambas herramientas SÍ cargaron su schema** vía
`ToolSearch` y fueron invocables sin error de "tool not found". `list_triggers` funcionó con
normalidad y devolvió los 9 triggers reales de la cuenta.

El fallo apareció al invocar `fire_trigger` sobre un trigger real y ya existente
(`trig_01TsS9F4RyUip1fnes4Usu8B`, `rutina-trabajadora-1`), en el marco del PASO 4 (despacho de
emergencia para el proyecto `stocktracker`, cuyo lock estaba huérfano desde hacía ~2h y cuyo Inbox
tenía 2 entradas reales sin triajar). El commit del lock (paso 4.1) se hizo con éxito vía la API de
GitHub (`create_or_update_file`, commit `b3a84f5` en `rifc23/stocktracker`), pero el paso 4.2
(`fire_trigger`) devolvió este error exacto:

```
fire_trigger: this routine was created via "http_api", not by an agent. Agents can only fire
routines they created (via create_trigger).
```

## Causa

Todos los triggers reales de la cuenta (`rutina-despachadora`, `rutina-trabajadora-1`,
`rutina-trabajadora-2`, `routine-fabrica-consola`, `routine-madre-fabrica`, "Diván", etc.) fueron
creados desde la **UI de routines de claude.ai** (`http_api`), tal como exige la regla ya
documentada en `CLAUDE.md` § Errores Conocidos (2026-07-17: "toda routine que deba ESCRIBIR en un
repo se crea desde la UI de routines" — para tener permisos de escritura). Pero esa misma decisión
tiene un efecto secundario no anticipado: **`fire_trigger` solo permite disparar routines que la
propia sesión-agente creó vía `create_trigger`**. La routine madre nunca crea triggers propios (por
diseño — no debe instalar routines), así que **estructuralmente no puede disparar NINGUNO** de los
triggers que existen hoy en la cuenta, sin importar si son DEDICADOS o del POOL. El diseño de v4
(PASO 3 y PASO 4 completos) depende de `fire_trigger` funcionando sobre triggers creados por UI —
y esa combinación es la que el servidor rechaza.

## Impacto observado este tick

- El commit del lock de emergencia sobre `stocktracker` (`.fabrica.json`, campo `lock`) sí se
  aplicó y es válido — refresca un lock huérfano y no depende de `fire_trigger`.
- El disparo de emergencia de `rutina-trabajadora-1` NO ocurrió. El proyecto quedará a la espera
  de su próximo tick normal (`10 * * * *`, ~11:10 UTC, <20 min de esta sesión) en vez de acelerarse
  al instante — impacto acotado hoy, pero el mecanismo de "despacho de emergencia" (razón de ser
  del PASO 4) queda inoperante en general.
- Ningún despacho de PASO 3 (routines dedicadas) fue necesario este tick (Inbox de
  `fabrica-consola`, la única DEDICADA activa, estaba vacío), así que no hay una segunda
  confirmación del mismo fallo en esta sesión, pero el mismo error es esperable en cualquier
  intento futuro de PASO 3 sobre cualquier routine dedicada existente.

## Qué necesita el usuario

Revisar la routine madre (`routine-madre-fabrica`) desde la UI de routines de claude.ai: el
mecanismo de disparo vía `fire_trigger` sobre triggers creados por UI no funciona para sesiones de
agente, así que el diseño de "madre dispara trabajadoras/dedicadas" necesita un mecanismo distinto
(o un ajuste de permisos que hoy no está expuesto a esta sesión). Hasta que se resuelva, el PASO 4
seguirá pudiendo refrescar/asignar el campo `lock` (eso sí funciona, vía la API de GitHub), pero
nunca podrá acelerar el disparo — cada proyecto solo avanza en su tick de cron normal.
