/* =========================================================================
   MERCI — data.js
   Datos de referencia (escalas fijas) y datos semilla (editables por el
   usuario). La semilla reproduce exactamente los valores del documento
   metodológico MERCI v2.0, para que informe y aplicativo sean coherentes.
   ========================================================================= */

const MERCI_REF = {
  categorias: [
    "Información", "Software", "Hardware", "Red y comunicaciones",
    "Servicios", "Humanos", "Intangibles",
  ],

  // Anclas de la escala 1-5 (Tabla 5 del informe)
  escalaP: [
    { v: 1, label: "Rara", desc: "más de 5 años entre ocurrencias" },
    { v: 2, label: "Improbable", desc: "cada 2–5 años" },
    { v: 3, label: "Posible", desc: "aproximadamente una vez al año" },
    { v: 4, label: "Probable", desc: "varias veces al año" },
    { v: 5, label: "Casi segura", desc: "mensual o continua" },
  ],
  escalaI: [
    { v: 1, label: "Insignificante", desc: "sin efecto operativo ni regulatorio medible" },
    { v: 2, label: "Menor", desc: "afecta un proceso; recuperación de bajo costo" },
    { v: 3, label: "Moderado", desc: "impacto medible en productividad, costos o reputación" },
    { v: 4, label: "Mayor", desc: "interrupción de procesos centrales; exposición regulatoria" },
    { v: 5, label: "Crítico", desc: "pérdida masiva de datos personales; consecuencias legales graves" },
  ],

  // Bandas de nivel de riesgo (Tabla 6) — intervalos semiabiertos, cubren 1-25 sin huecos
  niveles: [
    { max: 3, nombre: "Bajo", n: 1, color: "#2F7D5D" },
    { max: 5, nombre: "Moderado", n: 2, color: "#7A9A3C" },
    { max: 10, nombre: "Significativo", n: 3, color: "#C77F1A" },
    { max: 15, nombre: "Alto", n: 4, color: "#C1521E" },
    { max: Infinity, nombre: "Crítico", n: 5, color: "#B23A3A" },
  ],

  estrategias: ["Mitigar", "Transferir", "Aceptar", "Evitar"],
  tiposControl: ["Preventivo", "Detectivo"],
  estadosComunicacion: ["Abierta", "Seguimiento", "Cerrada"],
  tiposComunicacion: ["Observación", "Recomendación", "Consulta"],
  estadosControlExistente: ["Implementado", "Parcial", "Planificado"],
  audiencias: [
    { id: "direccion", label: "Dirección ejecutiva" },
    { id: "area", label: "Responsables de área" },
    { id: "auditoria", label: "Auditoría / Cumplimiento" },
  ],
};

function nivelDeRiesgo(r) {
  return MERCI_REF.niveles.find(n => r < n.max) || MERCI_REF.niveles[MERCI_REF.niveles.length - 1];
}

/* -------------------------------------------------------------------------
   SEMILLA — coincide con las Tablas 1, 2, 3, 4, 7, 9, 10 y 14 del informe.
   El usuario puede editar o borrar todo; esto solo puebla la primera carga.
   ------------------------------------------------------------------------- */
const MERCI_SEED = {

  assets: [
    { id: "ACT-001", nombre: "Base de datos de clientes", categoria: "Información", c: 5, i: 5, d: 4, nota: "Contiene datos personales bajo LOPDP." },
    { id: "ACT-002", nombre: "ERP / Sistema de gestión", categoria: "Software", c: 4, i: 5, d: 5, nota: "" },
    { id: "ACT-003", nombre: "Servidores de producción", categoria: "Hardware", c: 3, i: 5, d: 5, nota: "" },
    { id: "ACT-004", nombre: "Firewall / IDS perimetral", categoria: "Red y comunicaciones", c: 3, i: 4, d: 5, nota: "" },
    { id: "ACT-005", nombre: "Servicio de correo corporativo", categoria: "Servicios", c: 3, i: 3, d: 4, nota: "" },
    { id: "ACT-006", nombre: "Administradores de sistemas", categoria: "Humanos", c: 4, i: 5, d: 4, nota: "Acceso privilegiado." },
    { id: "ACT-007", nombre: "Reputación e imagen digital", categoria: "Intangibles", c: 5, i: 3, d: 2, nota: "" },
  ],

  threats: [
    { id: "AME-01", nombre: "Ransomware / Malware", origen: "Externa", activos: ["ACT-001", "ACT-002"] },
    { id: "AME-02", nombre: "Acceso no autorizado externo", origen: "Externa", activos: ["ACT-001", "ACT-004"] },
    { id: "AME-03", nombre: "Error humano / Insider", origen: "Interna", activos: ["ACT-001", "ACT-006"] },
    { id: "AME-04", nombre: "Falla de servicio (DDoS)", origen: "Externa", activos: ["ACT-003", "ACT-004"] },
    { id: "AME-05", nombre: "Brecha de proveedor", origen: "Tercero", activos: ["ACT-005", "ACT-002"] },
    { id: "AME-06", nombre: "Phishing dirigido", origen: "Externa", activos: ["ACT-006"] },
    { id: "AME-07", nombre: "Vulnerabilidad de software", origen: "Externa", activos: ["ACT-002", "ACT-003"] },
  ],

  vulns: [
    { id: "VUL-01", nombre: "Ausencia de MFA en sistemas críticos", tipo: "Tecnológica", activos: ["ACT-001", "ACT-002", "ACT-006"] },
    { id: "VUL-02", nombre: "Parches de seguridad desactualizados", tipo: "Tecnológica", activos: ["ACT-002", "ACT-003"] },
    { id: "VUL-03", nombre: "Falta de segmentación de red", tipo: "Tecnológica", activos: ["ACT-004"] },
    { id: "VUL-04", nombre: "Capacitación insuficiente en ciberseguridad", tipo: "Organizacional", activos: ["ACT-006"] },
    { id: "VUL-05", nombre: "Ausencia de política de contraseñas robusta", tipo: "Organizacional", activos: ["ACT-001", "ACT-002", "ACT-006"] },
    { id: "VUL-06", nombre: "Backups sin cifrar fuera del perímetro", tipo: "De procesos", activos: ["ACT-001", "ACT-003"] },
    { id: "VUL-07", nombre: "Sin monitoreo de logs en tiempo real", tipo: "Tecnológica", activos: ["ACT-003", "ACT-004"] },
  ],

  // Riesgos: I y P quedan como estimación editable; controles ya cargados
  // según la Tabla 9/10 del informe, con eficacias (0-1) y cláusula ISO.
  risks: [
    {
      id: "RIE-01", nombre: "Ransomware en BD de clientes", activo: "ACT-001",
      amenaza: "AME-01", vulnerabilidades: ["VUL-01", "VUL-02"], i: 5, p: 4,
      estrategias: ["Mitigar"],
      controles: [
        { nombre: "MFA obligatorio", tipo: "Preventivo", eficacia: 0.75, iso: "8.5 Autenticación segura", responsable: "Gerencia TI" },
        { nombre: "Gestión de parches mensual", tipo: "Preventivo", eficacia: 0.50, iso: "8.8 Gestión de vulnerabilidades técnicas", responsable: "Gerencia TI" },
        { nombre: "EDR en endpoints", tipo: "Detectivo", eficacia: 0.30, iso: "8.7 Protección contra malware", responsable: "CISO" },
      ],
    },
    {
      id: "RIE-02", nombre: "Acceso no autorizado externo", activo: "ACT-001",
      amenaza: "AME-02", vulnerabilidades: ["VUL-01", "VUL-05"], i: 5, p: 3,
      estrategias: ["Mitigar"],
      controles: [
        { nombre: "MFA obligatorio", tipo: "Preventivo", eficacia: 0.75, iso: "8.5 Autenticación segura", responsable: "Gerencia TI" },
        { nombre: "Segmentación de red", tipo: "Detectivo", eficacia: 0.25, iso: "8.22 Segregación de redes", responsable: "Gerencia TI" },
        { nombre: "SIEM 24/7", tipo: "Detectivo", eficacia: 0.30, iso: "8.16 Monitoreo", responsable: "CISO" },
      ],
    },
    {
      id: "RIE-03", nombre: "Fuga por insider", activo: "ACT-006",
      amenaza: "AME-03", vulnerabilidades: ["VUL-04", "VUL-05"], i: 4, p: 3,
      estrategias: ["Mitigar", "Transferir"],
      controles: [
        { nombre: "DLP", tipo: "Detectivo", eficacia: 0.20, iso: "8.12 Prevención de fuga de datos", responsable: "CISO" },
        { nombre: "Segregación de funciones", tipo: "Preventivo", eficacia: 0.30, iso: "5.3 Segregación de funciones", responsable: "Responsable de área" },
      ],
    },
    {
      id: "RIE-04", nombre: "DDoS a servidores", activo: "ACT-003",
      amenaza: "AME-04", vulnerabilidades: ["VUL-03", "VUL-07"], i: 4, p: 3,
      estrategias: ["Transferir", "Mitigar"],
      controles: [
        { nombre: "Anti-DDoS (CDN)", tipo: "Preventivo", eficacia: 0.50, iso: "8.20 Seguridad de redes", responsable: "Gerencia TI" },
      ],
    },
    {
      id: "RIE-05", nombre: "Brecha de proveedor", activo: "ACT-005",
      amenaza: "AME-05", vulnerabilidades: ["VUL-06"], i: 3, p: 2,
      estrategias: ["Aceptar", "Mitigar"],
      controles: [
        { nombre: "Cláusulas contractuales + auditoría anual", tipo: "Preventivo", eficacia: 0.30, iso: "5.19–5.20 Seguridad en relaciones con proveedores", responsable: "Responsable de área" },
      ],
    },
    {
      id: "RIE-06", nombre: "Phishing a privilegiados", activo: "ACT-006",
      amenaza: "AME-06", vulnerabilidades: ["VUL-01", "VUL-04", "VUL-05"], i: 4, p: 4,
      estrategias: ["Mitigar"],
      controles: [
        { nombre: "MFA obligatorio", tipo: "Preventivo", eficacia: 0.50, iso: "8.5 Autenticación segura", responsable: "Gerencia TI" },
        { nombre: "Capacitación y simulaciones de phishing", tipo: "Preventivo", eficacia: 0.40, iso: "6.3 Concienciación y formación", responsable: "Responsable de área" },
      ],
    },
    {
      id: "RIE-07", nombre: "Explotación de CVE en ERP", activo: "ACT-002",
      amenaza: "AME-07", vulnerabilidades: ["VUL-02"], i: 4, p: 3,
      estrategias: ["Mitigar"],
      controles: [
        { nombre: "Gestión de parches mensual", tipo: "Preventivo", eficacia: 0.50, iso: "8.8 Gestión de vulnerabilidades técnicas", responsable: "Gerencia TI" },
      ],
    },
  ],

  // Controles existentes detectados durante la identificación de riesgos
  // (previos a definir el tratamiento formal). Se registran junto a las
  // vulnerabilidades que mitigan, y pueden reutilizarse como punto de
  // partida al construir el plan de tratamiento de un escenario (CU-04).
  existingControls: [
    { id: "CEX-01", nombre: "Antivirus / EDR básico en endpoints", tipo: "Detectivo", vulnerabilidades: ["VUL-02", "VUL-07"], eficacia: 0.20, estado: "Implementado", nota: "Cobertura parcial; sin monitoreo centralizado 24/7." },
    { id: "CEX-02", nombre: "Respaldo periódico de base de datos", tipo: "Preventivo", vulnerabilidades: ["VUL-06"], eficacia: 0.25, estado: "Parcial", nota: "Backups existen pero no están cifrados fuera del perímetro." },
    { id: "CEX-03", nombre: "Charla anual de concienciación", tipo: "Preventivo", vulnerabilidades: ["VUL-04"], eficacia: 0.15, estado: "Implementado", nota: "Frecuencia baja frente al riesgo de phishing dirigido." },
    { id: "CEX-04", nombre: "Contraseñas mínimas de 8 caracteres", tipo: "Preventivo", vulnerabilidades: ["VUL-05"], eficacia: 0.10, estado: "Implementado", nota: "Política débil; no exige complejidad ni rotación." },
  ],

  comms: [
    { id: "COM-001", fecha: "2025-06-10", tipo: "Observación", riesgo: "RIE-06", emisor: "Analista SOC", receptor: "CISO", estado: "Seguimiento", detalle: "El plan de tratamiento de RIE-06 es exclusivamente preventivo; se recomienda incorporar un control detectivo sobre cuentas privilegiadas." },
    { id: "COM-002", fecha: "2025-06-12", tipo: "Recomendación", riesgo: "RIE-01", emisor: "CISO", receptor: "Dirección / Auditoría", estado: "Abierta", detalle: "Aprobar presupuesto para EDR en endpoints antes del cierre del trimestre." },
  ],

  kpis: [
    { id: "KPI-01", nombre: "Tiempo medio de detección de incidentes (MTTD)", meta: "≤ 4 horas", frecuencia: "Mensual", actual: 5 },
    { id: "KPI-02", nombre: "Tiempo medio de respuesta (MTTR)", meta: "≤ 8 horas", frecuencia: "Mensual", actual: 6 },
    { id: "KPI-03", nombre: "% de activos críticos con MFA activo", meta: "100%", frecuencia: "Trimestral", actual: 71 },
    { id: "KPI-04", nombre: "% de parches aplicados en ≤ 30 días", meta: "≥ 95%", frecuencia: "Mensual", actual: 88 },
    { id: "KPI-05", nombre: "Número de incidentes de seguridad", meta: "Tendencia decreciente", frecuencia: "Mensual", actual: 3 },
    { id: "KPI-06", nombre: "% de personal capacitado en ciberseguridad", meta: "≥ 90%", frecuencia: "Semestral", actual: 64 },
    { id: "KPI-07", nombre: "Tasa de clic en phishing simulado", meta: "≤ 5%", frecuencia: "Trimestral", actual: 9 },
  ],
};
