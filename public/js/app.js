/* ============================================================
   Dashboard BCR · app.js
   Vista principal 1920x640
   - Franja superior fija (KPIs + reloj en vivo)
   - Escenario central que rota capítulos con deslizamiento sólido
   Cada elemento tiene id individual para animación futura.
   ============================================================ */

// ---------- Configuración ----------
const CAPITULO_DURACION = 12000; // ms que cada capítulo permanece visible

// ---------- Utilidades de formato ----------
const fmtUSD = (n) => 'US$' + Number(n).toLocaleString('en-US', {
  minimumFractionDigits: 1, maximumFractionDigits: 1
});
const PALETA = ['#2e8bff', '#1a5fc4', '#4da3ff'];

// ---------- Estado ----------
let DATOS = null;
let capitulos = [];      // definiciones de capítulos
let capIndex = 0;
let capTimer = null;

// ============================================================
//  CARGA INICIAL
// ============================================================
async function iniciar() {
  try {
    const r = await fetch('/api/data');
    DATOS = await r.json();
  } catch (e) {
    console.error('No se pudo cargar /api/data', e);
    return;
  }
  renderFranjaSuperior();
  iniciarReloj();
  construirCapitulos();
  montarEscenario();
  arrancarRotacion();
}

// ============================================================
//  FRANJA SUPERIOR (KPIs fijos)
// ============================================================
function renderFranjaSuperior() {
  const k = DATOS.kpis;
  const cmp = DATOS.comparaCon ? 'vs. ' + DATOS.comparaCon : '';

  setKpi('depositos', fmtUSD(k.depositos.valor), k.depositos.var + '% ' + cmp, 'up');
  setKpi('prestamos', fmtUSD(k.prestamos.valor), k.prestamos.var + '% ' + cmp, 'up');
  setKpi('utilidad',  fmtUSD(k.utilidad.valor),  k.utilidad.var + '% ' + cmp, 'up');

  // Mora y Solvencia muestran referencia en vez de variación
  document.getElementById('kpi-mora-valor').textContent = k.mora.valor + '%';
  document.getElementById('kpi-mora-ref').textContent = 'Estándar: ' + k.mora.estandar + '%';
  document.getElementById('kpi-solvencia-valor').textContent = k.solvencia.valor + ' %';
  document.getElementById('kpi-solvencia-ref').textContent = 'Legal: ' + k.solvencia.parametro + '%';
}

function setKpi(nombre, valor, variacion, clase) {
  document.getElementById('kpi-' + nombre + '-valor').textContent = valor;
  const elVar = document.getElementById('kpi-' + nombre + '-var');
  if (elVar) {
    elVar.textContent = variacion;
    elVar.classList.add(clase);
  }
}

// ============================================================
//  RELOJ EN VIVO (zona horaria El Salvador)
// ============================================================
function iniciarReloj() {
  const elFecha = document.getElementById('reloj-fecha');
  const elHora = document.getElementById('reloj-hora');
  const tick = () => {
    const ahora = new Date();
    elFecha.textContent = ahora.toLocaleDateString('es-SV', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/El_Salvador'
    });
    elHora.textContent = ahora.toLocaleTimeString('es-SV', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/El_Salvador'
    });
  };
  tick();
  setInterval(tick, 1000);
}

// ============================================================
//  DEFINICIÓN DE CAPÍTULOS
//  Cada capítulo devuelve un elemento <section> con id propio.
//  Alternamos densos e impacto para dar ritmo narrativo.
// ============================================================
function construirCapitulos() {
  capitulos = [
    { id: 'cap-depositos',    tipo: 'denso',   crear: capDepositos },
    { id: 'cap-activos',      tipo: 'impacto', crear: capActivos },
    { id: 'cap-composicion',  tipo: 'denso',   crear: capComposicion },
    { id: 'cap-utilidad',     tipo: 'impacto', crear: capUtilidad },
    { id: 'cap-sectores',     tipo: 'denso',   crear: capSectores },
    { id: 'cap-familias',     tipo: 'denso',   crear: capFamilias },
  ];
}

// ---------- Capítulo: Depósitos por Tipo (donut) ----------
function capDepositos() {
  const sec = crearSeccion('cap-depositos', 'Depósitos por Tipo', 'US$ millones y % del Total');
  const cuerpo = sec.querySelector('.cap-cuerpo');
  cuerpo.innerHTML = `
    <div class="cap-grid dos-cols">
      <div class="bloque" id="bloque-donut">
        <div class="chart-wrap"><svg id="svg-donut" viewBox="0 0 340 240" width="100%" style="max-width:420px"></svg></div>
        <div class="leyenda" id="leyenda-donut"></div>
      </div>
      <div class="bloque" id="bloque-donut-detalle">
        <div id="donut-detalle-lista"></div>
      </div>
    </div>`;
  return sec;
}

// ---------- Capítulo: Activos (cifra gigante) ----------
function capActivos() {
  const sec = crearSeccionImpacto('cap-activos');
  const k = DATOS.kpis.activos;
  sec.querySelector('.cap-impacto').innerHTML = `
    <div class="impacto-mensaje">Activos totales del sistema</div>
    <div class="impacto-cifra" id="activos-cifra">${fmtUSD(k.valor)}</div>
    <div class="impacto-unidad">millones</div>
    <div class="impacto-detalle">▲ ${k.var}% <span class="cmp">vs. ${DATOS.comparaCon || ''}</span></div>`;
  return sec;
}

// ---------- Capítulo: Composición de Préstamos (pie) ----------
function capComposicion() {
  const sec = crearSeccion('cap-composicion', 'Composición de Préstamos', 'Familias vs. Empresas');
  const cuerpo = sec.querySelector('.cap-cuerpo');
  cuerpo.innerHTML = `
    <div class="cap-grid dos-cols">
      <div class="bloque">
        <div class="chart-wrap"><svg id="svg-pie" viewBox="0 0 240 240" width="100%" style="max-width:340px"></svg></div>
        <div class="leyenda" id="leyenda-pie"></div>
      </div>
      <div class="bloque" id="bloque-familias-mini">
        <div id="familias-mini-lista"></div>
      </div>
    </div>`;
  return sec;
}

// ---------- Capítulo: Utilidad (cifra gigante) ----------
function capUtilidad() {
  const sec = crearSeccionImpacto('cap-utilidad');
  const k = DATOS.kpis.utilidad;
  sec.querySelector('.cap-impacto').innerHTML = `
    <div class="impacto-mensaje">Utilidad del sistema financiero</div>
    <div class="impacto-cifra" id="utilidad-cifra">${fmtUSD(k.valor)}</div>
    <div class="impacto-unidad">millones</div>
    <div class="impacto-detalle">▲ ${k.var}% <span class="cmp">vs. ${DATOS.comparaCon || ''}</span></div>`;
  return sec;
}

// ---------- Capítulo: Préstamos por Sector (barras) ----------
function capSectores() {
  const sec = crearSeccion('cap-sectores', 'Préstamos Empresas por Sector', 'Var. USD Millones');
  const cuerpo = sec.querySelector('.cap-cuerpo');
  const sectores = DATOS.prestamosEmpresasSector;
  const max = Math.max(...sectores.map(s => s.valor));
  cuerpo.innerHTML = `<div style="width:100%;max-width:1100px" id="sectores-lista">` +
    sectores.map((s, i) => `
      <div class="sector-item" id="sector-${i}">
        <div class="sector-nombre">${s.sector}</div>
        <div class="sector-track"><div class="sector-fill" style="width:${(s.valor / max * 100).toFixed(1)}%"></div></div>
        <div class="sector-valor">${fmtUSD(s.valor)}</div>
      </div>`).join('') + `</div>`;
  return sec;
}

// ---------- Capítulo: Préstamos a Familias ----------
function capFamilias() {
  const sec = crearSeccion('cap-familias', 'Préstamos a Familias', 'Saldo y Var.%');
  const cuerpo = sec.querySelector('.cap-cuerpo');
  const f = DATOS.prestamosFamilias;
  cuerpo.innerHTML = `
    <div style="display:flex;gap:60px;align-items:center;justify-content:center;width:100%">
      <div class="familia-item" id="familia-consumo">
        <div class="familia-ic">🛒</div>
        <div>
          <div class="familia-tit">Consumo</div>
          <div class="familia-val">${fmtUSD(f.consumo.valor)}</div>
          <div class="familia-var">▲ ${f.consumo.var}%</div>
        </div>
      </div>
      <div class="familia-item" id="familia-vivienda">
        <div class="familia-ic">🏠</div>
        <div>
          <div class="familia-tit">Vivienda</div>
          <div class="familia-val">${fmtUSD(f.vivienda.valor)}</div>
          <div class="familia-var">▲ ${f.vivienda.var}%</div>
        </div>
      </div>
    </div>`;
  return sec;
}

// ============================================================
//  HELPERS PARA CREAR SECCIONES
// ============================================================
function crearSeccion(id, titulo, subtitulo) {
  const sec = document.createElement('section');
  sec.className = 'capitulo';
  sec.id = id;
  sec.innerHTML = `
    <div class="cap-titulo">${titulo}</div>
    <div class="cap-subtitulo">${subtitulo}</div>
    <div class="cap-cuerpo"></div>`;
  return sec;
}

function crearSeccionImpacto(id) {
  const sec = document.createElement('section');
  sec.className = 'capitulo cap-impacto';
  sec.id = id;
  sec.innerHTML = `<div class="cap-impacto" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%"></div>`;
  return sec;
}

// ============================================================
//  MONTAJE DEL ESCENARIO
// ============================================================
function montarEscenario() {
  const escenario = document.getElementById('escenario');
  escenario.innerHTML = '';

  // Crear todos los capítulos y añadirlos
  capitulos.forEach((cap, i) => {
    const el = cap.crear();
    escenario.appendChild(el);
    cap.elemento = el;
  });

  // Dibujar los gráficos de cada capítulo (ya están en el DOM)
  dibujarGraficos();

  // Indicadores (puntos)
  const ind = document.getElementById('indicadores-capitulo');
  ind.innerHTML = capitulos.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');

  // Mostrar el primero
  mostrarCapitulo(0, true);
}

function dibujarGraficos() {
  // Donut de depósitos
  if (document.getElementById('svg-donut')) {
    dibujarDonut('svg-donut', DATOS.depositosPorTipo);
    document.getElementById('leyenda-donut').innerHTML = DATOS.depositosPorTipo.map((s, i) =>
      `<span><i class="dot" style="background:${PALETA[i % 3]}"></i>${s.nombre}</span>`).join('');
    document.getElementById('donut-detalle-lista').innerHTML = DATOS.depositosPorTipo.map((s, i) => `
      <div style="display:flex;align-items:center;gap:12px;margin:14px 0;font-size:18px">
        <i class="dot" style="width:14px;height:14px;background:${PALETA[i % 3]}"></i>
        <span style="flex:1">${s.nombre}</span>
        <span style="font-weight:800">${fmtUSD(s.valor)}</span>
        <span style="color:var(--texto2);width:60px;text-align:right">${s.pct}%</span>
      </div>`).join('');
  }
  // Pie de composición
  if (document.getElementById('svg-pie')) {
    dibujarPie('svg-pie', DATOS.composicionPrestamos);
    document.getElementById('leyenda-pie').innerHTML =
      `<span><i class="dot" style="background:#4da3ff"></i>Familias</span>
       <span><i class="dot" style="background:#1a5fc4"></i>Empresas</span>`;
    const f = DATOS.prestamosFamilias;
    document.getElementById('familias-mini-lista').innerHTML = `
      <div style="font-size:18px;margin:14px 0">
        <div style="color:var(--texto2)">Consumo</div>
        <div style="font-size:28px;font-weight:800">${fmtUSD(f.consumo.valor)} <span style="font-size:14px;color:var(--verde)">▲ ${f.consumo.var}%</span></div>
      </div>
      <div style="font-size:18px;margin:14px 0">
        <div style="color:var(--texto2)">Vivienda</div>
        <div style="font-size:28px;font-weight:800">${fmtUSD(f.vivienda.valor)} <span style="font-size:14px;color:var(--verde)">▲ ${f.vivienda.var}%</span></div>
      </div>`;
  }
}

// ============================================================
//  ROTACIÓN DE CAPÍTULOS (deslizamiento sólido, sin opacidad)
// ============================================================
function mostrarCapitulo(i, inmediato) {
  capitulos.forEach((cap, idx) => {
    const el = cap.elemento;
    el.classList.remove('activo', 'saliendo');
    if (idx === i) {
      el.classList.add('activo');
    } else if (idx < i) {
      el.classList.add('saliendo'); // los anteriores quedan a la izquierda
    }
    // los posteriores quedan a la derecha (estado por defecto translateX(100%))
  });
  // Puntos indicadores
  document.querySelectorAll('#indicadores-capitulo i').forEach((d, idx) =>
    d.classList.toggle('on', idx === i));
  capIndex = i;
}

function siguienteCapitulo() {
  const next = (capIndex + 1) % capitulos.length;
  mostrarCapitulo(next);
}

function arrancarRotacion() {
  if (capTimer) clearInterval(capTimer);
  capTimer = setInterval(siguienteCapitulo, CAPITULO_DURACION);
}

// ============================================================
//  GRÁFICOS SVG (donut y pie)
// ============================================================
function dibujarDonut(id, data) {
  const svg = document.getElementById(id);
  const total = data.reduce((a, b) => a + b.valor, 0);
  const cx = 170, cy = 120, r = 84, rin = 50;
  let ang = -90, html = '';
  data.forEach((s, i) => {
    const frac = s.valor / total, a0 = ang, a1 = ang + frac * 360; ang = a1;
    html += arcoDonut(cx, cy, r, rin, a0, a1, PALETA[i % 3]);
  });
  svg.innerHTML = html;
}
function arcoDonut(cx, cy, r, rin, a0, a1, color) {
  const p = (ang, rad) => [cx + rad * Math.cos(ang * Math.PI / 180), cy + rad * Math.sin(ang * Math.PI / 180)];
  const large = (a1 - a0) > 180 ? 1 : 0;
  const [x0, y0] = p(a0, r), [x1, y1] = p(a1, r), [x2, y2] = p(a1, rin), [x3, y3] = p(a0, rin);
  return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A${rin} ${rin} 0 ${large} 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z" fill="${color}"/>`;
}

function dibujarPie(id, comp) {
  const svg = document.getElementById(id);
  const cx = 120, cy = 120, r = 100;
  const fam = comp.familias, emp = comp.empresas;
  const a0 = -90, a1 = a0 + (fam / 100) * 360, a2 = a1 + (emp / 100) * 360;
  let html = '';
  html += rebanadaPie(cx, cy, r, a0, a1, '#4da3ff');
  html += rebanadaPie(cx, cy, r, a1, a2, '#1a5fc4');
  const mF = (a0 + a1) / 2 * Math.PI / 180, mE = (a1 + a2) / 2 * Math.PI / 180;
  html += `<text x="${(cx + r * 0.5 * Math.cos(mF)).toFixed(1)}" y="${(cy + r * 0.5 * Math.sin(mF)).toFixed(1)}" fill="#fff" font-size="22" font-weight="800" text-anchor="middle" dominant-baseline="middle">${fam}%</text>`;
  html += `<text x="${(cx + r * 0.5 * Math.cos(mE)).toFixed(1)}" y="${(cy + r * 0.5 * Math.sin(mE)).toFixed(1)}" fill="#fff" font-size="22" font-weight="800" text-anchor="middle" dominant-baseline="middle">${emp}%</text>`;
  svg.innerHTML = html;
}
function rebanadaPie(cx, cy, r, a0, a1, color) {
  const p = (ang) => [cx + r * Math.cos(ang * Math.PI / 180), cy + r * Math.sin(ang * Math.PI / 180)];
  const large = (a1 - a0) > 180 ? 1 : 0;
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `<path d="M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${color}"/>`;
}

// ============================================================
//  ARRANQUE
// ============================================================
iniciar();
