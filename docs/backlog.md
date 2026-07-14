# Backlog — <NOMBRE-PROYECTO>

Fuente única de tareas para los agentes (`implementador`, `arquitecto`, `auditor-seguridad`,
`qa-funcional`, `producto`) y la routine orquestadora. La memoria del proyecto ES este archivo +
`docs/reportes/` + CLAUDE.md — no hay estado fuera de git.

**Protocolo obligatorio para todo agente que trabaje este backlog:**
1. **Prod intocable** — nunca push/merge a la rama principal (despliega a producción); todo en
   ramas; sin migraciones de datos ni deploys de configuración (esos los ejecuta el usuario u
   orquestador autorizado).
2. **Paquetes completos** — una tarea se toma entera o no se toma: código + tests + gate en verde
   + reporte. Prohibido dejar ramas a medias o en estado inconsistente.
3. **Checkpoint de contexto** — antes de iniciar cada tarea, evaluar el contexto de sesión
   restante; si no alcanza para completarla y reportar, NO iniciarla: cerrar en estado consistente
   y dejar el estado exacto en el reporte.
4. **Territorio y escritor único** — cada agente escribe SOLO dentro de su worktree. Este archivo
   y CLAUDE.md los edita ÚNICAMENTE el orquestador; los agentes entregan su reporte en
   `docs/reportes/<YYYY-MM-DD>-<rama>.md` (commiteado en su rama, nombre único) con una sección
   "Propuestas para CLAUDE.md/backlog" que el orquestador consolida tras el merge.
5. **Serialización por archivos compartidos** — nunca dos tareas en paralelo que toquen los mismos
   archivos fuente; van en serie (o el mismo agente vía SendMessage). Un agente que detecte solape
   no contemplado lo reporta y NO toma la tarea.

## Estado general

- <fecha>: proyecto arrancado con la Fábrica; esqueleto andante desplegado en <URL>; gate: <comandos> en verde.

## P0 — Features MVP (sembradas desde las specs de la Fase 0)

- [ ] **<Feature 1>.** Criterios de aceptación: <dado X, cuando Y, entonces Z>. Archivos previstos: <...>.
- [ ] **<Feature 2>.** ...

## P1 — Siguientes

- [ ] ...

## P2 — Deuda / mejoras

- [ ] ...

## Decisiones estacionadas [USUARIO]

- <pregunta exacta pendiente de decisión humana>

## Registro de trabajo

| Fecha | Tarea | Rama | Commits | Gate | Estado |
|-------|-------|------|---------|------|--------|
