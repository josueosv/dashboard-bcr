/* ============================================================
   Dashboard BCR · app.js
   Vista principal 1920x640
   - Franja superior fija (KPIs + reloj)
   - Cuerpo de dos secciones: lateral-índice + central rotativo
   Transiciones SIN opacidad. Dos modos conmutables:
     MODO_TRANSICION = 'corte'  -> desaparece/aparece instantáneo
     MODO_TRANSICION = 'desliza'-> deslizamiento sólido
   ============================================================ */

// ---------- Configuración ----------
const CAPITULO_DURACION = 12000;        // ms por capítulo
const MODO_TRANSICION = 'corte';        // 'corte' o 'desliza'  <-- cambia aquí para probar

// ---------- Utilidades ----------
const fmtUSD = (n) => 'US$' + Number(n).toLocaleString('en-US', {
  minimumFractionDigits: 1, maximumFractionDigits: 1
});
const PALETA = ['#2e8bff', '#1a5fc4', '#4da3ff'];

// ---------- Estado ----------
let DATOS = null;
let capitulos = [];
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
  montarLateral();
  montarCentral();
  arrancarRotacion();
}

// ============================================================
//  FRANJA SUPERIOR
// ============================================================
function renderFranjaSuperior() {
  const k = DATOS.kpis;
  const cmp = DATOS.comparaCon ? 'vs. ' + DATOS.comparaCon : '';
  setKpi('depositos', fmtUSD(k.depositos.valor), k.depositos.var + '% ' + cmp, 'up');
  setKpi('prestamos', fmtUSD(k.prestamos.valor), k.prestamos.var + '% ' + cmp, 'up');
  setKpi('utilidad',  fmtUSD(k.utilidad.valor),  k.utilidad.var + '% ' + cmp, 'up');
  document.getElementById('kpi-mora-valor').textContent = k.mora.valor + '%';
  document.getElementById('kpi-mora-ref').textContent = 'Estándar: ' + k.mora.estandar + '%';
  document.getElementById('kpi-solvencia-valor').textContent = k.solvencia.valor + ' %';
  document.getElementById('kpi-solvencia-ref').textContent = 'Legal: ' + k.solvencia.parametro + '%';
}
function setKpi(nombre, valor, variacion, clase) {
  document.getElementById('kpi-' + nombre + '-valor').textContent = valor;
  const elVar = document.getElementById('kpi-' + nombre + '-var');
  if (elVar) { elVar.textContent = variacion; elVar.classList.add(clase); }
}

// ============================================================
//  RELOJ (El Salvador)
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
//  Cada uno define: id, nombre e info para el lateral, y su render central.
// ============================================================
function construirCapitulos() {
  const d = DATOS;
  capitulos = [
    {
      id: 'cap-depositos',
      latTitulo: 'Depósitos por Tipo',
      latDato: 'Total 3 tipos · A Plazo 38.1%',
      crear: capDepositos
    },
    {
      id: 'cap-activos',
      latTitulo: 'Activos',
      latDato: fmtUSD(d.kpis.activos.valor) + ' M',
      crear: capActivos
    },
    {
      id: 'cap-composicion',
      latTitulo: 'Composición de Préstamos',
      latDato: 'Familias ' + d.composicionPrestamos.familias + '% · Empresas ' + d.composicionPrestamos.empresas + '%',
      crear: capComposicion
    },
    {
      id: 'cap-utilidad',
      latTitulo: 'Utilidad',
      latDato: fmtUSD(d.kpis.utilidad.valor) + ' M · ▲ ' + d.kpis.utilidad.var + '%',
      crear: capUtilidad
    },
    {
      id: 'cap-sectores',
      latTitulo: 'Préstamos por Sector',
      latDato: 'Top: Construcción ' + fmtUSD(d.prestamosEmpresasSector[0].valor),
      crear: capSectores
    },
    {
      id: 'cap-familias',
      latTitulo: 'Préstamos a Familias',
      latDato: 'Consumo ' + fmtUSD(d.prestamosFamilias.consumo.valor),
      crear: capFamilias
    },
  ];
}

// ---------- Renders de cada capítulo ----------
function capDepositos() {
  const sec = crearSeccion('cap-depositos', 'Depósitos por Tipo', 'US$ millones y % del Total');
  sec.querySelector('.cap-cuerpo').innerHTML = `
    <div class="cap-grid dos-cols">
      <div class="bloque">
        <div class="chart-wrap"><svg id="svg-donut" viewBox="0 0 340 240" width="100%" style="max-width:420px"></svg></div>
        <div class="leyenda" id="leyenda-donut"></div>
      </div>
      <div class="bloque"><div id="donut-detalle-lista"></div></div>
    </div>`;
  return sec;
}
function capActivos() {
  const sec = crearSeccionImpacto('cap-activos');
  const k = DATOS.kpis.activos;
  sec.querySelector('.cap-impacto-inner').innerHTML = `
    <div class="impacto-mensaje">Activos totales del sistema</div>
    <div class="impacto-cifra" id="activos-cifra">${fmtUSD(k.valor)}</div>
    <div class="impacto-unidad">millones</div>
    <div class="impacto-detalle">▲ ${k.var}% <span class="cmp">vs. ${DATOS.comparaCon || ''}</span></div>`;
  return sec;
}
function capComposicion() {
  const sec = crearSeccion('cap-composicion', 'Composición de Préstamos', 'Familias vs. Empresas');
  sec.querySelector('.cap-cuerpo').innerHTML = `
    <div class="cap-grid dos-cols">
      <div class="bloque">
        <div class="chart-wrap"><svg id="svg-pie" viewBox="0 0 240 240" width="100%" style="max-width:340px"></svg></div>
        <div class="leyenda" id="leyenda-pie"></div>
      </div>
      <div class="bloque"><div id="familias-mini-lista"></div></div>
    </div>`;
  return sec;
}
function capUtilidad() {
  const sec = crearSeccionImpacto('cap-utilidad');
  const k = DATOS.kpis.utilidad;
  sec.querySelector('.cap-impacto-inner').innerHTML = `
    <div class="impacto-mensaje">Utilidad del sistema financiero</div>
    <div class="impacto-cifra" id="utilidad-cifra">${fmtUSD(k.valor)}</div>
    <div class="impacto-unidad">millones</div>
    <div class="impacto-detalle">▲ ${k.var}% <span class="cmp">vs. ${DATOS.comparaCon || ''}</span></div>`;
  return sec;
}
function capSectores() {
  const sec = crearSeccion('cap-sectores', 'Préstamos Empresas por Sector', 'Var. USD Millones');
  const sectores = DATOS.prestamosEmpresasSector;
  const max = Math.max(...sectores.map(s => s.valor));
  sec.querySelector('.cap-cuerpo').innerHTML = `<div style="width:100%;max-width:1400px">` +
    sectores.map((s, i) => {
      const anchoFinal = (s.valor / max * 100).toFixed(1);
      return `
      <div class="sector-item" style="font-size:21px">
        <div class="sector-nombre" style="width:225px;font-size:21px">${s.sector}</div>
        <div class="sector-track" style="height:24px">
          <div class="sector-fill" id="sector-fill-${i}" data-ancho="${anchoFinal}" style="width:0%"></div>
        </div>
        <div class="sector-valor" style="width:135px;font-size:21px">${fmtUSD(s.valor)}</div>
      </div>`;
    }).join('') + `</div>`;
  return sec;
}
function capFamilias() {
  const sec = crearSeccion('cap-familias', 'Préstamos a Familias', 'Saldo y Var.%');
  const f = DATOS.prestamosFamilias;
  const iconoConBorde = (emoji, id) => `
    <div class="familia-ic-wrap" style="position:relative;width:105px;height:105px;flex-shrink:0">
      <div class="familia-ic" style="width:105px;height:105px;border-radius:24px;font-size:49px;border:none">${emoji}</div>
      <svg class="ic-borde" width="105" height="105" viewBox="0 0 105 105" style="position:absolute;top:0;left:0;pointer-events:none">
        <rect id="${id}" x="2" y="2" width="101" height="101" rx="24" ry="24"
          fill="none" stroke="#4da3ff" stroke-width="3"/>
      </svg>
    </div>`;
  sec.querySelector('.cap-cuerpo').innerHTML = `
    <div style="display:flex;gap:100px;align-items:center;justify-content:center;width:100%">
      <div class="familia-item" style="gap:32px">
        ${iconoConBorde('🛒', 'borde-consumo')}
        <div>
          <div class="familia-tit" style="font-size:26px">Consumo</div>
          <div class="familia-val" style="font-size:53px">${fmtUSD(f.consumo.valor)}</div>
          <div class="familia-var" style="font-size:25px">▲ ${f.consumo.var}%</div>
        </div>
      </div>
      <div class="familia-item" style="gap:32px">
        ${iconoConBorde('🏠', 'borde-vivienda')}
        <div>
          <div class="familia-tit" style="font-size:26px">Vivienda</div>
          <div class="familia-val" style="font-size:53px">${fmtUSD(f.vivienda.valor)}</div>
          <div class="familia-var" style="font-size:25px">▲ ${f.vivienda.var}%</div>
        </div>
      </div>
    </div>`;
  return sec;
}

// ---------- Helpers de sección ----------
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
  sec.className = 'capitulo';
  sec.id = id;
  sec.innerHTML = `<div class="cap-impacto-inner"></div>`;
  return sec;
}

// ============================================================
//  LATERAL (índice-resumen)
// ============================================================
function montarLateral() {
  const lista = document.getElementById('lateral-lista');
  lista.innerHTML = capitulos.map((c, i) => `
    <div class="lat-item" id="lat-${i}">
      <div class="lat-marca"></div>
      <div class="lat-nombre">
        <div class="ln-titulo">${c.latTitulo}</div>
        <div class="ln-dato">${c.latDato}</div>
      </div>
    </div>`).join('');
}
function resaltarLateral(i) {
  document.querySelectorAll('.lat-item').forEach((el, idx) =>
    el.classList.toggle('activo', idx === i));
}

// ============================================================
//  CENTRAL
// ============================================================
function montarCentral() {
  const central = document.getElementById('central');
  central.className = MODO_TRANSICION === 'desliza' ? 'modo-desliza' : 'modo-corte';
  central.innerHTML = '';
  capitulos.forEach((cap) => {
    const el = cap.crear();
    central.appendChild(el);
    cap.elemento = el;
  });
  dibujarGraficos();
  mostrarCapitulo(0, true);
}

function dibujarGraficos() {
  if (document.getElementById('svg-donut')) {
    dibujarDonut('svg-donut', DATOS.depositosPorTipo);
    document.getElementById('leyenda-donut').innerHTML = DATOS.depositosPorTipo.map((s, i) =>
      `<span><i class="dot" style="background:${PALETA[i % 3]}"></i>${s.nombre}</span>`).join('');
      document.getElementById('donut-detalle-lista').innerHTML = DATOS.depositosPorTipo.map((s, i) => `
    <div style="display:flex;align-items:center;gap:14px;margin:22px 0;font-size:36px">
      <i class="dot" style="width:24px;height:24px;background:${PALETA[i % 3]}"></i>
      <span style="width:220px">${s.nombre}</span>
      <span style="font-weight:800;width:200px;text-align:right">${fmtUSD(s.valor)}</span>
      <span style="color:var(--texto2);width:120px;text-align:right">${s.pct}%</span>
    </div>`).join('');
  }
  if (document.getElementById('svg-pie')) {
    dibujarPie('svg-pie', DATOS.composicionPrestamos);
    document.getElementById('leyenda-pie').innerHTML =
      `<span><i class="dot" style="background:#4da3ff"></i>Familias</span>
       <span><i class="dot" style="background:#1a5fc4"></i>Empresas</span>`;
    const f = DATOS.prestamosFamilias;
    document.getElementById('familias-mini-lista').innerHTML = `
        <div style="font-size:32px;margin:24px 0">
          <div style="color:var(--texto2)">Consumo</div>
          <div style="font-size:49px;font-weight:800">${fmtUSD(f.consumo.valor)} <span style="font-size:25px;color:var(--verde)">▲ ${f.consumo.var}%</span></div>
        </div>
        <div style="font-size:32px;margin:24px 0">
          <div style="color:var(--texto2)">Vivienda</div>
          <div style="font-size:49px;font-weight:800">${fmtUSD(f.vivienda.valor)} <span style="font-size:25px;color:var(--verde)">▲ ${f.vivienda.var}%</span></div>
        </div>`;
  }
}

// ---------- Rotación (sin opacidad) ----------
function mostrarCapitulo(i, inmediato) {
  capitulos.forEach((cap, idx) => {
    const el = cap.elemento;
    el.classList.remove('activo', 'saliendo');
    if (idx === i) el.classList.add('activo');
    else if (idx < i) el.classList.add('saliendo');
  });
  resaltarLateral(i);
  capIndex = i;

  // Re-disparar animaciones del capítulo que se acaba de activar
  const capActivo = capitulos[i];
  if (capActivo.id === 'cap-depositos' && document.getElementById('svg-donut')) {
    dibujarDonut('svg-donut', DATOS.depositosPorTipo);
  }
  if (capActivo.id === 'cap-activos') {
    animarCifraImpacto('activos-cifra', DATOS.kpis.activos.valor);
  }
  if (capActivo.id === 'cap-utilidad') {
    animarCifraImpacto('utilidad-cifra', DATOS.kpis.utilidad.valor);
  }
  if (capActivo.id === 'cap-composicion' && document.getElementById('svg-pie')) {
    dibujarPie('svg-pie', DATOS.composicionPrestamos);
  }
  if (capActivo.id === 'cap-sectores') {
    animarBarrasSector();
  }
  if (capActivo.id === 'cap-familias') {
    animarBordesFamilias();
  }
}
function siguienteCapitulo() {
  mostrarCapitulo((capIndex + 1) % capitulos.length);
}
function arrancarRotacion() {
  if (capTimer) clearInterval(capTimer);
  capTimer = setInterval(siguienteCapitulo, CAPITULO_DURACION);
}

// ============================================================
//  GRÁFICOS SVG
// ============================================================
function dibujarDonut(id, data) {
  const svg = document.getElementById(id);
  const total = data.reduce((a, b) => a + b.valor, 0);
  const cx = 170, cy = 120, r = 84, rin = 50;

  // Pre-calcular los ángulos de inicio/fin de cada segmento
  let ang = -90;
  const segmentos = data.map((s, i) => {
    const frac = s.valor / total;
    const inicio = ang;
    const fin = ang + frac * 360;
    ang = fin;
    return { inicio, fin, color: PALETA[i % 3], pct: s.pct, actual: inicio };
  });

  // Función que redibuja todos los arcos según su ángulo "actual"
  function redibujar() {
    let html = '';
    segmentos.forEach(seg => {
      if (seg.actual > seg.inicio) {
        html += arcoDonut(cx, cy, r, rin, seg.inicio, seg.actual, seg.color);
      }
    });
    svg.innerHTML = html;
  }

  // Animar cada segmento en secuencia: su ángulo "actual" crece de inicio a fin
  segmentos.forEach((seg, i) => {
    anime.animate(seg, {
      actual: seg.fin,
      duration: 600,
      delay: i * 600,
      ease: 'linear',
      // Se cambio ease a linear para que no se perciba corte entre segmentos
      onUpdate: redibujar,
      onComplete: () => {
        if (i === segmentos.length - 1) colocarPorcentajes();
      }
    });
  });

  // Colocar los porcentajes en el centro de cada segmento
  function colocarPorcentajes() {
    let etiquetas = svg.innerHTML;
    const rEtiqueta = r + 20;   // radio FUERA del anillo (r es el borde exterior)
    segmentos.forEach(seg => {
      const angMedio = (seg.inicio + seg.fin) / 2;
      const rad = angMedio * Math.PI / 180;
      const lx = cx + rEtiqueta * Math.cos(rad);
      const ly = cy + rEtiqueta * Math.sin(rad);
      etiquetas += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}"
        fill="#cfe0f7" font-size="15" font-weight="800"
        text-anchor="middle" dominant-baseline="middle">${seg.pct}%</text>`;
    });
    svg.innerHTML = etiquetas;
  }
}

function arcoDonut(cx, cy, r, rin, a0, a1, color) {
  const p = (ang, rad) => [cx + rad * Math.cos(ang * Math.PI / 180), cy + rad * Math.sin(ang * Math.PI / 180)];
  const large = (a1 - a0) > 180 ? 1 : 0;
  const [x0, y0] = p(a0, r), [x1, y1] = p(a1, r), [x2, y2] = p(a1, rin), [x3, y3] = p(a0, rin);
  return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A${rin} ${rin} 0 ${large} 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z" fill="${color}"/>`;
}

// Nota: cuando un arco supera 180° puede parpadear el flag "large".
// Como ningún segmento individual supera 180° aquí, no es problema.
function dibujarPie(id, comp) {
  const svg = document.getElementById(id);
  const cx = 120, cy = 120, r = 100;
  const fam = comp.familias, emp = comp.empresas;

  // Pre-calcular ángulos de las dos rebanadas
  let ang = -90;
  const rebanadas = [
    { inicio: ang, fin: ang + (fam / 100) * 360, color: '#4da3ff', pct: fam, actual: ang },
  ];
  ang = rebanadas[0].fin;
  rebanadas.push({ inicio: ang, fin: ang + (emp / 100) * 360, color: '#1a5fc4', pct: emp, actual: ang });

  // Redibuja las rebanadas según su ángulo "actual"
  function redibujar() {
    let html = '';
    rebanadas.forEach(reb => {
      if (reb.actual > reb.inicio) {
        html += rebanadaPie(cx, cy, r, reb.inicio, reb.actual, reb.color);
      }
    });
    svg.innerHTML = html;
  }

  // Animar cada rebanada en secuencia
  rebanadas.forEach((reb, i) => {
    anime.animate(reb, {
      actual: reb.fin,
      duration: 600,
      delay: i * 600,
      ease: 'linear',
      onUpdate: redibujar,
      onComplete: () => {
        if (i === rebanadas.length - 1) colocarPorcentajesPie();
      }
    });
  });

  // Colocar los porcentajes dentro de cada rebanada, al terminar
  function colocarPorcentajesPie() {
    let etiquetas = svg.innerHTML;
    rebanadas.forEach(reb => {
      const angMedio = (reb.inicio + reb.fin) / 2;
      const rad = angMedio * Math.PI / 180;
      const lx = cx + r * 0.5 * Math.cos(rad);
      const ly = cy + r * 0.5 * Math.sin(rad);
      etiquetas += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="#fff" font-size="22" font-weight="800" text-anchor="middle" dominant-baseline="middle">${reb.pct}%</text>`;
    });
    svg.innerHTML = etiquetas;
  }
}
function rebanadaPie(cx, cy, r, a0, a1, color) {
  const p = (ang) => [cx + r * Math.cos(ang * Math.PI / 180), cy + r * Math.sin(ang * Math.PI / 180)];
  const large = (a1 - a0) > 180 ? 1 : 0;
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `<path d="M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${color}"/>`;
}

// ============================================================
//  ANIMACIÓN DE CONTEO (Activos)
// ============================================================
function animarCifraImpacto(idElemento, valor) {
  const el = document.getElementById(idElemento);
  if (!el) return;

  // Texto fijo para dividir
  el.textContent = fmtUSD(valor);

  const { chars } = anime.splitText(el, { chars: true });

  anime.animate(chars, {
    scale: [0, 1],
    y: ['0.4em', '0em'],
    duration: 700,
    ease: 'out(3)',
    delay: anime.stagger(45, { from: 'center' })
  });
}
// ============================================================
//  ANIMACIÓN DE BARRAS CORRIENDO EN LATERAL
// ============================================================

function animarBarrasSector() {
  const sectores = DATOS.prestamosEmpresasSector;
  sectores.forEach((s, i) => {
    const barra = document.getElementById('sector-fill-' + i);
    if (!barra) return;
    const anchoFinal = parseFloat(barra.getAttribute('data-ancho'));
    const estado = { ancho: 0 };
    anime.animate(estado, {
      ancho: anchoFinal,
      duration: 1100,
      ease: 'out(3)',
      onUpdate: () => {
        barra.style.width = estado.ancho + '%';
      }
    });
  });
}

// ============================================================
//  ANIMACIÓN DE CONTORNOS ANIMADOS
// ============================================================

function animarBordesFamilias() {
  ['borde-consumo', 'borde-vivienda'].forEach((id, i) => {
    const rect = document.getElementById(id);
    if (!rect) return;
    const largo = rect.getTotalLength();   // perímetro del rectángulo redondeado

    // Preparar el trazo oculto
    rect.setAttribute('stroke-dasharray', largo);
    rect.setAttribute('stroke-dashoffset', largo);

    // Animar el trazo dibujándose alrededor del borde
    anime.animate(rect, {
      strokeDashoffset: [largo, 0],
      duration: 1200,
      delay: i * 200,
      ease: 'inOutSine'
    });
  });
}
// ============================================================
iniciar();
