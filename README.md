# Radar de Licitaciones SECOP II
### Next Level S.A.S.

Portal público en GitHub Pages que muestra **solo información pública**: los procesos de SECOP II que hoy reciben ofertas y encajan por tema con los servicios de Next Level, más un catálogo de códigos UNSPSC.

No contiene cartera de propuestas, valores ofertados, documentos, nombres de proponentes ni enlaces privados. La cartera vive en el SaaS privado (spec 005 del repositorio `licitaciones-nextlevel`, `contracts/portal-publico.md`).

## Cómo se actualiza

- `scripts/radar_filtro.mjs` tiene las reglas. Un proceso entra si cumple todo esto:
  - está publicado y sin adjudicar;
  - su recepción de ofertas está vigente;
  - su modalidad admite ofertas;
  - es un servicio de consultoría, asesoría, auditoría o capacitación;
  - coincide con las palabras clave de `scripts/radar_config.json`.
- `scripts/actualizar_radar.mjs` consulta SECOP II (datos.gov.co, conjunto `p6dx-8zbt`) y reescribe las líneas `const OPORTUNIDADES` y `const RADAR_META` de `index.html`.
- `.github/workflows/actualizar-radar.yml` corre todos los días a las 06:00 (hora de Colombia): prueba el filtro, regenera el radar, publica con una llave de despliegue y abre el issue **"Radar SECOP sin actualizar"** si algo falla. El portal muestra un aviso si el último corte tiene más de 36 horas.
- `.github/workflows/guardia-contenido.yml` falla, y abre un issue, si reaparece en el portal contenido no público.

## Protección de `main`

Un ruleset exige PR para cambiar `main` y bloquea force-push. Solo la llave de despliegue del workflow diario puede empujar directo. Así ningún script antiguo puede republicar el portal sin revisión.

## En local

```
node --test "scripts/*.test.mjs"             # pruebas del filtro
node scripts/actualizar_radar.mjs --dry-run   # muestra el resultado sin escribir
node scripts/actualizar_radar.mjs             # actualiza index.html
```

Requiere Node 18 o superior, sin dependencias.
