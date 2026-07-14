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

## 🔴 1. Crear el repo en GitHub y hacer push del esqueleto

**Qué:** el proyecto solo existe local hasta ahora; sin repo remoto no hay CI, no hay deploy, y la
propia consola no puede autogestionarse ni ser el "primer hijo" de la fábrica.
**Cómo:**
1. Crea un repo vacío en GitHub (ej. `rifc23/fabrica-consola`), privado o público (tu elección).
2. `git remote add origin https://github.com/rifc23/fabrica-consola.git`
3. `git push -u origin main`
**Tiempo:** 2 min.

## 🔴 2. Crear el `GITHUB_PAT` fine-grained y configurarlo en Vercel

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

## 🟠 3. Conectar el repo a Vercel (deploy automático por push)

**Qué:** sin esto, los push a `main` no despliegan nada — el "esqueleto andante" queda solo local.
**Cómo:**
1. vercel.com → Add New → Project → importa `rifc23/fabrica-consola` desde GitHub (requiere la
   integración GitHub↔Vercel instalada una vez por cuenta).
2. Framework preset: Next.js (autodetectado). Build command/output: defaults.
3. Agrega la env var `GITHUB_PAT` (ver tarea 2) antes del primer deploy si ya la tienes.
4. Deploy. Cada push a `main` despliega a producción desde entonces; cada PR genera su preview URL.
**Tiempo:** 3 min.

## 🟡 4. Decidir diseño visual y nombre del producto

**Qué:** te reservaste estas dos decisiones en la Fase 0 (ver `docs/backlog.md` § Decisiones
estacionadas). La UI actual es intencionalmente mínima hasta que decidas.
**Cómo:** responde en el backlog (o dile al agente `disenador-ui` que te proponga 2-3 direcciones)
si quieres iterar sobre lo mínimo o invertir en un sistema de diseño antes del formulario real.
**Tiempo:** cuando puedas — no bloquea el desarrollo de las features P0.

## 🟡 5. Instalar la routine cloud (Motor A) — una vez, cuando quieras autonomía continua

**Qué:** el prompt parametrizado listo en el mensaje final de esta sesión de `/fabrica` (peldaño 3,
sin push). Pégalo en `/schedule` para que la fábrica siga iterando el backlog sola cada N horas.
**Cómo:** ver el prompt entregado al cierre de esta sesión, o regenerarlo desde
`docs/plantilla-routine-prompt.md` con los datos de este proyecto.
**Tiempo:** 1 min.

## ⚪ 6. `VERCEL_TOKEN` (opcional, solo si quieres deploy autónomo desde agentes)

**Qué:** permite que `arquitecto-stack` u otro agente conecte proyectos a Vercel por API/CLI sin
que tú entres a la consola de Vercel cada vez. No es necesario si ya conectaste el repo (tarea 3).
**Cómo:** vercel.com/account/tokens → Create Token → pégalo donde lo pida el agente (nunca en
código/git — incluye la env var `VERCEL_TOKEN` en Vercel si algún workflow de CI lo necesita).
**Tiempo:** 2 min.
