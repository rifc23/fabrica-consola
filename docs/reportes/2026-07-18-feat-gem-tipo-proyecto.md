# Reporte — feat/gem-tipo-proyecto (2026-07-18)

## Qué se hizo

Tarea P1 del backlog (decisión del usuario 2026-07-17): añadir el tipo de proyecto "Gem" al
formulario "Nuevo proyecto" de la consola, siguiendo `docs/diseno-consola-web.md` §1.1.

- `src/app/nuevo-proyecto/page.tsx`: checkbox "🤖 Gem (chatbot con rol)" justo antes de la sección
  "3. Features MVP". Al marcarse, aparece el textarea obligatorio "Rol del bot" y una lista
  informativa (de solo lectura) de las features fijas del blueprint, leída de
  `featuresBlueprintGem()` (fuente única, sin duplicar nombres en el componente). El label de la
  sección de features cambia a "extra (opcional...)" y deja de exigir al menos una feature. Sin
  marcar el checkbox, el formulario es bit-a-bit el mismo de antes (mismo estado inicial, mismos
  campos, mismas validaciones).
- `src/lib/formulario-proyecto.ts`: nuevas funciones puras — `featuresBlueprintGem()` (las 4 P0
  fijas: CRUD de Gems, chat con streaming + rol como parámetro `system` fuera del historial,
  botón "Mejorar rol" con preview, capa de abstracción `ProveedorIA`), `generarSpecsMdGem()`
  (SPECS.md con sección "Rol inicial" con el texto del usuario ÍNTEGRO, sin reescritura),
  `agregarTareaManualClaveIA()` (bloque 🔴 bloqueante para `GEMINI_API_KEY`/`ANTHROPIC_API_KEY`,
  mismo patrón que `agregarTareaManualVercel`/`agregarTareaManualStackOtro`), y el combinador
  `generarContenidoProyecto()` que decide entre la ruta Gem y la genérica de siempre. Se extendió
  `FormularioProyecto`/`validarFormulario` con `esGem?`/`rolGem?` (rol obligatorio solo si
  `esGem`; features MVP dejan de ser obligatorias cuando `esGem` es true).
- `src/app/api/crear-proyecto/route.ts`: usa `generarContenidoProyecto(body)` en vez de
  `generarSpecsMd(body)` y `body.features` directos; el manifest gana `tipo: "gem"` solo cuando
  `body.esGem` (tipo local `FabricaManifest & { tipo?: "gem" }`, sin tocar `src/lib/github.ts`);
  se agrega la tarea manual de la key de IA a `docs/TAREAS-MANUALES.md` cuando el proyecto es Gem
  (independiente de si Vercel quedó degradado).
- Tests nuevos en `src/lib/formulario-proyecto.test.ts`: validación Gem (con/sin rol, sin features
  no falla), `featuresBlueprintGem`, `generarSpecsMdGem` (rol íntegro + mención de la capa IA),
  `agregarTareaManualClaveIA`, y `generarContenidoProyecto` con los 3 casos pedidos por el
  backlog: Gem con rol, Gem con rol + features extra (blueprint nunca reemplazado, solo
  extendido), y no-Gem (idéntico byte-a-byte a `generarSpecsMd(form)` de siempre, sin ningún
  campo/sección Gem).

## Gate

```
npm run lint      → OK, sin warnings
npm run test:run  → 9 archivos, 117 tests, todos en verde (20 en formulario-proyecto.test.ts)
npm run build     → OK (Next.js 16.2.10, TypeScript sin errores)
```

## Decisiones de diseño / ambigüedades

- **`.fabrica.json` con `tipo`**: `FabricaManifest` (en `src/lib/github.ts`, fuera de mi
  territorio) no declara el campo `tipo`. En vez de tocar ese archivo, extendí el tipo
  LOCALMENTE en `route.ts` (`FabricaManifest & { tipo?: "gem" }`) — cumple el criterio de
  aceptación sin arriesgar colisión con las tareas hermanas que sí tocan `github.ts`. El
  orquestador podría considerar mover este campo a `FabricaManifest` cuando integre, pero no era
  necesario para esta tarea.
- **Reuso de `sembrarBacklogNuevoProyecto`** (en `src/lib/backlog.ts`, tampoco tocado): en vez de
  escribir un sembrador de backlog paralelo para Gems, `generarContenidoProyecto` calcula la
  lista de `features` (blueprint + extras) y el route handler sigue llamando a la MISMA función
  de siempre con esa lista — respeta "fuente única" y evita duplicar el parseo/reemplazo de
  secciones del backlog.
- **Features extra del usuario en un Gem**: reutilicé el mismo estado `features`/UI del
  formulario (en vez de crear un campo separado "features extra") — semánticamente son las
  mismas features MVP, solo que ahora se suman al blueprint fijo en vez de ser la única fuente.
  Esto evita duplicar la UI de la lista repetible de features.
- **Ubicación del checkbox**: la spec no fija dónde va en el formulario; lo puse inmediatamente
  antes de "3. Features MVP" porque es la sección cuyo comportamiento cambia — visualmente queda
  claro que el checkbox "sustituye" esa sección por el blueprint.
- No se tocó `src/lib/github.test.ts` (no hizo falta lógica nueva en `github.ts`, tal como
  anticipaba el encargo).
- El `IA_PROVEEDOR`/adaptadores (`gemini.ts`, `anthropic.ts`) y el resto del código del proyecto
  Gem (`src/lib/ia/proveedor.ts`, chat UI, CRUD de Gems) NO se implementan aquí — son parte del
  repo NUEVO que la routine construye en su primer tick a partir de `docs/SPECS.md`; esta tarea
  solo cubre la siembra desde fabrica-consola (SPECS.md, backlog P0, manifest, tarea manual).

## Propuestas para CLAUDE.md/backlog

- Si en el futuro se agregan más `tipo` de proyecto (más allá de "gem"), vale la pena promover
  `tipo?: "gem"` a un campo real y tipado en `FabricaManifest` (`src/lib/github.ts`) en vez de la
  extensión local usada aquí, y quizás una función `esGem(manifest)` compartida para el dashboard.
