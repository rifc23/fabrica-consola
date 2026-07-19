# Reporte — routine madre, tick 2026-07-19 ~08:53 UTC

## Hallazgo crítico: `fire_trigger` bloqueado para las rutinas del Motor A-pool

`list_triggers` y `fire_trigger` SÍ están disponibles en esta sesión (PASO 1 pasa). El bloqueo es
distinto y más grave: `fire_trigger` sobre `rutina-trabajadora-1` devolvió el error

```
fire_trigger: this routine was created via "http_api", not by an agent. Agents can only fire
routines they created (via create_trigger).
```

Es decir: una sesión de agente (routine madre) **solo puede disparar con `fire_trigger` triggers
que ELLA MISMA creó con `create_trigger`**. Las rutinas `rutina-trabajadora-1`, `rutina-trabajadora-2`,
`rutina-despachadora` y `routine-fabrica-consola` fueron creadas desde la UI de claude.ai (`http_api`)
— tal como exige la regla ya documentada en CLAUDE.md ("toda routine que deba ESCRIBIR en un repo
se crea desde la UI", ver Errores Conocidos, 2026-07-17). Esa misma condición necesaria para que
tengan permiso de escritura (`outcomes`) es la que ahora impide que la routine madre las dispare.

**Esto contradice el estado que CLAUDE.md da por verificado** en Decisiones Arquitectónicas
("Motor A-pool..."): "la madre le asigna el lock ella misma y dispara con `fire_trigger` de
inmediato" / "su despacho con `fire_trigger` SÍ funciona (dispara routines existentes creadas por
UI...)". Ese texto asume que una rutina creada por UI puede ser disparada por otra sesión de
agente. El error de esta sesión indica que NO es así — al menos no con las credenciales de esta
routine madre.

## Qué se alcanzó a hacer antes de toparse con el bloqueo

1. Descubrimiento (PASO 2): topic `fabrica-agentes` → solo `rifc23/stocktracker` (proyecto POOL,
   sin `trigger_id`). Más `rifc23/fabrica-consola` (DEDICADO, `routine-fabrica-consola`, Inbox
   vacío — sin despacho necesario).
2. `stocktracker`: lock existente (`rutina-trabajadora-1`, `desde: 2026-07-19T06:52:56Z`) con más
   de 90 min de antigüedad → huérfano según la regla del PASO 2/4. Inbox con DOS entradas reales
   sin triaje, una de ellas bloqueante: *"Cualquier operación de yahoo finance me está regresando
   401... Necesito un source confiable"*.
3. PASO 4, paso 1: escrito el lock `{rutina: "rutina-trabajadora-1", desde: "2026-07-19T08:53:43Z"}`
   en `.fabrica.json` de `stocktracker` — commit `cd070558f5d60f587a1847a216110e0e2b0b9f26`, sin
   conflicto (nadie más lo tocó primero).
4. PASO 4, paso 2: `fire_trigger` sobre `trig_01TsS9F4RyUip1fnes4Usu8B` (`rutina-trabajadora-1`) →
   **falló** con el error de arriba. El lock quedó puesto (correcto según la regla: "si no puede
   disparar por el umbral de 15 min, deja el lock puesto") pero NO fue por el umbral de 15 min —
   fue por este bloqueo de permisos, categoría distinta que la regla no contempla.

## Consecuencia

Sin `fire_trigger` funcional sobre rutinas creadas por UI, **el PASO 3 (despacho de dedicadas) y
el PASO 4 (despacho de emergencia del pool) quedan sin efecto real** en cualquier sesión futura de
esta routine madre: puede seguir leyendo/clasificando y hasta escribiendo el lock del PASO 4, pero
nunca puede acelerar el arranque — el proyecto queda igual esperando su próximo tick normal (hasta
~1h) en vez de los ~inmediato que promete el diseño v4.

`stocktracker` con el bug crítico de Yahoo Finance en el Inbox seguirá esperando el próximo tick
natural de `rutina-trabajadora-1` (cadencia horaria) en vez de una reacción inmediata.

## Recomendación para el usuario

Este hallazgo necesita revisión humana, no un fix de código:
- Confirmar si `fire_trigger` entre sesiones de agente distintas es una restricción de plataforma
  nueva/permanente, o un bug puntual — quizás valga la pena reportarlo al soporte de Claude Code.
- Si es permanente, el diseño del Motor A-pool (§4 de `docs/diseno-consola-web.md`, v4 del prompt
  de la routine madre) necesita un mecanismo de despacho distinto para el PASO 3/4 — por ejemplo,
  que la propia routine madre se recree con `create_trigger` como dueña de triggers "proxy" que sí
  pueda disparar, o que el despacho de emergencia se limite a dejar el lock listo (que ya funciona)
  y renuncie a la aceleración por `fire_trigger`, degradando el diseño a solo el PASO 2/lock sin
  disparo inmediato.
- Mientras tanto, este tick avanzó el lock de `stocktracker` a `rutina-trabajadora-1` pero SIN
  disparo — su próximo tick natural (cadencia horaria, últ. disparo 08:10:34 UTC) lo recogerá solo,
  con hasta ~1h de latencia adicional sobre el bug de Yahoo Finance reportado por el usuario.

No se tocó ningún otro archivo ni repo. No se instaló ni modificó ningún trigger.
