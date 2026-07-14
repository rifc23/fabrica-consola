# Método "Fábrica de agentes" — manual replicable

Sistema de trabajo destilado del proyecto Diván (julio 2026): 3 días, ~40 ramas mergeadas a
producción, 225→624 tests, 4 campañas de agentes, 1 routine cloud autónoma con autoridad de push —
sin romper producción (y arreglando 6+ bugs que ya estaban rotos). Este documento contiene TODO lo
necesario para replicarlo en cualquier proyecto, incluido uno desde cero ("créame una calculadora").

---

## 1. Los 7 principios (el porqué de todo lo demás)

1. **Git es la única memoria.** Agentes, sesiones y routines mueren o pierden contexto sin aviso —
   todo estado vive en el repo: backlog, reportes, decisiones, planes. Un agente nuevo debe poder
   reconstruir el estado completo leyendo 2 archivos. *Cicatriz: dos documentos de planeación se
   perdieron por vivir solo en un worktree efímero — regla: todo entregable se commitea en la rama
   ANTES de cerrar la tarea.*
2. **Gates innegociables antes que autonomía.** Nadie mergea nada sin: tests unitarios + linters/
   ratchets + build + E2E, en verde, corridos DE VERDAD (no "si está disponible"). La autonomía se
   construye ENCIMA del gate, nunca en su lugar. *Cicatriz: un bug de 500 en producción pasó el
   gate unitario — el E2E que lo habría atrapado no existía aún; en cuanto existió, lo atrapó.*
3. **Escritor único y territorio.** Cada agente escribe SOLO en su worktree; los archivos
   compartidos (backlog, CLAUDE.md) los edita ÚNICAMENTE el orquestador; cada agente reporta en un
   archivo propio con nombre único (`docs/reportes/<fecha>-<rama>.md`). Dos tareas que comparten
   archivos fuente van en SERIE, jamás en paralelo. *Cicatriz: ediciones concurrentes al checkout
   principal → carreras, stashes huérfanos, trabajo rehecho.*
4. **Paquetes completos o nada.** Una tarea se toma entera (código + tests + gate + reporte) o no
   se toma. Antes de iniciar, el agente evalúa si le queda contexto para cerrarla; si no, no la
   empieza. Prohibido dejar ramas a medias.
5. **No-bloqueo con decisiones estacionadas.** Lo que requiera credenciales, consolas o decisiones
   del usuario se documenta con la pregunta/acción EXACTA y se sigue con lo siguiente. El reporte
   final siempre tiene dos listas: (A) completado, (B) estacionado esperando al humano.
6. **Dos fases para todo lo riesgoso.** El mecanismo nuevo se despliega APAGADO (flag, default =
   comportamiento viejo), se activa gradualmente, se observa, y solo entonces se demuele el viejo.
   Nunca activar lo nuevo y quitar lo viejo en el mismo deploy. Rollback = cambiar un flag o
   `git revert <ancla>`, siempre anotada. *Éxito: la migración de Apps Script a rutas nativas con
   flags por operación — rollback de 30 segundos sin deploy.*
7. **Observabilidad barata desde el día 1.** Una línea de log por decisión de ruteo/operación
   crítica. *Cicatriz-éxito: una línea `op=X ruta=Y` encontró en 1 hora un hueco de arquitectura
   (4ª operación sin migrar) que tres campañas de agentes no vieron.*

## 2. Kit de arranque — archivos a crear en CUALQUIER repo nuevo

### 2.1 `CLAUDE.md` (mínimo viable — crece con el proyecto)

```markdown
# <Proyecto> — Guía para agentes
## Qué es este proyecto
<2 párrafos: qué hace, para quién, stack, cómo se despliega>
## REGLAS NO NEGOCIABLES
<seguridad de datos, secretos solo por nombre, lo que jamás se hace>
## Regla de despliegue seguro
Rama propia por cambio + gate (<comandos exactos del stack>) + merge ff/no-ff + ancla de rollback.
El push a <rama principal> despliega a producción.
## Decisiones Arquitectónicas — No Revertir
<lista viva; cada decisión con su porqué>
## Errores Conocidos — No Repetir
<lista viva; cada bug resuelto deja su regla>
## Ancla de rollback
<hash del último estado bueno + cómo revertir>
```

### 2.2 `.claude/agents/` — 5 roles (commiteados en git)

Copiar de este repo (`.claude/agents/*.md`) y ajustar la sección de contexto del proyecto:
- **implementador** (tools completas, `model: inherit`) — único que escribe código; regla #0 de
  territorio; gate obligatorio; reporte en archivo propio.
- **arquitecto** (solo lectura, sonnet) — planes por paquetes desplegables, nunca implementa.
- **auditor-seguridad** (solo lectura) — checklist del dominio; reporta severidad+archivo:línea+fix.
- **qa-funcional** (solo lectura, sonnet) — verifica flujos completos, corre gates, reporta huecos.
- **producto** (lectura+web, sonnet) — evalúa features contra el mercado/costo/riesgo.

- **arquitecto-stack** (con manos) — decide tecnologías contra las specs/presupuesto (ADR) y las
  instala: scaffolding, paquetes por capacidad (plataforma-nativa-primero + tabla de evaluación +
  prueba de humo), gate, CI y deploy conectado.
- **disenador-ui** (con manos para CSS/HTML, nunca lógica) — sistema de diseño con tokens únicos
  (la "fuente única" del estilo), specs de UI por feature (jerarquía + 4 estados + microcopy), y
  auditorías visuales con screenshots reales vía Playwright. La identidad visual se estaciona al
  usuario; la calidad (accesibilidad AA, consistencia, estados, responsive) se impone.

Los 3 bloques que TODOS llevan: **Protocolo de sesión** (prod intocable / paquetes completos /
checkpoint de contexto) + **Territorio** + **Formato de salida**.

### 2.3 `docs/backlog.md` — la memoria de trabajo

Cabecera con el protocolo (5 reglas de §1.3-1.5 en forma imperativa), secciones P0/P1/P2, sección
"📦 PAQUETE SIGUIENTE", decisiones del usuario marcadas `[USUARIO]`, y "Registro de trabajo"
(tabla: fecha | tarea | rama | commits | gate | estado).

### 2.4 `docs/TAREAS-MANUALES.md` + `docs/reportes/README.md`

Tareas-manuales: todo lo que SOLO el humano puede hacer, con contexto+comandos+tiempo, por
prioridad. Reportes: convención de archivo único por paquete (qué se hizo / gate real / estacionado
/ propuestas para CLAUDE.md-backlog).

### 2.5 El gate del stack (definirlo el DÍA 1, antes de la primera feature)

3-5 comandos que TODO merge debe pasar. Para un proyecto web nuevo, mínimo: tests unitarios,
build, y desde la semana 1 un E2E aunque tenga 3 specs (crece con cada feature: cada paquete
nuevo agrega su spec). CI (GitHub Actions) corriendo el gate en cada push.

### 2.6 Testing de dos velocidades (eficiencia sin perder la red)

- **Ciclo interno (mientras se desarrolla)** — pruebas CON SCOPE: solo los tests relacionados a
  los archivos tocados. Unitarios: `vitest related --run <archivos>` (sigue el grafo de imports
  automáticamente) o el patrón del área (`vitest run tests/<area>*`). E2E: specs etiquetados por
  área (`playwright test --grep @<area>`) según el mapa de tests del proyecto. Esto es lo que se
  repite 5-20 veces por paquete — aquí vive el ahorro real de tiempo/tokens.
- **Gate pre-merge (una vez por paquete)** — SIEMPRE COMPLETO, innegociable: la suite entera es la
  que atrapa efectos cruzados fuera del scope (cicatrices: un 500 en prod y conflictos entre ramas
  se detectaron por tests "ajenos" al cambio). Un merge jamás se justifica con pruebas scoped.
- **Mantenimiento**: cada proyecto lleva `docs/mapa-tests.md` (área → patrón de unitarios + tag de
  E2E); toda spec E2E nueva nace etiquetada; el mapa se actualiza en el mismo paquete que agrega
  el área.

## 3. La escalera de autonomía (se sube peldaño por peldaño, nunca se arranca arriba)

| Peldaño | Quién mergea/pushea | Cuándo subir al siguiente |
|---|---|---|
| 1. Sesión supervisada | El orquestador, con OK explícito del humano por tanda | 2-3 tandas limpias |
| 2. `/loop` local o campañas | Igual — agentes dejan ramas, humano dice "mergea" | Protocolos estables, cero colisiones |
| 3. Routine cloud SIN push | La routine deja ramas + reporte final en archivo vigilado | 1-2 campañas limpias |
| 4. Routine cloud CON push | La routine, autónoma, con gate completo por merge | Auditoría retrospectiva limpia de sus primeros disparos |

El peldaño 4 exige: gate con E2E real, anclas de rollback anotadas, Paso 0 anti-solape (verificar
que no hay otra ejecución/trabajo a medias antes de tocar nada), y auditorías retrospectivas
periódicas del humano+orquestador ("revisa los últimos N disparos"). La autoridad se RATIFICA por
escrito en el backlog y es exclusiva de la routine-orquestador (sus subagentes nunca pushean).

## 4. Greenfield: "créame una calculadora" — el flujo producto-completo

### Fase 0 — Specs (el humano, 15-30 min; es LA inversión de mayor retorno)
Entregar al orquestador:
```
OBJETIVO: <qué problema resuelve, para quién>
FEATURES MVP: <lista numerada, priorizada — qué es v1 y qué NO es v1>
CRITERIOS DE ACEPTACIÓN: <por feature: "dado X, cuando Y, entonces Z">
STACK/RESTRICCIONES: <preferencias, presupuesto (principio de menor costo), dónde se despliega>
DECISIONES RESERVADAS: <qué quieres decidir tú: diseño visual, precios, nombres...>
```

### Fase 1 — Cimientos ANTES que features (1 disparo/sesión)
El orquestador (con un arquitecto) genera: CLAUDE.md inicial, kit §2 completo, esqueleto andante
(la app más pequeña que se despliega de punta a punta: "hola mundo" EN producción/preview), gate
funcionando en CI, y el backlog sembrado con las features como paquetes P0/P1/P2 con sus criterios
de aceptación. **Nada de features hasta que el esqueleto desplegado + gate estén en verde.**

### Fase 2 — Iteración por paquetes (el ciclo que ya conoces)
Cada disparo/tanda: tomar 2-6 paquetes de features sin archivos compartidos → subagentes en
worktrees → gate → merge → **URL de preview/prod + reporte** con (A)/(B). El humano recibe algo
USABLE en cada iteración — no reportes abstractos: "la suma y resta ya funcionan aquí: <url>;
decisión estacionada: ¿la división entre cero muestra error o infinito?".

### Fase 3 — Checkpoints de decisión
El flujo se detiene SOLO en las decisiones reservadas de la Fase 0 (diseño, comportamientos
ambiguos, trade-offs de costo). Todo lo demás fluye con el no-bloqueo. Las decisiones tomadas se
escriben en CLAUDE.md § Decisiones — nunca se re-preguntan.

### Fase 4 — Hardening de salida
Auditoría de seguridad (auditor), pase de QA sobre los criterios de aceptación completos, E2E del
happy path completo, observabilidad mínima (logs de errores + 1 canal de alertas), TAREAS-MANUALES
final (dominios, keys, analytics — lo que solo el humano puede), y CLAUDE.md § Errores Conocidos
poblado con lo aprendido.

## 5. Plantilla de prompt para la routine orquestadora (parametrizar lo <marcado>)

```
Eres el orquestador continuo de <PROYECTO> (repo <REPO>). SEPARACIÓN DE MODELOS: tú corres en el
modelo orquestador y NUNCA implementas código inline — todo trabajo de código va vía subagente
'implementador' (Agent tool, model:'sonnet', isolation:'worktree', prompt autocontenido).
PASO 0 ANTI-SOLAPE: fetch + revisar si el último commit (<12 min, patrón propio) sugiere otra
ejecución en curso; si hay trabajo a medias (tree sucio, worktree con cambios) → reporte SALTADA y
terminar sin tocar nada.
MEMORIA: lee docs/backlog.md (protocolo = LEY) + docs/TAREAS-MANUALES.md + CLAUDE.md (reglas,
errores conocidos, ancla). No hay estado fuera del repo.
GATE OBLIGATORIO por merge: <COMANDOS DEL GATE>, corriendo DE VERDAD (resolver la autosuficiencia
del entorno como primera tarea si algo falta).
MISIÓN POR DISPARO: un lote de 2-6 tareas delegables sin archivos compartidos (si comparten →
serie con el mismo subagente); auditar estado real antes de tomar nada; revisar diff+reporte de
cada subagente; merge --no-ff + push SOLO con gate verde y diff del alcance esperado.
[Autoridad de push: <SEGÚN PELDAÑO §3 — "dejar ramas y reporte" o "mergear y pushear">.]
RESTRICCIONES: nunca <OPERACIONES RESERVADAS: migraciones de datos, deploys de config, flags de
producción, pagos...>; decisiones de producto/riesgo → estacionar con la pregunta exacta.
AL TERMINAR: consolidar backlog+CLAUDE.md, reporte del disparo en docs/reportes/<fecha>-<hora>-
rutina.md, push de documentación. Si no queda nada delegable: reporte final (A)/(B) y decirlo
explícitamente. PASO FINAL: escribir el reporte también en docs/reportes/CAMPANA-<fecha>-FINAL.md.
```

Cadencia sugerida: cada 2 horas (`0 */2 * * *`). Modelos: el mejor disponible para orquestar
(decide merges a producción), sonnet para implementar. La sesión principal del humano se reserva
para: decisiones, auditorías retrospectivas, y emergencias.

## 6. Índice de cicatrices (por si alguien pregunta "¿por qué tanta regla?")

| Regla | El incidente que la creó |
|---|---|
| Escritor único + territorio | Carreras entre agentes editando el checkout principal (11 jul) |
| Commitear docs en la rama antes de cerrar | 2 planes perdidos en worktrees efímeros |
| E2E en el gate, de verdad | 500 en prod 1+ día sin que nadie supiera (bug de scope en un POST) |
| Flags de dos fases | Wipe de datos histórico por activar cambios sin red de rollback |
| Observabilidad de ruteo | Hueco F2.4 invisible para 3 campañas, visible en 1 log |
| Serialización por archivos compartidos | 5 conflictos de rebase entre ramas paralelas del dedup |
| Paso 0 anti-solape en routines | Disparos cada 2h + "run now" manual pueden coincidir |
| Auditoría retrospectiva antes de dar push | La autoridad de la routine se ratificó DESPUÉS de auditar 6 disparos limpios |
```
