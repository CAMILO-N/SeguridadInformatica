/* =========================================================================
   MERCI — app.js
   Aplicación de una sola página, sin framework ni paso de build. Router
   por hash, re-render del panel de contenido por sección, y una capa de
   estado in-memory sincronizada con MerciStore (localStorage).
   ========================================================================= */

let STATE = {};

function loadState() {
  MerciStore.init();
  STATE = MerciStore.all();
  computeDerived();
}

/** Recalcula todos los campos derivados (CIA, riesgo, residual) antes de cada render. */
function computeDerived() {
  STATE.assets.forEach(a => { a._cia = MerciCalc.round2(MerciCalc.cia(a)); });
  STATE.risks.forEach(r => {
    r._inherente = MerciCalc.riesgoInherente(r);
    r._nivelInherente = nivelDeRiesgo(r._inherente);
    r._residual = MerciCalc.riesgoResidual(r);
    r._nivelResidual = nivelDeRiesgo(r._residual.rRes);
  });
}

function persist(key) {
  MerciStore.set(key, STATE[key]);
  computeDerived();
}

function byId(list, id) { return list.find(x => x.id === id); }

function nextId(list, prefix) {
  const nums = list.map(x => parseInt(x.id.split("-")[1], 10)).filter(n => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return prefix + "-" + String(next).padStart(2, "0");
}

/* ------------------------------- ROUTING -------------------------------- */

const NAV = [
  { id: "dashboard",   n: "00", label: "Panel general" },
  { id: "activos",     n: "01", label: "Activos" },
  { id: "amenazas",    n: "02", label: "Amenazas y vulnerabilidades" },
  { id: "riesgos",     n: "03", label: "Riesgos" },
  { id: "tratamiento", n: "04", label: "Tratamiento" },
  { id: "residual",    n: "05", label: "Riesgo residual" },
  { id: "comunicacion",n: "06", label: "Comunicación y consulta" },
  { id: "monitoreo",   n: "07", label: "Monitoreo" },
];

function currentRoute() {
  const h = (location.hash || "#dashboard").replace("#", "");
  return NAV.some(n => n.id === h) ? h : "dashboard";
}

function renderShell() {
  const route = currentRoute();
  document.getElementById("sidebar-nav").innerHTML = NAV.map(item => `
    <button class="nav-item ${item.id === route ? "active" : ""}" data-route="${item.id}">
      <span class="n">${item.n}</span>${item.label}
    </button>`).join("");

  document.getElementById("tabbar").innerHTML = NAV.map(item => `
    <button class="${item.id === route ? "active" : ""}" data-route="${item.id}">
      <span class="n">${item.n}</span><span>${item.label.split(" ")[0]}</span>
    </button>`).join("");

  renderContent(route);
}

function go(route) { location.hash = "#" + route; }

window.addEventListener("hashchange", renderShell);

// Escape cierra el modal (accesibilidad de teclado)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.getElementById("modal-root").innerHTML) closeModal();
});

/* Delegación de eventos: navegación, acciones de módulo, y cierre de modal. */
document.addEventListener("click", (e) => {
  const navBtn = e.target.closest("[data-route]");
  if (navBtn) { go(navBtn.dataset.route); return; }

  const action = e.target.closest("[data-action]");
  if (action) { handleAction(action.dataset.action, action.dataset, e); return; }

  if (e.target.classList.contains("modal-backdrop")) closeModal();
});

function handleAction(action, data) {
  const handlers = {
    "delete-asset": () => {
      const refsThreats = STATE.threats.filter(t => t.activos.includes(data.id));
      const refsVulns = STATE.vulns.filter(v => v.activos.includes(data.id));
      const refsRisks = STATE.risks.filter(r => r.activo === data.id);
      const total = refsThreats.length + refsVulns.length + refsRisks.length;
      const msg = total
        ? `Este activo está referenciado en ${refsThreats.length} amenaza(s), ${refsVulns.length} vulnerabilidad(es) y ${refsRisks.length} escenario(s) de riesgo. Esas referencias quedarán huérfanas (mostrarán el ID pero ya no será editable desde los formularios). ¿Eliminar de todas formas?`
        : "¿Eliminar este activo?";
      if (confirm(msg)) { STATE.assets = STATE.assets.filter(a => a.id !== data.id); persist("assets"); renderContent("activos"); }
    },
    "delete-threat": () => { if (confirm("¿Eliminar esta amenaza?")) { STATE.threats = STATE.threats.filter(t => t.id !== data.id); persist("threats"); renderContent("amenazas"); } },
    "delete-vuln": () => {
      const refsRisks = STATE.risks.filter(r => r.vulnerabilidades.includes(data.id));
      const refsExisting = STATE.existingControls.filter(c => c.vulnerabilidades.includes(data.id));
      const total = refsRisks.length + refsExisting.length;
      const msg = total
        ? `Esta vulnerabilidad está referenciada en ${refsRisks.length} escenario(s) de riesgo y ${refsExisting.length} control(es) existente(s). Esas referencias quedarán huérfanas. ¿Eliminar de todas formas?`
        : "¿Eliminar esta vulnerabilidad?";
      if (confirm(msg)) { STATE.vulns = STATE.vulns.filter(v => v.id !== data.id); persist("vulns"); renderContent("amenazas"); }
    },
    "delete-existing-control": () => { if (confirm("¿Eliminar este control existente del catálogo?")) { STATE.existingControls = STATE.existingControls.filter(c => c.id !== data.id); persist("existingControls"); renderContent("amenazas"); } },
    "delete-risk": () => { if (confirm("¿Eliminar este escenario de riesgo?")) { STATE.risks = STATE.risks.filter(r => r.id !== data.id); persist("risks"); renderContent(currentRoute()); } },
    "delete-comm": () => { if (confirm("¿Eliminar este registro?")) { STATE.comms = STATE.comms.filter(c => c.id !== data.id); persist("comms"); renderContent("comunicacion"); } },
    "delete-control": () => {
      const risk = byId(STATE.risks, data.riskId);
      risk.controles.splice(parseInt(data.idx, 10), 1);
      persist("risks");
      renderContent(currentRoute());
      openTreatmentForm(data.riskId); // reabre el modal ya reflejando el borrado
    },
    "reset-seed": () => { if (confirm("Esto reemplaza todos los datos por los del documento MERCI de referencia. ¿Continuar?")) { MerciStore.reset(); loadState(); renderShell(); } },
    "wipe-all": () => { if (confirm("Esto borra TODOS los datos (activos, riesgos, todo). ¿Continuar?")) { MerciStore.wipe(); loadState(); renderShell(); } },
    "export-json": () => exportJSON(),
    "close-modal": () => closeModal(),
  };
  if (handlers[action]) handlers[action]();
}

function renderContent(route) {
  const map = {
    dashboard: renderDashboard, activos: renderActivos, amenazas: renderAmenazas,
    riesgos: renderRiesgos, tratamiento: renderTratamiento, residual: renderResidual,
    comunicacion: renderComunicacion, monitoreo: renderMonitoreo,
  };
  const el = document.getElementById("content");
  el.innerHTML = map[route]();
  document.getElementById("topbar-title").textContent = NAV.find(n => n.id === route).label;
}

/* ------------------------------- MODAL ---------------------------------- */

function openModal(title, bodyHtml, { onSubmit, submitLabel = "Guardar" } = {}) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header"><h3>${title}</h3><button class="modal-close" data-action="close-modal">×</button></div>
        <form id="modal-form"><div class="modal-body">${bodyHtml}</div>
          <div class="modal-footer">
            <button type="button" class="btn" data-action="close-modal">Cancelar</button>
            <button type="submit" class="btn btn-primary">${submitLabel}</button>
          </div>
        </form>
      </div>
    </div>`;
  document.getElementById("modal-form").addEventListener("submit", (e) => {
    e.preventDefault();
    onSubmit(new FormData(e.target));
  });
  const firstField = root.querySelector(".modal-body input, .modal-body select, .modal-body textarea");
  if (firstField) firstField.focus();
}
function closeModal() { document.getElementById("modal-root").innerHTML = ""; }

/* ------------------------------ HELPERS UI ------------------------------- */

function chip(nivel) { return `<span class="chip chip-${nivel.n}">${nivel.nombre}</span>`; }
function td(label, content, extra = "") { return `<td data-label="${label}" ${extra}>${content}</td>`; }
function esc(s) { return (s ?? "").toString().replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function assetOptions(selectedId) {
  return STATE.assets.map(a => `<option value="${a.id}" ${a.id === selectedId ? "selected" : ""}>${a.id} — ${esc(a.nombre)}</option>`).join("");
}
function multiCheckboxes(name, list, selectedIds) {
  return `<div class="checkbox-group">` + list.map(item => `
    <label class="checkbox-pill ${selectedIds.includes(item.id) ? "checked" : ""}">
      <input type="checkbox" name="${name}" value="${item.id}" ${selectedIds.includes(item.id) ? "checked" : ""}
        onchange="this.closest('label').classList.toggle('checked', this.checked)">
      ${item.id}
    </label>`).join("") + `</div>`;
}

/* ============================== DASHBOARD ================================ */

function renderDashboard() {
  const risks = STATE.risks;
  const criticos = risks.filter(r => r._nivelInherente.nombre === "Crítico").length;
  const totalInherente = risks.reduce((s, r) => s + r._inherente, 0);
  const totalResidual = risks.reduce((s, r) => s + r._residual.rRes, 0);
  const reduccion = totalInherente ? Math.round((1 - totalResidual / totalInherente) * 100) : 0;

  return `
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="card stat-card ${criticos ? "crit" : ""}"><div class="stat-value">${criticos}</div><div class="stat-label">Riesgos en nivel Crítico</div></div>
      <div class="card stat-card"><div class="stat-value">${risks.length}</div><div class="stat-label">Escenarios de riesgo activos</div></div>
      <div class="card stat-card"><div class="stat-value">${STATE.assets.length}</div><div class="stat-label">Activos bajo evaluación</div></div>
      <div class="card stat-card"><div class="stat-value">${reduccion}%</div><div class="stat-label">Reducción de riesgo (post-tratamiento)</div></div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-title-row"><h3>Matriz de calor — riesgo inherente</h3></div>
        <div class="heatmap-wrap">${MerciCharts.heatmap(risks, { mode: "inherente" })}</div>
        ${heatmapLegend()}
      </div>
      <div class="card">
        <div class="card-title-row"><h3>Matriz de calor — riesgo residual</h3></div>
        <div class="heatmap-wrap">${MerciCharts.heatmap(risks, { mode: "residual" })}</div>
        ${heatmapLegend()}
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="card-title-row"><h3>Inherente vs. residual por escenario</h3></div>
      <div class="grid grid-2">
        ${risks.slice().sort((a,b)=>b._inherente-a._inherente).map(r => `
          <div>
            <div style="font-size:13px; font-weight:600; margin-bottom:4px;">
              <span class="id-tag">${r.id}</span> ${esc(r.nombre)}
            </div>
            ${MerciCharts.barraComparativa(r._inherente, r._residual.rRes)}
          </div>`).join("")}
      </div>
    </div>

    <div class="no-print action-row">
      <button class="btn btn-sm" data-action="export-json">Exportar datos (JSON)</button>
      <button class="btn btn-sm" data-action="reset-seed">Restaurar datos de ejemplo</button>
      <button class="btn btn-sm btn-danger" data-action="wipe-all">Borrar todos los datos</button>
    </div>
  `;
}

function heatmapLegend() {
  return `<div class="legend-row">${MERCI_REF.niveles.map(n => `<span><span class="legend-dot" style="background:${n.color}"></span>${n.nombre}</span>`).join("")}</div>`;
}

/* =============================== ACTIVOS ================================= */

function renderActivos() {
  const rows = STATE.assets.map(a => `
    <tr>
      ${td("ID", `<span class="id-tag">${a.id}</span>`)}
      ${td("Nombre", esc(a.nombre))}
      ${td("Categoría", esc(a.categoria))}
      ${td("C / I / D", `${a.c} / ${a.i} / ${a.d}`)}
      ${td("CIA ponderada", `<strong>${a._cia.toFixed(2)}</strong>`)}
      ${td("", `<div style="display:flex; gap:6px; justify-content:flex-end;">
        <button class="btn btn-sm" data-action="edit-asset" data-id="${a.id}" onclick="openAssetForm('${a.id}')">Editar</button>
        <button class="btn btn-sm btn-danger" data-action="delete-asset" data-id="${a.id}">Eliminar</button>
      </div>`, 'class="no-label"')}
    </tr>`).join("");

  return `
    <div class="card">
      <div class="card-title-row">
        <div><h3>Inventario de activos</h3><div class="topbar-sub">CIA = C·0,40 + I·0,35 + D·0,25 (escala 1–5)</div></div>
        <button class="btn btn-primary" onclick="openAssetForm()">+ Nuevo activo</button>
      </div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>ID</th><th>Nombre</th><th>Categoría</th><th>C / I / D</th><th>CIA</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6">Sin activos registrados.</td></tr>`}</tbody>
      </table></div>
    </div>`;
}

function openAssetForm(id) {
  const a = id ? byId(STATE.assets, id) : null;
  const body = `
    <div class="field"><label>Nombre del activo</label><input name="nombre" required value="${a ? esc(a.nombre) : ""}"></div>
    <div class="field"><label>Categoría</label><select name="categoria">${MERCI_REF.categorias.map(c => `<option ${a && a.categoria === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
    <div class="field-row">
      <div class="field"><label>Confidencialidad (1–5)</label><input type="number" name="c" min="1" max="5" required value="${a ? a.c : 3}"></div>
      <div class="field"><label>Integridad (1–5)</label><input type="number" name="i" min="1" max="5" required value="${a ? a.i : 3}"></div>
      <div class="field"><label>Disponibilidad (1–5)</label><input type="number" name="d" min="1" max="5" required value="${a ? a.d : 3}"></div>
    </div>
    <div class="field"><label>Nota (opcional)</label><textarea name="nota">${a ? esc(a.nota) : ""}</textarea></div>`;

  openModal(a ? `Editar ${a.id}` : "Nuevo activo", body, {
    onSubmit: (fd) => {
      const vals = { nombre: fd.get("nombre"), categoria: fd.get("categoria"), c: +fd.get("c"), i: +fd.get("i"), d: +fd.get("d"), nota: fd.get("nota") };
      if (a) Object.assign(a, vals);
      else STATE.assets.push({ id: nextId(STATE.assets, "ACT"), ...vals });
      persist("assets"); closeModal(); renderContent("activos");
    },
  });
}

/* ============================ AMENAZAS / VULN ============================= */

function renderAmenazas() {
  const threatRows = STATE.threats.map(t => `
    <tr>
      ${td("ID", `<span class="id-tag">${t.id}</span>`)}
      ${td("Amenaza", esc(t.nombre))}
      ${td("Origen", t.origen)}
      ${td("Activos expuestos", t.activos.join(", "))}
      ${td("", `<div style="display:flex; gap:6px; justify-content:flex-end;">
        <button class="btn btn-sm" onclick="openThreatForm('${t.id}')">Editar</button>
        <button class="btn btn-sm btn-danger" data-action="delete-threat" data-id="${t.id}">Eliminar</button>
      </div>`, 'class="no-label"')}
    </tr>`).join("");

  const vulnRows = STATE.vulns.map(v => `
    <tr>
      ${td("ID", `<span class="id-tag">${v.id}</span>`)}
      ${td("Vulnerabilidad", esc(v.nombre))}
      ${td("Tipo", v.tipo)}
      ${td("Activos afectados", v.activos.join(", "))}
      ${td("", `<div style="display:flex; gap:6px; justify-content:flex-end;">
        <button class="btn btn-sm" onclick="openVulnForm('${v.id}')">Editar</button>
        <button class="btn btn-sm btn-danger" data-action="delete-vuln" data-id="${v.id}">Eliminar</button>
      </div>`, 'class="no-label"')}
    </tr>`).join("");

  const existingRows = STATE.existingControls.map(c => `
    <tr>
      ${td("ID", `<span class="id-tag">${c.id}</span>`)}
      ${td("Control existente", esc(c.nombre))}
      ${td("Tipo", c.tipo)}
      ${td("Vulnerabilidades cubiertas", c.vulnerabilidades.join(", ") || "—")}
      ${td("Eficacia estimada", `${Math.round(c.eficacia * 100)}%`)}
      ${td("Estado", `<span class="chip chip-outline">${c.estado}</span>`)}
      ${td("", `<div style="display:flex; gap:6px; justify-content:flex-end;">
        <button class="btn btn-sm" onclick="openExistingControlForm('${c.id}')">Editar</button>
        <button class="btn btn-sm btn-danger" data-action="delete-existing-control" data-id="${c.id}">Eliminar</button>
      </div>`, 'class="no-label"')}
    </tr>`).join("");

  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title-row"><h3>Catálogo de amenazas</h3><button class="btn btn-primary" onclick="openThreatForm()">+ Nueva amenaza</button></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>ID</th><th>Amenaza</th><th>Origen</th><th>Activos expuestos</th><th></th></tr></thead>
        <tbody>${threatRows || `<tr><td colspan="5">Sin amenazas registradas.</td></tr>`}</tbody>
      </table></div>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title-row"><h3>Catálogo de vulnerabilidades</h3><button class="btn btn-primary" onclick="openVulnForm()">+ Nueva vulnerabilidad</button></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>ID</th><th>Vulnerabilidad</th><th>Tipo</th><th>Activos afectados</th><th></th></tr></thead>
        <tbody>${vulnRows || `<tr><td colspan="5">Sin vulnerabilidades registradas.</td></tr>`}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="card-title-row">
        <div><h3>Controles existentes</h3><div class="topbar-sub">Controles ya presentes en la organización, detectados durante la identificación (previos al plan formal de tratamiento).</div></div>
        <button class="btn btn-primary" onclick="openExistingControlForm()">+ Nuevo control existente</button>
      </div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>ID</th><th>Control existente</th><th>Tipo</th><th>Vulnerabilidades cubiertas</th><th>Eficacia est.</th><th>Estado</th><th></th></tr></thead>
        <tbody>${existingRows || `<tr><td colspan="7">Sin controles existentes registrados.</td></tr>`}</tbody>
      </table></div>
    </div>`;
}

function openExistingControlForm(id) {
  const c = id ? byId(STATE.existingControls, id) : null;
  const body = `
    <div class="field"><label>Nombre del control</label><input name="nombre" required value="${c ? esc(c.nombre) : ""}"></div>
    <div class="field-row">
      <div class="field"><label>Tipo</label><select name="tipo">${MERCI_REF.tiposControl.map(t => `<option ${c && c.tipo === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label>Eficacia estimada % (0-100)</label><input type="number" name="eficacia" min="0" max="100" value="${c ? Math.round(c.eficacia * 100) : 0}"></div>
    </div>
    <div class="field"><label>Vulnerabilidades que cubre</label>${multiCheckboxes("vulnerabilidades", STATE.vulns, c ? c.vulnerabilidades : [])}</div>
    <div class="field"><label>Estado</label><select name="estado">${MERCI_REF.estadosControlExistente.map(e => `<option ${c && c.estado === e ? "selected" : ""}>${e}</option>`).join("")}</select></div>
    <div class="field"><label>Nota (opcional)</label><textarea name="nota">${c ? esc(c.nota) : ""}</textarea></div>`;

  openModal(c ? `Editar ${c.id}` : "Nuevo control existente", body, {
    onSubmit: (fd) => {
      const vals = {
        nombre: fd.get("nombre"), tipo: fd.get("tipo"),
        eficacia: Math.min(1, Math.max(0, (+fd.get("eficacia") || 0) / 100)),
        vulnerabilidades: fd.getAll("vulnerabilidades"),
        estado: fd.get("estado"), nota: fd.get("nota"),
      };
      if (c) Object.assign(c, vals);
      else STATE.existingControls.push({ id: nextId(STATE.existingControls, "CEX"), ...vals });
      persist("existingControls"); closeModal(); renderContent("amenazas");
    },
  });
}

function openThreatForm(id) {
  const t = id ? byId(STATE.threats, id) : null;
  const body = `
    <div class="field"><label>Nombre de la amenaza</label><input name="nombre" required value="${t ? esc(t.nombre) : ""}"></div>
    <div class="field"><label>Origen</label><select name="origen">${["Externa","Interna","Tercero"].map(o => `<option ${t && t.origen === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>
    <div class="field"><label>Activos expuestos</label>${multiCheckboxes("activos", STATE.assets, t ? t.activos : [])}</div>`;
  openModal(t ? `Editar ${t.id}` : "Nueva amenaza", body, {
    onSubmit: (fd) => {
      const vals = { nombre: fd.get("nombre"), origen: fd.get("origen"), activos: fd.getAll("activos") };
      if (t) Object.assign(t, vals);
      else STATE.threats.push({ id: nextId(STATE.threats, "AME"), ...vals });
      persist("threats"); closeModal(); renderContent("amenazas");
    },
  });
}

function openVulnForm(id) {
  const v = id ? byId(STATE.vulns, id) : null;
  const body = `
    <div class="field"><label>Nombre de la vulnerabilidad</label><input name="nombre" required value="${v ? esc(v.nombre) : ""}"></div>
    <div class="field"><label>Tipo</label><select name="tipo">${["Tecnológica","Organizacional","De procesos"].map(o => `<option ${v && v.tipo === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>
    <div class="field"><label>Activos afectados</label>${multiCheckboxes("activos", STATE.assets, v ? v.activos : [])}</div>`;
  openModal(v ? `Editar ${v.id}` : "Nueva vulnerabilidad", body, {
    onSubmit: (fd) => {
      const vals = { nombre: fd.get("nombre"), tipo: fd.get("tipo"), activos: fd.getAll("activos") };
      if (v) Object.assign(v, vals);
      else STATE.vulns.push({ id: nextId(STATE.vulns, "VUL"), ...vals });
      persist("vulns"); closeModal(); renderContent("amenazas");
    },
  });
}

/* ================================ RIESGOS ================================= */

function renderRiesgos() {
  const rows = STATE.risks.slice().sort((a,b)=>b._inherente-a._inherente).map(r => `
    <tr>
      ${td("ID", `<span class="id-tag">${r.id}</span>`)}
      ${td("Escenario", esc(r.nombre))}
      ${td("Activo", r.activo)}
      ${td("Amenaza / Vulnerab.", `${r.amenaza}<br><span style="color:var(--muted); font-size:12px;">${r.vulnerabilidades.join(", ")}</span>`)}
      ${td("I", r.i)}
      ${td("P", r.p)}
      ${td("R = I×P", `<strong>${r._inherente}</strong>`)}
      ${td("Nivel", chip(r._nivelInherente))}
      ${td("", `<div style="display:flex; gap:6px; justify-content:flex-end;">
        <button class="btn btn-sm" onclick="openRiskForm('${r.id}')">Editar</button>
        <button class="btn btn-sm btn-danger" data-action="delete-risk" data-id="${r.id}">Eliminar</button>
      </div>`, 'class="no-label"')}
    </tr>`).join("");

  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title-row">
        <div><h3>Escenarios de riesgo</h3><div class="topbar-sub">Escala de anclas de P e I disponible al crear/editar un escenario.</div></div>
        <button class="btn btn-primary" onclick="openRiskForm()">+ Nuevo escenario</button>
      </div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>ID</th><th>Escenario</th><th>Activo</th><th>Amenaza / Vulnerab.</th><th>I</th><th>P</th><th>R</th><th>Nivel</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="9">Sin escenarios registrados.</td></tr>`}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="card-title-row"><h3>Matriz de calor de escenarios</h3></div>
      <div class="heatmap-wrap">${MerciCharts.heatmap(STATE.risks, { mode: "inherente" })}</div>
      ${heatmapLegend()}
    </div>`;
}

function openRiskForm(id) {
  const r = id ? byId(STATE.risks, id) : null;
  const escalaHint = (label, escala) => `<div class="field-hint">${escala.map(e => `${e.v}=${e.label}`).join(" · ")}</div>`;
  const body = `
    <div class="field"><label>Nombre del escenario</label><input name="nombre" required value="${r ? esc(r.nombre) : ""}"></div>
    <div class="field"><label>Activo primario</label><select name="activo">${assetOptions(r ? r.activo : null)}</select></div>
    <div class="field"><label>Amenaza</label><select name="amenaza">${STATE.threats.map(t => `<option value="${t.id}" ${r && r.amenaza===t.id?"selected":""}>${t.id} — ${esc(t.nombre)}</option>`).join("")}</select></div>
    <div class="field"><label>Vulnerabilidades explotadas</label>${multiCheckboxes("vulnerabilidades", STATE.vulns, r ? r.vulnerabilidades : [])}</div>
    <div class="field-row">
      <div class="field"><label>Impacto (I, 1–5)</label><input type="number" name="i" min="1" max="5" required value="${r ? r.i : 3}">${escalaHint("I", MERCI_REF.escalaI)}</div>
      <div class="field"><label>Probabilidad (P, 1–5)</label><input type="number" name="p" min="1" max="5" required value="${r ? r.p : 3}">${escalaHint("P", MERCI_REF.escalaP)}</div>
    </div>`;
  openModal(r ? `Editar ${r.id}` : "Nuevo escenario de riesgo", body, {
    onSubmit: (fd) => {
      const vals = { nombre: fd.get("nombre"), activo: fd.get("activo"), amenaza: fd.get("amenaza"), vulnerabilidades: fd.getAll("vulnerabilidades"), i: +fd.get("i"), p: +fd.get("p") };
      if (r) Object.assign(r, vals);
      else STATE.risks.push({ id: nextId(STATE.risks, "RIE"), estrategias: [], controles: [], ...vals });
      persist("risks"); closeModal(); renderContent(currentRoute());
    },
  });
}

/* =============================== TRATAMIENTO ============================== */

function renderTratamiento() {
  const rows = STATE.risks.map(r => `
    <tr>
      ${td("ID", `<span class="id-tag">${r.id}</span>`)}
      ${td("Escenario", esc(r.nombre))}
      ${td("Estrategia(s)", r.estrategias.map(s => `<span class="chip chip-outline">${s}</span>`).join(" "))}
      ${td("Controles", r.controles.length ? r.controles.map(c => `${esc(c.nombre)} <span style="color:var(--muted);">(${c.tipo}, ${Math.round(c.eficacia*100)}%)</span>`).join("<br>") : "—")}
      ${td("Cláusula ISO 27002:2022", r.controles.map(c => esc(c.iso)).join("<br>") || "—")}
      ${td("", `<button class="btn btn-sm" onclick="openTreatmentForm('${r.id}')">Editar tratamiento</button>`, 'class="no-label"')}
    </tr>`).join("");

  return `
    <div class="card">
      <div class="card-title-row"><div><h3>Plan de tratamiento</h3><div class="topbar-sub">Estrategias: Mitigar · Transferir · Aceptar · Evitar. Controles referenciados a ISO/IEC 27002:2022.</div></div></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>ID</th><th>Escenario</th><th>Estrategia</th><th>Controles</th><th>ISO 27002:2022</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6">Sin escenarios registrados.</td></tr>`}</tbody>
      </table></div>
    </div>`;
}

function openTreatmentForm(riskId) {
  const r = byId(STATE.risks, riskId);
  const controlRow = (c, idx) => `
    <tr>
      <td>${esc(c.nombre)}</td><td>${c.tipo}</td><td>${Math.round(c.eficacia*100)}%</td>
      <td style="font-size:12px;">${esc(c.iso)}</td>
      <td><button type="button" class="btn btn-sm btn-danger" data-action="delete-control" data-risk-id="${r.id}" data-idx="${idx}">×</button></td>
    </tr>`;

  // Controles existentes (catálogo de identificación) que cubren alguna de las
  // vulnerabilidades de este escenario y que aún no han sido incorporados al
  // tratamiento — permiten partir de lo que ya existe en vez de empezar de cero.
  const yaIncluidos = new Set(r.controles.map(c => c.nombre));
  const sugeridos = STATE.existingControls.filter(c =>
    c.vulnerabilidades.some(v => r.vulnerabilidades.includes(v)) && !yaIncluidos.has(c.nombre)
  );
  const sugeridosHtml = sugeridos.length ? `
    <div class="field" style="background:var(--accent-soft); padding:12px; border-radius:8px; margin-bottom:10px;">
      <label>Controles existentes sugeridos (del catálogo de identificación)</label>
      <table class="data"><tbody>${sugeridos.map(c => `
        <tr>
          <td>${esc(c.nombre)}</td>
          <td style="font-size:12px; color:var(--muted);">${c.tipo} · ${Math.round(c.eficacia*100)}% · ${c.estado}</td>
          <td><button type="button" class="btn btn-sm" onclick="addExistingControlToRisk('${r.id}','${c.id}')">+ Usar</button></td>
        </tr>`).join("")}</tbody></table>
    </div>` : "";

  const body = `
    <div class="field"><label>Estrategias de tratamiento</label>
      <div class="checkbox-group">${MERCI_REF.estrategias.map(s => `
        <label class="checkbox-pill ${r.estrategias.includes(s) ? "checked" : ""}">
          <input type="checkbox" name="estrategias" value="${s}" ${r.estrategias.includes(s) ? "checked" : ""}
            onchange="this.closest('label').classList.toggle('checked', this.checked)"> ${s}
        </label>`).join("")}</div>
    </div>
    ${sugeridosHtml}
    <div class="field">
      <label>Controles aplicados</label>
      <table class="data" style="margin-bottom:10px;"><tbody>${r.controles.map(controlRow).join("") || "<tr><td>Sin controles cargados.</td></tr>"}</tbody></table>
    </div>
    <div class="field" style="background:var(--accent-soft); padding:12px; border-radius:8px;">
      <label>Agregar control</label>
      <div class="field-row">
        <div class="field"><input name="c_nombre" placeholder="Nombre del control"></div>
        <div class="field"><select name="c_tipo"><option>Preventivo</option><option>Detectivo</option></select></div>
      </div>
      <div class="field-row">
        <div class="field"><input name="c_eficacia" type="number" min="0" max="100" placeholder="Eficacia % (0-100)"></div>
        <div class="field"><input name="c_iso" placeholder="Cláusula ISO/IEC 27002:2022"></div>
      </div>
      <div class="field"><input name="c_responsable" placeholder="Responsable"></div>
    </div>`;

  openModal(`Tratamiento — ${r.id}`, body, {
    submitLabel: "Guardar tratamiento",
    onSubmit: (fd) => {
      r.estrategias = fd.getAll("estrategias");
      const nombre = fd.get("c_nombre");
      if (nombre) {
        r.controles.push({
          nombre, tipo: fd.get("c_tipo"),
          eficacia: Math.min(1, Math.max(0, (+fd.get("c_eficacia") || 0) / 100)),
          iso: fd.get("c_iso") || "Por definir",
          responsable: fd.get("c_responsable") || "Por asignar",
        });
      }
      persist("risks"); closeModal(); renderContent("tratamiento");
    },
  });
}

/** Copia un control existente del catálogo de identificación al plan de
 *  tratamiento de un escenario, como punto de partida editable. */
function addExistingControlToRisk(riskId, existingId) {
  const r = byId(STATE.risks, riskId);
  const c = byId(STATE.existingControls, existingId);
  if (!r || !c) return;
  r.controles.push({
    nombre: c.nombre, tipo: c.tipo, eficacia: c.eficacia,
    iso: "Por definir", responsable: "Por asignar",
  });
  persist("risks");
  openTreatmentForm(riskId); // reabre el modal ya con el control incorporado
}

/* ================================ RESIDUAL ================================ */

function renderResidual() {
  const rows = STATE.risks.slice().sort((a,b)=>b._inherente-a._inherente).map(r => `
    <tr>
      ${td("ID", `<span class="id-tag">${r.id}</span>`)}
      ${td("Escenario", esc(r.nombre))}
      ${td("R inherente", `${r._inherente} ${chip(r._nivelInherente)}`)}
      ${td("Controles P", r.controles.filter(c=>c.tipo==="Preventivo").map(c=>`${esc(c.nombre)} (${Math.round(c.eficacia*100)}%)`).join(", ") || "—")}
      ${td("Controles I", r.controles.filter(c=>c.tipo==="Detectivo").map(c=>`${esc(c.nombre)} (${Math.round(c.eficacia*100)}%)`).join(", ") || "—")}
      ${td("P residual", MerciCalc.round2(r._residual.pRes))}
      ${td("I residual", MerciCalc.round2(r._residual.iRes))}
      ${td("R residual", `<strong>${MerciCalc.round2(r._residual.rRes)}</strong>`)}
      ${td("Nivel residual", chip(r._nivelResidual))}
    </tr>`).join("");

  const asimetricos = STATE.risks.filter(r => r.controles.filter(c=>c.tipo==="Detectivo").length === 0 && r.controles.length > 0);

  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title-row"><div><h3>Riesgo residual</h3>
      <div class="topbar-sub mono">P_res = P × ∏(1−eᵢ) preventivos · I_res = I × ∏(1−eⱼ) detectivos · R_res = P_res × I_res (piso 1, tope de reducción 95% por eje)</div></div></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>ID</th><th>Escenario</th><th>R inh.</th><th>Controles P</th><th>Controles I</th><th>P res.</th><th>I res.</th><th>R res.</th><th>Nivel</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="9">Sin escenarios registrados.</td></tr>`}</tbody>
      </table></div>
    </div>
    ${asimetricos.length ? `
    <div class="card" style="border-color:#F0D4A8; background:#FFFBF2;">
      <h3 style="color:var(--significativo);">⚠ Asimetría de tratamiento detectada</h3>
      <p style="font-size:13.5px; margin:6px 0 0;">
        ${asimetricos.map(r => `<strong>${r.id}</strong> (${esc(r.nombre)})`).join(", ")}
        ${asimetricos.length > 1 ? "tienen" : "tiene"} controles exclusivamente preventivos, sin ningún control detectivo/compensatorio.
        Su impacto residual no se reduce: el riesgo queda limitado únicamente por la reducción de probabilidad.
        Se recomienda incorporar un control de detección o contención antes de considerar el escenario resuelto.
      </p>
    </div>` : ""}
  `;
}

/* ============================== COMUNICACIÓN =============================== */

function renderComunicacion() {
  const rows = STATE.comms.slice().reverse().map(c => `
    <tr>
      ${td("ID", `<span class="id-tag">${c.id}</span>`)}
      ${td("Fecha", c.fecha)}
      ${td("Tipo", c.tipo)}
      ${td("Riesgo", c.riesgo || "—")}
      ${td("Emisor → Receptor", `${esc(c.emisor)} → ${esc(c.receptor)}`)}
      ${td("Estado", `<span class="chip chip-outline">${c.estado}</span>`)}
      ${td("", `<button class="btn btn-sm btn-danger" data-action="delete-comm" data-id="${c.id}">Eliminar</button>`, 'class="no-label"')}
    </tr>`).join("");

  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title-row"><h3>Registro de comunicación y consulta</h3><button class="btn btn-primary" onclick="openCommForm()">+ Nuevo registro</button></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>ID</th><th>Fecha</th><th>Tipo</th><th>Riesgo</th><th>Emisor → Receptor</th><th>Estado</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7">Sin registros.</td></tr>`}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="card-title-row"><h3>Generar reporte para partes interesadas</h3></div>
      <p class="topbar-sub" style="margin-bottom:12px;">
        Nota de transparencia: estas vistas filtran la información por audiencia dentro del mismo aplicativo;
        no implementan control de acceso con autenticación (ver Sección XIII del informe metodológico).
      </p>
      <div class="report-picker">
        ${MERCI_REF.audiencias.map(a => `<button class="btn" onclick="renderReport('${a.id}')">${a.label}</button>`).join("")}
      </div>
      <div id="report-slot"></div>
    </div>`;
}

function openCommForm() {
  const body = `
    <div class="field"><label>Fecha</label><input type="date" name="fecha" required value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="field"><label>Tipo</label><select name="tipo">${MERCI_REF.tiposComunicacion.map(t => `<option>${t}</option>`).join("")}</select></div>
    <div class="field"><label>Riesgo relacionado</label><select name="riesgo"><option value="">— Ninguno —</option>${STATE.risks.map(r => `<option value="${r.id}">${r.id} — ${esc(r.nombre)}</option>`).join("")}</select></div>
    <div class="field-row">
      <div class="field"><label>Emisor</label><input name="emisor" required></div>
      <div class="field"><label>Receptor</label><input name="receptor" required></div>
    </div>
    <div class="field"><label>Estado</label><select name="estado">${MERCI_REF.estadosComunicacion.map(e => `<option>${e}</option>`).join("")}</select></div>
    <div class="field"><label>Detalle</label><textarea name="detalle"></textarea></div>`;
  openModal("Nuevo registro de comunicación", body, {
    onSubmit: (fd) => {
      STATE.comms.push({
        id: nextId(STATE.comms, "COM"), fecha: fd.get("fecha"), tipo: fd.get("tipo"),
        riesgo: fd.get("riesgo"), emisor: fd.get("emisor"), receptor: fd.get("receptor"),
        estado: fd.get("estado"), detalle: fd.get("detalle"),
      });
      persist("comms"); closeModal(); renderContent("comunicacion");
    },
  });
}

function renderReport(audienceId) {
  const slot = document.getElementById("report-slot");
  const fecha = new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" });
  const criticos = STATE.risks.filter(r => r._nivelInherente.nombre === "Crítico");

  let html = "";
  if (audienceId === "direccion") {
    html = `
      <div class="report-doc">
        <h2>Reporte ejecutivo — Riesgo cibernético</h2>
        <div class="report-meta">Generado el ${fecha} · Audiencia: Dirección ejecutiva</div>
        <div class="report-section"><h4>Riesgos críticos activos</h4>
          <table class="data"><thead><tr><th>ID</th><th>Escenario</th><th>R</th><th>R residual</th></tr></thead>
          <tbody>${criticos.map(r => `<tr><td>${r.id}</td><td>${esc(r.nombre)}</td><td>${r._inherente}</td><td>${MerciCalc.round2(r._residual.rRes)}</td></tr>`).join("") || "<tr><td colspan='4'>Sin riesgos críticos activos.</td></tr>"}</tbody></table>
        </div>
        <div class="report-section"><h4>Resumen de exposición</h4>
          <p>${STATE.risks.length} escenarios evaluados. Riesgo inherente acumulado: ${MerciCalc.round2(STATE.risks.reduce((s,r)=>s+r._inherente,0))}.
          Riesgo residual acumulado tras tratamiento: ${MerciCalc.round2(STATE.risks.reduce((s,r)=>s+r._residual.rRes,0))}.</p>
        </div>
      </div>`;
  } else if (audienceId === "area") {
    html = `
      <div class="report-doc">
        <h2>Reporte por responsable de área</h2>
        <div class="report-meta">Generado el ${fecha} · Audiencia: Responsables de área</div>
        <div class="report-section"><h4>Riesgos y plazos de tratamiento</h4>
          <table class="data"><thead><tr><th>ID</th><th>Escenario</th><th>Nivel</th><th>Controles pendientes</th></tr></thead>
          <tbody>${STATE.risks.map(r => `<tr><td>${r.id}</td><td>${esc(r.nombre)}</td><td>${chip(r._nivelInherente)}</td><td>${r.controles.length} cargado(s)</td></tr>`).join("")}</tbody></table>
        </div>
      </div>`;
  } else {
    html = `
      <div class="report-doc">
        <h2>Reporte de auditoría y cumplimiento</h2>
        <div class="report-meta">Generado el ${fecha} · Audiencia: Auditoría / Cumplimiento · Trazabilidad completa</div>
        <div class="report-section"><h4>Inventario de activos</h4>
          <table class="data"><thead><tr><th>ID</th><th>Activo</th><th>CIA</th></tr></thead>
          <tbody>${STATE.assets.map(a => `<tr><td>${a.id}</td><td>${esc(a.nombre)}</td><td>${a._cia.toFixed(2)}</td></tr>`).join("")}</tbody></table>
        </div>
        <div class="report-section"><h4>Escenarios de riesgo y tratamiento</h4>
          <table class="data"><thead><tr><th>ID</th><th>R inh.</th><th>Estrategia</th><th>R res.</th></tr></thead>
          <tbody>${STATE.risks.map(r => `<tr><td>${r.id}</td><td>${r._inherente}</td><td>${r.estrategias.join(", ") || "—"}</td><td>${MerciCalc.round2(r._residual.rRes)}</td></tr>`).join("")}</tbody></table>
        </div>
        <div class="report-section"><h4>Registro de comunicaciones</h4>
          <table class="data"><thead><tr><th>ID</th><th>Fecha</th><th>Tipo</th><th>Estado</th></tr></thead>
          <tbody>${STATE.comms.map(c => `<tr><td>${c.id}</td><td>${c.fecha}</td><td>${c.tipo}</td><td>${c.estado}</td></tr>`).join("")}</tbody></table>
        </div>
      </div>`;
  }
  slot.innerHTML = html + `<div class="no-print" style="margin-top:12px;"><button class="btn btn-primary" onclick="window.print()">Imprimir / Exportar PDF</button></div>`;
}

/* ================================ MONITOREO ================================ */

function renderMonitoreo() {
  const cards = STATE.kpis.map(k => {
    const numMeta = parseFloat(k.meta.replace(/[^\d.]/g, ""));
    const estado = MerciCalc.estadoKPI(k);
    const pct = isNaN(numMeta) ? 50 : Math.min(100, (k.actual / (numMeta || 1)) * 100);
    return `
      <div class="card kpi-card">
        ${MerciCharts.gauge(pct, estado)}
        <div class="kpi-info">
          <div class="kpi-name">${esc(k.nombre)}</div>
          <div class="kpi-meta">Meta: ${k.meta} · ${k.frecuencia}</div>
          <div class="kpi-actual">${k.actual}${isNaN(numMeta) ? "" : (k.meta.includes("%") ? "%" : (k.meta.includes("hora") ? " h" : ""))}
            <input type="number" step="0.1" style="width:64px; margin-left:8px; padding:2px 6px; font-size:12px; border:1px solid var(--border); border-radius:6px;"
              value="${k.actual}" onchange="updateKPI('${k.id}', this.value)">
          </div>
        </div>
      </div>`;
  }).join("");

  return `
    <div class="card" style="margin-bottom:14px;"><h3>Panel de monitoreo continuo</h3>
      <p class="topbar-sub">Riesgos Críticos: revisión mensual de indicadores. Riesgos Altos: revisión trimestral. Significativos/Moderados: revisión semestral.</p>
    </div>
    <div class="grid grid-2">${cards}</div>`;
}

function updateKPI(id, value) {
  const k = byId(STATE.kpis, id);
  k.actual = parseFloat(value) || 0;
  persist("kpis");
  renderContent("monitoreo");
}

/* ================================= EXPORT =================================== */

function exportJSON() {
  const data = { assets: STATE.assets, threats: STATE.threats, vulns: STATE.vulns, existingControls: STATE.existingControls, risks: STATE.risks, comms: STATE.comms, kpis: STATE.kpis, exportado: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "merci-export.json"; a.click();
  URL.revokeObjectURL(url);
}

/* ================================== INIT ===================================== */

loadState();
renderShell();
