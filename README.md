# Portal Ejecutivo de Licitaciones y Homologación de Proveedores
### Next Level S.A.S.

Portal publicado en GitHub Pages con:
- Cartera de propuestas reales: CCB 2807-2026 (radicada) y Contraloría Distrital de Cartagena (propuesta 2027 en preparación).
- Radar de procesos de SECOP II que hoy reciben ofertas y encajan con el perfil de Next Level.
- Directorio de homologación de proveedores para grandes compradores.

## Cómo se actualiza el radar

`scripts/actualizar_radar.mjs` consulta los datos abiertos de SECOP II (datos.gov.co, conjunto `p6dx-8zbt`) y reescribe en `index.html` las líneas `const OPORTUNIDADES` y `const RADAR_META`.

Solo deja procesos que cumplen todo esto:
- están en estado "Publicado";
- no están adjudicados;
- su fecha de recepción de ofertas es hoy o posterior;
- describen un servicio de consultoría, asesoría, auditoría o capacitación;
- coinciden con las palabras clave de algún perfil.

Las palabras clave, las exclusiones y el presupuesto mínimo están en `scripts/radar_config.json`.

El flujo `.github/workflows/actualizar-radar.yml` lo ejecuta todos los días a las 06:00 (hora de Colombia) y publica el resultado. También se puede lanzar a mano desde la pestaña *Actions* ("Run workflow") o en local:

```
node scripts/actualizar_radar.mjs --dry-run   # muestra el resultado sin escribir
node scripts/actualizar_radar.mjs             # actualiza index.html
```

Requiere Node 18 o superior, sin dependencias.

## Lo que no entra al radar

Las invitaciones privadas, como las de la CCB por Itbid, no están en SECOP. Llegan al correo desde `messages-noreply@itbid.org`.
