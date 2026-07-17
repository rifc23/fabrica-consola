# Playbook — Integraciones con servicios externos (Google, Stripe, Twilio, ...)

Cómo la fábrica agrega comunicación con un servicio de terceros a un proyecto. Ejemplo trabajado
real: la integración Google OAuth + Calendar + webhooks de Diván (crm-grecia-fire, CLAUDE.md
§ "Google Calendar") — este playbook destila ese aprendizaje.

## El principio: toda integración son DOS mitades

| Mitad | Quién | Qué incluye |
|---|---|---|
| **Código** | 100% el agente (arquitecto-stack / implementador) | SDK/fetch, flujo OAuth, endpoints, manejo de tokens, mocks para tests, NOMBRES de env vars |
| **Consola del proveedor** | 100% el usuario | Crear el proyecto/app en el proveedor, client ID/secret, redirect URIs, activar APIs, pegar secrets en el store |

La mitad del usuario se entrega SIEMPRE como entrada en `docs/TAREAS-MANUALES.md` con pasos
exactos, URLs y tiempo estimado — nunca como "configura Google" a secas. El agente NUNCA se
bloquea esperándola: construye contra mocks y deja la conexión real lista para cuando el usuario
pegue los secrets.

## Proceso (extensión de la Parte 1.5 del arquitecto-stack)

1. **Detección**: la feature de las specs implica un servicio ("agendar en el calendario del
   usuario" → Google Calendar; "cobrar" → Stripe; "SMS" → Twilio). El ADR evalúa proveedor y tier
   contra el principio de menor costo (¿hay free tier? ¿hay alternativa nativa/gratuita?).
2. **Diseño del flujo de credenciales ANTES de codificar** — las preguntas que evitan re-trabajo:
   - ¿API key simple o OAuth? Si OAuth: ¿acceso solo-en-sesión o se necesita **refresh_token**
     server-side para operar sin el usuario presente (webhooks, crons)? (Cicatriz Diván: elegir
     mal esto costó una migración entera — si hay operaciones en background, refresh_token
     server-side desde el día 1, guardado donde el cliente NO pueda leerlo.)
   - ¿Scopes mínimos? (pedir de más complica la verificación del proveedor)
   - ¿Webhooks entrantes? → endpoint + verificación de firma/token + renovación de canales si
     expiran (Google los mata a los ~7 días — cron de renovación).
3. **Código con mocks primero**: la integración nace testeable — E2E con el servicio mockeado
   (`page.route` / harness), tests unitarios de los payloads. El gate NUNCA depende del servicio
   real.
4. **Secretos por NOMBRE**: en el repo solo `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/etc. y cómo
   generarlos; valores → Vercel env / GitHub secrets (o la consola de la fábrica los escribe por
   API). Server-only NUNCA con prefijo expuesto al cliente (VITE_/NEXT_PUBLIC_).
5. **Entrega en dos fases**: (a) merge del código con mocks + entrada en TAREAS-MANUALES con la
   mitad del usuario; (b) cuando el usuario complete su mitad → verificación real en preview con
   checklist explícito (login OAuth completo, un webhook real recibido, etc.).

## Cicatrices específicas de Google (del caso Diván — leerlas ANTES de integrar Google)

- **OAuth consent en modo Testing**: los refresh tokens caducan cada ~7 días y hay tope de 100
  usuarios. Para producción real se necesita la VERIFICACIÓN de Google (semanas, privacy policy,
  video demo; scopes "sensitive" como calendar = revisión estricta). **Iniciar el trámite el
  día 1 del proyecto, no al lanzar** — entra a TAREAS-MANUALES como 🔴 desde el arranque.
- `access_type=offline` + `prompt=consent` para obtener refresh_token; llega SOLO la primera vez.
- El refresh_token vive server-side en un doc/tabla que el cliente no puede leer; el access_token
  se renueva solo cuando quedan <2 min.
- Webhooks de Calendar requieren canal registrado + cron de renovación (~cada 6 días) +
  auto-sanado del canal al renovar sesión.
- En handlers serverless: NUNCA responder antes de terminar el trabajo async (responder mata la
  función en Vercel).

## Base de datos para un proyecto (agregado 2026-07-17)

SÍ es posible y está previsto — la decide e instala el `arquitecto-stack` en la Fase 1 (o al
agregarla como capa mayor después), con ADR contra las specs y el presupuesto. Árbol de decisión:

0. **¿De verdad hace falta BD?** Principio de menor costo primero: si el estado cabe en el propio
   repo (archivos JSON/markdown, como hace la consola de la fábrica) o en el navegador
   (localStorage), no hay BD que operar ni pagar. Muchos MVP no la necesitan el día 0.
1. **Default cuando sí hace falta: storage nativo de Vercel** (Marketplace) — Postgres (Neon),
   KV/Redis (Upstash) o Blob. Razón: se aprovisiona con el MISMO `VERCEL_TOKEN` que ya tiene la
   fábrica y las env vars se inyectan SOLAS al proyecto conectado → conserva la autonomía (cero
   o mínima tarea manual), free tier Hobby para empezar, y el agente puede dejarlo andando.
2. **Firestore** — cuando el dominio es documental/realtime o se quiere el ecosistema Firebase
   (Auth, Storage). Patrón ya probado en casa (Diván). Mitad del usuario: crear el proyecto en la
   consola Firebase y pegar credenciales. Sus `firestore.rules` NUNCA las deploya la routine
   (restricción vigente) — quedan como tarea manual con el comando exacto.
3. **Supabase** — cuando se necesita Postgres + Auth + Storage + realtime en un solo proveedor
   con free tier generoso. Mitad del usuario: crear el proyecto Supabase y pegar URL + keys.

Reglas NO negociables (aplican a cualquier opción): credenciales SIEMPRE server-side y por
NOMBRE (nunca el valor en repo/cliente/logs); escrituras merge/parcial, nunca sobreescribir
documentos completos; **la routine NUNCA corre migraciones contra la BD real** ni deploya
reglas/esquemas — las migraciones se entregan como script + tarea manual con pasos exactos;
tests y gate SIEMPRE contra mock/emulador local, nunca contra la BD real; y toda opción con
costo recurrente >$0 se estaciona como decisión `[USUARIO]` antes de comprometerse.

## Integraciones ya destiladas (crecer esta tabla con cada proyecto)

| Servicio | Patrón de referencia | Dónde está el ejemplo completo |
|---|---|---|
| Google (OAuth/Calendar/webhooks) | refresh_token server-side + proxy autenticado + canales renovables | Diván: CLAUDE.md § Google Calendar, api/calendar.js, api/auth-google.js |
| Stripe (pagos/webhooks) | webhook con verificación de firma + claims/estado server-side + eventos de prueba con firma local | Diván: api/stripe-webhook.js, tests-e2e/stripe-webhook.spec.js |
| Telegram (notificaciones) | bot API con env vars, no-op silencioso si faltan | Diván: api/_monitor.js |

## Nota aparte: herramientas para los AGENTES (no para la app)

Distinto de integrar un servicio EN la app: darle herramientas al agente mismo (ej. que consulte
Google Drive). Eso se hace con **MCP servers** — `.mcp.json` en la raíz del repo (project-scoped,
viaja con el template si se desea) o `mcp_connections` en las routines cloud. Requiere que el
usuario autorice el conector una vez (OAuth interactivo en claude.ai/customize/connectors) — es
opcional y rara vez necesario: la mayoría de las integraciones son de la APP, no del agente.
