(function () {
  const DATA = window.NEOSALUD_DATA;
  const ENG = window.NEOSALUD_ENGINE;
  const SCHEMA = window.NEOSALUD_SCHEMA;
  const TL = window.NEOSALUD_TIMELINES;
  const STORAGE_KEY = "neosalud.maqueta.v1";

  let state = loadState();
  let ui = {
    route: "unidad", // unidad | ingreso | hosp | epicrisis | importar | estadisticas | exportacion | configuracion
    unitSearch: "",
    selectedPatientId: state.patients[0]?.id || null,
    heTab: "resumen",         // pestaña de «Hospitalización y epicrisis»
    heFilter: "activos",      // activos | egresados | todos
    heSearch: "",
    adminTab: "usuarios",
    ingresoSearch: "",
    patientFilters: { text: "", status: "all", sector: "all", gaGroup: "all" },
    ingresoVarFilter: "",
    collapsedSections: {},
    dxSearch: "",
    statsFilters: { sector: "all", gaGroup: "all", weightGroup: "all" },
    importStep: 1,
    activeBatch: null,
    exportPreviewSheet: "metadatos",
    importMode: "planilla",
    docImport: null,
    draftLoading: null,
    importLoading: null,
    exportLoading: null
  };

  function runImportLoader(fileName, onComplete) {
    ui.importStep = 2;
    ui.importLoading = {
      title: `Analizando ${fileName}`,
      stepText: "Leyendo columnas y validando formato de planilla...",
      pct: 28
    };
    render();
    setTimeout(() => {
      if (!ui.importLoading) return;
      ui.importLoading = {
        title: `Analizando ${fileName}`,
        stepText: "Verificando barrera de 3 identificadores (HC, sexo y fecha de nacimiento)...",
        pct: 68
      };
      render();
    }, 380);
    setTimeout(() => {
      if (!ui.importLoading) return;
      ui.importLoading = {
        title: `Analizando ${fileName}`,
        stepText: "Preparando bandeja de revisión humana...",
        pct: 96
      };
      render();
    }, 760);
    setTimeout(() => {
      ui.importLoading = null;
      onComplete();
    }, 1050);
  }

  function loadState() {
    let st = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === DATA.STATE_VERSION && Array.isArray(parsed.patients)) st = parsed;
      }
    } catch (e) { /* fallback to seed */ }
    return prepareState(st || DATA.createSeedState());
  }

  // Lleva los registros viejos al formato v2 y completa respuestas y controles de la demo.
  function prepareState(st) {
    if (!st.roles) {
      st.roles = DATA.ROLES.map((r) => ({ id: r.id, label: r.roleLabel, permissions: Object.assign({}, r.permissions) }))
        .concat(DATA.EXTRA_ROLES.map((r) => ({ id: r.id, label: r.label, permissions: Object.assign({}, r.permissions) })));
    }
    if (!st.users) {
      st.users = DATA.ROLES.map((r) => ({ id: `u-${r.id}`, name: r.name, matricula: r.matricula, initials: r.initials, roleId: r.id, active: true }))
        .concat(DATA.EXTRA_USERS.map((u) => Object.assign({}, u)));
      st.activeUserId = `u-${st.activeRoleId || "planta"}`;
    }
    st.roles.forEach((r) => { if (DATA.ROLE_LABELS[r.id]) r.label = DATA.ROLE_LABELS[r.id]; });
    st.roles.sort((a, b) => DATA.ROLE_ORDER.indexOf(a.id) - DATA.ROLE_ORDER.indexOf(b.id));
    st.patients.forEach((p) => {
      p.hosp = p.hosp || {};
      TL.upgradeRecords(p);
      TL.seedSeries(p);
      fillDerivedAnswers(p);
    });
    return st;
  }

  // Las preguntas de la v2 (relevadas de la referencia) se completan a partir de lo que cada
  // paciente ya tiene cargado. Solo se escribe donde todavía no hay respuesta.
  function fillDerivedAnswers(p) {
    const h = p.hosp || (p.hosp = {});
    const d = p.discharge || (p.discharge = {});
    const set = (obj, key, val) => { if (obj[key] === undefined) obj[key] = val; };
    const yn = (cond) => (cond ? "Sí" : "No");
    const ga = Number(p.gaWeeks);
    const bw = Number(p.birthWeight);
    const alive = d.condition && d.condition !== "Fallecido";
    const caths = (h.catheters || []).map((c) => c.type);

    set(h, "surfactant", h.surfactantDoses ? "Sí" : h.sdr ? "No" : "");
    set(h, "iaas", yn((h.iaasEpisodes || []).length));
    set(h, "npt", (h.nutrEvents || []).length ? yn(h.nutrEvents.some((e) => e.route === "Parenteral")) : "");
    set(h, "transfusionNeeded", yn((h.transfusions || []).length));
    set(h, "surgeryDuring", yn((h.surgeries || []).length));
    set(h, "phototherapy", ga ? yn(ga < 35) : "");
    set(h, "hypoglycemia", bw ? yn(bw < 1800) : "");
    set(h, "thrombocytopenia", yn((h.transfusions || []).some((t) => /plaqueta/i.test(t.component))));
    set(h, "coombs", "Negativo");
    if (ga < 32 || bw < 1500) set(h, "ropScreening", (h.ropExams || []).length ? "Sí" : "");
    h.access = h.access || {};
    [["cvu", "CVU"], ["cau", "CAU"], ["picc", "PICC"], ["cvc", "CVC"]].forEach(([k, t]) => set(h.access, k, yn(caths.includes(t))));
    h.neuro = h.neuro || {};
    const n = h.neuro;
    if (n.usDone === undefined && n.cranialUs) {
      n.usDone = n.cranialUs === "No realizada" ? "No" : "Sí";
      n.cranialUs = n.cranialUs === "No realizada" ? "" : n.cranialUs === "Normal" ? "Sin hallazgos" : n.cranialUs;
    }
    if (n.mriDone === undefined && n.mri) {
      n.mriDone = n.mri === "No realizada" ? "No" : "Sí";
      n.mri = n.mri === "No realizada" ? "" : n.mri === "Normal" ? "Sin hallazgos" : n.mri;
    }
    if (h.cardio && h.cardio.dapInvasive === "Cierre percutáneo") h.cardio.dapInvasive = "Cierre percutáneo (cateterismo)";
    // DBP a las 36 semanas: se evalúa si llegó internado a esa edad corregida.
    if (ga && ga < 36 && h.dbpEval36 === undefined) {
      const pma = ga + ENG.getPatientStayDays(p) / 7;
      h.dbpEval36 = pma >= 36 ? "Sí" : isActive(p) ? "" : "No evaluable";
    }
    if (alive) {
      set(d, "healthStatus", d.homeO2 === "Sí" || ga < 32 ? "Con patología en seguimiento" : "Sano");
      set(d, "requiresMeds", yn(d.medications));
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore quota */ }
  }

  // Perfil activo = usuario de la sesión + permisos de su rol (los administra la jefatura).
  // Conserva la forma de antes (id del rol, name, roleLabel, initials, matricula, permissions).
  function activeUser() {
    return state.users.find((u) => u.id === state.activeUserId && u.active) || state.users.find((u) => u.active) || state.users[0];
  }

  function roleOf(roleId) {
    return state.roles.find((r) => r.id === roleId) || state.roles[0];
  }

  function activeRole() {
    const u = activeUser();
    const role = roleOf(u.roleId);
    return { id: role.id, userId: u.id, name: u.name, matricula: u.matricula, initials: u.initials, roleLabel: role.label, permissions: role.permissions };
  }

  // Sesión simulada: vive en la pestaña del navegador; al abrir la maqueta se elige un perfil.
  const SESSION_KEY = "neosalud.maqueta.session";
  function hasSession() {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) { return true; }
  }
  function setSession(on) {
    try { if (on) sessionStorage.setItem(SESSION_KEY, "1"); else sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* sin almacenamiento: se trabaja igual */ }
  }

  function activePatient() {
    return state.patients.find((p) => p.id === ui.selectedPatientId) || state.patients[0] || null;
  }

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function nowStamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function logAudit(action, target, detail) {
    const r = activeRole();
    state.auditLog.unshift({
      ts: nowStamp(),
      user: r.name,
      role: r.roleLabel,
      action,
      target,
      detail
    });
    if (state.auditLog.length > 80) state.auditLog.length = 80;
    saveState();
  }

  function toast(msg) {
    const region = document.getElementById("toast-region");
    while (region.children.length >= 2) {
      region.firstElementChild.remove();
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    region.appendChild(el);
    setTimeout(() => { el.remove(); }, 3400);
  }

  function statusBadge(status) {
    const map = {
      ingreso_incompleto: ["Ingreso incompleto", "status-incomp"],
      hospitalizado: ["Hospitalizado", "status-hosp"],
      en_alta: ["En alta", "status-alta"],
      egresado: ["Egresado", "status-egr"],
      fallecido: ["Fallecido", "status-fall"]
    };
    const [label, cls] = map[status] || [status, "status-na"];
    return `<span class="status-pill ${cls}">${esc(label)}</span>`;
  }

  function iconSvg(name) {
    const paths = {
      home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v4H9z"/><path d="M9 11h6M9 15h4"/>',
      activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
      file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
      upload: '<path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
      chart: '<path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>',
      download: '<path d="M12 4v12m0 0-4-4m4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
    };
    return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
  }

  function isPatientRoute(r) {
    return r === "ingreso";
  }

  function navigate(route, patientId) {
    if (patientId) ui.selectedPatientId = patientId;
    // Internación y egreso viven en la sección «Hospitalización y epicrisis».
    if (route === "hosp" || route === "epicrisis") {
      ui.heTab = route === "epicrisis" ? "epicrisis" : "resumen";
      const p = activePatient();
      if (p && !isActive(p) && ui.heFilter === "activos") ui.heFilter = "todos";
      route = "he";
    }
    ui.route = route === "inicio" || route === "pacientes" ? "unidad" : route;
    closeDrawer();
    render();
    document.getElementById("main").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function openDrawer() {
    document.getElementById("rail").classList.add("open");
    document.getElementById("drawer-scrim").hidden = false;
  }

  function closeDrawer() {
    document.getElementById("rail").classList.remove("open");
    document.getElementById("drawer-scrim").hidden = true;
  }

  function openModal(title, bodyHtml, footHtml) {
    document.getElementById("modal-title").textContent = title;
    const bodyEl = document.getElementById("modal-body");
    bodyEl.innerHTML = bodyHtml;
    bodyEl.scrollTop = 0;
    document.getElementById("modal-foot").innerHTML = footHtml || '<button class="btn btn-secondary" type="button" data-close-modal>Cerrar</button>';
    document.getElementById("modal-backdrop").hidden = false;
  }

  function closeModal() {
    document.getElementById("modal-backdrop").hidden = true;
  }

  function renderNav() {
    const activeCount = state.patients.filter((p) => p.status === "hospitalizado" || p.status === "ingreso_incompleto").length;
    const pendingImport = ui.activeBatch ? ui.activeBatch.rows.filter((r) => r.decision === "pending").length : 0;
    const unsignedAdm = state.patients.filter((p) => p.status === "ingreso_incompleto" || (isActive(p) && !p.admissionDraft.validated)).length;
    const r = activeRole();
    // Accesos por tarea (docs/08 §2). Administración solo para quien administra usuarios.
    const items = [
      { id: "unidad", label: "Inicio", icon: "home", count: activeCount, hint: "internados" },
      { id: "ingresos", label: "Ingreso", icon: "clipboard", count: unsignedAdm || null, hint: "ingresos sin firmar" },
      { id: "he", label: "Hospitalización y epicrisis", icon: "activity", count: null },
      { id: "importar", label: "Importar datos", icon: "upload", count: pendingImport || null, hint: "filas por revisar" },
      { id: "estadisticas", label: "Estadísticas", icon: "chart", count: null },
      { id: "exportacion", label: "Exportar", icon: "download", count: null },
      { id: "configuracion", label: "Configuración", icon: "settings", count: null },
      r.permissions.admin ? { id: "admin", label: "Administración", icon: "users", count: null } : null
    ].filter(Boolean);
    const current = navSection(ui.route);
    document.getElementById("rail-nav").innerHTML = items.map((it) => `
      <button class="nav-item ${current === it.id ? "active" : ""}" type="button" data-nav="${it.id}" ${current === it.id ? 'aria-current="page"' : ""}>
        <span class="nav-item-main">${iconSvg(it.icon)}<span>${esc(it.label)}</span></span>
        ${it.count !== null ? `<span class="nav-count" title="${it.count} ${esc(it.hint || "")}">${it.count}</span>` : ""}
      </button>
    `).join("");
  }

  // La ficha de ingreso de un paciente pertenece a la sección Ingreso.
  function navSection(route) {
    if (isPatientRoute(route)) return "ingresos";
    return route === "inicio" || route === "pacientes" ? "unidad" : route;
  }

  function renderTopbar() {
    const r = activeRole();
    document.getElementById("role-avatar").textContent = r.initials;
    document.getElementById("role-name").textContent = r.name;
    document.getElementById("role-label").textContent = r.roleLabel;

    const titles = {
      unidad: "Inicio",
      ingresos: "Ingreso",
      he: "Hospitalización y epicrisis",
      importar: "Importar datos",
      estadisticas: "Estadísticas",
      exportacion: "Exportar",
      configuracion: "Configuración",
      admin: "Administración"
    };
    const p = activePatient();
    const crumb = isPatientRoute(ui.route) && p
      ? `<button class="crumb-link" type="button" data-nav="ingresos">Ingreso</button><span aria-hidden="true">/</span><strong>${esc(p.fullName)}</strong>`
      : `<strong>${esc(titles[navSection(ui.route)] || "NeoSalud")}</strong>`;
    document.getElementById("breadcrumb").innerHTML = crumb;
  }

  // Cabecera de la historia: quién es el bebé y en qué paso de la internación estás.
  function renderPatientStrip() {
    const el = document.getElementById("patient-strip");
    const p = isPatientRoute(ui.route) ? activePatient() : null;
    if (!p) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    const canEdit = activeRole().permissions.editClinical;
    const steps = historySteps(p);
    const facts = [
      ENG.num(p.gaWeeks) === null ? "EG sin responder" : `${ENG.fmtGa(p.gaWeeks, p.gaDays)} semanas`,
      ENG.fmtWeight(p.birthWeight, "peso sin responder"),
      dayOfLife(p) === null ? null : `día ${dayOfLife(p)} de vida`,
      isActive(p) ? (p.sector ? sectorName(p.sector) : "sin sector") : null
    ].filter(Boolean);
    el.hidden = false;
    el.innerHTML = `
      <div class="history-head">
        <button class="back-link" type="button" data-nav="unidad">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          Volver a la unidad
        </button>
        <div class="history-id">
          <h1 class="history-name">${esc(p.fullName)}</h1>
          ${statusBadge(p.status)}
          ${canEdit && isActive(p) ? `<button class="btn btn-ghost btn-sm" type="button" data-transfer-patient="${esc(p.id)}">Cambiar de sector</button>` : ""}
        </div>
        <p class="history-facts">${facts.map(esc).join(", ")} <span class="mono history-ids">${esc(p.id)}${p.hc ? `, ${esc(p.hc)}` : ""}</span></p>
        <nav class="hsteps" aria-label="Pasos de la internación">
          ${steps.map((s, i) => `
            <button class="hstep ${ui.route === s.route ? "is-current" : ""} hstep-${s.tone}" type="button" data-nav="${s.route}" ${ui.route === s.route ? 'aria-current="step"' : ""}>
              <span class="hstep-num" aria-hidden="true">${i + 1}</span>
              <span class="hstep-text"><span class="hstep-title">${esc(s.title)}</span><span class="hstep-state">${esc(s.state)}</span></span>
            </button>`).join("")}
        </nav>
      </div>
    `;
  }

  function isActive(p) {
    return p.status === "hospitalizado" || p.status === "ingreso_incompleto";
  }

  function sectorName(id) {
    const s = DATA.SECTORS.find((x) => x.id === id);
    return s ? s.name : id;
  }

  function dayOfLife(p) {
    if (!p.birthDate) return null;
    const end = isActive(p) ? ENG.REF_DATE : (p.dischargeDate || ENG.REF_DATE);
    return Math.max(0, Math.round((Date.parse(end) - Date.parse(p.birthDate)) / 86400000));
  }

  // Estado de cada paso, en palabras: lo que conviene mirar primero.
  function historySteps(p) {
    const adm = p.admissionDraft;
    const epi = p.epicrisisDraft;
    const admState = adm.validated
      ? (ENG.computeDraftDiff(p, "admission").length ? ["Firmado, con cambios posteriores", "action"] : ["Firmado", "ok"])
      : adm.text ? ["Borrador sin firmar", "action"] : ["Sin completar", "action"];
    const stay = ENG.getPatientStayDays(p);
    const hospState = [`${stay} ${stay === 1 ? "día" : "días"}${p.hosp.respCoverage === "completa" ? "" : ", cronología abierta"}`, "neutral"];
    const epiState = epi.validated ? ["Epicrisis firmada", "ok"] : isActive(p) ? ["Al dar el alta", "neutral"] : ["Epicrisis sin firmar", "action"];
    return [
      { route: "ingreso", title: "Ingreso", state: admState[0], tone: admState[1] },
      { route: "hosp", title: "Internación", state: hospState[0], tone: hospState[1] },
      { route: "epicrisis", title: "Egreso", state: epiState[0], tone: epiState[1] }
    ];
  }

  // Paso que se abre al tocar una cuna: el que necesita atención.
  function defaultStepFor(p) {
    if (p.status === "ingreso_incompleto" || !p.admissionDraft.validated) return "ingreso";
    if (isActive(p)) return "hosp";
    return "epicrisis";
  }

  // ===================== UNIDAD (cunas por sector) =====================
  // Lo que hay que resolver por paciente, de más a menos urgente.
  function patientIssues(p) {
    const issues = [];
    if (p.status === "ingreso_incompleto") issues.push({ tone: "action", text: "Ingreso sin firmar", route: "ingreso" });
    else if (p.admissionDraft.validated && ENG.computeDraftDiff(p, "admission").length) issues.push({ tone: "action", text: "Ingreso firmado con cambios posteriores", route: "ingreso" });
    if (isActive(p)) {
      const missing = coreMissingFields(p).length;
      if (missing) issues.push({ tone: "missing", text: missing === 1 ? "Falta 1 dato del ingreso" : `Faltan ${missing} datos del ingreso`, route: "ingreso" });
      if (ENG.num(p.gaWeeks) !== null && ENG.num(p.gaWeeks) < 32 && p.hosp.respCoverage !== "completa") {
        issues.push({ tone: "missing", text: "Cronología respiratoria abierta", route: "hosp" });
      }
    }
    return issues;
  }

  function fold(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  // ===================== FICHA DE INGRESO DECLARATIVA (schema.js) =====================
  function sectionKeywords(sec) {
    return [sec.title, sec.sub, ...sec.fields.map((f) => f.label)].join(" ");
  }

  function optionPairs(f) {
    return (f.options || []).map((o) => (Array.isArray(o) ? o : [o, o]));
  }

  function fieldDisplayValue(f, v) {
    const pair = optionPairs(f).find(([val]) => String(val) === String(v));
    return pair ? pair[1] : String(v);
  }

  function fieldControlHtml(f, p, canEdit, parent) {
    const v = SCHEMA.readField(p, f);
    const id = `fx-${f.key}`;
    const dataAttr = `data-sfield="${f.key}"`;
    const dis = canEdit ? "" : "disabled";
    let control;
    if (f.type === "yesno") {
      // No · Sí como botones (un clic) y el resto de respuestas en un selector aparte.
      const other = SCHEMA.YESNO_OTHER.includes(v);
      const seg = (val) => `<button class="yn-btn${v === val ? " is-on" : ""}" type="button" data-yn="${f.key}" data-yn-val="${val}" aria-pressed="${v === val}" ${dis}>${val}</button>`;
      control = `<div class="yn" role="group" aria-labelledby="${id}-lab">
        ${seg("No")}${seg("Sí")}
        <select class="select yn-other${other ? " is-on" : ""}" id="${id}" ${dataAttr} aria-label="${esc(f.label)}: otra respuesta" ${dis}>
          <option value="${other ? "" : esc(v)}">${other ? "Quitar" : "Otra…"}</option>
          ${SCHEMA.YESNO_OTHER.map((o) => `<option value="${o}" ${o === v ? "selected" : ""}>${o}</option>`).join("")}
        </select>
      </div>`;
    } else if (f.type === "select") {
      const opts = optionPairs(f);
      // Un valor cargado que no está en la lista (dato importado o de otra versión) se muestra igual.
      if (v !== "" && !opts.some(([val]) => String(val) === String(v))) opts.push([v, `${v} (valor cargado)`]);
      control = `<select class="select" id="${id}" ${dataAttr} ${dis}>
        <option value="">Sin responder</option>
        ${opts.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? "selected" : ""}>${esc(lab)}</option>`).join("")}
      </select>`;
    } else {
      const type = ["number", "date", "time"].includes(f.type) ? f.type : "text";
      const attrs = [
        f.min !== undefined ? `min="${f.min}"` : "",
        f.max !== undefined ? `max="${f.max}"` : "",
        f.step ? `step="${f.step}"` : ""
      ].join(" ");
      control = f.type === "textarea"
        ? `<textarea class="textarea" id="${id}" ${dataAttr} rows="3" placeholder="${esc(f.placeholder || "Sin responder")}" ${dis}>${esc(v)}</textarea>`
        : `<input class="input${f.type === "number" ? " num" : ""}${f.mono ? " mono" : ""}" id="${id}" type="${type}" ${dataAttr} value="${esc(v)}" placeholder="${esc(f.placeholder || "Sin responder")}" ${attrs} ${dis} />`;
    }
    const badge = f.core ? "" : ` <span class="badge-confirm" title="Variable propuesta: confirmar con el servicio si se registra">A confirmar</span>`;
    const branch = parent
      ? ` is-branch" title="Se muestra porque «${esc(parent.label)}» es «${esc(fieldDisplayValue(parent, SCHEMA.readField(p, parent)))}»`
      : "";
    const mark = parent ? `<span class="branch-mark" aria-hidden="true">↳</span>` : "";
    const wide = f.type === "textarea" ? " field-wide" : "";
    const help = f.help ? `<span class="field-hint">${esc(f.help)}</span>` : "";
    return `<div class="field${v === "" ? " is-empty" : ""}${wide}${branch}"><label for="${id}" id="${id}-lab">${mark}${esc(f.label)}${badge}</label>${control}${help}</div>`;
  }

  function schemaSectionHtml(sec, p, canEdit, ctx) {
    const visible = sec.fields.filter((f) => SCHEMA.conditionMet(p, f) && (f.onlyWhen !== "kaiser" || ctx.kaiserApplicable));
    const inSection = new Set(sec.fields.map((f) => f.key));
    const opensBranch = (f) => f.showIf && f.showIf.notEq === undefined;
    const childrenOf = (key) => visible.filter((f) => opensBranch(f) && f.showIf.key === key);
    // Los subcampos de una rama se dibujan inmediatamente después de su campo padre,
    // marcados como rama, para que la grilla no deje filas vacías.
    const renderGroup = (list, parent) => list.map((f) => {
      const kids = childrenOf(f.key);
      return fieldControlHtml(f, p, canEdit, parent) + (kids.length ? renderGroup(kids, f) : "");
    }).join("");
    if (!visible.length) return "";
    const roots = visible.filter((f) => !opensBranch(f) || !inSection.has(f.showIf.key));
    const filled = visible.filter((f) => SCHEMA.readField(p, f) !== "").length;
    const toConfirm = visible.filter((f) => !f.core).length;
    const open = ctx.forceOpen || !ui.collapsedSections[sec.id];
    return `
      <details class="panel form-section" data-section="${sec.id}" ${open ? "open" : ""}>
        <summary class="panel-head">
          <div>
            <h2 class="panel-title">${esc(sec.title)}</h2>
            <p class="panel-sub">${esc(sec.sub)}</p>
          </div>
          <div class="section-meta">
            <span class="status-pill ${filled === visible.length ? "status-ok" : filled ? "status-warn" : "status-na"} num">${filled}/${visible.length} completos</span>
            ${toConfirm ? `<span class="badge-confirm">${toConfirm} a confirmar</span>` : ""}
            <svg class="section-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </summary>
        <div class="panel-body">
          <div class="form-grid">${renderGroup(roots)}</div>
          ${ctx.after || ""}
        </div>
      </details>`;
  }

  function fentonStripHtml(fenton) {
    return `
      <div class="derived-strip" style="margin-top:16px" aria-live="polite">
        <div class="derived-item">
          <span class="derived-label">Fenton 2025 · Clasificación</span>
          <span class="derived-val">${esc(fenton.classification)}</span>
        </div>
        <div class="derived-item">
          <span class="derived-label">Peso · Z-score</span>
          <span class="derived-val">${fenton.ready ? fenton.zScore : "—"}</span>
        </div>
        <div class="derived-item">
          <span class="derived-label">Peso · Percentil</span>
          <span class="derived-val">${fenton.ready ? `P ${fenton.percentile}` : "—"}</span>
        </div>
      </div>`;
  }

  // ===================== VIEW 3: INGRESO =====================
  function viewIngreso() {
    const p = activePatient();
    if (!p) return `<div class="empty-state"><strong>Sin paciente seleccionado</strong>Creá o elegí un paciente desde el padrón.</div>`;
    const r = activeRole();
    const canEdit = r.permissions.editClinical;
    const dis = canEdit ? "" : "disabled";
    const a = p.admission;
    const fenton = ENG.calcFenton2025(p.gaWeeks, p.gaDays, p.sex, p.birthWeight);
    const crib = ENG.calcCrib2(p.gaWeeks, p.birthWeight, p.sex, a.tempC, a.baseExcess);
    const kaiser = ENG.calcKaiserFor(p);
    const diffs = ENG.computeDraftDiff(p, "admission");
    const hasPlaceholders = (p.admissionDraft.text || "").includes("_____");
    const admSigned = !!p.admissionDraft.validated;

    // Búsqueda sin distinguir mayúsculas ni tildes («reanimacion» encuentra «Reanimación»).
    const fold = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const vf = fold(ui.ingresoVarFilter.trim());
    const showBlock = (keywords) => !vf || fold(keywords).includes(vf);

    const dxMatches = ui.dxSearch.trim().length > 0
      ? DATA.CIE10_CATALOG.filter((d) =>
          `${d.code} ${d.label}`.toLowerCase().includes(ui.dxSearch.trim().toLowerCase()) &&
          !(a.diagnoses || []).includes(d.code)
        ).slice(0, 8)
      : [];

    return `
      <div class="page-header">
        <div>
          <p class="step-lead">Completá lo que sepas. Lo que quede vacío figura como «Sin responder» en el borrador; algunas preguntas aparecen solas según la respuesta anterior.</p>
        </div>
        <div class="page-actions">
          <input class="input" id="ingreso-var-filter" style="width:270px;max-width:100%" type="search" placeholder="Buscar variable (ej. Chagas, reanimación, DNI)" value="${esc(ui.ingresoVarFilter)}" />
        </div>
      </div>

      ${!canEdit ? `<div class="banner banner-info">Tu perfil actual (${esc(r.roleLabel)}) es de solo consulta. Cambiá de perfil en la esquina superior derecha para editar o firmar.</div>` : ""}

      <div class="legend-row" role="note">
        <span><span class="legend-dot is-core" aria-hidden="true"></span>Variable núcleo</span>
        <span><span class="badge-confirm">A confirmar</span> Variable propuesta: preguntar al servicio si la registra hoy</span>
        <span class="field-hint">Los campos vacíos quedan como «Sin responder». Nada se completa por defecto.</span>
      </div>

      ${SCHEMA.ADMISSION_SECTIONS.filter((sec) => showBlock(sectionKeywords(sec))).map((sec) => schemaSectionHtml(sec, p, canEdit, {
        kaiserApplicable: kaiser.applicable,
        forceOpen: !!vf,
        after: sec.after === "fenton" ? fentonStripHtml(fenton) : sec.after === "calculators" ? `
          <div style="display:grid;gap:12px;margin-top:16px">
            ${crib.applicable ? (crib.ready ? `
              <div class="calc-box ${crib.score >= 12 ? "is-danger" : crib.score >= 8 ? "is-warn" : ""}" aria-live="polite">
                <div class="calc-header">
                  <strong>Score CRIB II (activado automáticamente por ≤ 32 sem o ≤ 1.500 g)</strong>
                  <span class="status-pill ${crib.score >= 12 ? "status-danger" : "status-hosp"} num">Puntaje: ${crib.score} · ${esc(crib.level)}</span>
                </div>
                <div class="field-hint">Calculado con sexo, edad gestacional (${esc(ENG.fmtGa(p.gaWeeks, p.gaDays))} sem), peso (${esc(ENG.fmtWeight(p.birthWeight))}), temperatura de ingreso (${esc(a.tempC)} °C) y exceso de base (${esc(a.baseExcess)}).</div>
              </div>
            ` : `
              <div class="calc-box" aria-live="polite">
                <div class="calc-header">
                  <strong>Score CRIB II (activado automáticamente por ≤ 32 sem o ≤ 1.500 g)</strong>
                  <span class="status-pill status-warn">No calculable</span>
                </div>
                <div class="field-hint">Falta: ${crib.missing.map(esc).join(", ")}. El puntaje no se estima con datos incompletos.</div>
              </div>
            `) : ""}

            ${kaiser.applicable ? (kaiser.ready ? `
              <div class="calc-box ${kaiser.severity === "danger" ? "is-danger" : kaiser.severity === "warn" ? "is-warn" : ""}" aria-live="polite">
                <div class="calc-header">
                  <strong>Calculadora Kaiser 2024 · Sepsis precoz (activada automáticamente en ≥ 35 sem)</strong>
                  <span class="status-pill ${kaiser.severity === "danger" ? "status-danger" : kaiser.severity === "warn" ? "status-warn" : "status-ok"} num">Riesgo basal ${kaiser.riskBirth}/1000 · Posterior ${kaiser.posterior}/1000</span>
                </div>
                <div style="font-size:14px;color:var(--navy);font-weight:500">Recomendación: ${esc(kaiser.recommendation)}</div>
                <div class="field-hint" style="margin-top:4px">Incidencia local usada: ${String(kaiser.incidence).replace(".", ",")} / 1.000 nacidos vivos (parámetro institucional) <span class="badge-confirm">A confirmar</span></div>
              </div>
            ` : `
              <div class="calc-box" aria-live="polite">
                <div class="calc-header">
                  <strong>Calculadora Kaiser 2024 · Sepsis precoz (activada automáticamente en ≥ 35 sem)</strong>
                  <span class="status-pill status-warn">No calculable</span>
                </div>
                <div class="field-hint">Falta: ${kaiser.missing.map(esc).join(", ")}. No se asume ningún valor por defecto.</div>
              </div>
            `) : ""}
          </div>` : ""
      })).join("")}

      ${showBlock("diagnosticos cie10 catalogo ingreso") ? `
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Diagnósticos de ingreso (catálogo CIE-10 normalizado)</h2>
            <p class="panel-sub">Selección desde catálogo cerrado sin texto libre descontrolado</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="combo-wrap">
            <label for="dx-search-input" class="field-hint" style="display:block;margin-bottom:5px">Buscar por código CIE-10 o descripción (ej. P22, sepsis, ductus, hipoglucemia)</label>
            <input class="input" id="dx-search-input" type="search" placeholder="Escribí para buscar en catálogo CIE-10..." value="${esc(ui.dxSearch)}" ${dis} />
            ${dxMatches.length ? `
              <div class="combo-menu" role="listbox" aria-label="Resultados CIE-10">
                ${dxMatches.map((d) => `
                  <button class="combo-option" type="button" data-add-dx="${esc(d.code)}">
                    <span class="mono" style="font-weight:600;color:var(--teal-dark)">${esc(d.code)}</span>
                    <span>${esc(d.label)}</span>
                  </button>
                `).join("")}
              </div>
            ` : ""}
          </div>
          <div class="tag-list">
            ${(a.diagnoses || []).length ? a.diagnoses.map((code) => `
              <span class="dx-tag">
                <span class="mono" style="font-weight:600">${esc(code)}</span>
                <span>${esc(ENG.lookupDx(code).replace(code + " - ", ""))}</span>
                ${canEdit ? `<button type="button" data-rem-dx="${esc(code)}" aria-label="Quitar ${esc(code)}">×</button>` : ""}
              </span>
            `).join("") : `<span class="field-hint">Sin diagnósticos seleccionados.</span>`}
          </div>
        </div>
      </section>
      ` : ""}

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Generador determinístico de borrador de ingreso y firma médica</h2>
            <p class="panel-sub">Nunca inventa normalidad; conserva ediciones humanas y avisa si cambiás datos estructurados después de generar</p>
          </div>
          <div class="page-actions">
            ${canEdit && !admSigned ? `<button class="btn btn-secondary" type="button" id="btn-gen-adm-draft" ${ui.draftLoading === "admission" ? "disabled" : ""}>${ui.draftLoading === "admission" ? '<span class="spinner" aria-hidden="true"></span>Generando...' : "Generar borrador"}</button>` : ""}
            <button class="btn btn-secondary" type="button" id="btn-preview-adm-pdf" ${ui.draftLoading === "admission" ? "disabled" : ""}>Vista impresión</button>
            ${admSigned
              ? amendButtonHtml("admission", r)
              : `<button class="btn btn-primary" type="button" id="btn-sign-adm" ${!r.permissions.signDraft || ui.draftLoading === "admission" ? "disabled" : ""}>Validar ingreso</button>`}
          </div>
        </div>
        <div class="panel-body">
          ${diffs.length ? `
            <div class="banner banner-warn">
              <div>
                <strong>${admSigned ? "El ingreso firmado no refleja los datos actuales de la ficha." : "Borrador desfasado respecto a los datos de la ficha."}</strong>
                Cambió: ${diffs.map((d) => `${esc(d.label)} (${esc(d.prev)} → ${esc(d.curr)})`).join(" · ")}.
                ${admSigned ? "El documento firmado no se modifica: creá una enmienda para incorporar los cambios." : ""}
              </div>
              ${canEdit && !admSigned ? `<button class="btn btn-secondary btn-sm" type="button" id="btn-regen-adm-draft" ${ui.draftLoading === "admission" ? "disabled" : ""}>Regenerar borrador</button>` : ""}
            </div>
          ` : ""}

          ${!r.permissions.signDraft ? `
            <div class="banner banner-info">Tu rol actual (${esc(r.roleLabel)}) puede cargar datos y borradores, pero la firma/validación de ingreso está reservada a Medicina / Jefatura.</div>
          ` : ""}

          ${admSigned ? `
            <div class="banner banner-ok"><div>Ingreso validado por <strong>${esc(p.admissionDraft.validatedBy)}</strong> el <span class="mono">${esc(ENG.fmtDate(p.admissionDraft.validatedAt))}</span>. Documento de solo lectura.</div></div>
          ` : ""}

          ${draftVersionsHtml("admission", p.admissionDraft)}

          ${hasPlaceholders && !admSigned ? `
            <div class="banner banner-warn"><div>Quedan campos pendientes (<span class="mono">_____</span>) en el examen físico. Completalos antes de validar el ingreso.</div></div>
          ` : ""}

          <div class="draft-sheet">
            <div class="draft-sheet-head">
              <strong>Documento de ingreso · ${esc(p.fullName)} (${esc(p.id)})</strong>
              <span>${ui.draftLoading === "admission" ? "Consolidando datos..." : p.admissionDraft.validated ? "Firmado" : "Borrador editable"}</span>
            </div>
            ${ui.draftLoading === "admission" ? `
              <div class="skeleton-wrap" aria-live="polite">
                <div style="display:flex;align-items:center;gap:10px;color:var(--teal-dark);font-size:14px;font-weight:600;margin-bottom:6px">
                  <span class="spinner" aria-hidden="true"></span>
                  Consolidando antecedentes perinatales, Fenton 2025, calculadoras y diagnósticos CIE-10...
                </div>
                <div class="skeleton-line" style="width:55%"></div>
                <div class="skeleton-line" style="width:92%"></div>
                <div class="skeleton-line" style="width:84%"></div>
                <div class="skeleton-line" style="width:76%"></div>
                <div class="skeleton-line" style="width:88%"></div>
                <div class="skeleton-line" style="width:62%"></div>
              </div>
            ` : `
              <textarea class="draft-textarea" id="adm-draft-text" placeholder="Hacé clic en «Generar borrador» para construir el ingreso a partir de los datos estructurados..." ${dis} ${admSigned ? 'readonly aria-readonly="true"' : ""}>${esc(p.admissionDraft.text || "")}</textarea>
            `}
            <div class="draft-sheet-foot">
              <span>${admSigned ? "Documento firmado: cualquier cambio requiere una enmienda con motivo." : "El texto editado se conserva automáticamente."}</span>
              <span>Validación humana obligatoria (sin IA).</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ===================== CRONOLOGÍAS Y TABLAS SERIADAS (timelines.js) =====================
  // Un solo componente para las 7 cronologías: tabla legible + editor con alta, edición y baja.
  function stripHtml(items) {
    return `<div class="derived-strip">${items.map(([l, v]) => `<div class="derived-item"><span class="derived-label">${esc(l)}</span><span class="derived-val">${esc(v)}</span></div>`).join("")}</div>`;
  }

  function timelineDerivedHtml(kind, p) {
    if (kind === "resp") {
      const r = ENG.deriveRespiratory(p);
      return stripHtml([
        [isActive(p) ? "Soporte actual" : "Soporte al egreso", respCurrent(p) || "Sin registro"],
        ["Oxígeno", `${r.totals.o2} d`], ["CPAP", `${r.totals.cpap} d`], ["VNI", `${r.totals.vni} d`],
        ["VMC", `${r.totals.vmc} d`], ["VAFO", `${r.totals.vafo} d`], ["Cánula bajo / alto flujo", `${r.totals.cn} / ${r.totals.cnaf} d`],
        ["FiO₂ máx. 24 h", r.maxFio224 ? `${r.maxFio224}%` : "Sin dato"], ["O₂ al día 28", r.o2Day28], ["O₂ a las 36 sem", r.o2At36w],
        ["DBP Jensen (calculada)", r.jensen], ["DBP Bancalari (calculada)", r.bancalari]
      ]);
    }
    if (kind === "nutr") {
      const n = ENG.deriveNutrition(p);
      return stripHtml([
        ["Días de parenteral", `${n.nptDays} d`], ["Inicio enteral", n.enteralStartDay !== null ? `día ${n.enteralStartDay}` : "Sin dato"],
        ["Inició con leche materna", n.startedHumanMilk === null ? "Sin dato" : n.startedHumanMilk ? "Sí" : "No"],
        ["100 cc/kg/día", n.day100cc !== null ? `día ${n.day100cc}` : "Aún no"], ["Fortificación", n.fortificationDay !== null ? `día ${n.fortificationDay}` : "No"]
      ]);
    }
    if (kind === "cath") {
      const c = ENG.deriveCatheters(p);
      return stripHtml([["Días-catéter", `${c.totalDays} d`], ["CVU", `${c.byType.CVU} d`], ["CAU", `${c.byType.CAU} d`], ["PICC", `${c.byType.PICC} d`], ["CVC", `${c.byType.CVC} d`]]);
    }
    if (kind === "rop") return stripHtml([["Peor resultado", ENG.deriveRopWorst(p).summary]]);
    if (kind === "iaas") {
      const eps = p.hosp.iaasEpisodes || [];
      return stripHtml([["Episodios", String(eps.length)], ["Sepsis tardía", eps.some((e) => e.syndrome === "Sepsis") ? "Sí" : "No"],
        ["Asociadas a catéter", String(eps.filter((e) => e.catheterRelated === "Sí").length)]]);
    }
    if (kind === "tx") return stripHtml([["Transfusiones", String((p.hosp.transfusions || []).length)]]);
    if (kind === "surg") return stripHtml([["Cirugías", String((p.hosp.surgeries || []).length)]]);
    return "";
  }

  function tlSortKey(r) {
    const d = r.day !== undefined ? r.day : r.insertDay;
    return (d === "" || d === undefined ? 1e9 : Number(d)) + (r.time ? Number(r.time.replace(":", "")) / 1e5 : 0);
  }

  function timelineHtml(kind, p) {
    const cfg = TL.TIMELINES[kind];
    const canEdit = activeRole().permissions.editClinical;
    const list = [...(p.hosp[cfg.list] || [])].sort((a, b) => tlSortKey(a) - tlSortKey(b));
    const issues = cfg.issues ? cfg.issues(p.hosp[cfg.list] || [], p) : [];
    const withIssue = new Set(issues.map((i) => i[0]));
    const complete = cfg.coverage && p.hosp[cfg.coverage] === "completa";
    const cov = cfg.coverage ? `
      <div class="coverage-toggle" role="group" aria-label="Cobertura de la cronología">
        <button class="coverage-btn ${!complete ? "active-incomp" : ""}" type="button" data-set-cov="${cfg.coverage}" data-cov-val="incompleta" ${canEdit ? "" : "disabled"}>Incompleta</button>
        <button class="coverage-btn ${complete ? "active-comp" : ""}" type="button" data-set-cov="${cfg.coverage}" data-cov-val="completa" ${canEdit ? "" : "disabled"}>Completa al corte</button>
      </div>` : "";
    return `
      <section class="panel tl-panel" id="tl-${kind}">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${esc(cfg.title)} <span class="tl-count num">${list.length}</span></h2>
            <p class="panel-sub">${esc(cfg.sub)}</p>
          </div>
          <div class="page-actions">
            ${cov}
            ${canEdit ? `<button class="btn btn-primary btn-sm" type="button" data-tl-add="${kind}">${esc(cfg.addLabel)}</button>` : ""}
          </div>
        </div>
        <div class="panel-body">
          ${cfg.coverage && !complete ? `<div class="banner banner-warn"><div>Cronología <strong>incompleta</strong>: no se deduce un «No» que podría ser falso y cuenta como deuda de registro en Estadísticas hasta que confirmes el corte.</div></div>` : ""}
          ${issues.length ? `
            <div class="banner banner-danger tl-issues" role="alert">
              <div><strong>${complete ? "La cronología está marcada completa pero tiene problemas:" : "Revisá estos registros:"}</strong>
                <ul>${issues.map(([id, text]) => `<li>${esc(text)} ${canEdit ? `<button class="link-btn" type="button" data-tl-edit="${kind}" data-tl-id="${esc(id)}">Ir al ${esc(cfg.item)}</button>` : ""}</li>`).join("")}</ul>
              </div>
            </div>` : ""}
          ${timelineDerivedHtml(kind, p)}
          ${list.length ? `
            <div class="table-wrap">
              <table class="clinical-table tl-table">
                <thead><tr>${cfg.columns.map(([h]) => `<th>${esc(h)}</th>`).join("")}<th><span class="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  ${list.map((r) => `
                    <tr class="${withIssue.has(r.id) ? "has-issue" : ""}">
                      ${cfg.columns.map(([, fn], i) => `<td${i === 0 ? ' class="mono"' : ""}>${esc(fn(r, p))}</td>`).join("")}
                      <td class="tl-actions">${canEdit ? `<button class="btn btn-ghost btn-sm" type="button" data-tl-edit="${kind}" data-tl-id="${esc(r.id)}">Editar</button>` : ""}</td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>` : `<div class="empty-state"><strong>Sin registros</strong>${canEdit ? `Usá «${esc(cfg.addLabel)}» para cargar el primero.` : ""}</div>`}
        </div>
      </section>`;
  }

  // ---- Editor de un registro (modal). El borrador vive en ui.tlEdit hasta guardar. ----
  function optionTriples(opts) {
    return (opts || []).map((o) => (Array.isArray(o) ? [o[0], o[1], o[2] || ""] : [o, o, ""]));
  }

  function tlFieldHtml(f, rec) {
    const v = rec[f.key] === undefined || rec[f.key] === null ? "" : rec[f.key];
    const id = `tlf-${f.key}`;
    let control;
    if (f.type === "tiles") {
      control = `<div class="tiles" role="radiogroup" aria-labelledby="${id}-lab">${optionTriples(f.options).map(([val, code, label]) => `
        <button class="tile${String(v) === String(val) ? " is-on" : ""}" type="button" role="radio" aria-checked="${String(v) === String(val)}" data-tlf-tile="${f.key}" data-val="${esc(val)}">
          <strong>${esc(code)}</strong><span>${esc(label)}</span>
        </button>`).join("")}</div>`;
    } else if (f.type === "select") {
      const opts = optionTriples(f.options);
      if (v !== "" && !opts.some(([val]) => String(val) === String(v))) opts.push([v, `${v} (valor cargado)`, ""]);
      control = `<select class="select" id="${id}" data-tlf="${f.key}"><option value="">Sin consignar</option>${opts.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? "selected" : ""}>${esc(lab)}</option>`).join("")}</select>`;
    } else {
      const type = ["number", "date", "time"].includes(f.type) ? f.type : "text";
      const attrs = [f.min !== undefined ? `min="${f.min}"` : "", f.max !== undefined ? `max="${f.max}"` : "", f.step ? `step="${f.step}"` : ""].join(" ");
      control = `<input class="input${f.type === "number" ? " num" : ""}" id="${id}" type="${type}" data-tlf="${f.key}" value="${esc(v)}" ${attrs} />`;
    }
    return `<div class="field${f.wide || f.type === "tiles" ? " field-wide" : ""}"><label for="${id}" id="${id}-lab">${esc(f.label)}${f.required ? ' <span class="req" aria-label="obligatorio">*</span>' : ""}</label>${control}</div>`;
  }

  function openTimelineEditor(kind, id) {
    const p = activePatient();
    const cfg = TL.TIMELINES[kind];
    const existing = id ? (p.hosp[cfg.list] || []).find((r) => r.id === id) : null;
    const today = p.dischargeDate && p.dischargeDate < ENG.REF_DATE ? p.dischargeDate : ENG.REF_DATE;
    const fresh = kind === "resp" ? { date: today, precision: "Solo fecha", event: (p.hosp.respEvents || []).length ? "" : "Inicio de soporte" }
      : kind === "cath" ? { insertDate: today } : { date: today };
    ui.tlEdit = { kind, id: existing ? id : null, rec: existing ? JSON.parse(JSON.stringify(existing)) : fresh, confirmDelete: false, error: "" };
    renderTimelineEditor();
  }

  function renderTimelineEditor(focusId) {
    const { kind, id, rec, confirmDelete, error } = ui.tlEdit;
    const cfg = TL.TIMELINES[kind];
    const fields = cfg.fields.filter((f) => !f.showIf || f.showIf(rec));
    openModal(
      `${id ? "Editar" : "Agregar"} ${cfg.item} · ${cfg.title.split(" · ")[0].toLowerCase()}`,
      `${error ? `<div class="banner banner-danger" role="alert"><div>${esc(error)}</div></div>` : ""}
       <div class="form-grid tl-form">${fields.map((f) => tlFieldHtml(f, rec)).join("")}</div>`,
      `${id ? `<button class="btn ${confirmDelete ? "btn-danger" : "btn-ghost"} tl-delete" type="button" id="tl-delete">${confirmDelete ? "Confirmar eliminación" : "Eliminar"}</button>` : ""}
       <button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
       <button class="btn btn-primary" type="button" id="tl-save">Guardar</button>`
    );
    const el = focusId && document.getElementById(focusId);
    if (el) el.focus();
  }

  function saveTimelineRecord() {
    const p = activePatient();
    const { kind, id, rec } = ui.tlEdit;
    const cfg = TL.TIMELINES[kind];
    const visible = cfg.fields.filter((f) => !f.showIf || f.showIf(rec));
    const missing = visible.filter((f) => f.required && (rec[f.key] === "" || rec[f.key] === undefined));
    if (missing.length) {
      ui.tlEdit.error = `Falta completar: ${missing.map((f) => f.label).join(", ")}.`;
      renderTimelineEditor(`tlf-${missing[0].key}`);
      return;
    }
    // Lo que quedó oculto por una respuesta no se guarda (cero datos huérfanos).
    cfg.fields.filter((f) => f.showIf && !f.showIf(rec)).forEach((f) => { rec[f.key] = ""; });
    cfg.normalize(rec, p);
    const arr = p.hosp[cfg.list] || (p.hosp[cfg.list] = []);
    if (id) arr[arr.findIndex((r) => r.id === id)] = rec;
    else { rec.id = `${kind}-${Date.now()}`; arr.push(rec); }
    saveState();
    logAudit(`${id ? "Edición" : "Alta"} en ${cfg.title}`, `${p.id} (${p.fullName})`, `${cfg.item} del día ${rec.day !== undefined ? rec.day : rec.insertDay}`);
    ui.tlEdit = null;
    closeModal();
    toast(`${cfg.item.charAt(0).toUpperCase() + cfg.item.slice(1)} guardado; totales recalculados.`);
    render();
  }

  function deleteTimelineRecord() {
    if (!ui.tlEdit.confirmDelete) { ui.tlEdit.confirmDelete = true; renderTimelineEditor("tl-delete"); return; }
    const p = activePatient();
    const { kind, id } = ui.tlEdit;
    const cfg = TL.TIMELINES[kind];
    const rec = (p.hosp[cfg.list] || []).find((r) => r.id === id);
    p.hosp[cfg.list] = (p.hosp[cfg.list] || []).filter((r) => r.id !== id);
    saveState();
    logAudit(`Baja en ${cfg.title}`, `${p.id} (${p.fullName})`, `${cfg.item} del día ${rec ? (rec.day !== undefined ? rec.day : rec.insertDay) : "?"} eliminado`);
    ui.tlEdit = null;
    closeModal();
    toast(`${cfg.item.charAt(0).toUpperCase() + cfg.item.slice(1)} eliminado.`);
    render();
  }

  // ---- Tablas de controles seriados (evaluación nutricional y exámenes quincenales) ----
  function seriesHtml(which, p) {
    const cfg = which === "growth" ? TL.GROWTH : TL.LABS;
    const canEdit = activeRole().permissions.editClinical;
    const data = p.hosp[cfg.store] || {};
    const stay = ENG.getPatientStayDays(p);
    const rows = cfg.rows.map((r) => Object.assign({}, r, { t: r.target(p) })).filter((r) => r.t !== null);
    const vel = which === "growth" ? TL.growthVelocities(p) : {};
    const dis = canEdit ? "" : "disabled";
    const outOfWindow = [];
    const body = rows.map((r) => {
      const c = data[r.id] || {};
      const future = r.t > stay && !c.date;
      let warn = "";
      if (cfg.window && c.date) {
        const delta = TL.dayOf(p, c.date) - r.t;
        if (Math.abs(delta) > cfg.window) {
          warn = `Tomado el día ${TL.dayOf(p, c.date)}: fuera de la ventana ± ${cfg.window} días`;
          outOfWindow.push(r.label);
        }
      }
      const v = vel[r.id] || {};
      const cell = (key) => `<td><input class="input input-cell num" type="number" step="any" aria-label="${esc(r.label)} · ${esc(cfg.inputs.find((i) => i[0] === key)[1])}" data-series="${which}" data-row="${r.id}" data-key="${key}" value="${esc(c[key] ?? "")}" ${dis} /></td>`;
      return `
        <tr class="${future ? "is-future" : ""}${warn ? " has-issue" : ""}">
          <th scope="row"><span>${esc(r.label)}</span><span class="field-hint">esperado ${esc(ENG.fmtDate(TL.isoOf(p, r.t)))}</span></th>
          <td><input class="input input-cell" type="date" aria-label="${esc(r.label)} · fecha" data-series="${which}" data-row="${r.id}" data-key="date" value="${esc(c.date || "")}" ${dis} />${warn ? `<span class="cell-warn">${esc(warn)}</span>` : ""}</td>
          ${cfg.inputs.map(([key]) => cell(key)).join("")}
          ${which === "growth" ? `<td class="num calc">${v.gkgd ?? "—"}</td><td class="num calc">${v.gweek ?? "—"}</td><td class="num calc">${v.lweek ?? "—"}</td><td class="num calc">${v.hcweek ?? "—"}</td>` : ""}
        </tr>`;
    }).join("");
    const head = `<tr><th>Control</th><th>Fecha</th>${cfg.inputs.map(([, l, u]) => `<th>${esc(l)}${u ? `<span class="th-unit">${esc(u)}</span>` : ""}</th>`).join("")}${which === "growth" ? `<th class="calc">Ganancia<span class="th-unit">g/kg/día</span></th><th class="calc">Ganancia<span class="th-unit">g/semana</span></th><th class="calc">Talla<span class="th-unit">cm/semana</span></th><th class="calc">CC<span class="th-unit">cm/semana</span></th>` : ""}</tr>`;
    return `
      <section class="panel" id="series-${which}">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${which === "growth" ? "Evaluación nutricional seriada" : "Exámenes quincenales del prematuro"}</h2>
            <p class="panel-sub">${which === "growth"
              ? "Los z-score se copian de la calculadora Fenton; las velocidades (columnas sombreadas) se calculan contra el control anterior o el nacimiento"
              : `Cada control tiene su día esperado con margen de ± ${cfg.window} días; fuera de la ventana el dato vale pero no es comparable`}</p>
          </div>
        </div>
        <div class="panel-body tight">
          ${outOfWindow.length ? `<div class="banner banner-warn"><div>Fuera de la ventana: ${esc(outOfWindow.join(", "))}.</div></div>` : ""}
          <div class="table-wrap series-wrap"><table class="clinical-table series-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>
        </div>
      </section>`;
  }

  // Panel de una pestaña: cronología o tabla seriada.
  function hospPanelHtml(id, p) {
    return id === "growth" || id === "labs" ? seriesHtml(id, p) : timelineHtml(id, p);
  }

  // ===================== HOSPITALIZACIÓN Y EPICRISIS (docs/08 §3) =====================
  // Una pestaña por sistema. «panels» son las cronologías del sistema; «panelWhen» la pregunta
  // que las habilita (como en la referencia: con «Sí» aparece el registro de episodios).
  const HE_TABS = [
    { id: "resumen", label: "Resumen" },
    { id: "respiratorio", label: "Respiratorio", panels: [{ id: "resp", before: true }] },
    { id: "cardio", label: "Cardiovascular" },
    { id: "infeccioso", label: "Infeccioso", panels: [{ id: "iaas", when: "iaas" }] },
    { id: "nutricion", label: "Nutrición y crecimiento", panels: [{ id: "nutr", before: true }, { id: "growth", when: "growthSeries" }] },
    { id: "prematurez", label: "Prematurez", applies: "preterm", panels: [{ id: "labs", when: "biweeklyLabs" }, { id: "rop", when: "ropScreening" }] },
    { id: "neuro", label: "Neurológico" },
    { id: "hemato", label: "Hematología", panels: [{ id: "tx", when: "transfusionNeeded" }] },
    { id: "accesos", label: "Accesos vasculares", panels: [{ id: "cath" }] },
    { id: "procedimientos", label: "Procedimientos", panels: [{ id: "surg", when: "surgeryDuring" }] },
    { id: "epicrisis", label: "Epicrisis y egreso" }
  ];

  // Contexto clínico en que una sección o pestaña existe.
  function appliesTo(p, ctx) {
    if (!ctx) return true;
    const ga = ENG.num(p.gaWeeks);
    const bw = ENG.num(p.birthWeight);
    // DBP: nació antes de las 36 sem y ya llegó (o egresó) a esa edad corregida.
    if (ctx === "lt36") return ga !== null && ga < 36 && (!isActive(p) || ga + ENG.getPatientStayDays(p) / 7 >= 36);
    if (ctx === "preterm") return (ga !== null && ga < 32) || (bw !== null && bw < 1500);
    return true;
  }

  function tabSections(p, tabId) {
    if (tabId === "epicrisis") return SCHEMA.DISCHARGE_SECTIONS;
    return SCHEMA.HOSP_SECTIONS.filter((s) => s.tab === tabId && appliesTo(p, s.applies));
  }

  // Cuántas preguntas visibles quedan sin responder en una pestaña.
  // Solo cuentan las variables núcleo (las «A confirmar» son propuestas) y el egreso de un
  // internado todavía no está pendiente.
  function tabProgress(p, tabId) {
    if (tabId === "epicrisis" && isActive(p)) return { total: 0, missing: 0, later: true };
    const fields = tabSections(p, tabId).flatMap((s) => s.fields).filter((f) => f.core && SCHEMA.conditionMet(p, f));
    const filled = fields.filter((f) => SCHEMA.readField(p, f) !== "").length;
    return { total: fields.length, missing: fields.length - filled };
  }

  function hePatients() {
    const q = fold(ui.heSearch);
    return state.patients
      .filter((p) => ui.heFilter === "todos" || (ui.heFilter === "activos" ? isActive(p) : !isActive(p)))
      .filter((p) => !q || fold(`${p.fullName} ${p.hc || ""} ${p.id}`).includes(q))
      .sort((a, b) => (isActive(b) - isActive(a)) || String(a.fullName).localeCompare(b.fullName));
  }

  function respCurrent(p) {
    const ev = [...(p.hosp.respEvents || [])].sort((a, b) => a.day - b.day);
    return ev.length ? ev[ev.length - 1].modality : null;
  }

  function viewHE() {
    const list = hePatients();
    let p = activePatient();
    if (p && !list.includes(p) && list.length) { p = list[0]; ui.selectedPatientId = p.id; }
    const r = activeRole();
    const counts = {
      activos: state.patients.filter(isActive).length,
      egresados: state.patients.filter((x) => !isActive(x)).length,
      todos: state.patients.length
    };
    const listHtml = `
      <aside class="he-list" aria-label="Pacientes">
        <div class="he-list-head">
          <input class="input" id="he-search" type="search" placeholder="Buscar por nombre o HC" value="${esc(ui.heSearch)}" aria-label="Buscar paciente" />
          <div class="seg" role="group" aria-label="Filtrar pacientes">
            ${[["activos", "Internados"], ["egresados", "Egresados"], ["todos", "Todos"]].map(([id, lab]) => `
              <button class="seg-btn${ui.heFilter === id ? " is-on" : ""}" type="button" data-he-filter="${id}" aria-pressed="${ui.heFilter === id}"><span>${lab}</span><span class="seg-count num">${counts[id]}</span></button>`).join("")}
          </div>
        </div>
        <div class="he-items">
          ${list.length ? list.map((x) => {
            const dol = dayOfLife(x);
            const pend = HE_TABS.filter((t) => t.id !== "resumen" && appliesTo(x, t.applies)).reduce((a, t) => a + tabProgress(x, t.id).missing, 0);
            return `
            <button class="he-item${p && x.id === p.id ? " is-on" : ""}" type="button" data-he-patient="${esc(x.id)}" ${p && x.id === p.id ? 'aria-current="true"' : ""}>
              <span class="he-item-name">${esc(x.fullName)}</span>
              <span class="he-item-meta">${esc(ENG.fmtGa(x.gaWeeks, x.gaDays))} sem · ${esc(ENG.fmtWeight(x.birthWeight, "—"))}${isActive(x) && dol !== null ? ` · día ${dol}` : ""}</span>
              <span class="he-item-foot">${statusBadge(x.status)}${pend ? `<span class="he-pend">${pend} sin responder</span>` : ""}</span>
            </button>`;
          }).join("") : `<p class="empty-state">Ningún paciente coincide.</p>`}
        </div>
        ${r.permissions.createPatient ? `<button class="btn btn-secondary he-new" type="button" id="btn-new-patient">Nuevo ingreso rápido</button>` : ""}
      </aside>`;

    if (!p) return `<div class="he">${listHtml}<section class="he-main"><div class="empty-state"><strong>Elegí un paciente</strong></div></section></div>`;

    const tab = HE_TABS.find((t) => t.id === ui.heTab) || HE_TABS[0];
    const dol = dayOfLife(p);
    const facts = [
      `${ENG.fmtGa(p.gaWeeks, p.gaDays)} semanas`,
      ENG.fmtWeight(p.birthWeight, "peso sin dato"),
      dol === null ? null : isActive(p) ? `día ${dol} de vida` : `${ENG.getPatientStayDays(p)} días internado`,
      isActive(p) && p.sector ? sectorName(p.sector) : null
    ].filter(Boolean);

    const tabsHtml = HE_TABS.map((t) => {
      const na = !appliesTo(p, t.applies);
      const prog = t.id === "resumen" || na ? null : tabProgress(p, t.id);
      const badge = na ? `<span class="tab-na">no aplica</span>`
        : prog && prog.later ? `<span class="tab-na">al alta</span>`
        : prog && prog.missing ? `<span class="tab-pend num" title="${prog.missing} sin responder">${prog.missing}</span>`
        : prog && prog.total ? `<span class="tab-ok" aria-label="completo">✓</span>` : "";
      return `<button class="he-tab${t.id === tab.id ? " is-on" : ""}${na ? " is-na" : ""}" type="button" role="tab" aria-selected="${t.id === tab.id}" data-he-tab="${t.id}">${esc(t.label)}${badge}</button>`;
    }).join("");

    return `
      <div class="he">
        ${listHtml}
        <section class="he-main">
          <header class="he-head">
            <div class="he-head-id">
              <h1 class="he-title">${esc(p.fullName)}</h1>
              ${statusBadge(p.status)}
            </div>
            <p class="he-facts">${facts.map(esc).join(" · ")} <span class="mono">${esc(p.hc || p.id)}</span></p>
            <div class="he-head-actions">
              <button class="btn btn-ghost btn-sm" type="button" data-open-patient="${esc(p.id)}" data-target-route="ingreso">Ficha de ingreso</button>
            </div>
          </header>
          <nav class="he-tabs" role="tablist" aria-label="Sistemas">${tabsHtml}</nav>
          <div class="he-body" role="tabpanel">${heTabHtml(p, tab)}</div>
        </section>
      </div>`;
  }

  function heTabHtml(p, tab) {
    const canEdit = activeRole().permissions.editClinical;
    if (tab.id === "resumen") return heSummaryHtml(p);
    if (tab.id === "epicrisis") return viewEpicrisis();
    if (!appliesTo(p, tab.applies)) {
      return `<div class="empty-state"><strong>No aplica a este paciente</strong>Se registra en menores de 32 semanas o de 1.500 g; nació con ${esc(ENG.fmtGa(p.gaWeeks, p.gaDays))} semanas y ${esc(ENG.fmtWeight(p.birthWeight, "peso sin dato"))}.</div>`;
    }
    const questions = tabSections(p, tab.id).map((sec) => schemaSectionHtml(sec, p, canEdit, {})).join("");
    // Cada registro aparece cuando la pregunta que lo habilita vale «Sí» (como en la referencia).
    const shown = (tab.panels || []).filter((x) => !x.when || p.hosp[x.when] === "Sí");
    const panels = (before) => shown.filter((x) => !!x.before === before).map((x) => hospPanelHtml(x.id, p)).join("");
    return panels(true) + questions + panels(false);
  }

  function heSummaryHtml(p) {
    const resp = ENG.deriveRespiratory(p);
    const nutr = ENG.deriveNutrition(p);
    const cath = ENG.deriveCatheters(p);
    const rop = ENG.deriveRopWorst(p);
    const h = p.hosp;
    const val = (v, alt = "sin responder") => (v === "" || v === undefined || v === null ? alt : v);
    const facts = {
      respiratorio: [`Soporte ${isActive(p) ? "actual" : "al egreso"}: ${val(respCurrent(p), "sin registro")}`, `Oxígeno ${resp.totals.o2} d · VMC ${resp.totals.vmc} d`, `DBP (Jensen): ${resp.jensen}`],
      cardio: [`Ecocardiograma: ${val(h.cardio && h.cardio.echo)}`, `Ductus: ${val(h.cardio && h.cardio.dap)}${h.cardio && h.cardio.dapMed && h.cardio.dapMed !== "No" ? ` · ${h.cardio.dapMed}` : ""}`],
      infeccioso: [`Sepsis precoz: ${val(h.earlySepsis)}`, `IAAS: ${(h.iaasEpisodes || []).length} episodio(s)`],
      nutricion: [`Parenteral: ${nutr.nptDays} d`, `100 cc/kg/día: ${nutr.day100cc !== null ? `día ${nutr.day100cc}` : "aún no"}`, `NEC: ${val(h.nec)}`],
      prematurez: [`ROP: ${rop.summary}`, `Quincenales: ${val(h.biweeklyLabs)}`],
      neuro: [`Ecografía: ${val(h.neuro && h.neuro.cranialUs, h.neuro && h.neuro.usDone === "No" ? "no realizada" : "sin responder")}`, `Apneas: ${val(h.neuro && h.neuro.apnea)}`],
      hemato: [`Transfusiones: ${(h.transfusions || []).length}`, `Fototerapia: ${val(h.phototherapy)}`],
      accesos: [`${cath.count} catéter(es) · ${cath.totalDays} días-catéter`],
      procedimientos: [`Cirugías: ${(h.surgeries || []).length}`],
      epicrisis: [p.epicrisisDraft.validated ? "Epicrisis firmada" : isActive(p) ? "Se completa al dar el alta" : "Epicrisis sin firmar", p.discharge.condition ? `Condición: ${p.discharge.condition}` : null].filter(Boolean)
    };
    const alerts = [];
    if (!resp.complete && ENG.num(p.gaWeeks) !== null) alerts.push(["Cronología respiratoria abierta", "respiratorio"]);
    if (!isActive(p) && !p.epicrisisDraft.validated) alerts.push(["Epicrisis sin firmar", "epicrisis"]);
    return `
      ${alerts.length ? `<div class="he-alerts">${alerts.map(([t, id]) => `<button class="he-alert" type="button" data-he-tab="${id}">${esc(t)} <span aria-hidden="true">→</span></button>`).join("")}</div>` : ""}
      <div class="he-cards">
        ${HE_TABS.filter((t) => t.id !== "resumen").map((t) => {
          const na = !appliesTo(p, t.applies);
          const prog = na ? null : tabProgress(p, t.id);
          const st = na ? ["No aplica", "na"] : prog.later ? ["Al alta", "na"] : prog.missing ? [`${prog.missing} sin responder`, "warn"] : ["Completo", "ok"];
          return `
          <button class="he-card${na ? " is-na" : ""}" type="button" data-he-tab="${t.id}">
            <span class="he-card-head"><strong>${esc(t.label)}</strong><span class="status-pill status-${st[1]}">${esc(st[0])}</span></span>
            ${na ? "" : `<span class="he-card-facts">${(facts[t.id] || []).map((x) => `<span>${esc(x)}</span>`).join("")}</span>`}
          </button>`;
        }).join("")}
      </div>`;
  }

  // ===================== LOGIN SIMULADO =====================
  // Una tarjeta por usuario activo y, debajo, qué puede hacer su rol. En producción se entra
  // con usuario y contraseña; acá alcanza con elegir el perfil.
  function permissionSummary(perms) {
    const can = DATA.PERMISSIONS.filter(([k]) => perms[k]);
    const cannot = DATA.PERMISSIONS.filter(([k]) => !perms[k]);
    return { can, cannot };
  }

  function viewLogin() {
    const users = state.users.filter((u) => u.active);
    const order = state.roles.map((r) => r.id);
    users.sort((a, b) => order.indexOf(a.roleId) - order.indexOf(b.roleId));
    return `
      <div class="login">
        <header class="login-head">
          <span class="brand-mark login-mark" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span>
          <div>
            <h1 class="login-title">NeoSalud · Neonatología</h1>
            <p class="login-sub">${esc(state.institution?.name || "Servicio de Neonatología")} · Entorno de demostración con datos ficticios</p>
          </div>
        </header>
        <p class="login-lead">Elegí con qué perfil querés entrar. Debajo de cada uno figura qué puede hacer; los permisos los administra la jefatura del servicio.</p>
        <div class="login-grid">
          ${users.map((u) => {
            const role = roleOf(u.roleId);
            const { can, cannot } = permissionSummary(role.permissions);
            return `
            <article class="login-card">
              <div class="login-card-id">
                <span class="role-avatar" aria-hidden="true">${esc(u.initials)}</span>
                <div>
                  <h2 class="login-name">${esc(u.name)}</h2>
                  <p class="login-role">${esc(role.label)} <span class="mono">${esc(u.matricula)}</span></p>
                </div>
              </div>
              <p class="login-desc">${esc(DATA.ROLE_INFO[role.id] || "")}</p>
              <ul class="perm-list" aria-label="Permisos de ${esc(role.label)}">
                ${can.map(([, l]) => `<li class="perm-yes"><span aria-hidden="true">✓</span>${esc(l)}</li>`).join("")}
                ${cannot.map(([, l]) => `<li class="perm-no"><span aria-hidden="true">—</span>No: ${esc(l.charAt(0).toLowerCase() + l.slice(1))}</li>`).join("")}
              </ul>
              <button class="btn btn-primary login-btn" type="button" data-login-user="${esc(u.id)}">Ingresar como ${esc(u.name.split(" ").slice(0, 2).join(" "))}</button>
            </article>`;
          }).join("")}
        </div>
      </div>`;
  }

  // ===================== ADMINISTRACIÓN =====================
  function viewAdmin() {
    if (!activeRole().permissions.admin) {
      return `<div class="empty-state"><strong>Sin permiso</strong>La administración de usuarios es de la jefatura del servicio.</div>`;
    }
    const tab = ui.adminTab || "usuarios";
    const tabs = [["usuarios", "Usuarios"], ["roles", "Roles y permisos"], ["auditoria", "Auditoría"]];
    let body = "";
    if (tab === "usuarios") {
      const me = activeUser();
      body = `
        <section class="panel">
          <div class="panel-head">
            <div><h2 class="panel-title">Usuarios del servicio</h2><p class="panel-sub">${state.users.filter((u) => u.active).length} activos de ${state.users.length}</p></div>
            <button class="btn btn-primary btn-sm" type="button" data-user-edit="">Nuevo usuario</button>
          </div>
          <div class="panel-body tight"><div class="table-wrap"><table class="clinical-table">
            <thead><tr><th>Usuario</th><th>Matrícula</th><th>Rol</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody>${state.users.map((u) => `
              <tr class="${u.active ? "" : "is-inactive"}">
                <td><strong>${esc(u.name)}</strong>${u.id === me.id ? ' <span class="status-pill status-hosp">sesión actual</span>' : ""}${u.email ? `<div class="field-hint">${esc(u.email)}</div>` : ""}</td>
                <td class="mono">${esc(u.matricula || "—")}</td>
                <td>${esc(roleOf(u.roleId).label)}</td>
                <td>${u.active ? '<span class="status-pill status-ok">Activo</span>' : '<span class="status-pill status-na">Inactivo</span>'}</td>
                <td class="tl-actions">
                  <button class="btn btn-ghost btn-sm" type="button" data-user-edit="${esc(u.id)}">Editar</button>
                  ${u.id === me.id ? "" : `<button class="btn btn-ghost btn-sm" type="button" data-user-toggle="${esc(u.id)}">${u.active ? "Desactivar" : "Reactivar"}</button>`}
                </td>
              </tr>`).join("")}</tbody>
          </table></div></div>
        </section>`;
    } else if (tab === "roles") {
      body = `
        <section class="panel">
          <div class="panel-head"><div><h2 class="panel-title">Roles y permisos</h2><p class="panel-sub">Cada cambio se aplica de inmediato a todos los usuarios del rol y queda en auditoría</p></div></div>
          <div class="panel-body tight"><div class="table-wrap"><table class="clinical-table perm-table">
            <thead><tr><th>Rol</th>${DATA.PERMISSIONS.map(([, l, d]) => `<th title="${esc(d)}">${esc(l)}</th>`).join("")}</tr></thead>
            <tbody>${state.roles.map((r) => `
              <tr>
                <th scope="row"><strong>${esc(r.label)}</strong><span class="field-hint">${state.users.filter((u) => u.roleId === r.id && u.active).length} usuario(s) activo(s)</span></th>
                ${DATA.PERMISSIONS.map(([k, l]) => {
                  // La jefatura no puede quitarse la administración: dejaría el servicio sin quien administre.
                  const locked = r.id === "jefatura" && k === "admin";
                  return `<td><label class="perm-check"><input type="checkbox" data-perm-role="${esc(r.id)}" data-perm-key="${k}" ${r.permissions[k] ? "checked" : ""} ${locked ? "disabled" : ""} /><span class="sr-only">${esc(r.label)}: ${esc(l)}</span>${locked ? '<span class="field-hint">fijo</span>' : ""}</label></td>`;
                }).join("")}
              </tr>`).join("")}</tbody>
          </table></div></div>
        </section>`;
    } else {
      body = auditHtml();
    }
    return `
      <div class="page-header"><div><h1 class="page-title">Administración</h1><p class="page-desc">Usuarios del servicio, qué puede hacer cada rol y registro de todo lo que se hizo.</p></div></div>
      <div class="seg admin-seg" role="tablist" aria-label="Secciones de administración">
        ${tabs.map(([id, l]) => `<button class="seg-btn${tab === id ? " is-on" : ""}" type="button" role="tab" aria-selected="${tab === id}" data-admin-tab="${id}">${l}</button>`).join("")}
      </div>
      ${body}`;
  }

  function auditHtml() {
    return `
      <section class="panel">
        <div class="panel-head"><div>
          <h2 class="panel-title">Bitácora de auditoría (${state.auditLog.length} registros)</h2>
          <p class="panel-sub">Cada alta, cambio clínico, firma, importación o cambio de permisos queda registrado</p>
        </div></div>
        <div class="panel-body tight"><div class="table-wrap"><table class="clinical-table">
          <thead><tr><th>Fecha y hora</th><th>Usuario y rol</th><th>Acción</th><th>Registro</th><th>Detalle</th></tr></thead>
          <tbody>${state.auditLog.map((a) => `
            <tr>
              <td class="mono" style="white-space:nowrap">${esc(ENG.fmtDate(a.ts))}</td>
              <td><strong>${esc(a.user)}</strong><div class="field-hint">${esc(a.role)}</div></td>
              <td>${esc(a.action)}</td>
              <td class="mono">${esc(a.target)}</td>
              <td>${esc(a.detail)}</td>
            </tr>`).join("")}</tbody>
        </table></div></div>
      </section>`;
  }

  function showUserModal(userId) {
    const u = state.users.find((x) => x.id === userId) || { name: "", matricula: "", email: "", roleId: "planta" };
    openModal(
      userId ? `Editar usuario · ${u.name}` : "Nuevo usuario",
      `<div class="form-grid">
        <div class="field"><label for="us-name">Nombre y apellido <span class="req">*</span></label><input class="input" id="us-name" value="${esc(u.name)}" placeholder="Ej. Dr. Martín López" /></div>
        <div class="field"><label for="us-mat">Matrícula</label><input class="input mono" id="us-mat" value="${esc(u.matricula)}" placeholder="Ej. MN 123.456" /></div>
        <div class="field"><label for="us-mail">Correo institucional</label><input class="input" id="us-mail" type="email" value="${esc(u.email || "")}" placeholder="Opcional" /></div>
        <div class="field"><label for="us-role">Rol <span class="req">*</span></label><select class="select" id="us-role">${state.roles.map((r) => `<option value="${esc(r.id)}" ${r.id === u.roleId ? "selected" : ""}>${esc(r.label)}</option>`).join("")}</select></div>
      </div>
      <p class="field-hint" id="us-role-help">${esc(DATA.ROLE_INFO[u.roleId] || "")}</p>`,
      `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
       <button class="btn btn-primary" type="button" id="us-save" data-user-id="${esc(userId || "")}">${userId ? "Guardar cambios" : "Dar de alta"}</button>`
    );
  }

  function saveUserFromModal(userId) {
    const name = (document.getElementById("us-name").value || "").trim();
    if (!name) { toast("Ingresá el nombre del usuario."); document.getElementById("us-name").focus(); return; }
    const roleId = document.getElementById("us-role").value;
    const data = {
      name,
      matricula: (document.getElementById("us-mat").value || "").trim(),
      email: (document.getElementById("us-mail").value || "").trim(),
      roleId,
      initials: name.replace(/^(Dr\\.?|Dra\\.?|Lic\\.?)\\s+/i, "").split(/\\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
    };
    const me = activeUser();
    if (userId) {
      const u = state.users.find((x) => x.id === userId);
      // Nadie puede quitarse a sí mismo la administración desde acá.
      if (u.id === me.id && !roleOf(roleId).permissions.admin) { toast("No podés quitarte la administración a vos mismo."); return; }
      const before = `${u.name} · ${roleOf(u.roleId).label}`;
      Object.assign(u, data);
      logAudit("Edición de usuario", u.name, `${before} → ${u.name} · ${roleOf(u.roleId).label}`);
    } else {
      const u = Object.assign({ id: `u-${Date.now()}`, active: true }, data);
      state.users.push(u);
      logAudit("Alta de usuario", u.name, `Rol: ${roleOf(u.roleId).label}`);
    }
    saveState();
    closeModal();
    toast(userId ? "Usuario actualizado." : `Usuario dado de alta: ${name}.`);
    render();
  }

  // ===================== INICIO (tablero rápido) =====================
  function viewInicio() {
    const r = activeRole();
    const today = ENG.REF_DATE;
    const active = state.patients.filter(isActive);
    const totalBeds = DATA.SECTORS.reduce((a, s) => a + s.capacity, 0);
    const admittedToday = state.patients.filter((p) => p.admitDate === today);
    const dischargedToday = state.patients.filter((p) => p.dischargeDate === today);
    const unsignedAdm = state.patients.filter((p) => p.status === "ingreso_incompleto" || (isActive(p) && !p.admissionDraft.validated));
    const pendingEpi = state.patients.filter((p) => !isActive(p) && !p.epicrisisDraft.validated);
    const pendingData = active.filter((p) => HE_TABS.some((t) => t.id !== "resumen" && appliesTo(p, t.applies) && tabProgress(p, t.id).missing));
    const openResp = active.filter((p) => ENG.num(p.gaWeeks) !== null && ENG.num(p.gaWeeks) < 32 && p.hosp.respCoverage !== "completa");
    const tlIssues = active.flatMap((p) => Object.entries(TL.TIMELINES).flatMap(([kind, cfg]) =>
      (cfg.issues ? cfg.issues(p.hosp[cfg.list] || [], p) : []).map(([, text]) => ({ p, kind, text }))));
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";
    const kindTab = { resp: "respiratorio", nutr: "nutricion", iaas: "infeccioso", cath: "accesos", tx: "hemato", rop: "prematurez", surg: "procedimientos" };

    const kpi = (label, value, note, attrs, tone) => `
      <button class="kpi${tone ? ` kpi-${tone}` : ""}" type="button" ${attrs}>
        <span class="kpi-label">${esc(label)}</span>
        <span class="kpi-value num">${value}</span>
        <span class="kpi-note">${esc(note)}</span>
      </button>`;

    const todo = [
      ...unsignedAdm.map((p) => ({ p, text: p.status === "ingreso_incompleto" ? "Ingreso incompleto" : "Ingreso sin firmar", attrs: `data-open-patient="${esc(p.id)}" data-target-route="ingreso"`, tone: "action" })),
      ...pendingEpi.map((p) => ({ p, text: "Epicrisis sin firmar", attrs: `data-open-patient="${esc(p.id)}" data-target-route="epicrisis"`, tone: "action" })),
      ...tlIssues.map((i) => ({ p: i.p, text: i.text, attrs: `data-he-goto="${esc(i.p.id)}" data-he-goto-tab="${kindTab[i.kind]}"`, tone: "danger" })),
      ...openResp.map((p) => ({ p, text: "Cronología respiratoria abierta", attrs: `data-he-goto="${esc(p.id)}" data-he-goto-tab="respiratorio"`, tone: "missing" }))
    ];

    const q = fold(ui.unitSearch || "");
    const matches = (p) => !q || fold(`${p.fullName} ${p.id} ${p.hc} ${p.motherName} ${p.motherDni}`).includes(q);
    const cunaHtml = (p) => {
      const issue = patientIssues(p)[0];
      const dol = dayOfLife(p);
      return `
        <button class="cuna ${issue ? `has-${issue.tone}` : ""} ${matches(p) ? "" : "is-dimmed"}" type="button" data-open-patient="${esc(p.id)}" data-target-route="${defaultStepFor(p)}">
          <span class="cuna-name">${esc(p.fullName)}</span>
          <span class="cuna-facts">${esc(ENG.fmtGa(p.gaWeeks, p.gaDays, "EG s/d"))}${ENG.num(p.gaWeeks) === null ? "" : " sem"}${dol === null ? "" : `, día ${dol}`} · ${esc(ENG.fmtWeight(p.birthWeight, "peso s/d"))}</span>
          ${issue ? `<span class="cuna-issue tone-${issue.tone}">${esc(issue.text)}</span>` : `<span class="cuna-issue tone-ok">Al día</span>`}
        </button>`;
    };

    return `
      <div class="page-header">
        <div>
          <p class="dash-date">${esc((() => { const d = new Date(today + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }); return d.charAt(0).toUpperCase() + d.slice(1); })())}</p>
          <h1 class="page-title">${greet}, ${esc(r.name)}</h1>
        </div>
        <div class="page-actions">
          ${r.permissions.createPatient ? `<button class="btn btn-primary" type="button" id="btn-new-patient">Ingreso rápido</button>` : ""}
        </div>
      </div>

      <div class="kpis">
        ${kpi("Internados", active.length, `${totalBeds - active.length} cunas libres de ${totalBeds}`, 'data-scroll-to="mapa"')}
        ${kpi("Ingresos de hoy", admittedToday.length, admittedToday.length ? `Último: ${admittedToday[0].fullName}` : "Sin ingresos todavía", 'data-nav="ingresos"')}
        ${kpi("Egresos de hoy", dischargedToday.length, dischargedToday.length ? "Ver en Hospitalización" : "Sin egresos todavía", 'data-he-filter-go="egresados"')}
        ${kpi("Ingresos sin firmar", unsignedAdm.length, unsignedAdm.length ? "Incompletos o sin validar" : "Todo firmado", 'data-nav="ingresos"', unsignedAdm.length ? "action" : "")}
        ${kpi("Altas pendientes", pendingEpi.length, pendingEpi.length ? "Epicrisis sin firmar" : "Epicrisis al día", 'data-he-filter-go="egresados"', pendingEpi.length ? "action" : "")}
        ${kpi("Con datos por completar", pendingData.length, "Internados con preguntas sin responder", 'data-nav="he"', pendingData.length ? "missing" : "")}
      </div>

      <div class="dash-cols">
        <section class="panel">
          <div class="panel-head"><div><h2 class="panel-title">Para resolver</h2><p class="panel-sub">Firmas pendientes y registros con problemas, de lo más urgente a lo menos</p></div></div>
          <div class="panel-body tight">
            ${todo.length ? `<ul class="todo-list dash-todo">${todo.slice(0, 12).map((t) => `
              <li><button class="todo-item" type="button" ${t.attrs}>
                <span class="todo-mark tone-${t.tone}" aria-hidden="true"></span>
                <span><strong>${esc(t.p.fullName)}</strong><span class="todo-text">${esc(t.text)}</span></span>
              </button></li>`).join("")}</ul>
              ${todo.length > 12 ? `<p class="field-hint dash-more">y ${todo.length - 12} más</p>` : ""}` : `<p class="empty-state">No hay pendientes.</p>`}
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><div><h2 class="panel-title">Actividad reciente</h2><p class="panel-sub">Últimos registros de la bitácora</p></div>
            ${r.permissions.admin ? `<button class="btn btn-ghost btn-sm" type="button" data-admin-go="auditoria">Ver todo</button>` : ""}</div>
          <div class="panel-body tight">
            ${state.auditLog.length ? `<ul class="activity">${state.auditLog.slice(0, 8).map((a) => `
              <li><span class="activity-time mono">${esc(String(a.ts).slice(11, 16) || "")}</span><span><strong>${esc(a.action)}</strong><span class="todo-text">${esc(a.target)} · ${esc(a.user)}</span></span></li>`).join("")}</ul>`
              : `<p class="empty-state">Todavía no hay actividad en esta sesión.</p>`}
          </div>
        </section>
      </div>

      <section class="panel" id="mapa">
        <div class="panel-head">
          <div><h2 class="panel-title">Mapa de cunas</h2><p class="panel-sub">Tocá una cuna para abrir al bebé, o una libre para ingresar a uno nuevo en ese sector</p></div>
          <input class="input unit-search" id="unit-search" type="search" placeholder="Buscar por nombre, HC o DNI de la madre" value="${esc(ui.unitSearch || "")}" aria-label="Buscar paciente" />
        </div>
        <div class="panel-body unit-map">
          ${DATA.SECTORS.map((sec) => {
            const here = active.filter((p) => p.sector === sec.id);
            const free = Math.max(0, sec.capacity - here.length);
            return `
              <section class="sector" aria-labelledby="sec-${esc(sec.id)}">
                <h3 class="sector-title" id="sec-${esc(sec.id)}">${esc(sec.name)} <span class="sector-count">${here.length} de ${sec.capacity}</span></h3>
                <div class="cuna-grid">
                  ${here.map(cunaHtml).join("")}
                  ${Array.from({ length: free }, () => r.permissions.createPatient
                    ? `<button class="cuna cuna-free" type="button" data-new-patient-sector="${esc(sec.id)}">Cuna libre<span>Ingresar aquí</span></button>`
                    : `<div class="cuna cuna-free" aria-label="Cuna libre">Cuna libre</div>`).join("")}
                </div>
              </section>`;
          }).join("")}
          ${active.some((p) => !p.sector) ? `<section class="sector"><h3 class="sector-title">Sin sector asignado</h3><div class="cuna-grid">${active.filter((p) => !p.sector).map(cunaHtml).join("")}</div></section>` : ""}
        </div>
      </section>`;
  }

  // ===================== INGRESO =====================
  // Ingreso rápido en la misma página (los datos mínimos para abrir la cuna) y las fichas
  // completas por terminar o firmar. El mismo formulario rápido se usa desde Inicio y las cunas.
  function quickAdmissionFields(presetSector) {
    return `
      <div class="form-grid">
        <div class="field"><label for="np-name">Nombre o «RN de …» <span class="req">*</span></label><input class="input" id="np-name" placeholder="Ej. RN de Laura Rojas" /></div>
        <div class="field"><label for="np-sex">Sexo</label><select class="select" id="np-sex"><option value="">Sin consignar</option><option value="F">Femenino</option><option value="M">Masculino</option><option value="I">Indeterminado</option></select></div>
        <div class="field"><label for="np-hc">N° de historia clínica</label><input class="input mono" id="np-hc" placeholder="Opcional" /></div>
        <div class="field"><label for="np-mother">Nombre de la madre</label><input class="input" id="np-mother" placeholder="Opcional" /></div>
        <div class="field"><label for="np-bdate">Fecha de nacimiento</label><input class="input" id="np-bdate" type="date" /></div>
        <div class="field"><label for="np-adate">Fecha de ingreso a la unidad</label><input class="input" id="np-adate" type="date" value="${ENG.REF_DATE}" /></div>
        <div class="field"><label for="np-sector">Sector</label><select class="select" id="np-sector"><option value="">Sin asignar</option>${DATA.SECTORS.map((s) => `<option value="${esc(s.id)}" ${s.id === presetSector ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div>
        <div class="field"><label for="np-gaw">EG semanas</label><input class="input num" id="np-gaw" type="number" min="22" max="43" placeholder="Opcional" /></div>
        <div class="field"><label for="np-gad">EG días</label><input class="input num" id="np-gad" type="number" min="0" max="6" placeholder="Opcional" /></div>
        <div class="field"><label for="np-wt">Peso al nacer (g)</label><input class="input num" id="np-wt" type="number" min="350" max="5500" placeholder="Opcional" /></div>
      </div>`;
  }

  function viewIngresos() {
    const r = activeRole();
    const q = fold(ui.ingresoSearch || "");
    const match = (p) => !q || fold(`${p.fullName} ${p.hc || ""} ${p.id}`).includes(q);
    const pending = state.patients.filter((p) => (p.status === "ingreso_incompleto" || (isActive(p) && !p.admissionDraft.validated)) && match(p));
    const signed = state.patients.filter((p) => isActive(p) && p.admissionDraft.validated && match(p));
    const row = (p, note, tone) => `
      <button class="he-item" type="button" data-open-patient="${esc(p.id)}" data-target-route="ingreso">
        <span class="he-item-name">${esc(p.fullName)}</span>
        <span class="he-item-meta">${esc(ENG.fmtGa(p.gaWeeks, p.gaDays, "EG s/d"))} sem · ${esc(ENG.fmtWeight(p.birthWeight, "peso s/d"))} · ingresó ${esc(ENG.fmtDate(p.admitDate) || "—")}</span>
        <span class="he-item-foot"><span class="status-pill status-${tone}">${esc(note)}</span>${coreMissingFields(p).length ? `<span class="he-pend">${coreMissingFields(p).length} dato(s) del ingreso sin responder</span>` : ""}</span>
      </button>`;
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Ingreso</h1>
          <p class="page-desc">El ingreso rápido abre la cuna con lo mínimo; la ficha completa (antecedentes, parto, reanimación y diagnósticos) se termina después y se firma.</p>
        </div>
      </div>
      <div class="ing-grid">
        ${r.permissions.createPatient ? `
        <section class="panel">
          <div class="panel-head"><div><h2 class="panel-title">Ingreso rápido</h2><p class="panel-sub">Solo el nombre es obligatorio. Lo que no completes queda «Sin responder»: la app nunca inventa datos clínicos</p></div></div>
          <div class="panel-body">
            ${quickAdmissionFields("")}
            <div class="form-actions">
              <button class="btn btn-secondary" type="button" id="confirm-new-patient" data-after="stay">Crear y seguir ingresando</button>
              <button class="btn btn-primary" type="button" id="confirm-new-patient-full">Crear y completar la ficha</button>
            </div>
          </div>
        </section>` : ""}
        <section class="panel">
          <div class="panel-head">
            <div><h2 class="panel-title">Fichas de ingreso</h2><p class="panel-sub">${pending.length} por completar o firmar · ${signed.length} firmadas de internados</p></div>
            <input class="input" id="ingreso-search" type="search" placeholder="Buscar" value="${esc(ui.ingresoSearch || "")}" aria-label="Buscar ficha de ingreso" />
          </div>
          <div class="panel-body he-items ing-list">
            ${pending.length ? `<h3 class="list-group">Por completar o firmar</h3>${pending.map((p) => row(p, p.status === "ingreso_incompleto" ? "Ingreso incompleto" : "Sin firmar", "warn")).join("")}` : ""}
            ${signed.length ? `<h3 class="list-group">Firmadas</h3>${signed.map((p) => row(p, "Firmado", "ok")).join("")}` : ""}
            ${!pending.length && !signed.length ? `<p class="empty-state">Ninguna ficha coincide.</p>` : ""}
          </div>
        </section>
      </div>`;
  }

  // ===================== VIEW 5: EPICRISIS =====================
  function viewEpicrisis() {
    const p = activePatient();
    if (!p) return `<div class="empty-state"><strong>Sin paciente seleccionado</strong></div>`;
    const r = activeRole();
    const canEdit = r.permissions.editClinical;
    const dis = canEdit ? "" : "disabled";
    const d = p.discharge;
    const diffs = ENG.computeDraftDiff(p, "epicrisis");
    const epiSigned = !!p.epicrisisDraft.validated;
    const epiMissing = epicrisisMissingItems(p);
    // Variables núcleo del egreso que siguen sin respuesta, con enlace a cada campo.
    const epiPending = isActive(p) ? [] : SCHEMA.DISCHARGE_SECTIONS.flatMap((sec) => sec.fields)
      .filter((f) => f.core && SCHEMA.conditionMet(p, f) && SCHEMA.readField(p, f) === "" && !["date", "condition"].includes(f.key));

    return `
      <div class="page-header">
        <div>
          <p class="step-lead">Completá la condición de egreso y generá la epicrisis: se arma sola con lo cargado en la internación. Al firmarla se cierra la internación.</p>
        </div>
        <div class="page-actions">
          ${canEdit && !epiSigned ? `<button class="btn btn-secondary" type="button" id="btn-gen-epi-draft" ${ui.draftLoading === "epicrisis" ? "disabled" : ""}>${ui.draftLoading === "epicrisis" ? '<span class="spinner" aria-hidden="true"></span>Sintetizando...' : "Generar epicrisis"}</button>` : ""}
          <button class="btn btn-secondary" type="button" id="btn-preview-epi-pdf" ${ui.draftLoading === "epicrisis" ? "disabled" : ""}>Vista impresión</button>
          ${epiSigned
            ? amendButtonHtml("epicrisis", r)
            : `<button class="btn btn-primary" type="button" id="btn-sign-epi" ${!r.permissions.signDraft || ui.draftLoading === "epicrisis" ? "disabled" : ""}>Validar epicrisis</button>`}
        </div>
      </div>

      ${SCHEMA.DISCHARGE_SECTIONS.map((sec) => schemaSectionHtml(sec, p, canEdit, {})).join("")}

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Borrador de epicrisis por sistemas</h2>
            <p class="panel-sub">Se completa automáticamente desde las líneas de tiempo respiratoria, nutricional, infecciosa, vascular, ROP y cirugías</p>
          </div>
        </div>
        <div class="panel-body">
          ${diffs.length ? `
            <div class="banner banner-warn">
              <div><strong>${epiSigned ? "La epicrisis firmada no refleja los datos actuales:" : "Epicrisis desfasada:"}</strong> cambió ${diffs.map((x) => `${esc(x.label)} (${esc(x.prev)} → ${esc(x.curr)})`).join(" · ")}.${epiSigned ? " El documento firmado no se modifica: creá una enmienda para incorporar los cambios." : ""}</div>
              ${canEdit && !epiSigned ? `<button class="btn btn-secondary btn-sm" type="button" id="btn-regen-epi-draft">Regenerar epicrisis</button>` : ""}
            </div>
          ` : ""}

          ${epiSigned ? `
            <div class="banner banner-ok"><div>Epicrisis validada por <strong>${esc(p.epicrisisDraft.validatedBy)}</strong> el <span class="mono">${esc(ENG.fmtDate(p.epicrisisDraft.validatedAt))}</span>. Documento de solo lectura.</div></div>
          ` : ""}

          ${!epiSigned && (epiMissing.length || epiPending.length) ? `
            <div class="banner banner-warn epi-check">
              <div>
                ${epiMissing.length ? `<p><strong>Para poder firmar falta:</strong> ${epiMissing.map(esc).join(" · ")}.</p>` : ""}
                ${epiPending.length ? `<p><strong>Sin responder</strong> (no impiden firmar, pero quedan como deuda de registro):</p>
                  <ul class="goto-list">${epiPending.map((f) => `<li><button class="link-btn" type="button" data-goto-field="${esc(f.key)}">${esc(f.label)}</button></li>`).join("")}</ul>` : ""}
              </div>
            </div>
          ` : ""}

          ${draftVersionsHtml("epicrisis", p.epicrisisDraft)}

          <div class="draft-sheet">
            <div class="draft-sheet-head">
              <strong>Epicrisis neonatal · ${esc(p.fullName)} (${esc(p.id)})</strong>
              <span>${ui.draftLoading === "epicrisis" ? "Sintetizando líneas de tiempo..." : p.epicrisisDraft.validated ? "Firmada" : "Borrador editable"}</span>
            </div>
            ${ui.draftLoading === "epicrisis" ? `
              <div class="skeleton-wrap" aria-live="polite">
                <div style="display:flex;align-items:center;gap:10px;color:var(--teal-dark);font-size:14px;font-weight:600;margin-bottom:6px">
                  <span class="spinner" aria-hidden="true"></span>
                  Integrando líneas de tiempo respiratoria, nutricional, IAAS, catéteres, ROP y cirugías...
                </div>
                <div class="skeleton-line" style="width:60%"></div>
                <div class="skeleton-line" style="width:94%"></div>
                <div class="skeleton-line" style="width:86%"></div>
                <div class="skeleton-line" style="width:82%"></div>
                <div class="skeleton-line" style="width:90%"></div>
                <div class="skeleton-line" style="width:68%"></div>
              </div>
            ` : `
              <textarea class="draft-textarea" id="epi-draft-text" placeholder="Hacé clic en «Generar epicrisis» para armar el resumen completo por sistemas..." ${dis} ${epiSigned ? 'readonly aria-readonly="true"' : ""}>${esc(p.epicrisisDraft.text || "")}</textarea>
            `}
            <div class="draft-sheet-foot">
              <span>Generación determinística sin IA.</span>
              <span>Al validar, el paciente pasa a Egresado (o Fallecido).</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ===================== VIEW 6: IMPORTAR EXCEL / CSV =====================
  // ===================== IMPORTACIÓN SIMULADA DE DOCUMENTOS (PDF / Word) =====================
  // Simula la extracción por reglas de texto fijas (sin IA): cada campo propuesto muestra el
  // fragmento del documento del que sale y el médico lo acepta o rechaza uno por uno.
  const DOC_SAMPLES = [
    {
      id: "derivacion",
      fileName: "Epicrisis_derivacion_Hospital_Zonal.pdf",
      kind: "PDF · 2 páginas",
      targetId: "NEO-2026-000012",
      text: [
        "HOSPITAL ZONAL DE EZEIZA · SERVICIO DE OBSTETRICIA",
        "Resumen de derivación neonatal",
        "",
        "Madre de 27 años, G2 P1 C0 A0. Embarazo gemelar bicorial biamniótico.",
        "Controles prenatales: 6 controles en CAPS. Recibió corticoides antenatales: 2 dosis de betametasona.",
        "Serologías del tercer trimestre: VDRL no reactiva. HIV no reactivo. Chagas no reactivo.",
        "HBsAg no reactivo. Toxoplasmosis IgG reactiva.",
        "Parto: cesárea de urgencia por trabajo de parto prematuro. Presentación cefálica.",
        "Líquido amniótico claro. Apgar 7/9. No requirió reanimación avanzada.",
        "Se deriva en incubadora de transporte para cuidados intensivos neonatales."
      ].join("\n"),
      proposals: [
        { key: "maternalAge", value: 27, match: "Madre de 27 años", rule: "«Madre de N años»" },
        { key: "parityDetail", value: "G2 P1 C0 A0", match: "G2 P1 C0 A0", rule: "Fórmula G P C A" },
        { key: "prenatalCare", value: "Controlado (5 o más controles)", match: "6 controles", rule: "«N controles» con N ≥ 5" },
        { key: "antenatalSteroids", value: "Completo (2 dosis betametasona)", match: "2 dosis de betametasona", rule: "«2 dosis» + corticoide" },
        { key: "vdrl", value: "No reactiva", match: "VDRL no reactiva", rule: "«VDRL (no) reactiva»" },
        { key: "hivSerology", value: "No reactiva", match: "HIV no reactivo", rule: "«HIV (no) reactivo»" },
        { key: "chagas", value: "No reactiva", match: "Chagas no reactivo", rule: "«Chagas (no) reactivo»" },
        { key: "hbsag", value: "No reactiva", match: "HBsAg no reactivo", rule: "«HBsAg (no) reactivo»" },
        { key: "toxo", value: "IgG reactiva (inmune)", match: "Toxoplasmosis IgG reactiva", rule: "«Toxoplasmosis IgG …»" },
        { key: "deliveryType", value: "Cesárea de urgencia", match: "cesárea de urgencia", rule: "Tipo de parto del catálogo" },
        { key: "presentation", value: "Cefálica", match: "Presentación cefálica", rule: "«Presentación …»" },
        { key: "apgar1", value: 7, match: "Apgar 7/9", rule: "«Apgar N/M» → 1 min" },
        { key: "apgar5", value: 9, match: "Apgar 7/9", rule: "«Apgar N/M» → 5 min" }
      ]
    },
    {
      id: "obstetrica",
      fileName: "Nota_obstetrica_sala_de_partos.docx",
      kind: "Word · 1 página",
      targetId: "NEO-2026-000004",
      text: [
        "NOTA DE SALA DE PARTOS",
        "",
        "Paciente de 22 años, primigesta. Edad gestacional por FUM: 35 semanas.",
        "Rotura prematura de membranas de 20 horas de evolución. Temperatura materna máxima 37,4 °C.",
        "Hisopado para estreptococo grupo B: positivo. Recibió ampicilina 6 horas antes del parto.",
        "Parto vaginal espontáneo, presentación cefálica, líquido amniótico meconial.",
        "VDRL no reactiva · HIV no reactivo · Chagas reactivo · HBsAg no reactivo.",
        "Recién nacido vigoroso. Apgar 8/9."
      ].join("\n"),
      proposals: [
        { key: "maternalAge", value: 22, match: "Paciente de 22 años", rule: "«Paciente de N años»" },
        { key: "parity", value: "Primípara", match: "primigesta", rule: "«primigesta» → Primípara" },
        { key: "gaMethod", value: "FUM confiable", match: "Edad gestacional por FUM", rule: "«por FUM»" },
        { key: "rpo", value: "Sí", match: "Rotura prematura de membranas", rule: "Mención de RPM" },
        { key: "rpoHours", value: 20, match: "20 horas de evolución", rule: "«N horas» junto a RPM" },
        { key: "maternalMaxTemp", value: 37.4, match: "Temperatura materna máxima 37,4 °C", rule: "«Temperatura materna máxima N °C»" },
        { key: "gbs", value: "Positivo", match: "estreptococo grupo B: positivo", rule: "«estreptococo grupo B: …»" },
        { key: "maternalAbx", value: "Ampicilina >= 4 h", match: "ampicilina 6 horas antes del parto", rule: "Antibiótico + horas ≥ 4" },
        { key: "deliveryType", value: "Vaginal espontáneo", match: "Parto vaginal espontáneo", rule: "Tipo de parto del catálogo" },
        { key: "presentation", value: "Cefálica", match: "presentación cefálica", rule: "«presentación …»" },
        { key: "amnioticFluid", value: "Meconial", match: "líquido amniótico meconial", rule: "«líquido amniótico …»" },
        { key: "vdrl", value: "No reactiva", match: "VDRL no reactiva", rule: "«VDRL (no) reactiva»" },
        { key: "hivSerology", value: "No reactiva", match: "HIV no reactivo", rule: "«HIV (no) reactivo»" },
        { key: "chagas", value: "Reactiva", match: "Chagas reactivo", rule: "«Chagas (no) reactivo»" },
        { key: "hbsag", value: "No reactiva", match: "HBsAg no reactivo", rule: "«HBsAg (no) reactivo»" },
        { key: "apgar1", value: 8, match: "Apgar 8/9", rule: "«Apgar N/M» → 1 min" },
        { key: "apgar5", value: 9, match: "Apgar 8/9", rule: "«Apgar N/M» → 5 min" }
      ]
    }
  ];

  function startDocImport(sampleId) {
    const sample = DOC_SAMPLES.find((d) => d.id === sampleId);
    if (!sample) return;
    ui.docImport = { sampleId, step: "loading", stepText: "Extrayendo el texto del documento...", pct: 22, decisions: {} };
    render();
    const steps = [
      [450, "Aplicando reglas de reconocimiento de texto (sin IA)...", 58],
      [900, "Comparando cada valor con la ficha actual del paciente...", 90]
    ];
    steps.forEach(([ms, text, pct]) => setTimeout(() => {
      if (!ui.docImport || ui.docImport.step !== "loading") return;
      ui.docImport.stepText = text;
      ui.docImport.pct = pct;
      render();
    }, ms));
    setTimeout(() => {
      if (!ui.docImport) return;
      ui.docImport.step = "review";
      render();
    }, 1350);
  }

  // Resalta en el texto del documento los fragmentos de donde salió cada campo.
  function highlightDocument(text, proposals, focusKey) {
    let html = esc(text);
    const seen = new Set();
    for (const pr of proposals) {
      if (seen.has(pr.match)) continue;
      seen.add(pr.match);
      const m = esc(pr.match);
      const cls = proposals.some((x) => x.match === pr.match && x.key === focusKey) ? "doc-mark is-focus" : "doc-mark";
      html = html.replace(m, `<mark class="${cls}">${m}</mark>`);
    }
    return html;
  }

  function docImportHtml(canImport) {
    const di = ui.docImport;
    if (!di) {
      return `
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Importar datos desde un documento</h2>
              <p class="panel-sub">Epicrisis de derivación, notas de sala de partos o informes en PDF / Word. La app propone campos con reglas de texto fijas (sin IA) y el médico acepta o rechaza cada uno.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="grid-equal">
              ${DOC_SAMPLES.map((d) => {
                const target = state.patients.find((p) => p.id === d.targetId);
                return `
                  <div class="option-tile">
                    <strong style="display:block;color:var(--navy);margin-bottom:4px">${esc(d.fileName)}</strong>
                    <p class="field-hint" style="margin:0 0 6px">${esc(d.kind)} · ${d.proposals.length} campos reconocibles</p>
                    <p class="field-hint" style="margin:0 0 14px">Paciente: ${target ? `${esc(target.fullName)} (${esc(target.id)})` : "—"}</p>
                    <button class="btn btn-primary btn-sm" type="button" data-doc-sample="${d.id}" ${!canImport || !target ? "disabled" : ""}>Procesar documento de ejemplo</button>
                  </div>`;
              }).join("")}
            </div>
            <p class="field-hint" style="margin:14px 0 0">En la maqueta los documentos son de ejemplo: no se lee ningún archivo de tu equipo.</p>
          </div>
        </section>`;
    }

    const sample = DOC_SAMPLES.find((d) => d.id === di.sampleId);
    if (di.step === "loading") {
      return `
        <section class="loading-card" aria-live="polite">
          <span class="spinner spinner-lg" aria-hidden="true"></span>
          <h2 class="loading-title">Procesando ${esc(sample.fileName)}</h2>
          <p class="loading-step-text">${esc(di.stepText)}</p>
          <div class="progress-track"><div class="progress-fill" style="width:${di.pct}%"></div></div>
        </section>`;
    }

    const p = state.patients.find((x) => x.id === sample.targetId);
    const rows = sample.proposals.map((pr) => {
      const f = SCHEMA.FIELD_BY_KEY[pr.key];
      const current = SCHEMA.readField(p, f);
      const same = String(current) === String(pr.value);
      const conflict = current !== "" && !same;
      return { pr, f, current, same, conflict, decision: same ? "same" : (di.decisions[pr.key] || "pending") };
    });
    const accepted = rows.filter((r) => r.decision === "accepted").length;
    const pendingSafe = rows.filter((r) => r.decision === "pending" && !r.conflict).length;

    if (di.step === "done") {
      return `
        <section class="panel">
          <div class="panel-body">
            <div class="banner banner-ok"><div><strong>Importación confirmada.</strong> Se incorporaron ${di.appliedCount} campos a la ficha de ${esc(p.fullName)} y quedó registrado en la bitácora de auditoría.</div></div>
            ${di.discarded && di.discarded.length ? `<div class="banner banner-warn" style="margin-top:10px"><div><strong>No se incorporaron:</strong> ${di.discarded.map(esc).join(", ")}. Su pregunta padre en la ficha no los habilita (por ejemplo, horas de bolsa rota requiere RPM = Sí). Revisalo en la ficha si corresponde.</div></div>` : ""}
            <div class="page-actions" style="margin-top:12px">
              <button class="btn btn-primary btn-sm" type="button" data-open-patient="${esc(p.id)}" data-target-route="ingreso">Ver ficha de ingreso</button>
              <button class="btn btn-secondary btn-sm" type="button" id="btn-doc-reset">Procesar otro documento</button>
            </div>
          </div>
        </section>`;
    }

    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Revisión campo por campo · ${esc(sample.fileName)}</h2>
            <p class="panel-sub">Destino: <strong>${esc(p.fullName)}</strong> (${esc(p.id)}) · identidad verificada por HC + sexo + fecha de nacimiento · ${rows.length} campos reconocidos</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" type="button" id="btn-doc-reset">Descartar</button>
            <button class="btn btn-secondary btn-sm" type="button" id="btn-doc-accept-safe" ${!pendingSafe || !canImport ? "disabled" : ""}>Aceptar los ${pendingSafe} sin conflicto</button>
            <button class="btn btn-primary btn-sm" type="button" id="btn-doc-commit" ${!accepted || !canImport ? "disabled" : ""}>Confirmar (${accepted})</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="doc-review">
            <div class="doc-preview" aria-label="Texto del documento">
              <div class="doc-preview-head">${esc(sample.fileName)}</div>
              <pre class="doc-text">${highlightDocument(sample.text, sample.proposals, di.focusKey)}</pre>
            </div>
            <div class="table-wrap">
              <table class="clinical-table">
                <thead><tr><th>Campo</th><th>En la ficha</th><th>Propuesto</th><th>Regla</th><th>Decisión</th></tr></thead>
                <tbody>
                  ${rows.map((r) => `
                    <tr class="${r.conflict ? "row-conflict" : ""}" data-doc-focus="${esc(r.pr.key)}">
                      <td><strong>${esc(r.f.label)}</strong>${r.f.core ? "" : ' <span class="badge-confirm">A confirmar</span>'}</td>
                      <td>${r.current === "" ? '<span class="field-hint">Sin responder</span>' : esc(fieldDisplayValue(r.f, r.current))}</td>
                      <td><strong>${esc(fieldDisplayValue(r.f, r.pr.value))}</strong>${r.conflict ? '<div class="field-hint" style="color:var(--warn-ink)">Distinto del valor cargado</div>' : ""}</td>
                      <td class="field-hint">${esc(r.pr.rule)}</td>
                      <td style="white-space:nowrap">
                        ${r.decision === "same" ? '<span class="status-pill status-na">Ya coincide</span>' : `
                          <button class="btn btn-sm ${r.decision === "accepted" ? "btn-primary" : "btn-secondary"}" type="button" data-doc-decision="${esc(r.pr.key)}" data-doc-value="accepted" aria-pressed="${r.decision === "accepted"}" ${!canImport ? "disabled" : ""}>Aceptar</button>
                          <button class="btn btn-sm ${r.decision === "rejected" ? "btn-danger" : "btn-ghost"}" type="button" data-doc-decision="${esc(r.pr.key)}" data-doc-value="rejected" aria-pressed="${r.decision === "rejected"}" ${!canImport ? "disabled" : ""}>Rechazar</button>`}
                      </td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>`;
  }

  function commitDocImport() {
    const di = ui.docImport;
    const sample = DOC_SAMPLES.find((d) => d.id === di.sampleId);
    const p = state.patients.find((x) => x.id === sample.targetId);
    const applied = [];
    for (const pr of sample.proposals) {
      if (di.decisions[pr.key] !== "accepted") continue;
      const f = SCHEMA.FIELD_BY_KEY[pr.key];
      const before = SCHEMA.readField(p, f);
      SCHEMA.writeField(p, f, pr.value);
      applied.push(`${f.label}: ${before === "" ? "Sin responder" : before} → ${pr.value}`);
    }
    const rejected = sample.proposals.filter((pr) => di.decisions[pr.key] === "rejected").length;
    // Un subcampo aceptado cuya pregunta padre quedó cerrada (p. ej. horas de bolsa rota con RPM = No)
    // no se guarda: se informa en lugar de descartarlo en silencio.
    const proposedKeys = new Set(sample.proposals.map((pr) => pr.key));
    const discarded = SCHEMA.discardClosedBranches(p).filter((d) => proposedKeys.has(d.key));
    saveState();
    const discardedTxt = discarded.length ? ` · No incorporados por rama cerrada: ${discarded.map((d) => d.label).join(", ")}` : "";
    logAudit("Importación desde documento", `${p.id} (${p.fullName})`, `${sample.fileName} · ${applied.length} aceptados, ${rejected} rechazados · ${applied.join("; ")}${discardedTxt}`);
    di.step = "done";
    di.appliedCount = applied.length - discarded.length;
    di.discarded = discarded.map((d) => d.label);
    toast(`${di.appliedCount} campos incorporados a la ficha de ${p.fullName}.`);
    render();
  }

  function viewImportar() {
    const r = activeRole();
    const canImport = r.permissions.importFiles;
    const batch = ui.activeBatch;
    const step = !batch ? 1 : ui.importStep;

    const approvedCount = batch ? batch.rows.filter((x) => x.decision === "approved").length : 0;
    const blockedCount = batch ? batch.rows.filter((x) => x.idCheck.status === "blocked").length : 0;

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Importar planillas y documentos</h1>
          <p class="page-desc">Dos caminos para cargar datos existentes, siempre con revisión humana antes de guardar y sin IA: planillas Excel / CSV o documentos PDF / Word.</p>
        </div>
        ${ui.importMode === "planilla" ? `<div class="page-actions">
          <button class="btn btn-secondary" type="button" id="btn-dl-template">Descargar plantilla CSV</button>
        </div>` : ""}
      </div>

      ${!canImport ? `<div class="banner banner-info">Tu perfil actual (${esc(r.roleLabel)}) no tiene permisos de importación. Cambiá de rol para probar el flujo.</div>` : ""}

      <div class="system-tabs" role="tablist" aria-label="Modalidad de importación">
        <button class="sys-tab ${ui.importMode === "planilla" ? "active" : ""}" type="button" role="tab" aria-selected="${ui.importMode === "planilla"}" data-import-mode="planilla">Planilla Excel / CSV</button>
        <button class="sys-tab ${ui.importMode === "documento" ? "active" : ""}" type="button" role="tab" aria-selected="${ui.importMode === "documento"}" data-import-mode="documento">Documento PDF / Word <span class="badge-confirm">A confirmar</span></button>
      </div>

      ${ui.importMode === "documento" ? docImportHtml(canImport) : `

      <div class="stepper" aria-label="Pasos de importación">
        <div class="step-item ${step === 1 ? "active" : step > 1 ? "done" : ""}"><span class="step-num">1</span>Elegir archivo</div>
        <div class="step-item ${step === 2 ? "active" : step > 2 ? "done" : ""}"><span class="step-num">2</span>Verificar identidad (HC, sexo y fecha de nacimiento)</div>
        <div class="step-item ${step === 3 ? "active" : ""}"><span class="step-num">3</span>Revisar y confirmar</div>
      </div>

      ${ui.importLoading ? `
        <section class="loading-card" aria-live="polite">
          <span class="spinner spinner-lg" aria-hidden="true"></span>
          <h2 class="loading-title">${esc(ui.importLoading.title)}</h2>
          <p class="loading-step-text">${esc(ui.importLoading.stepText)}</p>
          <div class="progress-track"><div class="progress-fill" style="width:${ui.importLoading.pct}%"></div></div>
        </section>
      ` : !batch ? `
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Subir planilla del servicio o cargar lote de ejemplo</h2>
              <p class="panel-sub">Soporta archivos .csv (y .xlsx en servidor) siguiendo la plantilla oficial de NeoSalud</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="grid-equal">
              <div class="dropzone">
                <strong style="display:block;color:var(--navy);margin-bottom:6px">Cargar archivo CSV desde tu equipo</strong>
                <p class="field-hint" style="margin:0 0 14px">Columnas: <span class="mono">hc,nombre,madre,sexo,fecha_nacimiento,eg_sem,eg_dias,peso_g,sector</span></p>
                <input type="file" id="csv-file-input" accept=".csv,text/csv" ${!canImport ? "disabled" : ""} />
              </div>

              <div class="option-tile">
                <strong style="display:block;color:var(--navy);margin-bottom:6px">Probar con lote realista de demostración</strong>
                <p class="field-hint" style="margin:0 0 14px">Incluye 1 alta nueva válida, 1 actualización verificada por 3-ID y 1 conflicto de sexo bloqueado automáticamente.</p>
                <button class="btn btn-primary" type="button" id="btn-load-sample-batch" ${!canImport ? "disabled" : ""}>Cargar lote de ejemplo (semana 47)</button>
              </div>
            </div>
          </div>
        </section>
      ` : `
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Bandeja de revisión · ${esc(batch.fileName)}</h2>
              <p class="panel-sub">${batch.rows.length} filas detectadas · ${blockedCount} bloqueada(s) por barrera de 3 identificadores · ${approvedCount} aprobada(s)</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-secondary btn-sm" type="button" id="btn-clear-batch">Descartar lote</button>
              <button class="btn btn-primary btn-sm" type="button" id="btn-commit-batch" ${approvedCount === 0 || !canImport ? "disabled" : ""}>Confirmar lote (${approvedCount})</button>
            </div>
          </div>

          <div class="panel-body tight">
            <div class="table-wrap">
              <table class="clinical-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Paciente en archivo</th>
                    <th>Verificación 3-ID (HC · Sexo · F. Nac.)</th>
                    <th>Observaciones / Diff</th>
                    <th>Decisión humana</th>
                  </tr>
                </thead>
                <tbody>
                  ${batch.rows.map((row) => {
                    const isBlocked = row.idCheck.status === "blocked";
                    return `
                      <tr>
                        <td><span class="status-pill ${row.action === "create" ? "status-hosp" : "status-alta"}">${row.action === "create" ? "Nuevo ingreso" : "Actualización"}</span></td>
                        <td>
                          <strong>${esc(row.fullName)}</strong>
                          <div class="field-hint mono">${esc(row.hc)} · ${esc(row.sex)} · ${esc(ENG.fmtDate(row.birthDate))} · ${row.gaWeeks}+${row.gaDays} · ${row.birthWeight} g</div>
                        </td>
                        <td>
                          <div style="display:flex;gap:4px;flex-wrap:wrap">
                            <span class="status-pill ${row.idCheck.hc ? "status-ok" : "status-danger"}">HC ${row.idCheck.hc ? "OK" : "Error"}</span>
                            <span class="status-pill ${row.idCheck.sex ? "status-ok" : "status-danger"}">Sexo ${row.idCheck.sex ? "OK" : "No coincide"}</span>
                            <span class="status-pill ${row.idCheck.birthDate ? "status-ok" : "status-danger"}">F. Nac ${row.idCheck.birthDate ? "OK" : "Error"}</span>
                          </div>
                        </td>
                        <td style="max-width:300px">
                          ${row.warnings.length ? row.warnings.map((w) => `<div style="font-size:14px;color:${isBlocked ? "var(--danger-ink)" : "var(--warn-ink)"}">${esc(w)}</div>`).join("") : `<span class="field-hint">Sin advertencias · listo para aprobar</span>`}
                        </td>
                        <td>
                          ${isBlocked ? `
                            <span class="status-pill status-danger">Bloqueado por 3-ID</span>
                          ` : `
                            <div style="display:flex;gap:6px">
                              <button class="btn btn-sm ${row.decision === "approved" ? "btn-primary" : "btn-secondary"}" type="button" data-batch-row="${esc(row.rowId)}" data-batch-dec="approved">Aprobar</button>
                              <button class="btn btn-sm ${row.decision === "rejected" ? "btn-danger" : "btn-secondary"}" type="button" data-batch-row="${esc(row.rowId)}" data-batch-dec="rejected">Rechazar</button>
                            </div>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      `}
      `}
    `;
  }

  // ===================== VIEW 7: ESTADÍSTICAS =====================
  function viewEstadisticas() {
    const f = ui.statsFilters;
    const st = ENG.computeStatistics(state.patients, f);

    const morbidities = [
      ["DBP (en < 32 sem)", st.dbp],
      ["ROP (cualquier estadio, en riesgo)", st.ropAny],
      ["ROP grave o tratada", st.ropSevere],
      ["HIV (cualquier grado)", st.hivAny],
      ["HIV grado III–IV", st.hivSevere],
      ["Enterocolitis necrotizante (NEC)", st.nec],
      ["Ductus arterioso permeable (DAP)", st.dap],
      ["Sepsis precoz (< 72 h)", st.earlySepsis],
      ["Sepsis tardía (> 72 h)", st.lateSepsis],
      ["Infección asociada a cuidados (IAAS, cualquier foco)", st.iaas]
    ];

    function triRow(label, m) {
      const tot = Math.max(1, m.yes + m.no + m.missing + m.na);
      const pY = (m.yes / tot) * 100;
      const pN = (m.no / tot) * 100;
      const pM = (m.missing / tot) * 100;
      const pA = (m.na / tot) * 100;
      return `
        <tr>
          <td><strong>${esc(label)}</strong></td>
          <td class="num" style="white-space:nowrap">
            <strong>${m.denom ? `${m.yes}/${m.denom} (${m.rate}%)` : "Sin evaluables"}</strong>
          </td>
          <td style="min-width:240px">
            <div class="tri-bar" aria-label="${esc(label)}">
              <div class="tri-seg-yes" style="width:${pY}%" title="Sí: ${m.yes}"></div>
              <div class="tri-seg-no" style="width:${pN}%" title="No: ${m.no}"></div>
              <div class="tri-seg-miss" style="width:${pM}%" title="En riesgo sin dato: ${m.missing}"></div>
              <div class="tri-seg-na" style="width:${pA}%" title="Fuera de riesgo (No aplica): ${m.na}"></div>
            </div>
            <div class="tri-legend num">
              <span><i class="dot tri-seg-yes"></i>Sí: ${m.yes}</span>
              <span><i class="dot tri-seg-no"></i>No: ${m.no}</span>
              ${m.missing ? `<span style="color:var(--warn-ink);font-weight:600"><i class="dot tri-seg-miss"></i>Dato pendiente: ${m.missing}</span>` : ""}
              ${m.na ? `<span><i class="dot tri-seg-na"></i>Fuera de riesgo: ${m.na}</span>` : ""}
            </div>
          </td>
        </tr>
      `;
    }

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Estadísticas e indicadores de la unidad</h1>
          <p class="page-desc">Cada tasa dice sobre cuántos bebés se calcula. Un bebé sin el dato no se cuenta como sano: se muestra aparte como pendiente.</p>
        </div>
      </div>

      <section class="panel">
        <div class="filter-bar">
          <div class="field" style="min-width:170px">
            <label for="sf-sector">Sector</label>
            <select class="select" id="sf-sector">
              <option value="all" ${f.sector === "all" ? "selected" : ""}>Todos los sectores</option>
              ${DATA.SECTORS.map((s) => `<option value="${esc(s.id)}" ${f.sector === s.id ? "selected" : ""}>${esc(s.id)}</option>`).join("")}
            </select>
          </div>
          <div class="field" style="min-width:170px">
            <label for="sf-ga">Edad gestacional</label>
            <select class="select" id="sf-ga">
              <option value="all" ${f.gaGroup === "all" ? "selected" : ""}>Todas las EG</option>
              <option value="<28" ${f.gaGroup === "<28" ? "selected" : ""}>&lt; 28 sem</option>
              <option value="28-31" ${f.gaGroup === "28-31" ? "selected" : ""}>28–31+6 sem</option>
              <option value="32-36" ${f.gaGroup === "32-36" ? "selected" : ""}>32–36+6 sem</option>
              <option value=">=37" ${f.gaGroup === ">=37" ? "selected" : ""}>≥ 37 sem</option>
            </select>
          </div>
          <div class="field" style="min-width:170px">
            <label for="sf-wt">Peso al nacer</label>
            <select class="select" id="sf-wt">
              <option value="all" ${f.weightGroup === "all" ? "selected" : ""}>Todos los pesos</option>
              <option value="<1000" ${f.weightGroup === "<1000" ? "selected" : ""}>&lt; 1.000 g</option>
              <option value="<1500" ${f.weightGroup === "<1500" ? "selected" : ""}>&lt; 1.500 g</option>
              <option value="1500-2499" ${f.weightGroup === "1500-2499" ? "selected" : ""}>1.500–2.499 g</option>
              <option value=">=2500" ${f.weightGroup === ">=2500" ? "selected" : ""}>≥ 2.500 g</option>
            </select>
          </div>
          <div class="field-hint" style="margin-left:auto;padding-bottom:6px">Cohorte filtrada: <strong class="num">${st.total} pacientes</strong></div>
        </div>
      </section>

      <section class="ledger-bar">
        <div class="ledger-cell">
          <div class="ledger-label">Mortalidad (desenlace conocido)</div>
          <div class="ledger-value">${st.mortalityRate !== null ? `${st.mortalityRate}%` : "—"}</div>
          <div class="ledger-sub">${st.deceased} fallecido(s) sobre ${st.knownOutcomeCount} con desenlace · ${st.stillHosp} aún internados aparte</div>
        </div>
        <div class="ledger-cell">
          <div class="ledger-label">Bacteriemia / 1.000 días-catéter</div>
          <div class="ledger-value is-teal">${st.clabsiRate1000 !== null ? st.clabsiRate1000 : "—"}</div>
          <div class="ledger-sub">${st.clabsiEvents} evento(s) en ${st.totalCatheterDays} días-catéter</div>
        </div>
        <div class="ledger-cell">
          <div class="ledger-label">NAV / 1.000 días-ventilador</div>
          <div class="ledger-value is-teal">${st.navRate1000 !== null ? st.navRate1000 : "—"}</div>
          <div class="ledger-sub">${st.navEvents} evento(s) en ${st.totalVentDays} días de VMC/VAFO</div>
        </div>
        <div class="ledger-cell">
          <div class="ledger-label">LME exclusiva al alta</div>
          <div class="ledger-value">${st.dischargedAliveCount ? `${Math.round((st.lmeAtDischarge / st.dischargedAliveCount) * 100)}%` : "—"}</div>
          <div class="ledger-sub">${st.lmeAtDischarge} de ${st.dischargedAliveCount} egresos vivos · Estadía media ${st.avgStay ?? "—"} d</div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Morbilidades</h2>
            <p class="panel-sub">Los bebés fuera de riesgo no entran en la cuenta; los que tienen el dato pendiente se informan aparte</p>
          </div>
        </div>
        <div class="panel-body tight">
          <div class="table-wrap">
            <table class="clinical-table">
              <thead><tr><th>Indicador</th><th>Tasa (casos sobre bebés con el dato)</th><th>Cómo se compone</th></tr></thead>
              <tbody>
                ${morbidities.map(([lbl, m]) => triRow(lbl, m)).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  // Diccionario de datos: variables del esquema + variables derivadas por el motor.
  function dictionaryRows() {
    const modules = [["Ingreso", SCHEMA.ADMISSION_SECTIONS], ["Hospitalización", SCHEMA.HOSP_SECTIONS], ["Egreso", SCHEMA.DISCHARGE_SECTIONS]];
    const rows = [];
    for (const [module, sections] of modules) {
      for (const sec of sections) {
        for (const f of sec.fields) {
          const domain = f.type === "select"
            ? optionPairs(f).map(([, lab]) => lab).join(" | ")
            : f.type === "number" ? [f.min !== undefined ? `mín ${f.min}` : "", f.max !== undefined ? `máx ${f.max}` : ""].filter(Boolean).join(" · ") || "Numérico"
              : f.type === "date" ? "dd/mm/aaaa" : "Texto libre";
          const cond = f.showIf ? ` · Solo si «${(SCHEMA.FIELD_BY_KEY[f.showIf.key] || {}).label || f.showIf.key}» ${f.showIf.notEq ? "≠ " + f.showIf.notEq : "= " + (f.showIf.eq || f.showIf.in.join(" / "))}` : "";
          rows.push({ key: f.key, label: f.label, module: `${module} · ${sec.title}`, type: f.type, domain: domain + cond, status: f.core ? "Núcleo" : "A confirmar" });
        }
      }
    }
    const derived = [
      ["fenton_clasificacion", "Fenton 2025: PEG / AEG / GEG, Z-score y percentil", "Derivada de EG, sexo y peso al nacer"],
      ["crib2_puntaje", "Score CRIB II", "Derivada si EG ≤ 32 sem o peso ≤ 1.500 g; requiere temperatura y exceso de base"],
      ["kaiser_riesgo_posterior", "Kaiser 2024: riesgo de sepsis precoz", "Derivada si EG ≥ 35 sem; usa la incidencia local institucional"],
      ["dias_o2 / cpap / vni / vmc / vafo", "Días por modalidad respiratoria", "Derivada de la línea de tiempo respiratoria"],
      ["dbp_jensen / dbp_bancalari", "Clasificación de displasia broncopulmonar", "Derivada si EG < 32 sem y cronología completa"],
      ["dias_npt / dia_100cc_kg", "Hitos nutricionales", "Derivada de la línea de tiempo nutricional"],
      ["dias_cateter", "Días-catéter por tipo", "Derivada de colocación y retiro"],
      ["rop_peor_estadio", "Peor estadio de ROP", "Derivada de los controles oftalmológicos"]
    ];
    for (const [key, label, domain] of derived) rows.push({ key, label, module: "Derivadas (no se cargan)", type: "derivada", domain, status: "Derivada" });
    return rows;
  }

  // Variables núcleo visibles (rama abierta) que siguen sin responder en el ingreso.
  function coreMissingFields(p) {
    return SCHEMA.ADMISSION_SECTIONS.flatMap((sec) => sec.fields)
      .filter((f) => f.core && SCHEMA.conditionMet(p, f) && f.onlyWhen !== "kaiser" && SCHEMA.readField(p, f) === "");
  }

  // ===================== VIEW 8: EXPORTACIÓN =====================
  function viewExportacion() {
    const r = activeRole();
    const st = ENG.computeStatistics(state.patients, {});
    const sheet = ui.exportPreviewSheet;

    const debtRows = [];
    for (const p of state.patients) {
      if (p.status === "ingreso_incompleto") debtRows.push([p.id, p.fullName, "Ingreso sin validar", "Completar y firmar nota de ingreso"]);
      if (ENG.num(p.gaWeeks) !== null && ENG.num(p.gaWeeks) < 32 && p.hosp.respCoverage !== "completa") debtRows.push([p.id, p.fullName, "Cronología respiratoria abierta", "Confirmar cobertura al corte clínico"]);
      if (ENG.computeDraftDiff(p, "admission").length) debtRows.push([p.id, p.fullName, "Borrador de ingreso desfasado", "Regenerar borrador tras edición"]);
      const coreMissing = coreMissingFields(p);
      if (coreMissing.length) debtRows.push([p.id, p.fullName, `${coreMissing.length} variables núcleo sin responder`, coreMissing.slice(0, 4).map((f) => f.label).join(", ") + (coreMissing.length > 4 ? "…" : "")]);
    }

    let previewHtml = "";
    if (sheet === "metadatos") {
      previewHtml = `
        <table class="clinical-table">
          <thead><tr><th>Campo</th><th>Valor</th></tr></thead>
          <tbody>
            <tr><td>Institución</td><td>${esc(state.institutionName)}</td></tr>
            <tr><td>Fecha de exportación</td><td class="mono">${ENG.fmtDate(nowStamp())}</td></tr>
            <tr><td>Usuario exportador</td><td>${esc(r.name)} (${esc(r.roleLabel)})</td></tr>
            <tr><td>Versión de diccionario</td><td class="mono">neosalud-dict-v2.0 (maqueta)</td></tr>
            <tr><td>Pacientes incluidos</td><td class="num">${state.patients.length}</td></tr>
            <tr><td>Lectura de valores</td><td>Ver hoja 3 «Cómo leer los valores».</td></tr>
          </tbody>
        </table>
      `;
    } else if (sheet === "base") {
      previewHtml = `
        <table class="clinical-table">
          <thead><tr><th>ID</th><th>Sexo</th><th>EG</th><th>Peso (g)</th><th>Fenton</th><th>Días O2</th><th>DBP Jensen</th><th>Días-catéter</th><th>Estado</th></tr></thead>
          <tbody>
            ${state.patients.map((p) => {
              const fen = ENG.calcFenton2025(p.gaWeeks, p.gaDays, p.sex, p.birthWeight);
              const resp = ENG.deriveRespiratory(p);
              const cath = ENG.deriveCatheters(p);
              return `<tr><td class="mono">${esc(p.id)}</td><td>${esc(p.sex)}</td><td class="num">${esc(ENG.fmtGa(p.gaWeeks, p.gaDays, ""))}</td><td class="num">${esc(String(p.birthWeight ?? ""))}</td><td>${esc(fen.classification.split(" ")[0])}</td><td class="num">${resp.totals.o2}</td><td>${esc(resp.jensen)}</td><td class="num">${cath.totalDays}</td><td>${esc(p.status)}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      `;
    } else if (sheet === "como-leer") {
      previewHtml = `
        <table class="clinical-table">
          <thead><tr><th>Valor en la celda</th><th>Qué significa</th><th>Cómo tratarlo en el análisis</th></tr></thead>
          <tbody>
            <tr><td class="mono">Sí / No</td><td>Dato registrado por el equipo</td><td>Entra al numerador (Sí) y al denominador (Sí + No).</td></tr>
            <tr><td class="mono">NA</td><td>No aplica: el paciente nunca estuvo en riesgo (p. ej. ROP en un RN de término)</td><td>Sale del numerador y del denominador.</td></tr>
            <tr><td class="mono">SD</td><td>Sin dato: estaba en riesgo y no se consignó</td><td>Deuda de registro. No se cuenta como «No»: se informa aparte.</td></tr>
            <tr><td class="mono">(vacío)</td><td>Variable sin responder en la ficha</td><td>Nunca se interpreta como normal.</td></tr>
            <tr><td class="mono">Derivada</td><td>Calculada por la app (Fenton, DBP, días-catéter, etc.)</td><td>No se edita a mano: se corrige el dato de origen.</td></tr>
          </tbody>
        </table>
      `;
    } else if (sheet === "diccionario") {
      const dictRows = dictionaryRows();
      previewHtml = `
        <p class="field-hint" style="margin:0 0 10px">${dictRows.length} variables: ${dictRows.filter((d) => d.status === "Núcleo").length} núcleo y ${dictRows.filter((d) => d.status === "A confirmar").length} a confirmar con el servicio.</p>
        <table class="clinical-table">
          <thead><tr><th>Variable</th><th>Etiqueta</th><th>Módulo</th><th>Tipo</th><th>Valores permitidos / regla</th><th>Estado</th></tr></thead>
          <tbody>
            ${dictRows.map((d) => `<tr><td class="mono">${esc(d.key)}</td><td>${esc(d.label)}</td><td>${esc(d.module)}</td><td>${esc(d.type)}</td><td>${esc(d.domain)}</td><td>${d.status === "A confirmar" ? '<span class="badge-confirm">A confirmar</span>' : esc(d.status)}</td></tr>`).join("")}
          </tbody>
        </table>
      `;
    } else if (sheet === "tasas") {
      const rates = [
        ["DBP (< 32 sem)", st.dbp], ["ROP cualquier estadio", st.ropAny], ["ROP grave o tratada", st.ropSevere],
        ["HIV cualquier grado", st.hivAny], ["HIV grado III–IV", st.hivSevere], ["NEC", st.nec], ["DAP", st.dap],
        ["Sepsis precoz", st.earlySepsis], ["Sepsis tardía", st.lateSepsis], ["IAAS", st.iaas]
      ];
      previewHtml = `
        <table class="clinical-table">
          <thead><tr><th>Morbilidad</th><th>Numerador</th><th>Denominador</th><th>Tasa</th><th>NA (fuera de riesgo)</th><th>SD (deuda)</th></tr></thead>
          <tbody>
            ${rates.map(([name, t]) => `<tr><td>${esc(name)}</td><td class="num">${t.yes}</td><td class="num">${t.denom}</td><td class="num">${t.rate === null ? "—" : String(t.rate).replace(".", ",") + " %"}</td><td class="num">${t.na}</td><td class="num">${t.missing}</td></tr>`).join("")}
          </tbody>
        </table>
      `;
    } else if (sheet === "resumen") {
      previewHtml = `
        <table class="clinical-table">
          <thead><tr><th>Indicador</th><th>Resultado</th><th>Detalle</th></tr></thead>
          <tbody>
            <tr><td>Mortalidad (desenlace conocido)</td><td class="num">${st.mortalityRate ?? "—"}%</td><td>${st.deceased}/${st.knownOutcomeCount} (${st.stillHosp} aún internados)</td></tr>
            <tr><td>DBP (&lt; 32 sem)</td><td class="num">${st.dbp.rate ?? "—"}%</td><td>${st.dbp.yes}/${st.dbp.denom} · ${st.dbp.missing} sin dato · ${st.dbp.na} fuera de riesgo</td></tr>
            <tr><td>Bacteriemia / 1.000 días-catéter</td><td class="num">${st.clabsiRate1000 ?? "—"}</td><td>${st.clabsiEvents} en ${st.totalCatheterDays} días-catéter</td></tr>
          </tbody>
        </table>
      `;
    } else {
      previewHtml = `
        <table class="clinical-table">
          <thead><tr><th>ID</th><th>Paciente</th><th>Inconsistencia / Deuda</th><th>Acción sugerida</th></tr></thead>
          <tbody>
            ${debtRows.length ? debtRows.map(([id, name, issue, act]) => `<tr><td class="mono">${esc(id)}</td><td>${esc(name)}</td><td style="color:var(--warn-ink)">${esc(issue)}</td><td>${esc(act)}</td></tr>`).join("") : `<tr><td colspan="4" class="empty-state">Sin errores ni deuda de registro.</td></tr>`}
          </tbody>
        </table>
      `;
    }

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Exportación y diccionario de datos</h1>
          <p class="page-desc">Generación directa desde los datos consolidados. Incluye opción pseudonimizada sin nombres ni DNI para reportes externos o investigación.</p>
        </div>
      </div>

      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">Descargas disponibles</h2></div>
        <div class="panel-body">
          <div class="grid-equal">
            <div class="option-tile">
              <strong>Base maestra (CSV compatible Excel)</strong>
              <p class="field-hint" style="margin:4px 0 14px">Una fila por paciente con variables primarias y derivadas (Fenton, DBP, días-catéter).</p>
              <button class="btn btn-primary btn-sm" type="button" id="btn-exp-master" ${!r.permissions.exportFull || ui.exportLoading ? "disabled" : ""}>${ui.exportLoading === "master" ? '<span class="spinner" aria-hidden="true"></span>Preparando...' : "Descargar base maestra"}</button>
              ${!r.permissions.exportFull ? `<span class="field-hint" style="margin-left:8px">Requiere rol Planta o Jefatura</span>` : ""}
            </div>
            <div class="option-tile">
              <strong>CSV pseudonimizado (sin datos filiatorios)</strong>
              <p class="field-hint" style="margin:4px 0 14px">Excluye nombres, HC y DNI materno. Apto para redes neonatales, Dirección y estadística.</p>
              <button class="btn btn-secondary btn-sm" type="button" id="btn-exp-anon" ${ui.exportLoading ? "disabled" : ""}>${ui.exportLoading === "anon" ? '<span class="spinner" aria-hidden="true"></span>Preparando...' : "Descargar CSV pseudonimizado"}</button>
            </div>
            <div class="option-tile">
              <strong>JSON completo del servicio</strong>
              <p class="field-hint" style="margin:4px 0 14px">Incluye pacientes, líneas de tiempo y borradores estructurados.</p>
              <button class="btn btn-secondary btn-sm" type="button" id="btn-exp-json" ${!r.permissions.exportFull || ui.exportLoading ? "disabled" : ""}>${ui.exportLoading === "json" ? '<span class="spinner" aria-hidden="true"></span>Preparando...' : "Descargar JSON"}</button>
            </div>
            <div class="option-tile">
              <strong>Diccionario de datos versionado (.csv)</strong>
              <p class="field-hint" style="margin:4px 0 14px">Todas las variables con dominio, módulo y estado núcleo / a confirmar. Sirve para revisar con el servicio qué se registra.</p>
              <button class="btn btn-secondary btn-sm" type="button" id="btn-exp-dict" ${ui.exportLoading ? "disabled" : ""}>${ui.exportLoading === "dict" ? '<span class="spinner" aria-hidden="true"></span>Preparando...' : "Descargar diccionario"}</button>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Vista previa de las 7 hojas del Excel Maestro</h2>
            <p class="panel-sub">En la versión productiva estas 7 pestañas se empaquetan en un único archivo .xlsx</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="system-tabs">
            ${[
              ["metadatos", "1. Metadatos"],
              ["base", "2. Base maestra"],
              ["como-leer", "3. Cómo leer los valores"],
              ["diccionario", "4. Diccionario de datos"],
              ["resumen", "5. Resumen estadístico"],
              ["tasas", "6. Tasas de morbilidad"],
              ["errores", `7. Errores y deuda de registro (${debtRows.length})`]
            ].map(([k, lbl]) => `<button class="sys-tab ${sheet === k ? "active" : ""}" type="button" data-exp-sheet="${k}">${esc(lbl)}</button>`).join("")}
          </div>
          <div class="table-wrap">${previewHtml}</div>
        </div>
      </section>
    `;
  }

  // ===================== VIEW 9: ADMIN Y AUDITORÍA =====================
  function viewConfiguracion() {
    const canAdmin = activeRole().permissions.admin;
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Configuración</h1>
          <p class="page-desc">Tu perfil profesional, los datos de la institución, sectores y camas, catálogos y respaldo. Los usuarios y permisos están en Administración.</p>
        </div>
      </div>

      <div class="grid-equal">
        <section class="panel">
          <div class="panel-head"><div><h2 class="panel-title">Mi perfil profesional</h2><p class="panel-sub">Con este nombre y matrícula se firman los ingresos y las epicrisis</p></div></div>
          <div class="panel-body">
            <div class="form-grid">
              <div class="field"><label for="me-name">Nombre y apellido</label><input class="input" id="me-name" value="${esc(activeUser().name)}" /></div>
              <div class="field"><label for="me-mat">Matrícula</label><input class="input mono" id="me-mat" value="${esc(activeUser().matricula || "")}" /></div>
              <div class="field"><label>Rol</label><p class="derived-val">${esc(activeRole().roleLabel)}</p><span class="field-hint">El rol y los permisos los asigna la jefatura en Administración</span></div>
            </div>
            <div class="form-actions"><button class="btn btn-primary btn-sm" type="button" id="btn-save-me">Guardar mi perfil</button></div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><div><h2 class="panel-title">Respaldo</h2><p class="panel-sub">Copia de todo lo cargado en esta maqueta (pacientes, usuarios y auditoría)</p></div></div>
          <div class="panel-body">
            <p class="field-hint" style="margin-top:0">En el sistema real el respaldo es automático y cifrado en el servidor; acá se descarga un archivo para guardar o mostrar.</p>
            <button class="btn btn-secondary" type="button" id="btn-backup">Descargar copia de seguridad</button>
          </div>

      <div class="grid-equal">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Datos institucionales</h2>
              <p class="panel-sub">Aparecen en los PDF y alimentan las calculadoras</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="form-grid">
              <div class="field field-wide">
                <label for="inst-name">Nombre de la institución y servicio</label>
                <input class="input" id="inst-name" data-inst="institutionName" value="${esc(state.institutionName)}" ${canAdmin ? "" : "disabled"} />
              </div>
              <div class="field">
                <label for="inst-timeout">Cierre de sesión por inactividad (min)</label>
                <input class="input num" id="inst-timeout" type="number" min="5" max="120" data-inst="sessionTimeoutMin" value="${esc(state.sessionTimeoutMin)}" ${canAdmin ? "" : "disabled"} />
              </div>
              <div class="field">
                <label for="inst-eos">Incidencia local de sepsis precoz (/ 1.000 NV) <span class="badge-confirm">A confirmar</span></label>
                <input class="input num" id="inst-eos" type="number" step="0.1" min="0.1" max="4" data-inst="eosIncidence" value="${esc(state.eosIncidence)}" ${canAdmin ? "" : "disabled"} />
              </div>
              <div class="field field-wide">
                <label>Logo para el membrete de los PDF</label>
                <div class="logo-slot"><span class="brand-mark" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span><span class="field-hint">En la versión productiva se sube la imagen del hospital.</span></div>
              </div>
            </div>
            ${canAdmin ? "" : `<p class="field-hint" style="margin:12px 0 0">Solo Jefatura puede modificar estos parámetros.</p>`}
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Sectores y camas</h2>
              <p class="panel-sub">Capacidad y ocupación actual de la unidad</p>
            </div>
          </div>
          <div class="panel-body tight">
            <div class="table-wrap">
              <table class="clinical-table">
                <thead><tr><th>Sector</th><th>Camas</th><th>Ocupadas</th><th>Libres</th></tr></thead>
                <tbody>
                  ${DATA.SECTORS.map((sec) => {
                    const occ = state.patients.filter((p) => p.sector === sec.id && (p.status === "hospitalizado" || p.status === "ingreso_incompleto")).length;
                    return `<tr><td><strong>${esc(sec.name)}</strong></td><td class="num">${sec.capacity}</td><td class="num">${occ}</td><td class="num">${Math.max(0, sec.capacity - occ)}</td></tr>`;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Catálogos cerrados</h2>
            <p class="panel-sub">Listas que se eligen en lugar de escribir texto libre</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="derived-strip">
            <div class="derived-item"><span class="derived-label">Diagnósticos CIE-10</span><span class="derived-val">${DATA.CIE10_CATALOG.length} en la maqueta</span><span class="field-hint">Producción: catálogo completo de la OPS</span></div>
            <div class="derived-item"><span class="derived-label">Microorganismos</span><span class="derived-val">${DATA.MICROORGANISMS.length}</span></div>
            <div class="derived-item"><span class="derived-label">Antibióticos</span><span class="derived-val">${DATA.ANTIBIOTICS.length}</span></div>
            <div class="derived-item"><span class="derived-label">Modalidades respiratorias</span><span class="derived-val">${DATA.RESP_MODALITIES.length}</span></div>
            <div class="derived-item"><span class="derived-label">Variables de la ficha</span><span class="derived-val">${Object.keys(SCHEMA.FIELD_BY_KEY).length}</span><span class="field-hint">Ver diccionario en Exportación</span></div>
          </div>
        </div>
      </section>

        </section>
      </div>
    `;
  }

  // ===================== MAIN RENDER =====================
  function render() {
    ENG.setInstitution({ eosIncidence: state.eosIncidence });
    // Sin sesión se muestra solo la pantalla de perfiles (sin barra lateral ni superior).
    const login = !hasSession();
    document.body.classList.toggle("is-login", login);
    if (login) {
      document.getElementById("patient-strip").hidden = true;
      document.getElementById("main").innerHTML = viewLogin();
      return;
    }
    renderNav();
    renderTopbar();
    renderPatientStrip();

    const views = {
      unidad: viewInicio,
      inicio: viewInicio,
      pacientes: viewInicio,
      ingreso: viewIngreso,
      ingresos: viewIngresos,
      he: viewHE,
      admin: viewAdmin,
      importar: viewImportar,
      estadisticas: viewEstadisticas,
      exportacion: viewExportacion,
      configuracion: viewConfiguracion
    };

    document.getElementById("main").innerHTML = (views[ui.route] || viewInicio)();
    bindViewEvents();
  }

  // ===================== MODALS & ACTIONS =====================
  function showGuideModal() {
    openModal(
      "Guion de la reunión con el servicio",
      `<p class="field-hint" style="margin:0 0 12px">Objetivo: salir con respuestas a cuatro preguntas. ¿Falta alguna variable? ¿Sobra alguna? ¿El borrador se redactaría distinto? ¿Las tasas son las que informan a Jefatura?</p>
      <ol class="guide-steps">
        <li><strong>Perfiles e Inicio (2 min).</strong> Pantalla de perfiles con sus permisos, tablero de Inicio y mapa de cunas. Tocá tu nombre arriba a la derecha y entrá como <em>Dirección</em> para mostrar la vista de solo lectura.
          <span class="guide-ask">Preguntar: ¿los sectores y cunas son los reales?</span></li>
        <li><strong>Ficha de ingreso (4 min).</strong> Desde <em>Ingreso</em>, creá un paciente solo con el nombre. Abrí <em>Mateo Cabrera</em> (Kaiser) y <em>Alma Ríos</em> (CRIB II). Abrí y cerrá la rama de embarazo gemelar.
          <span class="guide-ask">Preguntar: recorrer las etiquetas <span class="badge-confirm">A confirmar</span>, ¿cuáles registran hoy? ¿Cargan el SIP?</span></li>
        <li><strong>Hospitalización y epicrisis (3 min).</strong> <em>Alma Ríos</em>: Resumen, línea respiratoria (agregá un cambio), evaluación nutricional y quincenales. <em>Martina Álvarez</em>: sífilis congénita. Generá la epicrisis y leé dos secciones.
          <span class="guide-ask">Preguntar: ¿la redacción y el orden son los que usan?</span></li>
        <li><strong>Importar (2 min).</strong> Pestaña <em>Documento</em>: procesá la nota de sala de partos y aceptá o rechazá campos.
          <span class="guide-ask">Preguntar: ¿tienen planillas históricas o derivaciones en PDF / Word?</span></li>
        <li><strong>Estadísticas y exportación (2 min).</strong> Tasas con denominador, filtro &lt; 1.500 g y las 7 hojas del Excel.
          <span class="guide-ask">Preguntar: ¿son las tasas que informan? ¿Falta alguna?</span></li>
        <li><strong>Cierre (2 min).</strong> Volvé a las cuatro preguntas y anotá las respuestas. El diccionario CSV (Exportación) sirve como planilla de relevamiento.</li>
      </ol>`
    );
  }

  function showNewPatientModal(presetSector) {
    openModal(
      "Ingreso rápido",
      `<p class="field-hint" style="margin-bottom:12px">Solo el nombre es obligatorio. Lo que no completes queda «Sin responder» y se carga después en la ficha de ingreso: la app nunca rellena datos clínicos por su cuenta.</p>
      ${quickAdmissionFields(presetSector)}`,
      `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
       <button class="btn btn-primary" type="button" id="confirm-new-patient-full">Crear y completar la ficha</button>`
    );
  }

  function nextCorrelativeId() {
    const num = state.patients.length + 1;
    return `NEO-2026-${String(num).padStart(6, "0")}`;
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function showPrintPreviewModal(title, text) {
    openModal(
      title,
      `<div style="background:#ffffff;border:1px solid var(--border-strong);padding:20px;font-family:var(--font-mono);font-size:13px;line-height:1.65;white-space:pre-wrap">${esc(text || "Generá primero el borrador para previsualizar el documento.")}</div>`,
      `<button class="btn btn-secondary" type="button" data-close-modal>Cerrar</button>
       <button class="btn btn-primary" type="button" onclick="window.print()">Imprimir / Guardar PDF</button>`
    );
  }

  // ===================== DOCUMENTOS FIRMADOS: ENMIENDAS Y REGENERACIÓN =====================
  const DRAFT_KINDS = {
    admission: { key: "admissionDraft", label: "ingreso", title: "Nota de ingreso" },
    epicrisis: { key: "epicrisisDraft", label: "epicrisis", title: "Epicrisis neonatal" }
  };

  function amendButtonHtml(kind, r) {
    if (!r.permissions.signDraft) return `<span class="status-pill status-na">Firmado · solo lectura</span>`;
    return `<button class="btn btn-primary" type="button" data-amend="${kind}">Crear enmienda</button>`;
  }

  function draftVersionsHtml(kind, draft) {
    const versions = draft.versions || [];
    if (!versions.length) return "";
    return `
      <div class="banner banner-info">
        <div>
          <strong>Versiones firmadas anteriores (${versions.length}).</strong>
          ${versions.map((v, i) => `
            <div style="margin-top:6px">
              <span class="mono">v${i + 1}</span> · firmada por ${esc(v.validatedBy)} el <span class="mono">${esc(ENG.fmtDate(v.validatedAt))}</span>
              · enmendada por ${esc(v.amendedBy)} el <span class="mono">${esc(ENG.fmtDate(v.amendedAt))}</span> · Motivo: ${esc(v.reason)}
              <button class="btn btn-ghost btn-sm" type="button" data-view-version="${kind}:${i}">Ver</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function epicrisisMissingItems(p) {
    const missing = [];
    if (!p.discharge.date) missing.push("fecha de egreso");
    if (!p.discharge.condition) missing.push("condición al egreso");
    if ((p.epicrisisDraft.text || "").includes("_____")) missing.push("completar los espacios _____ del texto");
    return missing;
  }

  // Hay ediciones manuales si el texto actual difiere del último texto que armó el sistema.
  // Estados guardados antes de este cambio no tienen generatedText: se tratan como editados por seguridad.
  function hasManualEdits(draft) {
    const text = (draft.text || "").trim();
    if (!text) return false;
    return draft.generatedText === undefined || text !== String(draft.generatedText).trim();
  }

  function openAmendModal(kind) {
    const cfg = DRAFT_KINDS[kind];
    openModal(
      `Crear enmienda · ${cfg.title}`,
      `<p class="field-hint" style="margin-bottom:12px">La versión firmada actual se conserva íntegra con su firma. El documento vuelve a borrador editable y requiere una nueva validación médica.</p>
       <div class="field">
         <label for="amend-reason">Motivo de la enmienda (obligatorio)</label>
         <textarea class="input" id="amend-reason" rows="3" placeholder="Ej. Corrección de peso al nacer informado por enfermería"></textarea>
       </div>`,
      `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
       <button class="btn btn-primary" type="button" data-confirm-amend="${kind}">Crear enmienda</button>`
    );
    document.getElementById("amend-reason")?.focus();
  }

  function confirmAmend(kind) {
    const cfg = DRAFT_KINDS[kind];
    const p = activePatient();
    const r = activeRole();
    if (!p || !r.permissions.signDraft) return;
    const draft = p[cfg.key];
    if (!draft.validated) { closeModal(); return; }
    const reason = (document.getElementById("amend-reason")?.value || "").trim();
    if (!reason) { toast("Indicá el motivo de la enmienda."); return; }
    draft.versions = [...(draft.versions || []), {
      text: draft.text,
      validatedBy: draft.validatedBy,
      validatedAt: draft.validatedAt,
      amendedBy: r.name,
      amendedAt: nowStamp(),
      reason
    }];
    draft.validated = false;
    draft.validatedBy = "";
    draft.validatedAt = "";
    draft.generatedText = draft.text;
    saveState();
    logAudit(`Enmienda de ${cfg.label}`, `${p.id} (${p.fullName})`, `Motivo: ${reason} · Versión firmada v${draft.versions.length} conservada`);
    closeModal();
    toast(`Enmienda abierta. La versión firmada quedó guardada como v${draft.versions.length}.`);
    render();
  }

  function viewDraftVersion(spec) {
    const [kind, idx] = spec.split(":");
    const cfg = DRAFT_KINDS[kind];
    const v = (activePatient()?.[cfg.key].versions || [])[Number(idx)];
    if (!v) return;
    showPrintPreviewModal(`${cfg.title} · v${Number(idx) + 1} (firmada por ${v.validatedBy})`, v.text);
  }

  // Pide confirmación antes de reemplazar ediciones manuales; los campos «_____» ya completados se conservan.
  function requestRegenerate(kind, run) {
    const cfg = DRAFT_KINDS[kind];
    const p = activePatient();
    if (!p || ui.draftLoading) return;
    const draft = p[cfg.key];
    if (draft.validated) { toast("El documento está firmado. Creá una enmienda para modificarlo."); return; }
    if (!hasManualEdits(draft)) { run(); return; }
    ui.pendingRegen = run;
    openModal(
      `Regenerar ${cfg.label}`,
      `<p>El texto tiene ediciones manuales. Al regenerar:</p>
       <ul style="margin:8px 0 0 18px;line-height:1.6">
         <li>Se conservan las líneas con espacios <span class="mono">_____</span> que ya completaste (por ejemplo, el examen físico).</li>
         <li>Cualquier otra edición manual se reemplaza por el texto que arma el sistema.</li>
       </ul>`,
      `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
       <button class="btn btn-primary" type="button" id="confirm-regen">Regenerar igual</button>`
    );
  }

  // ===================== EVENT BINDING =====================
  // Cero datos huérfanos: si la respuesta cerró una rama condicional, se descartan
  // todos sus subcampos con valor y el descarte queda en la bitácora de auditoría.
  function closeOrphanBranches(p, key, val) {
    const discarded = SCHEMA.discardClosedBranches(p);
    if (!discarded.length) return;
    const parent = SCHEMA.FIELD_BY_KEY[key];
    const branchName = parent ? parent.label : key;
    const detail = discarded.map((d) => `${d.label}: ${d.value}`).join(", ");
    logAudit(`Descarte de rama «${branchName}»`, `${p.id} (${p.fullName})`, `Respuesta cambiada a «${val === "" ? "Sin responder" : val}» · Subcampos descartados: ${detail}`);
    toast(`Rama «${branchName}» cerrada: ${discarded.length} subcampo(s) descartado(s) y registrado(s) en auditoría.`);
  }

  function bindViewEvents() {
    const main = document.getElementById("main");

    // Patient switcher in strip
    const ps = document.getElementById("patient-switcher");
    if (ps) {
      ps.onchange = () => {
        ui.selectedPatientId = ps.value;
        ui.dxSearch = "";
        render();
      };
    }

    // Tablas de controles seriados: se guarda al salir de cada celda.
    main.querySelectorAll("[data-series]").forEach((el) => {
      el.onchange = () => {
        const p = activePatient();
        const store = el.getAttribute("data-series") === "growth" ? TL.GROWTH.store : TL.LABS.store;
        const row = el.getAttribute("data-row");
        const key = el.getAttribute("data-key");
        const bag = p.hosp[store] || (p.hosp[store] = {});
        const rec = bag[row] || (bag[row] = {});
        rec[key] = el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value;
        saveState();
        // Se redibuja cuando el foco ya pasó a la celda siguiente (Tab sigue avanzando).
        setTimeout(() => {
          const a = document.activeElement;
          const sel = a && a.dataset && a.dataset.series ? `[data-series="${a.dataset.series}"][data-row="${a.dataset.row}"][data-key="${a.dataset.key}"]` : null;
          const scroll = document.querySelector(`#series-${el.getAttribute("data-series")} .series-wrap`);
          const left = scroll ? scroll.scrollLeft : 0;
          render();
          const wrap = document.querySelector(`#series-${el.getAttribute("data-series")} .series-wrap`);
          if (wrap) wrap.scrollLeft = left;
          const again = sel && document.querySelector(sel);
          if (again) again.focus({ preventScroll: true });
        }, 0);
      };
    });

    const saveMe = document.getElementById("btn-save-me");
    if (saveMe) saveMe.onclick = () => {
      const u = activeUser();
      const name = (document.getElementById("me-name").value || "").trim();
      if (!name) { toast("El nombre no puede quedar vacío."); return; }
      const before = `${u.name} · ${u.matricula}`;
      u.name = name;
      u.matricula = (document.getElementById("me-mat").value || "").trim();
      saveState();
      logAudit("Edición de perfil propio", u.name, `${before} → ${u.name} · ${u.matricula}`);
      toast("Perfil guardado: así vas a figurar en las firmas.");
      render();
    };
    const backup = document.getElementById("btn-backup");
    if (backup) backup.onclick = () => {
      downloadFile(`neosalud_respaldo_${ENG.REF_DATE}.json`, JSON.stringify(state, null, 2), "application/json");
      logAudit("Respaldo descargado", "Base de la maqueta", `${state.patients.length} pacientes · ${state.users.length} usuarios`);
      toast("Copia de seguridad descargada.");
    };

    const ingSearch = document.getElementById("ingreso-search");
    if (ingSearch) {
      ingSearch.oninput = () => {
        ui.ingresoSearch = ingSearch.value;
        render();
        const again = document.getElementById("ingreso-search");
        if (again) { again.focus(); again.setSelectionRange(ui.ingresoSearch.length, ui.ingresoSearch.length); }
      };
    }

    // Hospitalización y epicrisis: búsqueda en la lista de pacientes
    const heSearch = document.getElementById("he-search");
    if (heSearch) {
      heSearch.oninput = () => {
        ui.heSearch = heSearch.value;
        render();
        const again = document.getElementById("he-search");
        if (again) { again.focus(); again.setSelectionRange(ui.heSearch.length, ui.heSearch.length); }
      };
    }

    // Unidad: resaltar los bebés con datos por completar
    const btnMissing = document.getElementById("btn-unit-missing");
    if (btnMissing) btnMissing.onclick = () => { ui.unitFilter = ui.unitFilter === "missing" ? "" : "missing"; render(); };

    // Búsqueda en Unidad
    const unitSearch = document.getElementById("unit-search");
    if (unitSearch) {
      unitSearch.oninput = () => {
        ui.unitSearch = unitSearch.value;
        render();
        const again = document.getElementById("unit-search");
        if (again) { again.focus(); again.setSelectionRange(ui.unitSearch.length, ui.unitSearch.length); }
      };
    }
    main.querySelectorAll("tr[data-open-patient]").forEach((tr) => {
      tr.onkeydown = (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tr.click(); } };
    });

    // New patient triggers
    const btnNew = document.getElementById("btn-new-patient");
    if (btnNew) btnNew.onclick = () => showNewPatientModal();

    // Patient filters
    ["pf-text", "pf-status", "pf-sector", "pf-ga"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const map = { "pf-text": "text", "pf-status": "status", "pf-sector": "sector", "pf-ga": "gaGroup" };
      el.oninput = () => {
        ui.patientFilters[map[id]] = el.value;
        render();
        const refocused = document.getElementById(id);
        if (refocused && id === "pf-text") { refocused.focus(); refocused.setSelectionRange(el.value.length, el.value.length); }
      };
    });

    // Ingreso variable filter
    const ivf = document.getElementById("ingreso-var-filter");
    if (ivf) {
      ivf.oninput = () => {
        ui.ingresoVarFilter = ivf.value;
        render();
        const f = document.getElementById("ingreso-var-filter");
        if (f) { f.focus(); f.setSelectionRange(ivf.value.length, ivf.value.length); }
      };
    }

    // Ingreso structured fields (patient-level and admission-level)
    main.querySelectorAll("[data-pfield], [data-afield], [data-dfield], [data-sfield]").forEach((el) => {
      el.onchange = () => {
        const p = activePatient();
        if (!p) return;
        const pf = el.getAttribute("data-pfield");
        const af = el.getAttribute("data-afield");
        const df = el.getAttribute("data-dfield");
        const sf = el.getAttribute("data-sfield");
        const val = el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value;

        if (sf) {
          const field = SCHEMA.FIELD_BY_KEY[sf];
          SCHEMA.writeField(p, field, val);
          if (field.scope === "d" && sf === "date") p.dischargeDate = val;
        } else if (pf) {
          p[pf] = val;
        } else if (af) {
          p.admission[af] = val;
        } else if (df) {
          p.discharge[df] = val;
          if (df === "date") p.dischargeDate = val;
        }

        if (sf || pf || af) closeOrphanBranches(p, sf || pf || af, val);

        const focusId = el.id;
        saveState();
        render();
        // Al re-renderizar se conserva el foco en el mismo campo (navegación con teclado).
        const again = focusId && document.getElementById(focusId);
        if (again) again.focus();
      };
    });

    // Secciones colapsables de la ficha: se recuerda cuáles cerró el usuario.
    main.querySelectorAll("details.form-section").forEach((d) => {
      d.addEventListener("toggle", () => { ui.collapsedSections[d.dataset.section] = !d.open; });
    });

    // Parámetros institucionales (Administración)
    main.querySelectorAll("[data-inst]").forEach((el) => {
      el.onchange = () => {
        const key = el.getAttribute("data-inst");
        const before = state[key];
        state[key] = el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value.trim();
        saveState();
        logAudit("Cambio de parámetro institucional", key, `${before} → ${state[key]}`);
        toast("Parámetro institucional actualizado.");
        render();
      };
    });

    // CIE-10 search
    const dxs = document.getElementById("dx-search-input");
    if (dxs) {
      dxs.oninput = () => {
        ui.dxSearch = dxs.value;
        render();
        const el = document.getElementById("dx-search-input");
        if (el) { el.focus(); el.setSelectionRange(ui.dxSearch.length, ui.dxSearch.length); }
      };
    }

    // Draft text edits
    const admTa = document.getElementById("adm-draft-text");
    if (admTa) {
      admTa.oninput = () => {
        const p = activePatient();
        if (!p || p.admissionDraft.validated) return;
        p.admissionDraft.text = admTa.value;
        saveState();
      };
    }

    const epiTa = document.getElementById("epi-draft-text");
    if (epiTa) {
      epiTa.oninput = () => {
        const p = activePatient();
        if (!p || p.epicrisisDraft.validated) return;
        p.epicrisisDraft.text = epiTa.value;
        saveState();
      };
    }

    // Generate / Sign Admission Draft (with mocked consolidation loading state)
    const genAdm = () => {
      const p = activePatient();
      if (!p || ui.draftLoading) return;
      ui.draftLoading = "admission";
      render();
      setTimeout(() => {
        const merged = ENG.carryOverCompletedFields(p.admissionDraft.text, ENG.generateAdmissionDraft(p));
        p.admissionDraft.text = merged;
        p.admissionDraft.generatedText = merged;
        p.admissionDraft.snapshot = ENG.admissionSnapshot(p);
        p.admissionDraft.validated = false;
        ui.draftLoading = null;
        saveState();
        logAudit("Generación de borrador de ingreso", `${p.id} (${p.fullName})`, "Generado de forma determinística desde ficha estructurada");
        toast("Borrador de ingreso generado.");
        render();
      }, 650);
    };
    const bGenAdm = document.getElementById("btn-gen-adm-draft");
    if (bGenAdm) bGenAdm.onclick = () => requestRegenerate("admission", genAdm);
    const bRegenAdm = document.getElementById("btn-regen-adm-draft");
    if (bRegenAdm) bRegenAdm.onclick = () => requestRegenerate("admission", genAdm);

    const bPrevAdm = document.getElementById("btn-preview-adm-pdf");
    if (bPrevAdm) bPrevAdm.onclick = () => showPrintPreviewModal("Vista previa PDF · Nota de ingreso", activePatient()?.admissionDraft.text);

    const bSignAdm = document.getElementById("btn-sign-adm");
    if (bSignAdm) {
      bSignAdm.onclick = () => {
        const p = activePatient();
        const r = activeRole();
        if (!p || !r.permissions.signDraft) return;
        if (!p.admissionDraft.text.trim()) {
          toast("Generá el borrador de ingreso antes de validar.");
          return;
        }
        if (p.admissionDraft.text.includes("_____")) {
          toast("Completá los espacios _____ del examen físico antes de validar.");
          return;
        }
        if (ENG.computeDraftDiff(p, "admission").length) {
          toast("El borrador quedó desfasado respecto a los datos. Regeneralo antes de firmar.");
          return;
        }
        p.admissionDraft.validated = true;
        p.admissionDraft.validatedBy = r.name;
        p.admissionDraft.validatedAt = nowStamp();
        if (p.status === "ingreso_incompleto") p.status = "hospitalizado";
        saveState();
        logAudit("Validación de ingreso", `${p.id} (${p.fullName})`, `Firmado por ${r.name} · Estado: ${p.status}`);
        toast("Ingreso validado y firmado.");
        render();
      };
    }

    // Generate / Sign Epicrisis Draft (with mocked synthesis loading state)
    const genEpi = () => {
      const p = activePatient();
      if (!p || ui.draftLoading) return;
      ui.draftLoading = "epicrisis";
      render();
      setTimeout(() => {
        const merged = ENG.carryOverCompletedFields(p.epicrisisDraft.text, ENG.generateEpicrisisDraft(p));
        p.epicrisisDraft.text = merged;
        p.epicrisisDraft.generatedText = merged;
        p.epicrisisDraft.snapshot = ENG.epicrisisSnapshot(p);
        p.epicrisisDraft.validated = false;
        ui.draftLoading = null;
        saveState();
        logAudit("Generación de borrador de epicrisis", `${p.id} (${p.fullName})`, "Sintetizada desde líneas de tiempo por sistema");
        toast("Borrador de epicrisis generado.");
        render();
      }, 700);
    };
    const bGenEpi = document.getElementById("btn-gen-epi-draft");
    if (bGenEpi) bGenEpi.onclick = () => requestRegenerate("epicrisis", genEpi);
    const bRegenEpi = document.getElementById("btn-regen-epi-draft");
    if (bRegenEpi) bRegenEpi.onclick = () => requestRegenerate("epicrisis", genEpi);

    const bPrevEpi = document.getElementById("btn-preview-epi-pdf");
    if (bPrevEpi) bPrevEpi.onclick = () => showPrintPreviewModal("Vista previa PDF · Epicrisis neonatal", activePatient()?.epicrisisDraft.text);

    const bSignEpi = document.getElementById("btn-sign-epi");
    if (bSignEpi) {
      bSignEpi.onclick = () => {
        const p = activePatient();
        const r = activeRole();
        if (!p || !r.permissions.signDraft) return;
        if (!p.epicrisisDraft.text.trim()) {
          toast("Generá la epicrisis antes de validarla.");
          return;
        }
        const missing = epicrisisMissingItems(p);
        if (missing.length) {
          toast(`No se puede validar: falta ${missing.join(", ")}.`);
          return;
        }
        if (ENG.computeDraftDiff(p, "epicrisis").length) {
          toast("La epicrisis quedó desfasada tras cambios en la ficha. Regenerala antes de firmar.");
          return;
        }
        p.epicrisisDraft.validated = true;
        p.epicrisisDraft.validatedBy = r.name;
        p.epicrisisDraft.validatedAt = nowStamp();
        p.dischargeDate = p.discharge.date;
        p.status = p.discharge.condition === "Fallecido" ? "fallecido" : "egresado";
        saveState();
        logAudit("Validación de epicrisis", `${p.id} (${p.fullName})`, `Firmada por ${r.name} · Estado final: ${p.status}`);
        toast("Epicrisis validada y firmada.");
        render();
      };
    }

    // Import controls
    const bDlTpl = document.getElementById("btn-dl-template");
    if (bDlTpl) {
      bDlTpl.onclick = () => {
        const csv = "hc,nombre,madre,sexo,fecha_nacimiento,eg_sem,eg_dias,peso_g,sector\nHC-91501,Clara Navarro,Paula Navarro,F,2026-11-20,37,2,2980,Intermedios\n";
        downloadFile("plantilla_neosalud_v1.csv", csv, "text/csv;charset=utf-8");
        toast("Plantilla CSV oficial descargada.");
      };
    }

    const bSample = document.getElementById("btn-load-sample-batch");
    if (bSample) {
      bSample.onclick = () => {
        const sample = JSON.parse(JSON.stringify(state.sampleImportBatches.censoSemanal));
        runImportLoader(sample.fileName, () => {
          ui.activeBatch = sample;
          ui.importStep = 3;
          render();
          toast("Lote de ejemplo validado con barrera de 3 identificadores.");
        });
      };
    }

    const csvInput = document.getElementById("csv-file-input");
    if (csvInput) {
      csvInput.onchange = () => {
        const file = csvInput.files && csvInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const lines = String(reader.result || "").trim().split(/\r?\n/);
          const rows = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",").map((x) => x.trim());
            if (cols.length < 8) continue;
            const [hc, fullName, motherName, sex, birthDate, gaW, gaD, wt, sector] = cols;
            const existing = state.patients.find((pt) => pt.hc === hc);
            const sexMatch = existing ? existing.sex === sex : true;
            const birthMatch = existing ? existing.birthDate === birthDate : true;
            const blocked = existing && (!sexMatch || !birthMatch);
            rows.push({
              rowId: "csv-" + i,
              action: existing ? "update" : "create",
              targetId: existing ? existing.id : null,
              hc, fullName, motherName, sex, birthDate,
              gaWeeks: Number(gaW) || 37,
              gaDays: Number(gaD) || 0,
              birthWeight: Number(wt) || 3000,
              sector: sector || "Intermedios",
              idCheck: { hc: true, sex: sexMatch, birthDate: birthMatch, status: blocked ? "blocked" : existing ? "verified" : "new" },
              warnings: blocked ? ["BLOQUEO 3-ID: Los identificadores no coinciden con la ficha existente."] : [],
              decision: blocked ? "rejected" : "pending"
            });
          }
          if (!rows.length) {
            toast("No se encontraron filas válidas en el archivo CSV.");
            return;
          }
          runImportLoader(file.name, () => {
            ui.activeBatch = { fileName: file.name, uploadedAt: nowStamp(), rows };
            ui.importStep = 3;
            render();
            toast(`Archivo ${file.name} analizado (${rows.length} filas).`);
          });
        };
        reader.readAsText(file);
      };
    }

    const bClearBatch = document.getElementById("btn-clear-batch");
    if (bClearBatch) {
      bClearBatch.onclick = () => { ui.activeBatch = null; ui.importStep = 1; render(); };
    }

    const bCommitBatch = document.getElementById("btn-commit-batch");
    if (bCommitBatch) {
      bCommitBatch.onclick = () => {
        if (!ui.activeBatch || ui.importLoading) return;
        const batchSnapshot = ui.activeBatch;
        ui.importLoading = {
          title: "Aplicando lote aprobado",
          stepText: "Impactando registros verificados y registrando bitácora de auditoría...",
          pct: 82
        };
        render();
        setTimeout(() => {
          let created = 0, updated = 0;
          for (const row of batchSnapshot.rows) {
            if (row.decision !== "approved" || row.idCheck.status === "blocked") continue;
            if (row.action === "create") {
              const newId = nextCorrelativeId();
              state.patients.unshift(DATA.createBlankPatient({
                id: newId, hc: row.hc, fullName: row.fullName, motherName: row.motherName,
                sex: row.sex, birthDate: row.birthDate, admitDate: row.birthDate, sector: row.sector,
                gaWeeks: row.gaWeeks, gaDays: row.gaDays, birthWeight: row.birthWeight
              }));
              created++;
            } else if (row.targetId) {
              const target = state.patients.find((p) => p.id === row.targetId);
              if (target) {
                if (row.tempC) target.admission.tempC = row.tempC;
                if (row.maternalAge) target.admission.maternalAge = row.maternalAge;
                updated++;
              }
            }
          }
          logAudit("Importación Excel/CSV confirmada", batchSnapshot.fileName, `${created} paciente(s) creado(s), ${updated} actualizado(s) tras revisión humana`);
          ui.importLoading = null;
          ui.activeBatch = null;
          ui.importStep = 1;
          saveState();
          toast(`Importación aplicada: ${created} alta(s) y ${updated} actualización(es).`);
          navigate("pacientes");
        }, 650);
      };
    }

    // Stats filters
    ["sf-sector", "sf-ga", "sf-wt"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const map = { "sf-sector": "sector", "sf-ga": "gaGroup", "sf-wt": "weightGroup" };
      el.onchange = () => { ui.statsFilters[map[id]] = el.value; render(); };
    });

    // Export downloads (with brief mocked preparation spinner)
    function runExportWithSpinner(key, fn) {
      if (ui.exportLoading) return;
      ui.exportLoading = key;
      render();
      setTimeout(() => {
        ui.exportLoading = null;
        fn();
        render();
      }, 480);
    }

    const bExpMaster = document.getElementById("btn-exp-master");
    if (bExpMaster) {
      bExpMaster.onclick = () => runExportWithSpinner("master", () => {
        const header = "id,hc,nombre,sexo,eg_sem,eg_dias,peso_g,fenton,dias_o2,dbp_jensen,dias_cateter,estado\n";
        const body = state.patients.map((p) => {
          const fen = ENG.calcFenton2025(p.gaWeeks, p.gaDays, p.sex, p.birthWeight);
          const resp = ENG.deriveRespiratory(p);
          const cath = ENG.deriveCatheters(p);
          return [p.id, p.hc, `"${p.fullName}"`, p.sex, p.gaWeeks, p.gaDays, p.birthWeight, `"${fen.classification}"`, resp.totals.o2, `"${resp.jensen}"`, cath.totalDays, p.status].join(",");
        }).join("\n");
        downloadFile(`neosalud_base_maestra_${ENG.REF_DATE}.csv`, header + body, "text/csv;charset=utf-8");
        logAudit("Exportación Base Maestra", "CSV institucional", `${state.patients.length} registros`);
        toast("Base maestra descargada.");
      });
    }

    const bExpAnon = document.getElementById("btn-exp-anon");
    if (bExpAnon) {
      bExpAnon.onclick = () => runExportWithSpinner("anon", () => {
        const header = "codigo_anon,sexo,eg_sem,eg_dias,peso_g,dbp_jensen,estado\n";
        const body = state.patients.map((p, idx) => [
          `ANON-${String(idx + 1).padStart(4, "0")}`, p.sex, p.gaWeeks, p.gaDays, p.birthWeight, `"${ENG.deriveRespiratory(p).jensen}"`, p.status
        ].join(",")).join("\n");
        downloadFile(`neosalud_pseudonimizado_${ENG.REF_DATE}.csv`, header + body, "text/csv;charset=utf-8");
        logAudit("Exportación pseudonimizada", "CSV sin datos filiatorios", `${state.patients.length} registros`);
        toast("CSV pseudonimizado descargado.");
      });
    }

    const bExpJson = document.getElementById("btn-exp-json");
    if (bExpJson) {
      bExpJson.onclick = () => runExportWithSpinner("json", () => {
        downloadFile(`neosalud_completo_${ENG.REF_DATE}.json`, JSON.stringify(state.patients, null, 2), "application/json");
        logAudit("Exportación JSON completo", "Dataset clínico", `${state.patients.length} pacientes`);
        toast("JSON completo descargado.");
      });
    }

    const bExpDict = document.getElementById("btn-exp-dict");
    if (bExpDict) {
      bExpDict.onclick = () => runExportWithSpinner("dict", () => {
        const rows = dictionaryRows();
        const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
        const csv = ["variable;etiqueta;modulo;tipo;valores_o_regla;estado"]
          .concat(rows.map((d) => [d.key, d.label, d.module, d.type, d.domain, d.status].map(q).join(";")))
          .join("\n");
        downloadFile("diccionario_datos_neosalud_v2.csv", "\ufeff" + csv, "text/csv;charset=utf-8");
        toast("Diccionario de datos descargado.");
      });
    }
  }

  // Global delegated clicks (nav, modals, patient buttons, tabs)
  document.addEventListener("click", (e) => {
    const t = e.target;

    const freeCuna = t.closest("[data-new-patient-sector]");
    if (freeCuna) { showNewPatientModal(freeCuna.getAttribute("data-new-patient-sector")); return; }

    const importMode = t.closest("[data-import-mode]");
    if (importMode) { ui.importMode = importMode.getAttribute("data-import-mode"); render(); return; }

    const docSample = t.closest("[data-doc-sample]");
    if (docSample) { startDocImport(docSample.getAttribute("data-doc-sample")); return; }

    const docDecision = t.closest("[data-doc-decision]");
    if (docDecision && ui.docImport) {
      const key = docDecision.getAttribute("data-doc-decision");
      const val = docDecision.getAttribute("data-doc-value");
      ui.docImport.decisions[key] = ui.docImport.decisions[key] === val ? "pending" : val;
      ui.docImport.focusKey = key;
      render();
      return;
    }

    const docFocus = t.closest("[data-doc-focus]");
    if (docFocus && ui.docImport) { ui.docImport.focusKey = docFocus.getAttribute("data-doc-focus"); render(); return; }

    if (t.id === "btn-doc-reset") { ui.docImport = null; render(); return; }
    if (t.id === "btn-doc-commit" && ui.docImport) { commitDocImport(); return; }
    if (t.id === "btn-doc-accept-safe" && ui.docImport) {
      const sample = DOC_SAMPLES.find((d) => d.id === ui.docImport.sampleId);
      const p = state.patients.find((x) => x.id === sample.targetId);
      for (const pr of sample.proposals) {
        const cur = SCHEMA.readField(p, SCHEMA.FIELD_BY_KEY[pr.key]);
        if (cur === "" && !ui.docImport.decisions[pr.key]) ui.docImport.decisions[pr.key] = "accepted";
      }
      render();
      return;
    }

    // Cronologías: alta, edición y baja
    const tlAdd = t.closest("[data-tl-add]");
    if (tlAdd) { openTimelineEditor(tlAdd.getAttribute("data-tl-add"), null); return; }
    const tlEdit = t.closest("[data-tl-edit]");
    if (tlEdit) { openTimelineEditor(tlEdit.getAttribute("data-tl-edit"), tlEdit.getAttribute("data-tl-id")); return; }
    const tile = t.closest("[data-tlf-tile]");
    if (tile && ui.tlEdit) {
      const key = tile.getAttribute("data-tlf-tile");
      ui.tlEdit.rec[key] = tile.getAttribute("data-val");
      ui.tlEdit.error = "";
      renderTimelineEditor();
      const again = document.querySelector(`[data-tlf-tile="${key}"][data-val="${tile.getAttribute("data-val")}"]`);
      if (again) again.focus();
      return;
    }
    if (t.closest("#tl-save") && ui.tlEdit) { saveTimelineRecord(); return; }
    if (t.closest("#tl-delete") && ui.tlEdit) { deleteTimelineRecord(); return; }

    // Lista de faltantes de la epicrisis: lleva al campo.
    const goto = t.closest("[data-goto-field]");
    if (goto) {
      const el = document.getElementById(`fx-${goto.getAttribute("data-goto-field")}`)
        || document.querySelector(`[data-yn="${goto.getAttribute("data-goto-field")}"]`);
      if (el) {
        const det = el.closest("details");
        if (det) det.open = true;
        el.scrollIntoView({ block: "center" });
        el.focus({ preventScroll: true });
      }
      return;
    }

    const hePt = t.closest("[data-he-patient]");
    if (hePt) { ui.selectedPatientId = hePt.getAttribute("data-he-patient"); ui.dxSearch = ""; render(); return; }

    const heTab = t.closest("[data-he-tab]");
    if (heTab) {
      ui.heTab = heTab.getAttribute("data-he-tab");
      render();
      const on = document.querySelector(`.he-tab[data-he-tab="${ui.heTab}"]`);
      if (on) { on.focus({ preventScroll: true }); on.scrollIntoView({ block: "nearest", inline: "nearest" }); }
      return;
    }

    const heFilter = t.closest("[data-he-filter]");
    if (heFilter) { ui.heFilter = heFilter.getAttribute("data-he-filter"); render(); return; }

    // Sí / No: un clic responde; volver a tocar la misma respuesta la borra.
    const ynBtn = t.closest("[data-yn]");
    if (ynBtn && !ynBtn.disabled) {
      const p = activePatient();
      const key = ynBtn.getAttribute("data-yn");
      const field = SCHEMA.FIELD_BY_KEY[key];
      const val = SCHEMA.readField(p, field) === ynBtn.getAttribute("data-yn-val") ? "" : ynBtn.getAttribute("data-yn-val");
      SCHEMA.writeField(p, field, val);
      closeOrphanBranches(p, key, val);
      saveState();
      render();
      const again = document.querySelector(`[data-yn="${key}"][data-yn-val="${ynBtn.getAttribute("data-yn-val")}"]`);
      if (again) again.focus({ preventScroll: true });
      return;
    }

    const navBtn = t.closest("[data-nav]");
    if (navBtn) {
      navigate(navBtn.getAttribute("data-nav"));
      return;
    }

    const openPt = t.closest("[data-open-patient]");
    if (openPt) {
      navigate(openPt.getAttribute("data-target-route") || "ingreso", openPt.getAttribute("data-open-patient"));
      return;
    }

    const transferBtn = t.closest("[data-transfer-patient]");
    if (transferBtn) {
      const pid = transferBtn.getAttribute("data-transfer-patient");
      const p = state.patients.find((x) => x.id === pid);
      if (!p) return;
      openModal(
        `Pase de sector · ${p.fullName}`,
        `<div class="field"><label for="tr-sec">Nuevo sector</label><select class="select" id="tr-sec">${DATA.SECTORS.map((s) => `<option value="${esc(s.id)}" ${s.id === p.sector ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div>`,
        `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
         <button class="btn btn-primary" type="button" data-confirm-transfer="${esc(p.id)}">Confirmar pase</button>`
      );
      return;
    }

    const confirmTr = t.closest("[data-confirm-transfer]");
    if (confirmTr) {
      const pid = confirmTr.getAttribute("data-confirm-transfer");
      const p = state.patients.find((x) => x.id === pid);
      const nextSec = document.getElementById("tr-sec")?.value;
      if (p && nextSec && nextSec !== p.sector) {
        const prev = p.sector;
        p.sector = nextSec;
        saveState();
        logAudit("Pase interno de sector", `${p.id} (${p.fullName})`, `${prev} → ${nextSec}`);
        toast(`Sector actualizado: ${prev} → ${nextSec}.`);
      }
      closeModal();
      render();
      return;
    }

    const addDx = t.closest("[data-add-dx]");
    if (addDx) {
      const p = activePatient();
      const code = addDx.getAttribute("data-add-dx");
      if (p && !p.admission.diagnoses.includes(code)) {
        p.admission.diagnoses.push(code);
        ui.dxSearch = "";
        saveState();
        render();
      }
      return;
    }

    const remDx = t.closest("[data-rem-dx]");
    if (remDx) {
      const p = activePatient();
      const code = remDx.getAttribute("data-rem-dx");
      if (p) {
        p.admission.diagnoses = p.admission.diagnoses.filter((c) => c !== code);
        saveState();
        render();
      }
      return;
    }


    const covBtn = t.closest("[data-set-cov]");
    if (covBtn) {
      const p = activePatient();
      const field = covBtn.getAttribute("data-set-cov");
      const val = covBtn.getAttribute("data-cov-val");
      if (p) {
        p.hosp[field] = val;
        saveState();
        logAudit("Cambio de cobertura de cronología", `${p.id} (${p.fullName})`, `${field} = ${val}`);
        toast(`Cobertura marcada como: ${val}.`);
        render();
      }
      return;
    }

    const batchDec = t.closest("[data-batch-row]");
    if (batchDec && ui.activeBatch) {
      const rid = batchDec.getAttribute("data-batch-row");
      const dec = batchDec.getAttribute("data-batch-dec");
      const row = ui.activeBatch.rows.find((x) => x.rowId === rid);
      if (row && row.idCheck.status !== "blocked") {
        row.decision = dec;
        render();
      }
      return;
    }

    const expSheet = t.closest("[data-exp-sheet]");
    if (expSheet) {
      ui.exportPreviewSheet = expSheet.getAttribute("data-exp-sheet");
      render();
      return;
    }

    // Login simulado
    const loginBtn = t.closest("[data-login-user]");
    if (loginBtn) {
      state.activeUserId = loginBtn.getAttribute("data-login-user");
      setSession(true);
      saveState();
      logAudit("Inicio de sesión", activeRole().name, activeRole().roleLabel);
      ui.route = "unidad";
      render();
      toast(`Ingresaste como ${activeRole().name} (${activeRole().roleLabel}).`);
      return;
    }

    // Administración
    const adminTab = t.closest("[data-admin-tab]");
    if (adminTab) { ui.adminTab = adminTab.getAttribute("data-admin-tab"); render(); return; }
    const adminGo = t.closest("[data-admin-go]");
    if (adminGo) { ui.adminTab = adminGo.getAttribute("data-admin-go"); navigate("admin"); return; }
    const userEdit = t.closest("[data-user-edit]");
    if (userEdit) { showUserModal(userEdit.getAttribute("data-user-edit") || null); return; }
    if (t.closest("#us-save")) { saveUserFromModal(t.closest("#us-save").getAttribute("data-user-id") || null); return; }
    const userToggle = t.closest("[data-user-toggle]");
    if (userToggle) {
      const u = state.users.find((x) => x.id === userToggle.getAttribute("data-user-toggle"));
      const admins = state.users.filter((x) => x.active && roleOf(x.roleId).permissions.admin);
      if (u.active && roleOf(u.roleId).permissions.admin && admins.length <= 1) { toast("Es el único usuario que administra: no se puede desactivar."); return; }
      u.active = !u.active;
      saveState();
      logAudit(u.active ? "Reactivación de usuario" : "Baja de usuario", u.name, roleOf(u.roleId).label);
      toast(u.active ? `${u.name} vuelve a estar activo.` : `${u.name} quedó inactivo: ya no puede ingresar.`);
      render();
      return;
    }

    // Accesos del tablero de Inicio
    const scrollTo = t.closest("[data-scroll-to]");
    if (scrollTo) { const el = document.getElementById(scrollTo.getAttribute("data-scroll-to")); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const heFilterGo = t.closest("[data-he-filter-go]");
    if (heFilterGo) { ui.heFilter = heFilterGo.getAttribute("data-he-filter-go"); ui.heTab = "resumen"; navigate("he"); return; }
    const heGoto = t.closest("[data-he-goto]");
    if (heGoto) {
      ui.selectedPatientId = heGoto.getAttribute("data-he-goto");
      ui.heTab = heGoto.getAttribute("data-he-goto-tab");
      ui.heFilter = "activos";
      navigate("he");
      return;
    }


    if (t.closest("[data-close-modal]") || t.closest("#modal-close") || t.id === "modal-backdrop") {
      closeModal();
      return;
    }

    const amendBtn = t.closest("[data-amend]");
    if (amendBtn) { openAmendModal(amendBtn.getAttribute("data-amend")); return; }

    const confirmAmendBtn = t.closest("[data-confirm-amend]");
    if (confirmAmendBtn) { confirmAmend(confirmAmendBtn.getAttribute("data-confirm-amend")); return; }

    const viewVersionBtn = t.closest("[data-view-version]");
    if (viewVersionBtn) { viewDraftVersion(viewVersionBtn.getAttribute("data-view-version")); return; }

    if (t.id === "confirm-regen") {
      const run = ui.pendingRegen;
      ui.pendingRegen = null;
      closeModal();
      if (run) run();
      return;
    }

    // Modal confirm handlers
    if (t.id === "confirm-new-patient" || t.id === "confirm-new-patient-full") {
      const fullName = document.getElementById("np-name")?.value.trim();
      if (!fullName) { toast("Ingresá un nombre para el recién nacido."); return; }
      const newId = nextCorrelativeId();
      const optNum = (id) => { const raw = (document.getElementById(id)?.value || "").trim(); return raw === "" ? "" : Number(raw); };
      const newPt = DATA.createBlankPatient({
        id: newId,
        fullName,
        hc: (document.getElementById("np-hc")?.value || "").trim(),
        motherName: (document.getElementById("np-mother")?.value || "").trim(),
        sex: document.getElementById("np-sex")?.value || "",
        birthDate: document.getElementById("np-bdate")?.value || "",
        admitDate: document.getElementById("np-adate")?.value || "",
        sector: document.getElementById("np-sector")?.value || "",
        gaWeeks: optNum("np-gaw"),
        gaDays: optNum("np-gad"),
        birthWeight: optNum("np-wt")
      });
      state.patients.unshift(newPt);
      saveState();
      logAudit("Alta rápida de paciente", `${newId} (${fullName})`, `Sector ${newPt.sector} · Estado: ingreso_incompleto`);
      closeModal();
      if (t.id === "confirm-new-patient") {
        toast(`${fullName} ingresado (${newId}). Podés seguir con el próximo.`);
        render();
        document.getElementById("np-name")?.focus();
        return;
      }
      toast(`Paciente ${newId} creado en Ingreso incompleto.`);
      navigate("ingreso", newId);
      return;
    }

  });

  // Administración: permisos por rol (se aplican al instante) y ayuda del rol en el alta de usuario.
  document.addEventListener("change", (e) => {
    const cb = e.target.closest && e.target.closest("[data-perm-role]");
    if (cb) {
      const role = roleOf(cb.getAttribute("data-perm-role"));
      const key = cb.getAttribute("data-perm-key");
      if (role.id === "jefatura" && key === "admin") return;
      role.permissions[key] = cb.checked;
      saveState();
      const label = DATA.PERMISSIONS.find((x) => x[0] === key)[1];
      logAudit("Cambio de permisos", role.label, `${label}: ${cb.checked ? "habilitado" : "quitado"}`);
      toast(`${role.label}: «${label}» ${cb.checked ? "habilitado" : "quitado"}.`);
      render();
      const again = document.querySelector(`[data-perm-role="${role.id}"][data-perm-key="${key}"]`);
      if (again) again.focus();
      return;
    }
    if (e.target.id === "us-role") {
      const help = document.getElementById("us-role-help");
      if (help) help.textContent = DATA.ROLE_INFO[e.target.value] || "";
    }
  });

  // Campos del editor de cronologías: los desplegables pueden abrir o cerrar otros campos.
  document.addEventListener("change", (e) => {
    const f = e.target.closest && e.target.closest("[data-tlf]");
    if (!f || !ui.tlEdit) return;
    const field = TL.TIMELINES[ui.tlEdit.kind].fields.find((x) => x.key === f.getAttribute("data-tlf"));
    ui.tlEdit.rec[field.key] = field.type === "number" ? (f.value === "" ? "" : Number(f.value)) : f.value;
    ui.tlEdit.error = "";
    if (field.type === "select" || field.type === "date") renderTimelineEditor(f.id);
  });
  document.addEventListener("input", (e) => {
    const f = e.target.closest && e.target.closest("[data-tlf]");
    if (!f || !ui.tlEdit || f.tagName === "SELECT") return;
    const field = TL.TIMELINES[ui.tlEdit.kind].fields.find((x) => x.key === f.getAttribute("data-tlf"));
    ui.tlEdit.rec[field.key] = field.type === "number" ? (f.value === "" ? "" : Number(f.value)) : f.value;
  });

  // Static shell buttons
  document.getElementById("brand-btn").onclick = () => navigate("inicio");
  // El botón del perfil cierra la sesión simulada y vuelve a la pantalla de perfiles.
  document.getElementById("role-trigger").onclick = () => {
    logAudit("Cierre de sesión", activeRole().name, activeRole().roleLabel);
    setSession(false);
    closeModal();
    closeDrawer();
    render();
    window.scrollTo({ top: 0 });
  };
  document.getElementById("open-guide-btn").onclick = showGuideModal;
  document.getElementById("open-rail-btn").onclick = openDrawer;
  document.getElementById("close-rail-btn").onclick = closeDrawer;
  document.getElementById("drawer-scrim").onclick = closeDrawer;
  document.getElementById("reset-demo-btn").onclick = () => {
    state = prepareState(DATA.createSeedState());
    hydrateInitialDrafts();
    ui.selectedPatientId = state.patients[0].id;
    ui.activeBatch = null;
    ui.importStep = 1;
    saveState();
    toast(`Maqueta reiniciada: ${state.patients.length} pacientes ficticios.`);
    navigate("inicio");
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeDrawer();
    }
  });

  // Seed pre-generated drafts for Alma Rios so Epicrisis/Ingreso look rich out of the box
  function hydrateInitialDrafts() {
    let changed = false;
    for (const p of state.patients) {
      if (p.admissionDraft.validated && !p.admissionDraft.text) {
        p.admissionDraft.text = ENG.generateAdmissionDraft(p);
        p.admissionDraft.generatedText = p.admissionDraft.text;
        p.admissionDraft.snapshot = ENG.admissionSnapshot(p);
        changed = true;
      }
      if (p.epicrisisDraft.validated && !p.epicrisisDraft.text) {
        p.epicrisisDraft.text = ENG.generateEpicrisisDraft(p);
        p.epicrisisDraft.generatedText = p.epicrisisDraft.text;
        p.epicrisisDraft.snapshot = ENG.epicrisisSnapshot(p);
        changed = true;
      }
    }
    if (changed) saveState();
  }
  hydrateInitialDrafts();

  render();
})();
