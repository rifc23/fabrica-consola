# <NOMBRE-PROYECTO> — Guía para Claude Code y agentes

Leer esto completo antes de tocar cualquier archivo. Este documento es la fuente de verdad del
proyecto y crece con él: cada decisión, cada bug resuelto y cada regla nueva se documenta AQUÍ.

---

## Qué es este proyecto

<2-3 párrafos: qué hace, para quién, modelo de negocio si aplica.>

**Stack:** <frontend · backend · base de datos · hosting/deploy>
**Deploy:** <cómo se despliega; qué dispara el deploy — ej. "push a main despliega vía X">

---

## REGLAS NO NEGOCIABLES

<Las líneas rojas del dominio. Ejemplos a adaptar/borrar:>
- <Datos sensibles: qué nunca sale del perímetro, qué se pseudonimiza>
- Secretos: en código/docs/git va SOLO el NOMBRE del secreto y cómo generarlo — NUNCA el valor.
  Los valores viven en <store: Vercel/GitHub Secrets/...>.
- <Escrituras a la BD: merge/parcial siempre; nunca sobreescribir documentos completos>
- <Sanitización de HTML/inputs si hay frontend>

## Regla de despliegue seguro (SIEMPRE, para cualquier cambio)

Cada cambio en su **rama propia** (`fix/…`, `feat/…`, `refactor/…`) con este gate antes de merge:

```bash
# 1. Ancla de rollback ANTES de mergear:
git rev-parse <RAMA-PRINCIPAL>

# 2. Gate (los N deben pasar):
<COMANDO-TESTS>            # ej. npm run test:run
<COMANDO-LINT-O-RATCHET>   # ej. npm run lint
<COMANDO-BUILD>            # ej. npm run build
<COMANDO-E2E>              # ej. npm run test:e2e — OBLIGATORIO desde que exista

# 3. Merge + push (el push DESPLIEGA a producción):
git checkout <RAMA-PRINCIPAL> && git merge --no-ff <rama> && git push
```

**Rollback:** `git revert <ancla>..HEAD` para la tanda; `git revert <hash>` puntual.
**Cambios riesgosos = dos fases**: mecanismo nuevo desplegado APAGADO tras flag → activar
gradualmente → observar → demoler el viejo. Nunca ambos pasos en el mismo deploy.

## Decisiones Arquitectónicas — No Revertir

<Lista viva. Cada entrada: la decisión + el porqué. Los agentes no proponen revertirlas sin
preguntar. Sembrar con las decisiones de la Fase 0 (stack, decisiones reservadas ya resueltas).>

## Errores Conocidos — No Repetir

<Lista viva. Cada bug resuelto deja: síntoma → causa → solución → regla. Empieza vacía.>

## Modelo de datos

<Colecciones/tablas con sus campos y notas. Crece con cada feature.>

## Testing

- **Regla:** toda función pura nueva o modificada lleva su test EN EL MISMO cambio.
- **Gate:** <comandos exactos, repetidos aquí para grep-abilidad>.
- **E2E:** <cómo corre, qué cubre; cada feature nueva agrega su spec>.

## Ancla de rollback (actualizar al cerrar cada sesión/campaña)

- **Último estado bueno:** `<hash>` (<fecha> — <qué incluía>)
