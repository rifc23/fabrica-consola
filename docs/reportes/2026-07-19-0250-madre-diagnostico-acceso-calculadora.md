# Routine madre (tick ~02:50 UTC, 2026-07-19) — bloqueo de acceso a `rifc23/calculadora`

**Tipo:** diagnóstico de bloqueo operativo, NO despacho. Sin cambios de código.

## Resumen

Esta sesión de `routine-madre-fabrica` NO tiene acceso GitHub a `rifc23/calculadora` — ni vía
`mcp__github__search_repositories` ni vía `mcp__Claude_Code_Remote__add_repo`. Esto bloquea por
completo el PASO 2 (descubrimiento) y por lo tanto los PASOS 3/4 (despacho) para ese proyecto,
que es el primer proyecto real creado desde el formulario y lleva el topic `fabrica-agentes`.

## Evidencia cruda (este tick)

1. `mcp__github__search_repositories` con query `user:rifc23 topic:fabrica-agentes` → `total_count: 0`.
2. `mcp__Claude_Code_Remote__list_repos` (query vacío) → 5 repos, SIN `rifc23/calculadora`:
   `crm-grecia-fire`, `fabrica-ia-proxy`, `fabrica-consola`, `fabrica-agentes-template`,
   `crm-pacientes-grecia`.
3. `mcp__Claude_Code_Remote__add_repo(owner:"rifc23", repo:"calculadora")` → error:
   `"repository \"rifc23/calculadora\" was not found on github.com, or this session's GitHub
   credential doesn't have access to it."`
4. Control: `add_repo` SÍ funcionó para `rifc23/crm-grecia-fire` y `rifc23/fabrica-ia-proxy`
   (repos sin relación con la fábrica) — descarta que sea un fallo genérico de la herramienta;
   es específico de `calculadora`.

## Contraste con el diagnóstico previo

El reporte `docs/reportes/DIAGNOSTICO-MCP-POST-FIX-2026-07-18.md` (rama
`diagnostico-post-fix-901p57`, sesión de las 2026-07-18 23:21 UTC, **aún sin mergear a `main`**)
documentó que, tras cambiar la GitHub App de Claude Code a "All repositories", esa OTRA sesión SÍ
veía `rifc23/calculadora` vía `list_repos` y `search_repositories` (con el topic
`fabrica-agentes` confirmado), aunque tampoco podía leer su contenido (scope de repo de esa
sesión limitado a `fabrica-consola`, error distinto: "not configured for this session").

Conclusión: el acceso a `calculadora` no es estable entre sesiones — esta sesión de la madre no
lo tiene, aunque una sesión de hace ~3.5h sí lo tuvo. No se puede descartar que la instalación de
la GitHub App haya vuelto a "repositorios seleccionados" sin incluir `calculadora`, o que cada
sesión reciba un subconjunto distinto de repos por algún motivo no visible desde aquí.

## Impacto

Mientras esto no se resuelva, NINGUNA sesión automática de la fábrica (madre, despachadora,
trabajadoras) puede garantizar que ve o despacha trabajo pendiente en `calculadora` — su Inbox y
su backlog quedan efectivamente huérfanos de automatización, sin que quede evidencia visible en
la consola ni en GitHub Actions (fallo silencioso, mismo patrón de "no se ve ningún error" que el
bug de email de `fabrica-sync.yml` del 2026-07-18).

## Qué NO se hizo (fuera de alcance de la madre)

No se tocó ningún archivo de `calculadora` (no hay acceso). No se re-intentó `add_repo` en bucle.
No se disparó ninguna routine para `calculadora` al no poder confirmar si tiene trabajo pendiente.

## Acción sugerida para el usuario

Verificar en `github.com/settings/installations` qué repos tiene autorizados la GitHub App de
Claude Code — confirmar si `rifc23/calculadora` sigue en la lista (o si quedó en "All
repositories" pero por algún motivo esta sesión no lo heredó). Si el proyecto está inactivo o
descartado, ignorar; si tiene trabajo real pendiente, puede requerir re-autorizar el acceso y/o
disparar su routine manualmente entretanto.

## Resto del tick (PASOS 3/4)

- **DEDICADAS:** único trigger dedicado descubierto además de `calculadora` (inaccesible):
  `routine-fabrica-consola` (`rifc23/fabrica-consola`). Su Inbox (`docs/backlog.md` § 📥 Inbox)
  está `(vacío)` → sin despacho.
- **POOL:** `search_repositories` con `topic:fabrica-agentes` no devolvió ningún repo accesible a
  esta sesión (el único conocido, `calculadora`, es justamente el inaccesible) → sin candidatos
  POOL-libres-con-trabajo verificables este tick.
- Sin despachos y sin asignaciones de emergencia este tick.
