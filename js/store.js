/* =========================================================================
   MERCI — store.js
   Capa de persistencia. Usa localStorage (requerido: sin backend, 100%
   cliente). Si localStorage no está disponible (modo privado del
   navegador, o un sandbox que lo bloquea), cae a memoria en la misma
   sesión, para que la app nunca se rompa por esto — solo pierde
   persistencia entre recargas, y lo avisa una vez en consola.
   ========================================================================= */

const MerciStore = (() => {
  const PREFIX = "merci:";
  const KEYS = ["assets", "threats", "vulns", "existingControls", "risks", "comms", "kpis"];

  let backend = "localStorage";
  const memory = {};

  function testLocalStorage() {
    try {
      const t = "__merci_test__";
      window.localStorage.setItem(t, "1");
      window.localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  if (!testLocalStorage()) {
    backend = "memory";
    console.warn(
      "[MERCI] localStorage no disponible en este contexto (modo privado o " +
      "sandbox de previsualización). Usando almacenamiento en memoria: los " +
      "datos no persistirán entre recargas. Al abrir el archivo en un " +
      "navegador normal, localStorage funciona con normalidad."
    );
  }

  function get(key) {
    if (backend === "memory") return memory[key] ?? null;
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  }

  function set(key, value) {
    if (backend === "memory") { memory[key] = value; return; }
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error("[MERCI] Error guardando '" + key + "':", e);
    }
  }

  /** Carga inicial: si no hay datos guardados, siembra desde MERCI_SEED. */
  function init() {
    KEYS.forEach(key => {
      if (get(key) === null) set(key, MERCI_SEED[key]);
    });
  }

  function all() {
    const out = {};
    KEYS.forEach(key => { out[key] = get(key) || []; });
    return out;
  }

  function reset() {
    KEYS.forEach(key => set(key, MERCI_SEED[key]));
  }

  function wipe() {
    KEYS.forEach(key => set(key, []));
  }

  return { get, set, init, all, reset, wipe, KEYS, get backend() { return backend; } };
})();
