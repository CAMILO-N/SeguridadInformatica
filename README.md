# MERCI — Aplicativo de gestión de riesgo cibernético

Aplicación web 100% del lado del cliente (sin backend, sin build, sin
dependencias de npm) que automatiza la metodología MERCI descrita en el
documento técnico del proyecto.

## Cómo ejecutarla

No requiere instalación ni servidor. Dos formas de abrirla:

1. **Doble clic en `index.html`** — se abre en el navegador por defecto.
2. **Servidor estático local (opcional, recomendado para grabar el video)**:
   ```bash
   cd merci-app
   python3 -m http.server 8080
   # abrir http://localhost:8080
   ```
   Usar un servidor evita cualquier restricción de `file://` en algunos
   navegadores y es más representativo de un despliegue real.

## Persistencia de datos

Los datos se guardan en `localStorage` del navegador: no hay backend ni
base de datos. Esto significa:

- Los datos son locales a ese navegador y ese dispositivo.
- No hay sincronización entre usuarios ni control de acceso real: los
  "reportes por audiencia" (Dirección / Área / Auditoría) son vistas
  filtradas de la misma base de datos local, no un sistema de permisos.
  Esta limitación se documenta explícitamente en la Sección XIII del
  informe metodológico (dilema ético de responsabilidad profesional).
- Al abrir la app por primera vez se siembra automáticamente con los
  datos de ejemplo del informe MERCI (7 activos, 7 amenazas, 7
  vulnerabilidades, 7 escenarios de riesgo), para que la demo y el
  informe escrito sean coherentes entre sí.
- Botón "Restaurar datos de ejemplo" en el Panel general para volver a
  este estado inicial en cualquier momento (útil antes de grabar el video).
- Botón "Exportar datos (JSON)" para respaldar el estado actual.

## Estructura del código

```
merci-app/
├── index.html          shell de la SPA, carga todos los scripts
├── css/styles.css       identidad visual, layout responsive, estilos de impresión
└── js/
    ├── data.js          escalas de referencia + datos semilla (Tarea 5 / MERCI, incluye catálogo de controles existentes)
    ├── calc.js          motor de cálculo: CIA, R=P×I, riesgo residual multiplicativo
    ├── store.js         persistencia sobre localStorage (con fallback en memoria)
    ├── charts.js        matriz de calor 5×5 y gauges de KPI en SVG puro
    └── app.js           router por hash, renderizado de cada módulo, formularios
```

## Módulos (mapeados a los 6 puntos mínimos de la consigna)

| Módulo en la app          | Punto de la consigna                         |
|----------------------------|-----------------------------------------------|
| Activos                    | 1. Valoración de activos                     |
| Amenazas y vulnerabilidades| 2. Identificación de riesgos (amenazas/vulns)|
| **Controles existentes**   | 2. Identificación de riesgos (**controles existentes**) — catálogo independiente, dentro del mismo módulo de Amenazas y vulnerabilidades |
| Riesgos                    | 2. Identificación de riesgos (análisis/R=P×I)|
| Tratamiento                 | 3. Tratamiento del riesgo (ISO/IEC 27002:2022)|
| Riesgo residual             | 4. Cálculo de riesgo residual                |
| Comunicación y consulta     | 5. Comunicación y consulta / reportes        |
| Monitoreo                   | 6. Monitoreo y supervisión (KPIs)            |

### Controles existentes → Tratamiento

El módulo **Controles existentes** registra, durante la identificación de
riesgos, qué controles ya existen en la organización y qué vulnerabilidad(es)
cubren (nombre, tipo Preventivo/Detectivo, eficacia estimada, estado
Implementado/Parcial/Planificado). No están atados a un escenario específico.

Al abrir el tratamiento de un escenario de riesgo, la app cruza sus
vulnerabilidades con este catálogo y sugiere los controles existentes
relevantes con un botón **"+ Usar"**, que los copia al plan de tratamiento de
ese escenario como punto de partida editable (eficacia y tipo iguales al
catálogo; ISO y responsable quedan en blanco para completarlos en el
contexto del escenario). Esto cierra el ciclo completo: identificar lo que ya
existe → decidir cómo tratarlo formalmente en cada escenario.

## Fórmulas implementadas (ver `js/calc.js`)

- `CIA = C×0.40 + I×0.35 + D×0.25`
- `R = P × I`
- Riesgo residual (combinación **multiplicativa**, no aditiva):
  - `P_residual = P × ∏(1 − eficacia_i)` para controles preventivos
  - `I_residual = I × ∏(1 − eficacia_j)` para controles detectivos
  - `R_residual = P_residual × I_residual`, con piso de 1 y tope de
    reducción acumulada de 95% por eje.

## Nota sobre fuentes tipográficas

La app carga Space Grotesk / Inter / JetBrains Mono desde Google Fonts.
Si se abre sin conexión a internet, cae automáticamente a las fuentes
del sistema — no se rompe ninguna funcionalidad, solo cambia la
tipografía.
