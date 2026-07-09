/* =========================================================================
   MERCI — charts.js
   Piezas visuales hechas a mano en SVG, sin dependencias externas, para
   que el aplicativo funcione sin conexión a internet en el momento de la
   demo. La matriz de calor 5×5 es el elemento de firma: es el artefacto
   canónico de cualquier metodología cuantitativa de riesgo, así que no es
   decoración — es el objeto que la metodología entera existe para producir.
   ========================================================================= */

const MerciCharts = {

  /**
   * Matriz de calor 5x5 (Probabilidad × Impacto). Coloca cada riesgo
   * (inherente o residual) en su celda P,I. onCellClick(p,i) es opcional.
   */
  heatmap(risks, { mode = "inherente", onCellClick = null } = {}) {
    const cell = 52, gap = 4, pad = 46;
    const size = cell * 5 + gap * 4;
    const W = size + pad + 14, H = size + pad + 28;

    const bucket = {};
    risks.forEach(r => {
      const p = mode === "inherente" ? r.p : Math.min(5, Math.max(1, Math.round(r._residual.pRes)));
      const i = mode === "inherente" ? r.i : Math.min(5, Math.max(1, Math.round(r._residual.iRes)));
      const key = p + "," + i;
      (bucket[key] = bucket[key] || []).push(r);
    });

    let svg = `<svg viewBox="0 0 ${W} ${H}" class="heatmap" role="img" aria-label="Matriz de calor de riesgos">`;

    // celdas, fila = impacto (5 arriba .. 1 abajo), columna = probabilidad (1..5)
    for (let row = 0; row < 5; row++) {
      const impacto = 5 - row;
      for (let col = 0; col < 5; col++) {
        const prob = col + 1;
        const r = impacto * prob;
        const nivel = nivelDeRiesgo(r);
        const x = pad + col * (cell + gap);
        const y = row * (cell + gap);
        const key = prob + "," + impacto;
        const items = bucket[key] || [];
        const clickable = onCellClick ? `data-p="${prob}" data-i="${impacto}" class="heat-cell clickable"` : `class="heat-cell"`;
        svg += `<g ${clickable}>
          <rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="8" fill="${nivel.color}" opacity="${items.length ? 1 : 0.28}"/>
          <text x="${x + cell / 2}" y="${y + cell / 2 + 5}" text-anchor="middle" class="heat-cell-label">${items.length ? items.length : ""}</text>
        </g>`;
      }
      // etiqueta eje Y (impacto)
      svg += `<text x="${pad - 10}" y="${row * (cell + gap) + cell / 2 + 5}" text-anchor="end" class="heat-axis-label">${impacto}</text>`;
    }
    // etiquetas eje X (probabilidad)
    for (let col = 0; col < 5; col++) {
      const x = pad + col * (cell + gap) + cell / 2;
      svg += `<text x="${x}" y="${size + 20}" text-anchor="middle" class="heat-axis-label">${col + 1}</text>`;
    }
    svg += `<text x="${pad - 32}" y="${size / 2}" text-anchor="middle" class="heat-axis-title" transform="rotate(-90 ${pad - 32} ${size / 2})">Impacto</text>`;
    svg += `<text x="${pad + size / 2}" y="${H - 2}" text-anchor="middle" class="heat-axis-title">Probabilidad</text>`;
    svg += `</svg>`;
    return svg;
  },

  /** Barra horizontal simple para comparar riesgo inherente vs. residual. */
  barraComparativa(inherente, residual, max = 25) {
    const w = 240, h = 14;
    const wi = Math.min(100, (inherente / max) * 100);
    const wr = Math.min(100, (residual / max) * 100);
    const nivelI = nivelDeRiesgo(inherente);
    const nivelR = nivelDeRiesgo(residual);
    return `
      <div class="barra-comp">
        <div class="barra-comp-row">
          <span class="barra-comp-tag">Inherente</span>
          <div class="barra-comp-track"><div class="barra-comp-fill" style="width:${wi}%; background:${nivelI.color}"></div></div>
          <span class="barra-comp-val">${MerciCalc.round2(inherente)}</span>
        </div>
        <div class="barra-comp-row">
          <span class="barra-comp-tag">Residual</span>
          <div class="barra-comp-track"><div class="barra-comp-fill" style="width:${wr}%; background:${nivelR.color}"></div></div>
          <span class="barra-comp-val">${MerciCalc.round2(residual)}</span>
        </div>
      </div>`;
  },

  /** Gauge circular pequeño para un KPI, coloreado por estado. */
  gauge(pct, estado) {
    const r = 30, c = 2 * Math.PI * r;
    const pctClamped = Math.max(0, Math.min(100, pct));
    const colors = { ok: "#2F7D5D", alerta: "#C77F1A", critico: "#B23A3A", info: "#5B6472" };
    const color = colors[estado] || colors.info;
    return `<svg viewBox="0 0 72 72" class="gauge">
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="#E7EAEF" stroke-width="8"/>
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pctClamped / 100)}"
        stroke-linecap="round" transform="rotate(-90 36 36)"/>
    </svg>`;
  },
};
