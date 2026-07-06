/* =========================================================================
   MERCI — calc.js
   Todas las fórmulas cuantitativas del modelo, en un solo lugar y sin
   dependencias, para que puedan auditarse y citarse en la sustentación.
   ========================================================================= */

const MerciCalc = {

  /** Valoración CIA ponderada de un activo. CIA = C·0,40 + I·0,35 + D·0,25 */
  cia(asset) {
    return asset.c * 0.40 + asset.i * 0.35 + asset.d * 0.25;
  },

  /** Riesgo inherente R = P × I */
  riesgoInherente(risk) {
    return risk.p * risk.i;
  },

  /**
   * Combinación MULTIPLICATIVA de eficacias de control, no aditiva.
   * factor = ∏(1 - eficacia_i), con tope de reducción acumulada de 95%.
   * (La suma simple podría superar el 100% con 3+ controles: es
   * matemáticamente incorrecta para eventos independientes.)
   */
  factorReduccion(eficacias) {
    if (!eficacias.length) return 1;
    const factor = eficacias.reduce((acc, e) => acc * (1 - e), 1);
    return Math.max(factor, 0.05); // tope de reducción acumulada: 95%
  },

  /** Riesgo residual de un escenario, dados sus controles cargados. */
  riesgoResidual(risk) {
    const preventivos = risk.controles.filter(c => c.tipo === "Preventivo").map(c => c.eficacia);
    const detectivos  = risk.controles.filter(c => c.tipo === "Detectivo").map(c => c.eficacia);

    const fP = this.factorReduccion(preventivos);
    const fI = this.factorReduccion(detectivos);

    const pRes = risk.p * fP;
    const iRes = risk.i * fI;
    const rRes = Math.max(pRes * iRes, 1); // piso de 1

    return { pRes, iRes, rRes };
  },

  /** Redondeo de presentación a 2 decimales sin arrastrar error de coma flotante. */
  round2(x) {
    return Math.round((x + Number.EPSILON) * 100) / 100;
  },

  /** Estado de un KPI frente a su meta: 'ok' | 'alerta' | 'critico'. No todas
   *  las metas son "mayor es mejor"; se interpreta el signo por texto de meta. */
  estadoKPI(kpi) {
    const meta = kpi.meta;
    const actual = kpi.actual;
    const numMeta = parseFloat(meta.replace(/[^\d.]/g, ""));
    if (isNaN(numMeta)) return "info"; // metas no numéricas (ej. "tendencia decreciente")

    const esMinimo = meta.includes("≥") || meta.toLowerCase().includes("mínimo");
    const esMaximo = meta.includes("≤") || meta.toLowerCase().includes("máximo") || meta === "100%";

    if (esMinimo) {
      if (actual >= numMeta) return "ok";
      if (actual >= numMeta * 0.85) return "alerta";
      return "critico";
    }
    if (esMaximo) {
      if (actual <= numMeta) return "ok";
      if (actual <= numMeta * 1.3) return "alerta";
      return "critico";
    }
    return "info";
  },
};
