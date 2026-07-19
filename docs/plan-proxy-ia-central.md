# Plan — Proxy central de IA para proyectos hijos (Gems y futuros consumidores de LLM)

Estado: APROBADO por el usuario (2026-07-19), pendiente de implementar. Autor: agente
arquitecto (sesion interactiva), 2026-07-18. No modifica CLAUDE.md/backlog/codigo — solo este
documento; la implementacion es trabajo futuro (Paquete 1 primero, ver seccion 6).

## Decisiones del usuario sobre las preguntas abiertas (seccion 7, resueltas 2026-07-19)

1. **Nombre y visibilidad del repo:** `fabrica-ia-proxy`, privado. Confirmado, no queda como
   sugerencia del arquitecto sino como nombre definitivo.
2. **Proveedor default del proxy:** Gemini (mismo criterio que ya usan los Gems — capa
   gratuita). No se construye adaptador doble en v1 del proxy; si hace falta Claude despues se
   agrega siguiendo el mismo patron IA_PROVEEDOR que ya usan los Gems.
3. **Gobernanza:** infraestructura mantenida a mano/interactiva — SIN routine automatica por
   ahora. Razon del usuario (alineada con la recomendacion del arquitecto): maneja el secreto de
   IA compartido por TODOS los proyectos hijos, mas sensible que cualquier proyecto existente
   hasta hoy; el patron de peldano 4 (gate de CI reemplaza revision humana) no esta probado
   todavia en algo de este nivel de sensibilidad. Nace FUERA del template de fabrica-agentes (sin
   `.fabrica.json`, no aparece en el dropdown de la consola, no tiene routine ni trigger_id) —
   es infraestructura, no un "proyecto de la fabrica".

## 0. Resumen de la recomendacion

Un servicio nuevo, en repo propio (rifc23/fabrica-ia-proxy), fuera de fabrica-consola,
desplegado en Vercel con su propia key real de proveedor server-side y persistencia minima
via Vercel KV (o Upstash Redis, capa gratuita) para tokens de proyecto + contadores de uso.
Autenticacion proyecto-proxy con tokens opacos (no JWT) generados y hasheados por el proxy,
guardados en texto plano SOLO una vez en el momento de emitirlos (igual que un PAT de GitHub).
fabrica-consola gana un flag usaProxyIA que reemplaza agregarTareaManualClaveIA por un
paso automatico: llamar al proxy para aprovisionar el token del proyecto nuevo y dejarlo
configurado en Vercel del proyecto hijo (si hay VERCEL_TOKEN) — degradando a tarea manual si
no. No hay Gems vivos hoy, asi que no hace falta plan de migracion de datos, solo de codigo.

Ver seccion 7 para las 3 preguntas que solo el usuario puede resolver antes de implementar nada.

---

## 1. Donde vive el proxy: repo nuevo vs. dentro de fabrica-consola

Recomendacion: repo nuevo, propio ciclo de deploy.

Comparacion de criterios:

- Acopla el ciclo de vida:
  - Repo nuevo: No. El proxy es infraestructura de PRODUCCION de N proyectos hijos, no una
    feature de la consola. Un bug/redeploy de la consola (UI, dashboard) no debe poder tumbar
    el chat de un Gem en uso.
  - Dentro de fabrica-consola: Si. Mismo deploy, mismo dominio, mismo gate. Cualquier cambio en
    la consola (aunque sea de UI) redeploya el proxy tambien.
- Viola "consola sin BD":
  - Repo nuevo: No aplica — el proxy es OTRO servicio, tiene su propia regla de datos.
  - Dentro de fabrica-consola: Si el proxy vive aqui, agregarle persistencia (tokens,
    contadores) contradice literalmente la Decision Arquitectonica "Next.js + Vercel, sin base
    de datos" de fabrica-consola — seria la primera excepcion a esa decision y probablemente
    amerita su propia conversacion con el usuario en vez de colarse como side-effect de este
    feature.
- Blast radius del secreto real:
  - Repo nuevo: un solo repo/proyecto Vercel con la key real del proveedor. Mismo principio que
    ya se aplico a GITHUB_PAT (server-side, un solo lugar).
  - Dentro de fabrica-consola: igual de aislado si se usa una env var propia, pero comparte el
    mismo proyecto Vercel que ya tiene GITHUB_PAT y VERCEL_TOKEN — mas secretos en el mismo
    blast radius, sin necesidad.
- Costo:
  - Repo nuevo: +1 proyecto Vercel gratis (capa gratuita cubre esto de sobra a la escala actual:
    N proyectos personales).
  - Dentro de fabrica-consola: 0 extra.
- Gate/CI:
  - Repo nuevo: necesita su propio fabrica-sync.yml (copiado del patron ya probado) o gate
    manual simple (es un servicio chico: 2-3 endpoints). Repo nuevo repite otra vez el Error
    Conocido de "triggers programaticos sin permiso de escritura" si algun dia se le pone una
    routine — hay que instalarla desde la UI si se decide automatizarlo.
  - Dentro de fabrica-consola: reutiliza el gate y el fabrica-sync.yml ya existentes y probados
    — cero setup nuevo de CI.
- Coherencia con "la consola no llama a LLM":
  - Repo nuevo: refuerza la separacion — el proxy es explicitamente "no la consola", nadie
    tiene que releer la regla para confirmar que no la viola.
  - Dentro de fabrica-consola: ambiguo a primera vista — un lector futuro de CLAUDE.md veria
    app/api/ia/completar/route.ts dentro de fabrica-consola y podria (razonablemente) pensar que
    contradice "la consola no llama a ningun LLM en v1", aunque tecnicamente el llamador sea el
    proyecto hijo y no la consola misma. Evitar la ambiguedad es mas barato que explicarla para
    siempre.

Por que gana el repo nuevo pese al costo de setup extra: el criterio de menor costo aplica
sobre el ciclo de vida completo, no solo el primer deploy. Meter el proxy dentro de
fabrica-consola ahorra un repo hoy pero crea dos deudas: (1) rompe la decision "sin base de
datos" de fabrica-consola sin que el usuario la haya tomado explicitamente para ESTE caso, y
(2) acopla la disponibilidad de la IA en produccion de N proyectos hijos al deploy de la
consola. Ninguna de las dos es reversible barata despues (una vez que un Gem depende del dominio
de fabrica-consola, separar el proxy implica rotar tokens y URLs en cada proyecto hijo).

Nombre del repo: dejo fabrica-ia-proxy como sugerencia, pero el nombre es una decision
reservada del usuario (ver seccion 7, pregunta 1) — no lo doy por asumido, solo lo uso como
placeholder en el resto del plan.

---

## 2. Modelo de autenticacion proyecto -> proxy

Recomendacion: token opaco por proyecto, generado por el proxy, guardado hasheado en su
store, verificado con lookup + comparacion en tiempo constante — NO JWT.

Por que no JWT firmado: un JWT autofirmado sin estado permitiria revocar solo dejandolo expirar
o llevando una denylist (que igual es estado persistente) — no gana nada en simplicidad frente a
un token opaco, y agrega superficie (elegir algoritmo, rotar la clave de firma, validar exp).
Con solo N proyectos personales (probablemente menos de 20 en el horizonte visible), un lookup
en KV es mas simple y mas barato que gestionar una PKI casera. Precedente directo en el propio
repo: asi es exactamente como ya funciona GITHUB_PAT/VERCEL_TOKEN — secreto opaco, sin
estructura, validado por posesion.

Flujo de emision:

1. fabrica-consola, en el paso "manifest" de crear-proyecto/route.ts (mismo punto donde hoy
   se decide agregarTareaManualClaveIA), si body.usaProxyIA, llama a POST /proyectos del proxy
   con el id del proyecto nuevo, autenticado con un secreto ADMIN propio del proxy
   (IA_PROXY_ADMIN_TOKEN, env var nueva de fabrica-consola, server-side, mismas reglas que
   GITHUB_PAT).
2. El proxy genera un token opaco aleatorio (256 bits, crypto.randomBytes), guarda
   hash(token) -> datos del proyecto (id, fecha de creacion, limite mensual) en su store, y
   devuelve el token EN CLARO una unica vez en la respuesta (igual que GitHub muestra un PAT
   nuevo una sola vez).
3. fabrica-consola recibe el token y, si hay VERCEL_TOKEN, lo escribe como env var
   IA_PROXY_TOKEN en el proyecto Vercel del repo hijo recien creado (nuevo helper en
   src/lib/vercel.ts, ej. configurarEnvVarProyecto — la API de Vercel ya expone el endpoint de
   variables de entorno por proyecto). Si no hay VERCEL_TOKEN o esa llamada falla, degrada
   exactamente igual que hoy: tarea manual en TAREAS-MANUALES.md con el token pegado UNA VEZ
   (aceptable porque TAREAS-MANUALES.md vive en el repo PRIVADO del proyecto hijo, mismo nivel
   de exposicion que cualquier otro secreto que ya se documenta ahi a mano hoy — pero debe
   marcarse como bloqueante igual que la key de IA actual, y el texto debe advertir "no
   commitear este token en ningun otro archivo").
4. El proyecto hijo usa IA_PROXY_TOKEN como bearer contra POST /completar del proxy. El
   proxy hace el lookup por hash, valida cuota (seccion 4) y reenvia al proveedor real con SU
   key.

Verificacion del proxy sin JWT: comparar el hash del token recibido contra el hash guardado
usando una comparacion en tiempo constante (para evitar timing attacks). El hash es SHA-256
simple — no hace falta bcrypt/argon2 porque el token ya tiene 256 bits de entropia (no es una
password humana adivinable por fuerza bruta offline).

Revocacion: endpoint de borrado por id de proyecto en el proxy (para cuando se elimina un
proyecto — engancha con la "Zona de peligro" existente de fabrica-consola).

---

## 3. Persistencia minima del proxy

Viola la regla "sin base de datos" — pero esa regla es de fabrica-consola, no del proxy nuevo
(son servicios distintos, ver seccion 1). El proxy SI necesita estado: tokens validos, contador
de uso mensual por proyecto. Recomendacion: Vercel KV (Redis gestionado, capa gratuita cubre
esto de sobra — decenas de proyectos con miles de requests por mes) por integrarse nativo con
Vercel sin credenciales adicionales que gestionar. Alternativa equivalente: Upstash Redis
directo. Esta eleccion de proveedor de store es de implementacion, no bloquea el plan — lo dejo
anotado para quien implemente, no es una pregunta abierta al usuario.

Esquema de datos (2 tipos de registro, nada mas):

- token con su hash como clave -> datos del proyecto (id, fecha de creacion)
- contador de uso por proyecto y mes -> numero incremental (con vencimiento de unos 40 dias,
  se auto-limpia)

Nada de logs de contenido de las conversaciones — solo metadata de cuota. Loguear el contenido
de las llamadas violaria el espiritu de "sanitizar/no exponer" del resto de CLAUDE.md aunque no
haya una regla textual especifica para el proxy todavia.

---

## 4. Rate limit / tope de gasto

Recomendacion minima viable: tope mensual de requests por proyecto (no de tokens/costo en
dinero — mas simple de calcular y suficiente como salvaguarda contra un bug en loop).

- Env var del proxy LIMITE_MENSUAL_DEFAULT (ej. 500 requests por mes por proyecto) aplicada a
  todo proyecto salvo que su registro en KV tenga un override.
- El proxy responde con codigo 429 y un header de reintento cuando un proyecto supera su cuota
  del mes — el adaptador ProveedorIA del proyecto hijo ya deberia manejar errores de proveedor
  (Gemini/Anthropic tambien devuelven 429), asi que este caso reusa la misma ruta de manejo de
  error sin requerir codigo nuevo del lado del proyecto hijo.
- No sobre-disenar: nada de billing real, nada de alertas por email, nada de dashboards de costo
  en v1 del proxy — eso es P2 si el volumen real lo justifica. Un simple endpoint de consulta de
  uso por proyecto, protegido con el mismo ADMIN token, sirve para que el dashboard de
  fabrica-consola (fuera de este plan, seria un paquete futuro opcional) o el propio usuario por
  curl consulten el consumo si hace falta depurar.

---

## 5. Integracion con el flujo de creacion de proyecto existente

Cambios en fabrica-consola (paquete 2, ver seccion 6):

- src/lib/formulario-proyecto.ts: nuevo campo opcional usaProxyIA (booleano) en
  FormularioProyecto, analogo a esGem pero NO acoplado a el — un Gem hoy fuerza IA_PROVEEDOR y
  key propia; con el proxy, un Gem futuro podria marcar usaProxyIA en true en vez de pedir key
  propia, y el proyecto nuevo de "tickets con OCR" (que no es un Gem) tambien podria marcarlo.
  Mantenerlos como dos flags independientes evita acoplar el blueprint de chat-con-rol al
  mecanismo de auth de IA — el usuario podria querer un Gem con key propia (ej. para usar un
  modelo que el proxy no soporta) sin tener que tocar el blueprint.
- Reemplaza, no convive con, agregarTareaManualClaveIA PARA quien elija el proxy: si
  usaProxyIA, el paso "manifest" de crear-proyecto/route.ts llama al proxy (aprovisionar
  token) en vez de llamar a agregarTareaManualClaveIA. Si el aprovisionamiento falla (proxy
  caido, IA_PROXY_ADMIN_TOKEN no configurado), degrada a una tarea manual NUEVA y distinta
  (configurar IA_PROXY_TOKEN a mano pegando el token que de el proxy) — mismo patron de
  degradacion elegante que ya usa agregarTareaManualVercel. agregarTareaManualClaveIA sigue
  existiendo tal cual para quien NO marque usaProxyIA (key propia del proveedor) — las dos
  rutas conviven como opciones del usuario en el formulario, no como viejo-vs-nuevo a demoler.
- UI del formulario (nuevo-proyecto/page.tsx, fuera del alcance detallado de este plan de
  arquitectura pero mencionado porque toca la regla mobile-first): un control adicional para
  elegir entre key propia del proveedor y proxy compartido de la fabrica (recomendado) — sigue
  las mismas reglas de targets tactiles de al menos 44px que el resto del formulario, sin
  trabajo nuevo de diseno (reusa los mismos controles que ya existen para esGem).
- Fase 1 del metodo fabrica / arquitecto-stack: cuando el proyecto nace con usaProxyIA,
  docs/SPECS.md debe documentar que la capa ProveedorIA (mismo patron ya definido para Gems
  en featuresBlueprintGem) apunta al proxy en vez de a Gemini/Anthropic directo — el adaptador
  cambia de los archivos separados por proveedor a un unico adaptador de proxy que llama al
  endpoint de completar con el token de proyecto como bearer. Esto es contenido generado
  (generarSpecsMdGem/generarContenidoProyecto o su equivalente para el proyecto de tickets), no
  codigo de infraestructura — lo construye quien implemente el paquete 2, siguiendo el mismo
  patron textual que ya existe para Gems.
- Proyecto "tickets con OCR" nuevo: no es un Gem (no tiene rol persistente ni chat), asi que
  NO usa featuresBlueprintGem. Necesita su propio blueprint de features (CRUD de tickets,
  captura de foto, llamada al proxy con vision, guardado en su propia base de datos — la del
  proyecto hijo, no la del proxy) — eso es un paquete de producto aparte, no de este plan de
  proxy. Este plan solo le da el mecanismo de auth de IA; el resto de sus specs las define el
  usuario en el formulario como cualquier proyecto no-Gem.

---

## 6. Paquetes desplegables

### Paquete 1 — Repo y servicio del proxy (autocontenido, sin tocar fabrica-consola)

Que: crear fabrica-ia-proxy desde CERO (no desde el template de agentes — es infraestructura,
no un "proyecto de la fabrica" con routine propia... salvo que el usuario prefiera lo contrario,
ver seccion 7 pregunta 3). Endpoints minimos: aprovisionar token de proyecto (admin), revocar
token de proyecto (admin), completar (proyecto hijo, con su bearer token), y consultar uso
(admin, diagnostico). Adaptador de proveedor unico (Gemini o Claude — ver seccion 7 pregunta 2)
con la key real como env var server-side. Vercel KV conectado. Gate propio: lint + build + tests
sobre sus propias funciones puras (validacion de token, calculo de cuota) con tests primero,
igual que el resto de la fabrica.

Archivos: todo nuevo, en el repo nuevo — cero archivos de fabrica-consola tocados.

Orden seguro: este paquete se despliega y se prueba SOLO (con un token de prueba emitido a
mano via curl) antes de que ningun proyecto hijo real dependa de el. No hay riesgo para
fabrica-consola ni para proyectos existentes porque nada los conecta todavia.

Rollback: apagar/borrar el proyecto Vercel del proxy — no afecta nada mas porque nadie lo
consume aun.

Que NO tocar: fabrica-consola (ningun archivo), ningun repo de proyecto hijo existente.

### Paquete 2 — Integracion en fabrica-consola (feature flag apagado por default)

Que: agrega usaProxyIA al formulario y al flujo de crear-proyecto/route.ts (aprovisionar
token, degradacion a tarea manual, contenido de SPECS.md para el adaptador proxy). Env var
nueva IA_PROXY_ADMIN_TOKEN e IA_PROXY_URL en Vercel de fabrica-consola. Sigue el patron de
"enforcement en dos fases": el control puede desplegarse desmarcado por default o incluso
oculto tras revisar que el paquete 1 lleva ya un tiempo estable antes de ofrecerlo en la UI
real.

Archivos: src/lib/formulario-proyecto.ts (nuevo campo + funcion de tarea manual de respaldo),
src/lib/vercel.ts (nuevo helper para configurar env var de proyecto), src/app/api/crear-proyecto/route.ts
(nuevo paso de aprovisionamiento), src/app/nuevo-proyecto/page.tsx (control nuevo), tests
correspondientes primero por la regla de testing de CLAUDE.md.

Orden seguro: rama propia (feat/proxy-ia-integracion), gate completo, merge solo despues de
que el Paquete 1 este verificado en produccion de forma independiente (curl manual con un
proyecto de prueba). Es aditivo puro: sin marcar el control, el comportamiento es IDENTICO al
actual (mismo camino que hoy: esGem sin usaProxyIA sigue pidiendo key propia via
agregarTareaManualClaveIA, exactamente como ahora).

Rollback: revert del merge — el control desaparece, el flujo vuelve a ser exactamente el de
hoy. No hay estado migrado que deshacer porque no hay Gems vivos (ver seccion 8, confirmacion
de migracion).

Que NO tocar: el flujo de esGem sin usaProxyIA no cambia una linea de comportamiento.

### Paquete 3 (opcional, futuro) — Dashboard de uso/costo en fabrica-consola

Fuera de alcance de este plan salvo mencion: un panel de solo-lectura que consuma el endpoint
de uso del proxy para mostrar cuota consumida por proyecto en el dashboard existente. Es 100%
lectura (no viola v1 read-only), pero no es necesario para que el proxy funcione — se propone
como mejora posterior, no bloqueante.

---

## 7. Preguntas abiertas — RESUELTAS por el usuario 2026-07-19 (ver encabezado del documento)

Las 3 preguntas originales (nombre/visibilidad del repo, proveedor default, gobernanza) ya
tienen decision del usuario — ver la seccion al inicio del documento. Se conserva el
razonamiento original de cada opcion abajo como contexto de por que se llego a esa
recomendacion, pero ya no son preguntas abiertas.

1. ~~Nombre y visibilidad del repo nuevo del proxy.~~ → `fabrica-ia-proxy`, privado.
2. ~~Proveedor default del proxy.~~ → Gemini (sin adaptador doble en v1).
3. ~~Gobernanza (proyecto de la fabrica vs. infraestructura manual).~~ → infraestructura manual,
   sin routine automatica.

---

## 8. Confirmacion de migracion

No hay ningun Gem vivo en produccion hoy — el unico proyecto de prueba (calculadora) ya fue
eliminado segun el ancla de rollback vigente en CLAUDE.md. No hace falta plan de migracion de
datos ni de tokens existentes: el Paquete 2 nace y el proximo Gem o proyecto de IA que se cree
desde el formulario es el primero en usar el flujo nuevo. agregarTareaManualClaveIA sigue
disponible sin cambios para quien no marque usaProxyIA, asi que no hay ningun camino existente
que se rompa.
