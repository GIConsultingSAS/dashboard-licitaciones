// Reglas del radar: decide si un registro de SECOP II entra al portal y con qué datos.
// Se separa del generador para poder probarlo sin red (scripts/radar_filtro.test.mjs).

export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Coincidencia al inicio de palabra: "habilitacion" no debe coincidir con "rehabilitacion".
export const patron = (p) => new RegExp('(^|[^a-z0-9])' + p.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'));
export const contiene = (texto, lista) => lista.filter((p) => patron(p).test(texto));

export const fechaColombia = (ms) => new Date(ms - 5 * 3600 * 1000).toISOString().slice(0, 10);
export const formatoCOP = (n) => n > 0 ? '$' + n.toLocaleString('es-CO') + ' COP' : 'Sin presupuesto publicado';

// Devuelve el objeto del radar (contrato: specs/005 contracts/portal-publico.md §2) o null si no aplica.
export function clasificar(fila, hoyMs, config) {
  const texto = norm(`${fila.nombre_del_procedimiento} ${fila.descripci_n_del_procedimiento}`);
  const modalidad = fila.modalidad_de_contratacion || '';
  if (/enajenaci|acuerdo marco|contratacion directa$|regimen especial$/.test(norm(modalidad))) return null;
  if (fila.adjudicado && fila.adjudicado !== 'No') return null;
  if (fila.estado_del_procedimiento && fila.estado_del_procedimiento !== 'Publicado') return null;
  const cierre = (fila.fecha_de_recepcion_de || '').slice(0, 10);
  if (!cierre || Date.parse(cierre) < hoyMs) return null;
  if (contiene(texto, config.excluir).length) return null;

  const unspsc = String(fila.codigo_principal_de_categoria || '').replace(/^V1\./, '');
  const esUnspscServicio = config.unspsc_servicio.some((p) => unspsc.startsWith(p));
  if (!esUnspscServicio && !contiene(texto, config.palabras_servicio).length) return null;

  let mejor = null;
  for (const perfil of config.perfiles) {
    const coincidencias = contiene(texto, perfil.palabras_clave);
    if (coincidencias.length && (!mejor || coincidencias.length > mejor.coincidencias.length)) {
      mejor = { perfil, coincidencias };
    }
  }
  if (!mejor) return null;

  const precio = Number(fila.precio_base) || 0;
  if (precio > 0 && precio < config.presupuesto_minimo_cop) return null;

  const departamento = fila.departamento_entidad || '';
  const esCaribe = config.departamentos_caribe.some((d) => norm(departamento).includes(d));
  const ciudad = fila.ciudad_entidad && fila.ciudad_entidad !== 'No Definido' ? fila.ciudad_entidad : '';
  const publicacion = (fila.fecha_de_publicacion_del || '').slice(0, 10);
  const diasPublicado = publicacion ? (hoyMs - Date.parse(publicacion)) / 86400000 : Infinity;

  return {
    id_requerimiento: fila.referencia_del_proceso || fila.id_del_proceso,
    id_proceso: fila.id_del_proceso,
    entidad: fila.entidad,
    objeto: fila.descripci_n_del_procedimiento || fila.nombre_del_procedimiento,
    presupuesto_cop: precio,
    presupuesto_formato: formatoCOP(precio),
    plataforma: 'SECOP II',
    modalidad,
    alcance: esCaribe ? `Región Caribe (${departamento})` : `Resto del país (${departamento || 'sin departamento'})`,
    ubicacion: [ciudad, departamento].filter(Boolean).join(', '),
    fase: fila.fase || '',
    publicacion,
    cierre,
    link_secop: fila.urlproceso?.url || '',
    sector: mejor.perfil.sector,
    coincidencias: mejor.coincidencias,
    score_relevancia: mejor.coincidencias.length + (esUnspscServicio ? 1 : 0),
    nueva: diasPublicado <= config.dias_nueva
  };
}
