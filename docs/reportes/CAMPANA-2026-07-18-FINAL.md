# Campaña — cierre, 2026-07-18 (tick 16:15 UTC de `routine-fabrica-consola`)

Con el tick de las 16:15 UTC, **ya no queda ningún ítem delegable del backlog sin decisión del
usuario, y el Inbox está vacío.** Este documento consolida toda la campaña arrancada el
2026-07-14 hasta hoy.

## A) Completado (orden cronológico, con hash)

| Fecha | Qué | Hash / rama |
|-------|-----|-------------|
| 2026-07-14 | Fase 0-1: esqueleto Next.js andante, gate lint/test/build | `cafebd9` (main) |
| 2026-07-17 | Lote v1 — 5 P0: formulario+Vercel, dropdown, dashboard, Inbox, decisiones | `7f2644f` (main) |
| 2026-07-17 | Eliminar proyecto (Zona de peligro) | `488cab0` (main) |
| 2026-07-17 | Esqueletos por stack (vite/estático/otro) | `2ac3276` (main) |
| 2026-07-17 | Estado del deploy en preview (dominio real vía API de Vercel) | `6520bd4` (main) |
| 2026-07-17 | `GITHUB_PAT`, conexión Vercel, `VERCEL_TOKEN`, routine madre, `routine-fabrica-consola` (tareas manuales 1, 2, 4, 5, 6) | ver `docs/TAREAS-MANUALES.md` |
| 2026-07-18 06:15 | Lote P1 completo: Gem, cola/tiempos, burn-down | `399111d` (merge a main) |
| 2026-07-18 ~15:00 | Peldaño 4 — `fabrica-sync.yml` auto-mergea también código tras gate en CI | `2753270` (merge a main) |
| 2026-07-18 16:15 | Fix `globalIgnores` ESLint + `exclude` Vitest para `.claude/**` (worktrees de agentes) | `b8e2933` / `88579dd`, rama `claude/rutina-2026-07-18-1615-eslint-ignore` — publicándose a main vía peldaño 4 |

**Estado del producto:** las 5 P0 del MVP y las 3 P1 (Gem, cola/tiempos, burn-down) están en
producción. El deploy es autónomo de punta a punta (repo + Vercel + routine, sin intervención
manual) y el pipeline de merges es autónomo desde el peldaño 4 (CI gatea, no un humano).

## B) Estacionado (con la acción exacta pendiente)

| Ítem | Acción exacta pendiente | Quién |
|------|--------------------------|-------|
| **Diseño visual** | Decidir si el `disenador-ui` propone 2-3 direcciones o se itera sobre lo mínimo actual | Usuario |
| **Nombre del producto** | Decidir si "fabrica-consola" es el nombre final o hay uno distinto para la UI | Usuario |
| **Playwright E2E del flujo completo (P2)** | Autorizar repo de prueba real dedicado (`fabrica-consola-e2e-fixture`) vs. mocks de GitHub/Vercel | Usuario |
| **Refinado instantáneo del feedback (P2)** | Reponer la tarea manual de crear `ANTHROPIC_API_KEY` en Vercel (retirada explícitamente) si se decide construir esta mejora de UX | Usuario |
| **Motor B (P2)** | Explícitamente fuera de v1 — sin acción pendiente, solo diseño documentado en `docs/diseno-consola-web.md` §4 | Ninguna (futuro) |
| **Promover `tipo?: "gem"` a campo real (P2)** | Esperar a que se agregue un segundo tipo de proyecto además de "gem" — sin acción hasta entonces | Ninguna (futuro) |

## Recomendación

No queda trabajo delegable en el backlog actual. El usuario puede:
1. Revisar y (si aplica) responder las decisiones estacionadas arriba — cualquier respuesta nueva
   en el Inbox de un proyecto reabre su campaña en el siguiente disparo de esa routine.
2. Deshabilitar `routine-fabrica-consola` (`trig_01NduNpiSB2NsJNuCPxmpQQp`) mientras no haya
   trabajo nuevo, para no gastar ticks sin acción — o dejarla activa: cada disparo sin trabajo
   delegable cuesta un tick corto de auditoría (gate + verificación de estado) y no tiene efectos
   secundarios.
3. Usar el Inbox de la consola (una vez el fix de este tick esté en producción) para dejar
   feedback nuevo cuando quiera iterar — el triaje del siguiente tick lo tomará automáticamente.
