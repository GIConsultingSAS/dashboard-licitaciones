// Actualiza el radar de index.html con los procesos de SECOP II que hoy reciben ofertas
// y encajan con el perfil de Next Level. Uso: node scripts/actualizar_radar.mjs [--dry-run]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { clasificar, fechaColombia } from './radar_filtro.mjs';

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const HTML = path.join(RAIZ, 'index.html');
const CONFIG = JSON.parse(await readFile(path.join(RAIZ, 'scripts', 'radar_config.json'), 'utf8'));
const DRY_RUN = process.argv.includes('--dry-run');
const PAGINA = 5000;

async function consultarSecop(hoy) {
  const campos = [
    'id_del_proceso', 'referencia_del_proceso', 'entidad', 'departamento_entidad', 'ciudad_entidad',
    'nombre_del_procedimiento', 'descripci_n_del_procedimiento', 'modalidad_de_contratacion', 'fase',
    'estado_del_procedimiento', 'adjudicado', 'fecha_de_publicacion_del', 'fecha_de_recepcion_de',
    'precio_base', 'codigo_principal_de_categoria', 'urlproceso'
  ].join(',');
  const where = `estado_del_procedimiento = 'Publicado' AND adjudicado = 'No' AND fecha_de_recepcion_de >= '${hoy}T00:00:00'`;
  const filas = [];
  for (let offset = 0; ; offset += PAGINA) {
    const url = `${CONFIG.fuente}?$select=${campos}&$where=${encodeURIComponent(where)}` +
      `&$order=id_del_proceso&$limit=${PAGINA}&$offset=${offset}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!resp.ok) throw new Error(`SECOP respondió ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
    const pagina = await resp.json();
    filas.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  return filas;
}

const ahora = Date.now();
const hoy = fechaColombia(ahora);
const filas = await consultarSecop(hoy);

// SECOP repite un proceso por cada lote o fase; se conserva uno por id_del_proceso.
const porProceso = new Map();
for (const fila of filas) {
  const opp = clasificar(fila, Date.parse(hoy), CONFIG);
  if (opp && !porProceso.has(opp.id_proceso)) porProceso.set(opp.id_proceso, opp);
}
const oportunidades = [...porProceso.values()]
  .sort((a, b) => a.cierre.localeCompare(b.cierre) || b.score_relevancia - a.score_relevancia);

const meta = {
  generado: new Date(ahora).toISOString(),
  fecha_corte: hoy,
  procesos_abiertos_secop: new Set(filas.map((f) => f.id_del_proceso)).size,
  total: oportunidades.length,
  fuente: 'SECOP II, datos abiertos (datos.gov.co, conjunto p6dx-8zbt)'
};

if (DRY_RUN) {
  console.log(JSON.stringify(meta, null, 2));
  for (const o of oportunidades) {
    console.log(`${o.cierre} | ${o.score_relevancia} | ${o.modalidad} | ${o.entidad} | ${o.objeto.slice(0, 110)} | ${o.presupuesto_formato} | ${o.coincidencias.join(', ')}`);
  }
  process.exit(0);
}

const html = await readFile(HTML, 'utf8');
const lineaDatos = /^    const OPORTUNIDADES = .*;$/m;
const lineaMeta = /^    const RADAR_META = .*;$/m;
if (!lineaDatos.test(html) || !lineaMeta.test(html)) {
  throw new Error('No se encontraron las líneas OPORTUNIDADES / RADAR_META en index.html');
}
const nuevo = html
  .replace(lineaDatos, () => `    const OPORTUNIDADES = ${JSON.stringify(oportunidades).replace(/</g, '\\u003c')};`)
  .replace(lineaMeta, () => `    const RADAR_META = ${JSON.stringify(meta)};`);
await writeFile(HTML, nuevo, 'utf8');
console.log(`Radar actualizado: ${meta.total} oportunidades de ${meta.procesos_abiertos_secop} procesos abiertos (corte ${hoy}).`);
