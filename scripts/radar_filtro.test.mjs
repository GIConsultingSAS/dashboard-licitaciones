// Pruebas del filtro del radar (spec 005, T014). Ejecutar: node --test scripts/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clasificar, contiene, norm } from './radar_filtro.mjs';

const CONFIG = JSON.parse(readFileSync(new URL('./radar_config.json', import.meta.url), 'utf8'));
const HOY = Date.parse('2026-10-05');

const base = {
  id_del_proceso: 'CO1.REQ.1',
  referencia_del_proceso: 'MC-001-2026',
  entidad: 'ENTIDAD DE PRUEBA',
  departamento_entidad: 'Bolívar',
  ciudad_entidad: 'Cartagena',
  nombre_del_procedimiento: 'Implementación MIPG',
  descripci_n_del_procedimiento: 'Prestar servicios profesionales para la implementación del modelo integrado de planeación y gestión MIPG',
  modalidad_de_contratacion: 'Mínima cuantía',
  estado_del_procedimiento: 'Publicado',
  adjudicado: 'No',
  fecha_de_publicacion_del: '2026-10-03T00:00:00.000',
  fecha_de_recepcion_de: '2026-10-09T00:00:00.000',
  precio_base: '45000000',
  urlproceso: { url: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.1' }
};
const con = (cambios) => ({ ...base, ...cambios });

test('proceso vigente y afín entra con los campos del contrato y sin perfil_sugerido', () => {
  const o = clasificar(base, HOY, CONFIG);
  assert.ok(o);
  assert.equal(o.cierre, '2026-10-09');
  assert.equal(o.sector, 'CUMPLIMIENTO / CALIDAD');
  assert.deepEqual(o.coincidencias, ['mipg', 'modelo integrado de planeacion']);
  assert.equal(o.alcance, 'Región Caribe (Bolívar)');
  assert.equal(o.nueva, true);
  assert.equal('perfil_sugerido' in o, false);
});

test('un proceso que cierra hoy sigue en el radar (SECOP publica solo la fecha)', () => {
  assert.ok(clasificar(con({ fecha_de_recepcion_de: '2026-10-05T00:00:00.000' }), HOY, CONFIG));
});

test('recepción vencida queda fuera', () => {
  assert.equal(clasificar(con({ fecha_de_recepcion_de: '2026-10-04T00:00:00.000' }), HOY, CONFIG), null);
});

test('adjudicado o no publicado queda fuera', () => {
  assert.equal(clasificar(con({ adjudicado: 'Si' }), HOY, CONFIG), null);
  assert.equal(clasificar(con({ estado_del_procedimiento: 'Seleccionado' }), HOY, CONFIG), null);
});

test('contratación directa y régimen especial sin ofertas quedan fuera; con ofertas entran', () => {
  assert.equal(clasificar(con({ modalidad_de_contratacion: 'Contratación directa' }), HOY, CONFIG), null);
  assert.equal(clasificar(con({ modalidad_de_contratacion: 'Contratación régimen especial' }), HOY, CONFIG), null);
  assert.ok(clasificar(con({ modalidad_de_contratacion: 'Contratación régimen especial (con ofertas)' }), HOY, CONFIG));
});

test('enajenación queda fuera', () => {
  assert.equal(clasificar(con({ modalidad_de_contratacion: 'Enajenación de bienes con subasta' }), HOY, CONFIG), null);
});

test('suministro de reactivos queda fuera aunque mencione el perfil', () => {
  const fila = con({ descripci_n_del_procedimiento: 'Suministro de reactivos para laboratorio farmacéutico', nombre_del_procedimiento: 'Reactivos' });
  assert.equal(clasificar(fila, HOY, CONFIG), null);
});

test('"rehabilitación" no coincide con "habilitación"', () => {
  assert.deepEqual(contiene(norm('rehabilitacion de vias'), ['habilitacion']), []);
  assert.deepEqual(contiene(norm('habilitación de servicios de salud'), ['habilitacion de servicios de salud']), ['habilitacion de servicios de salud']);
});

test('presupuesto bajo el mínimo queda fuera; sin presupuesto publicado entra', () => {
  assert.equal(clasificar(con({ precio_base: '5000000' }), HOY, CONFIG), null);
  const o = clasificar(con({ precio_base: '0' }), HOY, CONFIG);
  assert.equal(o.presupuesto_formato, 'Sin presupuesto publicado');
});

test('la configuración pública no contiene nombres de personas', () => {
  const texto = JSON.stringify(CONFIG);
  for (const nombre of ['Julia', 'Alicia', 'Luis Daniel', 'Pardo', 'Guzmán']) {
    assert.equal(texto.includes(nombre), false, `la configuración menciona ${nombre}`);
  }
});
