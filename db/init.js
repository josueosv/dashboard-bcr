// db/init.js — Crea la tabla e inserta los datos iniciales (basados en Abril 2026)
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// El dashboard guarda TODO su estado como un único documento JSON.
// Esto permite agregar/quitar campos sin migraciones.
const DEFAULT_DATA = {
  periodo: 'MAYO 2026',
  comparaCon: 'Abr 2026',
  titulo: 'INDICADORES FINANCIEROS',
  subtitulo: 'DEL SISTEMA FINANCIERO (TODAS LAS INSTITUCIONES)',
  kpis: {
    depositos:  { valor: 24632.1, var: 14.9 },
    prestamos:  { valor: 21626.0, var: 8.1 },
    mora:       { valor: 1.6, estandar: 4 },
    solvencia:  { valor: 15.1, parametro: 12 },
    utilidad:   { valor: 202.9, var: 23.2 },
    activos:    { valor: 32405.7, var: 10.7 }
  },
  depositosPorTipo: [
    { nombre: 'Corriente', valor: 6648.1, pct: 27.5 },
    { nombre: 'Ahorro',    valor: 8039.4, pct: 31.3 },
    { nombre: 'A Plazo',   valor: 9445.2, pct: 38.1 }
  ],
  prestamosFamilias: {
    consumo:  { valor: 7076.3, var: 5.2 },
    vivienda: { valor: 3262.2, var: 6.7 }
  },
  composicionPrestamos: { familias: 47.8, empresas: 52.2 },
  prestamosEmpresasSector: [
    { sector: 'Construcción',           valor: 362.3 },
    { sector: 'Comercio',               valor: 244.2 },
    { sector: 'Servicios',              valor: 237.4 },
    { sector: 'Industria manufacturera', valor: 190.7 },
    { sector: 'Otros',                  valor: 36.6 }
  ],
  tasas: {
    prestamo: 7.6,
    deposito: 4.6,
    // series para los sparklines (opcional, se puede editar)
    seriePrestamo: [7.2, 7.4, 7.3, 7.5, 7.4, 7.6],
    serieDeposito: [4.3, 4.5, 4.4, 4.6, 4.5, 4.6]
  },
  serieActivos: [30800, 31200, 31500, 31900, 32100, 32405.7],
  notaOtros: 'Actividades no clasificadas; Electricidad, gas, agua y servicios sanitarios; Agropecuario; Minas y canteras; Transporte, almacenamiento y comunicaciones; Instituciones financieras privadas.',
  fuente: 'Elaboración propia con datos de BCR y SSF'
};

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dashboard (
      id INTEGER PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT single_row CHECK (id = 1)
    );
  `);

  const { rows } = await pool.query('SELECT id FROM dashboard WHERE id = 1');
  if (rows.length === 0) {
    await pool.query(
      'INSERT INTO dashboard (id, data) VALUES (1, $1)',
      [JSON.stringify(DEFAULT_DATA)]
    );
    console.log('✓ Datos iniciales insertados.');
  } else {
    console.log('✓ La tabla ya existe, no se sobrescribe.');
  }
  await pool.end();
}

init().catch((e) => { console.error(e); process.exit(1); });

export { DEFAULT_DATA };
