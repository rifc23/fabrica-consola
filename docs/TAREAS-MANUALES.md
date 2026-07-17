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

## ✅ 4. Instalar la routine cloud (Motor A) — una vez, cuando quieras autonomía continua

**Completada 2026-07-17:** routine `routine-fabrica-consola` instalada (trigger
`trig_019pWyj5wGgc5WNLZMEvzjSx`), cron cada 2 horas (`0 */2 * * *`), sesión fresca por disparo,
peldaño 3 (deja ramas listas, el usuario aprueba merges; la documentación sí se pushea a main).
**Apagado automático:** cuando no quede ningún ítem delegable, la routine escribe
`docs/reportes/CAMPANA-<fecha>-FINAL.md` en main — ese archivo es el candado: los disparos
siguientes terminan al instante sin hacer nada. Agregar entradas nuevas al `📥 Inbox` o tareas al
backlog REABRE la campaña automáticamente. Para apagarla del todo o reactivarla a mano: UI de
routines de claude.ai.

**Qué:** el prompt parametrizado (peldaño 3, sin push de merges) para que la fábrica itere el
backlog sola cada N horas; regenerable desde `docs/plantilla-routine-prompt.md`.

## 🟡 6. Crear la routine madre desde la UI de routines (experimento — instalación autónoma)

**Qué:** una routine que detecta proyectos nuevos sin `trigger_id` en su `.fabrica.json` y les
instala su routine orquestadora automáticamente (elimina el paso manual de la pantalla de
arranque). DEBE crearse desde la UI de routines de claude.ai — creada programáticamente nace sin
las herramientas de triggers. Análisis en `docs/diseno-consola-web.md` §4 Motor A.
**Cómo:** seguir `docs/routine-madre-prompt.md` (prompt listo para pegar + pasos + verificación).
Cadencia: `50 * * * *`. Si el primer tick deja `EXPERIMENTO-ROUTINE-MADRE-FALLIDO.md` en
`docs/reportes/`, borrar la routine de la UI — el flujo manual sigue funcionando igual.
**Tiempo:** 3 min + verificar el primer tick.

## ⚪ 5. `VERCEL_TOKEN` (opcional, solo si quieres deploy autónomo desde agentes)

**Qué:** permite que `arquitecto-stack` u otro agente conecte proyectos a Vercel por API/CLI sin
que tú entres a la consola de Vercel cada vez. No es necesario si ya conectaste el repo (tarea 3).
**Cómo:** vercel.com/account/tokens → Create Token → pégalo donde lo pida el agente (nunca en
código/git — incluye la env var `VERCEL_TOKEN` en Vercel si algún workflow de CI lo necesita).
**Tiempo:** 2 min.

(Retirada 2026-07-17: la tarea de crear `ANTHROPIC_API_KEY` para el refinado instantáneo del
feedback ya no aplica en v1 — el refinado lo hace la routine en el cron. Se repondrá solo si se
construye la mejora opcional P2 del backlog.)
