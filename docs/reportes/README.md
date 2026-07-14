# Reportes de agentes

Un archivo por paquete de trabajo: `<YYYY-MM-DD>-<nombre-de-rama>.md` (nombre único — cero
contención entre agentes paralelos). La routine escribe además un consolidado por disparo
(`<fecha>-<hora>-rutina.md`) y un `CAMPANA-<fecha>-FINAL.md` al agotar el backlog (ese archivo
puede ser vigilado por la sesión principal para despertar y revisar automáticamente).

Cada agente crea su reporte DENTRO de su worktree y lo commitea en su rama. Contenido mínimo:

1. **Qué se hizo** — rama, commits, archivos tocados.
2. **Gate** — output REAL de cada comando del gate (no "pasó": el número).
3. **Pendientes / estacionados** — qué falta y qué le toca al usuario, con la acción exacta.
4. **Propuestas para CLAUDE.md/backlog** — texto listo para que el orquestador consolide tras el
   merge. Los agentes NUNCA editan `docs/backlog.md` ni `CLAUDE.md` directamente (regla 4).
