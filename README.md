# MERCI — Aplicativo de gestión de riesgo cibernético

**Aplicación en línea:** https://seguridadinformatica-merci.vercel.app/

## Estructura de carpetas

```
SeguridadInformatica/
├── Proyecto/
│   ├── index.html          shell de la SPA, carga todos los scripts
│   ├── css/
│   │   └── styles.css      identidad visual, layout responsive, estilos de impresión
│   └── js/
│       ├── data.js         escalas de referencia + datos semilla
│       ├── calc.js         motor de cálculo: CIA, R=P×I, riesgo residual multiplicativo
│       ├── store.js        persistencia sobre localStorage
│       ├── charts.js       matriz de calor 5×5 y gauges de KPI en SVG puro
│       └── app.js          router por hash, renderizado de cada módulo, formularios
└── Documentos/
    ├── Metodologia_MERCI_Final_Consolidada.docx
    ├── Manual_Usuario_MERCI.docx
    ├── PPT/
    │   └── MERCI_Integrated_Risk_Methodology.pdf
    └── Video/
```
