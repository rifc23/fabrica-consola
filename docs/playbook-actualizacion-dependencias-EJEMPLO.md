# Playbook de actualización de dependencias — Diván

Documento permanente. Define CÓMO se actualiza cualquier dependencia de este proyecto con el menor
riesgo posible, y contiene el plan específico vigente (`firebase-admin` 13→14). Cada actualización
futura sigue este playbook y deja su registro en la sección "Historial de actualizaciones".

**Principio rector (CLAUDE.md § despliegue seguro): nunca apilar dos cambios riesgosos a la vez.**
Un bump mayor de dependencia crítica jamás se hace mientras otro cambio de infraestructura está en
observación (ej. activación de flags de Calendar, enforcement de rules, migración de datos).

---

## 1. Clasificación — qué proceso aplica

| Tipo | Ejemplos | Proceso |
|---|---|---|
| **Parche/menor** (semver `~`/`^` dentro de mayor) | `npm audit fix` sin `--force`, 13.10→13.11 | Proceso corto (§2) |
| **Mayor de dependencia NO crítica** | chart.js 4→5, mammoth | Proceso completo (§3), verificación acotada a su superficie |
| **Mayor de dependencia CRÍTICA** | `firebase`, `firebase-admin`, `stripe`, `vite` | Proceso completo (§3) + preview deploy + ventana de observación |

**Dependencias críticas y su superficie de impacto** (mantener actualizado):

| Paquete | Superficie | Dónde se verifica |
|---|---|---|
| `firebase-admin` | TODAS las serverless (`api/_firebase-admin.js` singleton): verifyIdToken, Firestore Admin, claims | E2E harness (importa handlers reales) + preview |
| `firebase` (cliente) | Auth, Firestore, Storage, App Check del bundle completo | E2E fase 1 (emuladores) + smoke |
| `stripe` | Webhook de pagos, checkout, portal | E2E Stripe (firma local) + evento de prueba en preview |
| `dompurify` | dom-guard (anti-XSS, TODA la app) | tests/sanitize + revisión manual de logs de sombra |
| `xlsx` | Export Excel (3 call sites) — riesgo aceptado, sin fix upstream | Export manual de reporte |
| `vite`/`vitest`/`playwright`/`firebase-tools` (dev) | Solo tooling — no llegan a prod | El propio gate |

## 2. Proceso corto (parche/menor)

1. Rama `chore/deps-<fecha>`. `npm audit fix` (NUNCA `--force`) o bump puntual en package.json.
2. Verificar que `package.json` no cambió de mayores: `git diff package.json`.
3. Gate completo: `npm run test:run` + `node scripts/check-dom-ratchet.mjs` + `npm run build` + `npm run test:e2e`.
4. Reporte en `docs/reportes/` con el antes/después de `npm audit --omit=dev`. Merge por el flujo normal.

## 3. Proceso completo (bump mayor) — checklist obligatorio

**Fase A — Investigación (SIN tocar código; entregable: sección "Análisis previo" en el reporte)**
1. Leer el CHANGELOG/release notes OFICIAL del paquete entre la versión actual y la objetivo
   (GitHub releases, no solo el número). Listar TODOS los breaking changes anunciados.
2. Para cada breaking change: grep en el repo — ¿usamos esa API? Tabla `breaking change → archivo:línea afectado → acción`.
3. Listar bumps transitivos mayores arrastrados (ej. `@google-cloud/firestore` 7→8 dentro de
   firebase-admin 14) y repetir el paso 1-2 para cada uno.
4. Verificar compatibilidad de runtime (versión de Node de Vercel vs `engines` del paquete nuevo).
5. Madurez: ¿cuánto lleva publicada la versión? <1 mes = considerar esperar salvo urgencia de seguridad.
6. **Checkpoint**: si la fase A encuentra breaking changes que tocan código nuestro, el plan de
   adaptación se escribe ANTES del bump, no durante.

**Fase B — Ejecución (rama propia `chore/bump-<paquete>-<mayor>`)**
7. Bump en `package.json` + `npm install`. Un solo paquete por rama — nunca mezclar bumps mayores.
8. Aplicar las adaptaciones de la tabla de la fase A (si las hay), un commit por adaptación.
9. Gate completo: unit + ratchet + build + **E2E completo** (los E2E importan los handlers reales
   de `api/` — son la red principal para firebase-admin/stripe).
10. `npm audit --omit=dev` — confirmar que las vulnerabilidades objetivo desaparecieron y no
    entraron nuevas.

**Fase C — Verificación en preview (dependencias críticas)**
11. Push de la RAMA (no main) → Vercel genera preview deploy automático.
12. `$env:SMOKE_BASE_URL="https://<preview>.vercel.app"; npm run test:smoke` → 6 passed esperado.
13. Verificación manual dirigida según la superficie del paquete (tabla §1): p.ej. para
    firebase-admin: login real, un flujo de agenda vía exec, `?action=daily` con curl+CRON_SECRET.

**Fase D — Merge, observación y rollback**
14. Merge a main por el flujo normal (gate post-rebase). **Ancla de rollback anotada en el reporte.**
15. Observación 48h: logs de Vercel sin errores nuevos + digest de Telegram limpio (cuando esté activo).
16. **Rollback si algo falla**: `git revert <commits-del-bump> && git push` — revertir el lockfile
    junto con package.json SIEMPRE (nunca revertir uno sin el otro). Vercel redespliega en minutos.

**Regla de secuencia**: entre dos bumps mayores críticos, mínimo 1 semana de observación del primero.

## 4. Plan específico vigente — `firebase-admin` 13.10 → 14.x

- **Motivación**: elimina las 8 vulnerabilidades moderate residuales (`uuid`, `@opentelemetry`)
  que `npm audit fix` no pudo resolver (requieren el bump mayor). Severidad real baja: deps
  server-side sin input directo de atacantes — es higiene, no incendio.
- **Precondición de calendario (decisión del usuario, 12 jul 2026)**: NO iniciar hasta que los
  flags de Calendar nativo (`config_app/rutas_calendar`) lleven **≥2 semanas estables en
  `'vercel'`** — no apilar este bump sobre esa transición. Estimado: fin de julio 2026.
- **Alcance del bump**: `firebase-admin` 13.10.0 → 14.latest; arrastra `@google-cloud/firestore`
  7→8 (fase A punto 3 aplica a ambos changelogs).
- **Focos de la fase A conocidos de antemano**: (a) `api/_firebase-admin.js` — init con
  `credential.cert` y el guard de emulador `FIRESTORE_EMULATOR_HOST`; (b) `verifyIdToken` en las
  ~8 functions; (c) `setCustomUserClaims`/`getUserByEmail` (`api/_plan-activo.js`); (d)
  `runTransaction`/`writeBatch`/`getAll`/`collectionGroup` (`api/calendar.js`, scripts de
  migración); (e) `admin.firestore.Timestamp` (`api/encuesta.js`); (f) `FieldValue` si se usa.
- **Verificación C.13 específica**: login OAuth completo, agendar/cancelar una cita vía exec en
  preview, `?action=daily` y `?action=monitor-logs` con curl, un evento de Stripe de prueba, y
  correr `scripts/set-admin-claims.js --check` contra el proyecto (lee con el SDK nuevo).
- **Ejecutor**: delegable a la routine/implementador siguiendo este playbook al pie de la letra;
  las fases C.13 y D.15 las verifica el usuario u orquestador con acceso a prod.

## Historial de actualizaciones

| Fecha | Paquete | Versiones | Proceso | Resultado | Reporte |
|---|---|---|---|---|---|
| 12 jul 2026 | (varios, transitivos) | `npm audit fix` sin --force | §2 corto | 13 vulns → 9 (form-data, fast-xml-builder resueltas) | `docs/reportes/2026-07-12-chore-npm-audit.md` |
| — | `firebase-admin` | 13.10 → 14.x | §3+§4 | PENDIENTE (gated: flags estables 2 semanas) | — |
