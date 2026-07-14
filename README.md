# 🏭 Fábrica de agentes — plantilla de proyecto

Sistema de trabajo para construir y mantener software con Claude Code + agentes + routines cloud,
destilado de un proyecto real en producción (Diván, julio 2026). El fundamento completo está en
[`docs/metodo-fabrica-agentes.md`](docs/metodo-fabrica-agentes.md) — léelo una vez; este README es
el instructivo de ejecución.

## Cómo arrancar un proyecto nuevo (10 minutos)

### 1. Crea el repo desde esta plantilla
GitHub → botón **"Use this template"** → nombre nuevo → clonar a tu máquina.
(O con CLI: `gh repo create mi-proyecto --template <tu-usuario>/fabrica-agentes-template --private --clone`)

### 2. Abre Claude Code en la carpeta y arranca la Fase 0-1
Si tienes instalado el skill `/fabrica` (ver abajo), escribe:
```
/fabrica <pega aquí tus specs, o deja vacío para que te entreviste>
```
Si no, pega este prompt:
```
Arranca la fábrica (Fase 0-1 de docs/metodo-fabrica-agentes.md): entrevístame por las specs que
falten (objetivo, features MVP priorizadas, criterios de aceptación, stack, decisiones que me
reservo), luego genera: CLAUDE.md completo del proyecto, adapta los agentes de .claude/agents/
(reemplaza todos los <PLACEHOLDERS>), siembra docs/backlog.md con las features como paquetes con
criterios de aceptación, crea el esqueleto andante (la app mínima desplegada de punta a punta) con
el gate del stack funcionando en CI, y entrégame el prompt de routine de
docs/plantilla-routine-prompt.md ya parametrizado.
```

### 3. Trabaja las primeras tandas SUPERVISADO (peldaños 1-2 de la escalera)
Los agentes dejan ramas; tú dices "revisa y mergea". No saltes peldaños: la autonomía se gana
(ver § 3 del método). Señales para subir de peldaño: tandas limpias, cero colisiones, gates
siempre en verde.

### 4. Cuando el ritmo esté probado: crea la routine cloud
En Claude Code: `/schedule` → pega el prompt parametrizado de `docs/plantilla-routine-prompt.md`
→ cadencia sugerida `0 */2 * * *` (cada 2h) → **empieza SIN autoridad de push** (deja ramas).
Tras 1-2 campañas limpias + una auditoría retrospectiva, ratifica el push autónomo por escrito en
el backlog (peldaño 4).

### 5. Tu rol desde entonces
- Responder las **decisiones estacionadas** (lista B de cada reporte).
- Hacer lo de `docs/TAREAS-MANUALES.md` (credenciales, consolas, pruebas en prod).
- Pedir **auditorías retrospectivas** periódicas ("revisa los últimos N disparos").
- Probar cada iteración con la URL de preview que llega en los reportes.

## Estructura de la plantilla

```
CLAUDE.md                        ← esqueleto con <PLACEHOLDERS> — el contrato del proyecto
.claude/agents/                  ← 5 roles genéricos (implementador, arquitecto, auditor,
                                    qa-funcional, producto) con el protocolo anti-colisión
docs/
  metodo-fabrica-agentes.md      ← EL MÉTODO (principios, escalera, cicatrices) — no editar, referenciar
  backlog.md                     ← memoria de trabajo (protocolo en la cabecera = LEY)
  TAREAS-MANUALES.md             ← lo que solo el humano puede hacer
  plantilla-routine-prompt.md    ← prompt de la routine cloud, listo para parametrizar
  reportes/README.md             ← convención de reportes por paquete
  playbook-actualizacion-dependencias-EJEMPLO.md ← ejemplo real de playbook (adaptar al stack)
```

## Reglas de oro (las 3 que no se negocian nunca)

1. **Git es la única memoria** — todo entregable se commitea en su rama antes de cerrar la tarea.
2. **Gate antes de merge, siempre y de verdad** — tests + build + E2E del stack, definidos el día 1.
3. **Escritor único** — backlog y CLAUDE.md los edita solo el orquestador; agentes reportan en
   archivo propio; tareas con archivos compartidos van en serie.

Cada regla existe por una cicatriz real — el índice está al final del método.

## Instalar el skill `/fabrica` (una vez, disponible en toda tu máquina)

Copia la carpeta `skill/fabrica/` de este repo a `~/.claude/skills/fabrica/` — o pídele a Claude
Code: *"instala el skill fabrica de este repo como skill personal"*. Desde entonces `/fabrica`
funciona en cualquier carpeta.
