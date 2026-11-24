(function () {
  const DATA = window.NEOSALUD_DATA;
  const ENG = window.NEOSALUD_ENGINE;
  const SCHEMA = window.NEOSALUD_SCHEMA;
  const STORAGE_KEY = "neosalud.maqueta.v1";

  let state = loadState();
  let ui = {
    route: "inicio", // inicio | pacientes | ingreso | hosp | epicrisis | importar | estadisticas | exportacion | configuracion
    selectedPatientId: state.patients[0]?.id || null,
    hospTab: "respiratorio",
    patientFilters: { text: "", status: "all", sector: "all", gaGroup: "all" },
    ingresoVarFilter: "",
    collapsedSections: {},
    dxSearch: "",
    statsFilters: { sector: "all", gaGroup: "all", weightGroup: "all" },
    importStep: 1,
    activeBatch: null,
    exportPreviewSheet: "metadatos",
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
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === DATA.STATE_VERSION && Array.isArray(parsed.patients)) {
          return parsed;
        }
      }
    } catch (e) { /* fallback to seed */ }
    return DATA.createSeedState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore quota */ }
  }

  function activeRole() {
    return DATA.ROLES.find((r) => r.id === state.activeRoleId) || DATA.ROLES[0];
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
    return r === "ingreso" || r === "hosp" || r === "epicrisis";
  }

  function navigate(route, patientId) {
    if (patientId) ui.selectedPatientId = patientId;
    ui.route = route;
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
    const incompCount = state.patients.filter((p) => p.status === "ingreso_incompleto").length;
    const pendingImport = ui.activeBatch ? ui.activeBatch.rows.filter((r) => r.decision === "pending").length : 0;

    const groups = [
      {
        label: "Clínica",
        items: [
          { id: "inicio", label: "Inicio y censo", icon: "home", count: activeCount },
          { id: "pacientes", label: "Pacientes", icon: "users", count: state.patients.length },
          { id: "ingreso", label: "Ficha de ingreso", icon: "clipboard", count: incompCount || null },
          { id: "hosp", label: "Hospitalización", icon: "activity", count: null },
          { id: "epicrisis", label: "Egreso y epicrisis", icon: "file", count: null }
        ]
      },
      {
        label: "Gestión y datos",
        items: [
          { id: "importar", label: "Importar Excel / CSV", icon: "upload", count: pendingImport || null },
          { id: "estadisticas", label: "Estadísticas", icon: "chart", count: null },
          { id: "exportacion", label: "Exportación", icon: "download", count: null },
          { id: "configuracion", label: "Admin y auditoría", icon: "settings", count: null }
        ]
      }
    ];

    document.getElementById("rail-nav").innerHTML = groups.map((g) => `
      <div class="nav-group">
        <div class="nav-group-label">${esc(g.label)}</div>
        ${g.items.map((it) => `
          <button class="nav-item ${ui.route === it.id ? "active" : ""}" type="button" data-nav="${it.id}" ${ui.route === it.id ? 'aria-current="page"' : ""}>
            <span class="nav-item-main">${iconSvg(it.icon)}<span>${esc(it.label)}</span></span>
            ${it.count !== null ? `<span class="nav-count">${it.count}</span>` : ""}
          </button>
        `).join("")}
      </div>
    `).join("");
  }

  function renderTopbar() {
    const r = activeRole();
    document.getElementById("role-avatar").textContent = r.initials;
    document.getElementById("role-name").textContent = r.name;
    document.getElementById("role-label").textContent = r.roleLabel;

    const titles = {
      inicio: "Inicio y censo de unidad",
      pacientes: "Padrón de pacientes",
      ingreso: "Ficha de ingreso",
      hosp: "Hospitalización y líneas de tiempo",
      epicrisis: "Egreso y epicrisis",
      importar: "Importación Excel / CSV",
      estadisticas: "Estadísticas e indicadores",
      exportacion: "Exportación y diccionario",
      configuracion: "Administración y auditoría"
    };

    const p = activePatient();
    const crumb = isPatientRoute(ui.route) && p
      ? `<span>Pacientes</span> / <span>${esc(p.fullName)}</span> / <strong>${esc(titles[ui.route])}</strong>`
      : `<strong>${esc(titles[ui.route] || "NeoSalud")}</strong>`;
    document.getElementById("breadcrumb").innerHTML = crumb;
  }

  function renderPatientStrip() {
    const el = document.getElementById("patient-strip");
    if (!isPatientRoute(ui.route)) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    const p = activePatient();
    if (!p) {
      el.hidden = true;
      return;
    }
    const stay = ENG.getPatientStayDays(p);
    el.hidden = false;
    el.innerHTML = `
      <div class="patient-strip-inner">
        <div class="patient-id-block">
          <select class="select" style="width:auto;min-width:210px;font-weight:600" id="patient-switcher" aria-label="Cambiar paciente activo">
            ${state.patients.map((pt) => `<option value="${esc(pt.id)}" ${pt.id === p.id ? "selected" : ""}>${esc(pt.fullName)} (${esc(pt.id)} · ${esc(ENG.fmtGa(pt.gaWeeks, pt.gaDays, "EG s/d"))})</option>`).join("")}
          </select>
          ${statusBadge(p.status)}
          <div class="patient-telemetry">
            <span class="telemetry-item"><span>HC</span><strong class="mono">${esc(p.hc)}</strong></span>
            <span class="telemetry-item"><span>EG</span><strong class="num">${ENG.num(p.gaWeeks) === null ? "Sin responder" : esc(ENG.fmtGa(p.gaWeeks, p.gaDays)) + " sem"}</strong></span>
            <span class="telemetry-item"><span>Peso nac.</span><strong class="num">${esc(ENG.fmtWeight(p.birthWeight))}</strong></span>
            <span class="telemetry-item"><span>Estadía</span><strong class="num">${stay} d</strong></span>
            <span class="telemetry-item"><span>Sector</span><strong>${esc(p.sector)}</strong></span>
          </div>
        </div>
        <div class="patient-subnav" role="tablist" aria-label="Secciones de la historia clínica">
          <button class="subnav-btn ${ui.route === "ingreso" ? "active" : ""}" type="button" data-nav="ingreso">Ingreso</button>
          <button class="subnav-btn ${ui.route === "hosp" ? "active" : ""}" type="button" data-nav="hosp">Hospitalización</button>
          <button class="subnav-btn ${ui.route === "epicrisis" ? "active" : ""}" type="button" data-nav="epicrisis">Egreso y epicrisis</button>
        </div>
      </div>
    `;
  }

  // ===================== VIEW 1: INICIO =====================
  function viewInicio() {
    const r = activeRole();
    const active = state.patients.filter((p) => p.status === "hospitalizado" || p.status === "ingreso_incompleto");
    const incomp = state.patients.filter((p) => p.status === "ingreso_incompleto");
    const discharged = state.patients.filter((p) => p.status === "egresado");
    const avgStay = discharged.length
      ? (discharged.reduce((a, p) => a + ENG.getPatientStayDays(p), 0) / discharged.length).toFixed(1)
      : "—";

    const alerts = [];
    for (const p of state.patients) {
      if (p.status === "ingreso_incompleto") {
        alerts.push({
          severity: "warn",
          title: `${p.fullName} (${p.id}) · Ingreso sin validar`,
          detail: `Sector ${p.sector || "sin asignar"} · EG ${ENG.fmtGa(p.gaWeeks, p.gaDays)} · Peso ${ENG.fmtWeight(p.birthWeight)}. Falta generar y firmar borrador de ingreso.`,
          actionLabel: "Completar ingreso",
          route: "ingreso",
          patientId: p.id
        });
      }
      const admDiff = ENG.computeDraftDiff(p, "admission");
      if (admDiff.length) {
        alerts.push({
          severity: "danger",
          title: `${p.fullName} · Borrador de ingreso desfasado`,
          detail: `Cambió: ${admDiff.map((d) => `${d.label} (${d.prev} → ${d.curr})`).join(", ")}.`,
          actionLabel: "Revisar borrador",
          route: "ingreso",
          patientId: p.id
        });
      }
      if (p.status === "hospitalizado" && ENG.num(p.gaWeeks) !== null && ENG.num(p.gaWeeks) < 32 && p.hosp.respCoverage !== "completa") {
        alerts.push({
          severity: "warn",
          title: `${p.fullName} · Cronología respiratoria abierta`,
          detail: `Prematuro ${p.gaWeeks}+${p.gaDays} sem en ${p.sector}. Figura como deuda de registro hasta confirmar corte clínico.`,
          actionLabel: "Abrir línea de tiempo",
          route: "hosp",
          patientId: p.id
        });
      }
    }

    const totalBeds = DATA.SECTORS.reduce((a, s) => a + s.capacity, 0);
    const occPct = Math.round((active.length / totalBeds) * 100);

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Censo de la Unidad de Neonatología</h1>
          <p class="page-desc">${esc(state.institutionName)} — Corte clínico al ${ENG.fmtDate(ENG.REF_DATE)}. Cada dato registrado deriva borradores, líneas de tiempo y tasas sin doble carga.</p>
        </div>
        <div class="page-actions">
          ${r.permissions.createPatient ? `<button class="btn btn-primary" type="button" id="btn-new-patient">Crear paciente</button>` : ""}
          ${r.permissions.importFiles ? `<button class="btn btn-secondary" type="button" data-nav="importar">Importar Excel / CSV</button>` : ""}
        </div>
      </div>

      <section class="ledger-bar" aria-label="Resumen operativo del servicio">
        <div class="ledger-cell">
          <div class="ledger-label">En la unidad hoy</div>
          <div class="ledger-value is-teal">${active.length}</div>
          <div class="ledger-sub">${occPct}% ocupación sobre ${totalBeds} plazas</div>
        </div>
        <div class="ledger-cell">
          <div class="ledger-label">Ingresos incompletos</div>
          <div class="ledger-value ${incomp.length ? "is-warn" : ""}">${incomp.length}</div>
          <div class="ledger-sub">${incomp.length ? "Requieren validación médica" : "Sin pendientes de ingreso"}</div>
        </div>
        <div class="ledger-cell">
          <div class="ledger-label">Alertas de registro</div>
          <div class="ledger-value ${alerts.length ? "is-warn" : ""}">${alerts.length}</div>
          <div class="ledger-sub">Desfasajes o cronologías abiertas</div>
        </div>
        <div class="ledger-cell">
          <div class="ledger-label">Estadía media al alta</div>
          <div class="ledger-value">${avgStay}${avgStay !== "—" ? " d" : ""}</div>
          <div class="ledger-sub">Sobre ${discharged.length} egresos vivos</div>
        </div>
      </section>

      <div class="grid-2">
        <div>
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2 class="panel-title">Ocupación por sector</h2>
                <p class="panel-sub">Pacientes internados y en proceso de ingreso distribuidos por área</p>
              </div>
              <button class="btn btn-ghost btn-sm" type="button" data-nav="pacientes">Ver padrón completo</button>
            </div>
            <div class="panel-body">
              <div class="sector-list">
                ${DATA.SECTORS.map((sec) => {
                  const count = active.filter((p) => p.sector === sec.id).length;
                  const pct = Math.min(100, Math.round((count / sec.capacity) * 100));
                  return `
                    <div>
                      <div class="sector-row-top">
                        <strong>${esc(sec.name)}</strong>
                        <span class="num">${count} / ${sec.capacity} plazas (${pct}%)</span>
                      </div>
                      <div class="sector-track"><div class="sector-fill ${pct >= 80 ? "high" : ""}" style="width:${pct}%"></div></div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <div>
                <h2 class="panel-title">Pacientes activos y casos de referencia</h2>
                <p class="panel-sub">Acceso directo a historia clínica, líneas de tiempo o epicrisis</p>
              </div>
            </div>
            <div class="panel-body tight">
              <div class="table-wrap">
                <table class="clinical-table">
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th>EG</th>
                      <th>Peso nac.</th>
                      <th>Sector</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${state.patients.slice(0, 6).map((p) => `
                      <tr>
                        <td>
                          <button class="row-link" type="button" data-open-patient="${esc(p.id)}" data-target-route="${p.status === "ingreso_incompleto" ? "ingreso" : "hosp"}">${esc(p.fullName)}</button>
                          <div class="field-hint mono">${esc(p.id)} · ${esc(p.hc)}</div>
                        </td>
                        <td class="num">${esc(ENG.fmtGa(p.gaWeeks, p.gaDays, "—"))}</td>
                        <td class="num">${esc(ENG.fmtWeight(p.birthWeight, "—"))}</td>
                        <td>${esc(p.sector)}</td>
                        <td>${statusBadge(p.status)}</td>
                        <td>
                          <button class="btn btn-secondary btn-sm" type="button" data-open-patient="${esc(p.id)}" data-target-route="${p.status === "ingreso_incompleto" ? "ingreso" : "hosp"}">Abrir</button>
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <div>
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2 class="panel-title">Deuda clínica y validaciones pendientes</h2>
                <p class="panel-sub">Elementos que requieren revisión médica antes del cierre</p>
              </div>
            </div>
            <div class="panel-body tight">
              ${alerts.length ? `
                <ul class="queue-list">
                  ${alerts.map((al) => `
                    <li class="queue-item">
                      <div>
                        <div class="queue-title">${esc(al.title)}</div>
                        <div class="queue-detail">${esc(al.detail)}</div>
                      </div>
                      <button class="btn btn-secondary btn-sm" type="button" data-open-patient="${esc(al.patientId)}" data-target-route="${al.route}">${esc(al.actionLabel)}</button>
                    </li>
                  `).join("")}
                </ul>
              ` : `<div class="empty-state"><strong>Sin alertas pendientes</strong>Todos los ingresos y cronologías están al día.</div>`}
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <div>
                <h2 class="panel-title">Última actividad auditada</h2>
                <p class="panel-sub">Trazabilidad reciente del servicio</p>
              </div>
              <button class="btn btn-ghost btn-sm" type="button" data-nav="configuracion">Ver bitácora</button>
            </div>
            <div class="panel-body tight">
              <ul class="queue-list">
                ${state.auditLog.slice(0, 4).map((a) => `
                  <li class="queue-item">
                    <div>
                      <div class="queue-title">${esc(a.action)} — ${esc(a.target)}</div>
                      <div class="queue-detail">${esc(a.user)} (${esc(a.role)}) · <span class="mono">${esc(ENG.fmtDate(a.ts))}</span></div>
                    </div>
                  </li>
                `).join("")}
              </ul>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  // ===================== VIEW 2: PACIENTES =====================
  function viewPacientes() {
    const r = activeRole();
    const f = ui.patientFilters;
    const rows = state.patients.filter((p) => {
      if (f.text) {
        const q = f.text.toLowerCase();
        const hay = `${p.fullName} ${p.id} ${p.hc} ${p.motherName} ${p.motherDni}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (f.status !== "all" && p.status !== f.status) return false;
      if (f.sector !== "all" && p.sector !== f.sector) return false;
      if (f.gaGroup !== "all") {
        if (f.gaGroup === "<28" && !(p.gaWeeks < 28)) return false;
        if (f.gaGroup === "28-31" && !(p.gaWeeks >= 28 && p.gaWeeks <= 31)) return false;
        if (f.gaGroup === "32-36" && !(p.gaWeeks >= 32 && p.gaWeeks <= 36)) return false;
        if (f.gaGroup === ">=37" && !(p.gaWeeks >= 37)) return false;
      }
      return true;
    });

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Padrón de pacientes</h1>
          <p class="page-desc">Búsqueda combinada por identificación, estado, sector y edad gestacional. Alta rápida con correlativo automático.</p>
        </div>
        <div class="page-actions">
          ${r.permissions.createPatient ? `<button class="btn btn-primary" type="button" id="btn-new-patient">Crear paciente</button>` : `<span class="status-pill status-na">Solo lectura</span>`}
        </div>
      </div>

      <section class="panel">
        <div class="filter-bar">
          <div class="field" style="flex:1;min-width:220px">
            <label for="pf-text">Buscar paciente</label>
            <input class="input" id="pf-text" type="search" placeholder="Nombre, ID NEO, HC o DNI materno" value="${esc(f.text)}" />
          </div>
          <div class="field" style="min-width:170px">
            <label for="pf-status">Estado</label>
            <select class="select" id="pf-status">
              <option value="all" ${f.status === "all" ? "selected" : ""}>Todos los estados</option>
              <option value="ingreso_incompleto" ${f.status === "ingreso_incompleto" ? "selected" : ""}>Ingreso incompleto</option>
              <option value="hospitalizado" ${f.status === "hospitalizado" ? "selected" : ""}>Hospitalizado</option>
              <option value="egresado" ${f.status === "egresado" ? "selected" : ""}>Egresado</option>
              <option value="fallecido" ${f.status === "fallecido" ? "selected" : ""}>Fallecido</option>
            </select>
          </div>
          <div class="field" style="min-width:165px">
            <label for="pf-sector">Sector</label>
            <select class="select" id="pf-sector">
              <option value="all" ${f.sector === "all" ? "selected" : ""}>Todos los sectores</option>
              ${DATA.SECTORS.map((s) => `<option value="${esc(s.id)}" ${f.sector === s.id ? "selected" : ""}>${esc(s.id)}</option>`).join("")}
            </select>
          </div>
          <div class="field" style="min-width:155px">
            <label for="pf-ga">Edad gestacional</label>
            <select class="select" id="pf-ga">
              <option value="all" ${f.gaGroup === "all" ? "selected" : ""}>Todas las EG</option>
              <option value="<28" ${f.gaGroup === "<28" ? "selected" : ""}>&lt; 28 sem</option>
              <option value="28-31" ${f.gaGroup === "28-31" ? "selected" : ""}>28–31+6 sem</option>
              <option value="32-36" ${f.gaGroup === "32-36" ? "selected" : ""}>32–36+6 sem</option>
              <option value=">=37" ${f.gaGroup === ">=37" ? "selected" : ""}>≥ 37 sem</option>
            </select>
          </div>
        </div>

        <div class="panel-body tight">
          ${rows.length ? `
            <div class="table-wrap">
              <table class="clinical-table">
                <thead>
                  <tr>
                    <th>ID / HC</th>
                    <th>Recién nacido</th>
                    <th>Nacimiento</th>
                    <th>EG</th>
                    <th>Peso nac.</th>
                    <th>Fenton 2025</th>
                    <th>Sector</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map((p) => {
                    const fen = ENG.calcFenton2025(p.gaWeeks, p.gaDays, p.sex, p.birthWeight);
                    return `
                      <tr>
                        <td class="mono">${esc(p.id)}<div class="field-hint">${esc(p.hc)}</div></td>
                        <td>
                          <button class="row-link" type="button" data-open-patient="${esc(p.id)}" data-target-route="ingreso">${esc(p.fullName)}</button>
                          <div class="field-hint">Madre: ${esc(p.motherName || "Sin consignar")}</div>
                        </td>
                        <td class="num">${esc(ENG.fmtDate(p.birthDate) || "—")}</td>
                        <td class="num">${esc(ENG.fmtGa(p.gaWeeks, p.gaDays, "—"))}</td>
                        <td class="num">${esc(ENG.fmtWeight(p.birthWeight, "—"))}</td>
                        <td class="num">${fen.ready ? `${esc(fen.classification.split(" ")[0])} (P${fen.percentile})` : "—"}</td>
                        <td>${esc(p.sector)}</td>
                        <td>${statusBadge(p.status)}</td>
                        <td>
                          <div style="display:flex;gap:6px;flex-wrap:wrap">
                            <button class="btn btn-secondary btn-sm" type="button" data-open-patient="${esc(p.id)}" data-target-route="ingreso">Ingreso</button>
                            <button class="btn btn-secondary btn-sm" type="button" data-open-patient="${esc(p.id)}" data-target-route="hosp">Timelines</button>
                            ${r.permissions.editClinical ? `<button class="btn btn-ghost btn-sm" type="button" data-transfer-patient="${esc(p.id)}">Pase</button>` : ""}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <strong>No hay pacientes que coincidan con el filtro</strong>
              Ajustá los criterios de búsqueda o limpiá los filtros activos.
            </div>
          `}
        </div>
      </section>
    `;
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
    if (f.type === "select") {
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
    return `<div class="field${v === "" ? " is-empty" : ""}${wide}${branch}"><label for="${id}">${mark}${esc(f.label)}${badge}</label>${control}</div>`;
  }

  function schemaSectionHtml(sec, p, canEdit, ctx) {
    const visible = sec.fields.filter((f) => SCHEMA.conditionMet(p, f) && (f.onlyWhen !== "kaiser" || ctx.kaiserApplicable));
    const inSection = new Set(sec.fields.map((f) => f.key));
    const childrenOf = (key) => visible.filter((f) => f.showIf && f.showIf.key === key);
    // Los subcampos de una rama se dibujan inmediatamente después de su campo padre,
    // marcados como rama, para que la grilla no deje filas vacías.
    const renderGroup = (list, parent) => list.map((f) => {
      const kids = childrenOf(f.key);
      return fieldControlHtml(f, p, canEdit, parent) + (kids.length ? renderGroup(kids, f) : "");
    }).join("");
    if (!visible.length) return "";
    const roots = visible.filter((f) => !f.showIf || !inSection.has(f.showIf.key));
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
          <h1 class="page-title">Ficha de ingreso condicional</h1>
          <p class="page-desc">Las subramas se muestran solo según la respuesta clínica. Si cerrás una rama, los subcampos ocultos se descartan sin dejar datos huérfanos.</p>
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
                <div style="font-size:13px;color:var(--navy);font-weight:500">Recomendación: ${esc(kaiser.recommendation)}</div>
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
            <div class="banner banner-ok">Ingreso validado por <strong>${esc(p.admissionDraft.validatedBy)}</strong> el <span class="mono">${esc(ENG.fmtDate(p.admissionDraft.validatedAt))}</span>. Documento de solo lectura.</div>
          ` : ""}

          ${draftVersionsHtml("admission", p.admissionDraft)}

          ${hasPlaceholders && !admSigned ? `
            <div class="banner banner-warn">Quedan campos pendientes (<span class="mono">_____</span>) en el examen físico. Completalos antes de validar el ingreso.</div>
          ` : ""}

          <div class="draft-sheet">
            <div class="draft-sheet-head">
              <strong>Documento de ingreso · ${esc(p.fullName)} (${esc(p.id)})</strong>
              <span>${ui.draftLoading === "admission" ? "Consolidando datos..." : p.admissionDraft.validated ? "Firmado" : "Borrador editable"}</span>
            </div>
            ${ui.draftLoading === "admission" ? `
              <div class="skeleton-wrap" aria-live="polite">
                <div style="display:flex;align-items:center;gap:10px;color:var(--teal-dark);font-size:13px;font-weight:600;margin-bottom:6px">
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

  // ===================== VIEW 4: HOSPITALIZACIÓN =====================
  function viewHosp() {
    const p = activePatient();
    if (!p) return `<div class="empty-state"><strong>Sin paciente seleccionado</strong></div>`;
    const r = activeRole();
    const canEdit = r.permissions.editClinical;
    const resp = ENG.deriveRespiratory(p);
    const nutr = ENG.deriveNutrition(p);
    const cath = ENG.deriveCatheters(p);
    const rop = ENG.deriveRopWorst(p);

    const tabs = [
      ["respiratorio", `Respiratorio (${resp.eventCount})`],
      ["nutricion", `Nutrición y Digestivo (${(p.hosp.nutrEvents || []).length})`],
      ["infeccioso", `Infeccioso / IAAS (${(p.hosp.iaasEpisodes || []).length})`],
      ["cateteres", `Accesos Vasculares (${cath.count})`],
      ["transfusiones", `Transfusiones (${(p.hosp.transfusions || []).length})`],
      ["otros", "Cardio · Neuro · ROP · Cirugía"]
    ];

    let tabHtml = "";
    if (ui.hospTab === "respiratorio") {
      const modClass = (m) => {
        if (m === "VAFO" || m === "VMC" || m === "ECMO") return "mod-high";
        if (m === "CPAP" || m === "NIPPV" || m === "BiPAP" || m === "CNAF") return "mod-mid";
        if (m === "AA") return "mod-aa";
        return "mod-low";
      };
      const sorted = [...(p.hosp.respEvents || [])].sort((a, b) => a.day - b.day);
      tabHtml = `
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Línea de tiempo respiratoria</h2>
              <p class="panel-sub">Registrá solo los cambios de soporte; los días acumulados y la clasificación DBP Jensen / Bancalari se derivan solos</p>
            </div>
            <div class="page-actions">
              <div class="coverage-toggle" role="group" aria-label="Cobertura de cronología respiratoria">
                <button class="coverage-btn ${!resp.complete ? "active-incomp" : ""}" type="button" data-set-cov="respCoverage" data-cov-val="incompleta" ${!canEdit ? "disabled" : ""}>Cronología incompleta</button>
                <button class="coverage-btn ${resp.complete ? "active-comp" : ""}" type="button" data-set-cov="respCoverage" data-cov-val="completa" ${!canEdit ? "disabled" : ""}>Completa al corte</button>
              </div>
              ${canEdit ? `<button class="btn btn-primary btn-sm" type="button" id="btn-add-resp">Agregar cambio</button>` : ""}
            </div>
          </div>
          <div class="panel-body">
            ${!resp.complete ? `<div class="banner banner-warn">Cronología marcada como <strong>Incompleta</strong>: el sistema evita deducir un «No» falso y reporta deuda de registro en Estadísticas hasta confirmar el corte.</div>` : ""}

            <div class="derived-strip">
              <div class="derived-item"><span class="derived-label">Días de O2</span><span class="derived-val">${resp.totals.o2} d</span></div>
              <div class="derived-item"><span class="derived-label">CPAP</span><span class="derived-val">${resp.totals.cpap} d</span></div>
              <div class="derived-item"><span class="derived-label">Cánula bajo flujo</span><span class="derived-val">${resp.totals.cn} d</span></div>
              <div class="derived-item"><span class="derived-label">Cánula alto flujo</span><span class="derived-val">${resp.totals.cnaf} d</span></div>
              <div class="derived-item"><span class="derived-label">VNI (NIPPV / BiPAP)</span><span class="derived-val">${resp.totals.vni} d</span></div>
              <div class="derived-item"><span class="derived-label">VMC</span><span class="derived-val">${resp.totals.vmc} d</span></div>
              <div class="derived-item"><span class="derived-label">VAFO</span><span class="derived-val">${resp.totals.vafo} d</span></div>
              <div class="derived-item"><span class="derived-label">FiO2 máx 24h</span><span class="derived-val">${resp.maxFio224 ? resp.maxFio224 + "%" : "Sin dato"}</span></div>
              <div class="derived-item"><span class="derived-label">O2 día 28</span><span class="derived-val">${esc(resp.o2Day28)}</span></div>
              <div class="derived-item"><span class="derived-label">O2 36 sem EGC</span><span class="derived-val">${esc(resp.o2At36w)}</span></div>
              <div class="derived-item"><span class="derived-label">DBP Jensen (calculada)</span><span class="derived-val">${esc(resp.jensen)}</span></div>
              <div class="derived-item"><span class="derived-label">DBP Bancalari (calculada)</span><span class="derived-val">${esc(resp.bancalari)}</span></div>
            </div>

            ${sorted.length ? `
              <div class="timeline-track" aria-label="Eventos de soporte respiratorio">
                ${sorted.map((ev) => `
                  <article class="tl-node ${modClass(ev.modality)}">
                    <div class="tl-day"><strong class="mono">Día ${ev.day}</strong><span class="mono">${esc(ENG.fmtDate(ev.date))}</span></div>
                    <div class="tl-mod">${esc(ev.modality)}</div>
                    <div class="tl-meta">${esc(ev.event)}</div>
                    <div class="field-hint num">FiO2 ${ev.fio2 || "—"}% ${ev.peep ? `· PEEP ${ev.peep}` : ""} ${ev.flow ? `· Flujo ${ev.flow} L/m` : ""}</div>
                  </article>
                `).join("")}
              </div>
            ` : `<div class="empty-state"><strong>Sin cambios respiratorios cargados</strong>Agregá el evento inicial de soporte para derivar los totales.</div>`}

            <div class="form-grid" style="margin-top:12px">
              <div class="derived-item"><span class="derived-label">SDR</span><span class="derived-val">${esc(p.hosp.sdr || "Sin responder")}</span></div>
              <div class="derived-item"><span class="derived-label">Surfactante</span><span class="derived-val">${p.hosp.surfactantDoses ? `${p.hosp.surfactantDoses} dosis (${p.hosp.surfactantHours}h · ${p.hosp.surfactantRoute})` : "No"}</span></div>
              <div class="derived-item"><span class="derived-label">Neumotórax</span><span class="derived-val">${esc(p.hosp.pneumothorax || "Sin responder")}</span></div>
            </div>
          </div>
        </section>
      `;
    } else if (ui.hospTab === "nutricion") {
      const sorted = [...(p.hosp.nutrEvents || [])].sort((a, b) => a.day - b.day);
      tabHtml = `
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Línea de tiempo nutricional (3 vías simultáneas)</h2>
              <p class="panel-sub">Enteral, parenteral y suplementos conviven en paralelo; hitos y días de NPT se calculan solos</p>
            </div>
            <div class="page-actions">
              <div class="coverage-toggle">
                <button class="coverage-btn ${!nutr.complete ? "active-incomp" : ""}" type="button" data-set-cov="nutrCoverage" data-cov-val="incompleta" ${!canEdit ? "disabled" : ""}>Incompleta</button>
                <button class="coverage-btn ${nutr.complete ? "active-comp" : ""}" type="button" data-set-cov="nutrCoverage" data-cov-val="completa" ${!canEdit ? "disabled" : ""}>Completa al corte</button>
              </div>
              ${canEdit ? `<button class="btn btn-primary btn-sm" type="button" id="btn-add-nutr">Agregar evento</button>` : ""}
            </div>
          </div>
          <div class="panel-body">
            <div class="derived-strip" style="margin-bottom:14px">
              <div class="derived-item"><span class="derived-label">Días de parenteral (NPT)</span><span class="derived-val">${nutr.nptDays} d</span></div>
              <div class="derived-item"><span class="derived-label">Inicio estímulo enteral</span><span class="derived-val">${nutr.enteralStartDay !== null ? `DDV ${nutr.enteralStartDay}` : "Sin dato"}</span></div>
              <div class="derived-item"><span class="derived-label">Partió con leche materna</span><span class="derived-val">${nutr.startedHumanMilk === null ? "Sin dato" : nutr.startedHumanMilk ? "Sí" : "No"}</span></div>
              <div class="derived-item"><span class="derived-label">Alcanza 100 cc/kg/d</span><span class="derived-val">${nutr.day100cc !== null ? `DDV ${nutr.day100cc}` : "Aún no / Sin dato"}</span></div>
              <div class="derived-item"><span class="derived-label">Fortificación</span><span class="derived-val">${nutr.fortificationDay !== null ? `DDV ${nutr.fortificationDay}` : "No / Sin dato"}</span></div>
              <div class="derived-item"><span class="derived-label">NEC</span><span class="derived-val">${esc(p.hosp.nec || "Sin responder")}</span></div>
            </div>
            <div class="table-wrap">
              <table class="clinical-table">
                <thead><tr><th>DDV</th><th>Fecha</th><th>Vía</th><th>Evento</th><th>Leche / Aporte</th><th>Detalle</th></tr></thead>
                <tbody>
                  ${sorted.length ? sorted.map((e) => `
                    <tr>
                      <td class="mono">D${e.day}</td>
                      <td class="num">${esc(ENG.fmtDate(e.date) || "—")}</td>
                      <td><span class="status-pill ${e.route === "Parenteral" ? "status-warn" : e.route === "Enteral" ? "status-hosp" : "status-na"}">${esc(e.route)}</span></td>
                      <td><strong>${esc(e.event)}</strong></td>
                      <td class="num">${e.milk ? esc(e.milk) : "—"}${e.ccKg ? ` · ${e.ccKg} cc/kg/d` : ""}</td>
                      <td>${esc(e.detail || "")}</td>
                    </tr>
                  `).join("") : `<tr><td colspan="6" class="empty-state">Sin eventos nutricionales registrados.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      `;
    } else if (ui.hospTab === "infeccioso") {
      tabHtml = `
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Episodios infecciosos e IAAS</h2>
              <p class="panel-sub">Gérmenes y antibióticos desde catálogo cerrado para derivar sepsis tardía y bacteriemia asociada a catéter</p>
            </div>
            <div class="page-actions">
              <div class="coverage-toggle">
                <button class="coverage-btn ${p.hosp.iaasCoverage !== "completa" ? "active-incomp" : ""}" type="button" data-set-cov="iaasCoverage" data-cov-val="incompleta" ${!canEdit ? "disabled" : ""}>Incompleta</button>
                <button class="coverage-btn ${p.hosp.iaasCoverage === "completa" ? "active-comp" : ""}" type="button" data-set-cov="iaasCoverage" data-cov-val="completa" ${!canEdit ? "disabled" : ""}>Completa al corte</button>
              </div>
              ${canEdit ? `<button class="btn btn-primary btn-sm" type="button" id="btn-add-iaas">Agregar episodio</button>` : ""}
            </div>
          </div>
          <div class="panel-body tight">
            <div class="table-wrap">
              <table class="clinical-table">
                <thead><tr><th>DDV</th><th>Síndrome</th><th>Foco</th><th>Germen</th><th>Antibióticos</th><th>Días</th><th>Asoc. catéter</th></tr></thead>
                <tbody>
                  ${(p.hosp.iaasEpisodes || []).length ? p.hosp.iaasEpisodes.map((e) => `
                    <tr>
                      <td class="mono">D${e.day}</td>
                      <td><strong>${esc(e.syndrome)}</strong></td>
                      <td>${esc(e.focus)}</td>
                      <td>${esc(e.germ)}</td>
                      <td>${esc(e.abx1)}${e.abx2 ? " + " + esc(e.abx2) : ""}</td>
                      <td class="num">${e.days} d</td>
                      <td><span class="status-pill ${e.catheterRelated === "Sí" ? "status-danger" : "status-na"}">${esc(e.catheterRelated)}</span></td>
                    </tr>
                  `).join("") : `<tr><td colspan="7" class="empty-state">Sin episodios infecciosos cargados.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      `;
    } else if (ui.hospTab === "cateteres") {
      tabHtml = `
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Accesos vasculares centrales (línea unificada)</h2>
              <p class="panel-sub">CVU, CAU, PICC y CVC en una sola serie para derivar días-catéter y tasas por 1.000 días</p>
            </div>
            ${canEdit ? `<button class="btn btn-primary btn-sm" type="button" id="btn-add-cath">Agregar catéter</button>` : ""}
          </div>
          <div class="panel-body">
            <div class="derived-strip" style="margin-bottom:14px">
              <div class="derived-item"><span class="derived-label">Total días-catéter</span><span class="derived-val">${cath.totalDays} d</span></div>
              <div class="derived-item"><span class="derived-label">CVU</span><span class="derived-val">${cath.byType.CVU} d</span></div>
              <div class="derived-item"><span class="derived-label">CAU</span><span class="derived-val">${cath.byType.CAU} d</span></div>
              <div class="derived-item"><span class="derived-label">PICC / Silastic</span><span class="derived-val">${cath.byType.PICC} d</span></div>
              <div class="derived-item"><span class="derived-label">CVC</span><span class="derived-val">${cath.byType.CVC} d</span></div>
            </div>
            <div class="table-wrap">
              <table class="clinical-table">
                <thead><tr><th>Tipo</th><th>Colocación</th><th>Retiro</th><th>Días</th><th>Sitio</th><th>Motivo retiro</th><th>Complicación</th></tr></thead>
                <tbody>
                  ${(p.hosp.catheters || []).length ? p.hosp.catheters.map((c) => {
                    const dur = Math.max(0, (c.removeDay !== "" ? Number(c.removeDay) : ENG.getPatientStayDays(p)) - Number(c.insertDay));
                    return `
                      <tr>
                        <td><strong>${esc(c.type)}</strong></td>
                        <td class="mono">D${c.insertDay}</td>
                        <td class="mono">${c.removeDay !== "" ? "D" + c.removeDay : "Activo"}</td>
                        <td class="num">${dur} d</td>
                        <td>${esc(c.site)}</td>
                        <td>${esc(c.reason)}</td>
                        <td>${esc(c.complication)}</td>
                      </tr>
                    `;
                  }).join("") : `<tr><td colspan="7" class="empty-state">Sin catéteres centrales registrados.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      `;
    } else if (ui.hospTab === "transfusiones") {
      tabHtml = `
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Transfusiones y hemocomponentes</h2>
              <p class="panel-sub">Total derivado automáticamente: ${(p.hosp.transfusions || []).length} episodio(s)</p>
            </div>
            ${canEdit ? `<button class="btn btn-primary btn-sm" type="button" id="btn-add-tx">Agregar transfusión</button>` : ""}
          </div>
          <div class="panel-body tight">
            <div class="table-wrap">
              <table class="clinical-table">
                <thead><tr><th>DDV</th><th>Hemocomponente</th><th>Indicación</th><th>Volumen</th><th>Reacción</th></tr></thead>
                <tbody>
                  ${(p.hosp.transfusions || []).length ? p.hosp.transfusions.map((t) => `
                    <tr>
                      <td class="mono">D${t.day}</td>
                      <td><strong>${esc(t.component)}</strong></td>
                      <td>${esc(t.indication)}</td>
                      <td class="num">${t.mlKg} mL/kg</td>
                      <td>${esc(t.reaction)}</td>
                    </tr>
                  `).join("") : `<tr><td colspan="5" class="empty-state">Sin transfusiones registradas.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      `;
    } else {
      tabHtml = `
        ${hospSchemaHtml(p, canEdit, "otros")}
        <div>
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2 class="panel-title">Retinopatía del prematuro (ROP)</h2>
                <p class="panel-sub">Peor estadio derivado automáticamente: <strong>${esc(rop.summary)}</strong></p>
              </div>
              ${canEdit ? `<button class="btn btn-secondary btn-sm" type="button" id="btn-add-rop">Agregar control</button>` : ""}
            </div>
            <div class="panel-body tight">
              <table class="clinical-table">
                <thead><tr><th>DDV</th><th>Estadio</th><th>Zona</th><th>Plus</th><th>Conducta</th></tr></thead>
                <tbody>
                  ${(p.hosp.ropExams || []).length ? p.hosp.ropExams.map((e) => `
                    <tr><td class="mono">D${e.day}</td><td class="num">${e.stage}</td><td>${esc(e.zone)}</td><td>${esc(e.plus)}</td><td>${esc(e.treatment)}</td></tr>
                  `).join("") : `<tr><td colspan="5" class="empty-state">${esc(rop.summary)}</td></tr>`}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section class="panel">
          <div class="panel-head"><h2 class="panel-title">Procedimientos quirúrgicos (${(p.hosp.surgeries || []).length})</h2></div>
          <div class="panel-body tight">
            <table class="clinical-table">
              <thead><tr><th>DDV</th><th>Procedimiento</th><th>Evolución</th></tr></thead>
              <tbody>
                ${(p.hosp.surgeries || []).length ? p.hosp.surgeries.map((s) => `
                  <tr><td class="mono">D${s.day}</td><td><strong>${esc(s.procedure)}</strong></td><td>${esc(s.outcome)}</td></tr>
                `).join("") : `<tr><td colspan="3" class="empty-state">Sin procedimientos quirúrgicos registrados.</td></tr>`}
              </tbody>
            </table>
          </div>
        </section>
      `;
    }

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Hospitalización y líneas de tiempo</h1>
          <p class="page-desc">Lo que puede derivarse de los eventos no se vuelve a preguntar. Probá agregar un cambio respiratorio o nutricional para ver el recálculo en vivo.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" type="button" data-nav="epicrisis">Ir a egreso y epicrisis</button>
        </div>
      </div>

      <div class="system-tabs" role="tablist">
        ${tabs.map(([id, label]) => `
          <button class="sys-tab ${ui.hospTab === id ? "active" : ""}" type="button" data-hosp-tab="${id}">${esc(label)}</button>
        `).join("")}
      </div>

      ${ui.hospTab === "otros" ? "" : hospSchemaHtml(p, canEdit, ui.hospTab)}

      ${tabHtml}
    `;
  }

  function hospSchemaHtml(p, canEdit, tab) {
    return SCHEMA.HOSP_SECTIONS.filter((sec) => sec.tab === tab)
      .map((sec) => schemaSectionHtml(sec, p, canEdit, {}))
      .join("");
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

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Egreso, pesquisas obligatorias y epicrisis</h1>
          <p class="page-desc">Sintetiza todas las líneas de tiempo por sistema. La firma médica humana cierra la internación y actualiza el estado del paciente.</p>
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
            <div class="banner banner-ok">Epicrisis validada por <strong>${esc(p.epicrisisDraft.validatedBy)}</strong> el <span class="mono">${esc(ENG.fmtDate(p.epicrisisDraft.validatedAt))}</span>. Documento de solo lectura.</div>
          ` : ""}

          ${!epiSigned && epiMissing.length ? `
            <div class="banner banner-warn">Antes de validar falta: ${epiMissing.map(esc).join(" · ")}.</div>
          ` : ""}

          ${draftVersionsHtml("epicrisis", p.epicrisisDraft)}

          <div class="draft-sheet">
            <div class="draft-sheet-head">
              <strong>Epicrisis neonatal · ${esc(p.fullName)} (${esc(p.id)})</strong>
              <span>${ui.draftLoading === "epicrisis" ? "Sintetizando líneas de tiempo..." : p.epicrisisDraft.validated ? "Firmada" : "Borrador editable"}</span>
            </div>
            ${ui.draftLoading === "epicrisis" ? `
              <div class="skeleton-wrap" aria-live="polite">
                <div style="display:flex;align-items:center;gap:10px;color:var(--teal-dark);font-size:13px;font-weight:600;margin-bottom:6px">
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
          <h1 class="page-title">Importación estructurada de Excel / CSV</h1>
          <p class="page-desc">Pensada para arranque limpio en producción. Validación determinística sin IA, barrera obligatoria de 3 identificadores y bandeja de revisión humana.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" type="button" id="btn-dl-template">Descargar plantilla CSV</button>
        </div>
      </div>

      ${!canImport ? `<div class="banner banner-info">Tu perfil actual (${esc(r.roleLabel)}) no tiene permisos de importación. Cambiá de rol para probar el flujo.</div>` : ""}

      <div class="stepper" aria-label="Pasos de importación">
        <div class="step-item ${step === 1 ? "active" : step > 1 ? "done" : ""}"><span class="step-num">1</span>Plantilla y carga de archivo</div>
        <div class="step-item ${step === 2 ? "active" : step > 2 ? "done" : ""}"><span class="step-num">2</span>Validación y barrera 3-ID</div>
        <div class="step-item ${step === 3 ? "active" : ""}"><span class="step-num">3</span>Bandeja de revisión humana</div>
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
                          ${row.warnings.length ? row.warnings.map((w) => `<div style="font-size:12.5px;color:${isBlocked ? "var(--danger-ink)" : "var(--warn-ink)"}">${esc(w)}</div>`).join("") : `<span class="field-hint">Sin advertencias · listo para aprobar</span>`}
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
      ["Infección asociada a cuidados (IAAS)", st.iaas]
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
              <span><i class="dot" style="background:var(--teal)"></i>Sí: ${m.yes}</span>
              <span><i class="dot" style="background:#a8c9cc"></i>No: ${m.no}</span>
              ${m.missing ? `<span style="color:var(--warn-ink);font-weight:600"><i class="dot" style="background:#d98e2b"></i>Sin dato (deuda): ${m.missing}</span>` : ""}
              ${m.na ? `<span><i class="dot" style="background:#cfd8df"></i>Fuera de riesgo: ${m.na}</span>` : ""}
            </div>
          </td>
        </tr>
      `;
    }

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Estadísticas e indicadores de la unidad</h1>
          <p class="page-desc">Cada tasa declara su denominador explícito y separa Dato, Fuera de riesgo (No aplica) y Deuda de registro (Sin dato).</p>
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
            <h2 class="panel-title">Morbilidades principales con tricotomía epidemiológica</h2>
            <p class="panel-sub">Un paciente sin dato nunca se suma como sano; los pacientes fuera de riesgo salen del denominador</p>
          </div>
        </div>
        <div class="panel-body tight">
          <div class="table-wrap">
            <table class="clinical-table">
              <thead><tr><th>Indicador</th><th>Tasa (Numerador / Denominador)</th><th>Desglose Dato · Deuda · Fuera de riesgo</th></tr></thead>
              <tbody>
                ${morbidities.map(([lbl, m]) => triRow(lbl, m)).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  // ===================== VIEW 8: EXPORTACIÓN =====================
  function viewExportacion() {
    const r = activeRole();
    const st = ENG.computeStatistics(state.patients, {});
    const sheet = ui.exportPreviewSheet;

    const debtRows = [];
    for (const p of state.patients) {
      if (p.status === "ingreso_incompleto") debtRows.push([p.id, p.fullName, "Ingreso sin validar", "Completar y firmar nota de ingreso"]);
      if (p.gaWeeks < 32 && p.hosp.respCoverage !== "completa") debtRows.push([p.id, p.fullName, "Cronología respiratoria abierta", "Confirmar cobertura al corte clínico"]);
      if (ENG.computeDraftDiff(p, "admission").length) debtRows.push([p.id, p.fullName, "Borrador de ingreso desfasado", "Regenerar borrador tras edición"]);
      if (!p.admission.maternalAge) debtRows.push([p.id, p.fullName, "Edad materna sin responder", "Completar antecedente materno"]);
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
            <tr><td>Versión de diccionario</td><td class="mono">neosalud-dict-v1.0</td></tr>
            <tr><td>Cómo leer los valores</td><td>«NA» = Fuera de riesgo (excluido de denominador). «SD» = En riesgo sin dato (deuda de registro). Nunca se imputan omisiones como normalidad.</td></tr>
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
    } else if (sheet === "diccionario") {
      previewHtml = `
        <table class="clinical-table">
          <thead><tr><th>Variable</th><th>Tipo</th><th>Regla de derivación / Dominio</th></tr></thead>
          <tbody>
            <tr><td class="mono">fenton_z_peso</td><td>Numérico</td><td>Derivado automáticamente por Fenton 2025 (EG, sexo, peso g).</td></tr>
            <tr><td class="mono">kaiser_riesgo_post</td><td>Numérico</td><td>Derivado por Kaiser 2024 solo si EG ≥ 35 sem; NA en menores.</td></tr>
            <tr><td class="mono">dbp_jensen</td><td>Categórico</td><td>Derivado desde línea respiratoria si EG &lt; 32 sem y cobertura = Completa.</td></tr>
            <tr><td class="mono">dias_cateter_total</td><td>Entero</td><td>Suma de días de CVU + CAU + PICC + CVC registrados.</td></tr>
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
              <strong>Diccionario de datos versionado (.json)</strong>
              <p class="field-hint" style="margin:4px 0 14px">Esquema oficial de variables, dominios y reglas de cálculo (v1.0).</p>
              <button class="btn btn-secondary btn-sm" type="button" id="btn-exp-dict" ${ui.exportLoading ? "disabled" : ""}>${ui.exportLoading === "dict" ? '<span class="spinner" aria-hidden="true"></span>Preparando...' : "Descargar diccionario"}</button>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Vista previa de las 5 hojas del Excel Maestro</h2>
            <p class="panel-sub">En la versión productiva (Next.js + ExcelJS) estas 5 pestañas se empaquetan en un único archivo .xlsx</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="system-tabs">
            ${[
              ["metadatos", "1. Metadatos y lectura"],
              ["base", "2. Base maestra"],
              ["diccionario", "3. Diccionario"],
              ["resumen", "4. Resumen estadístico"],
              ["errores", `5. Deuda de registro (${debtRows.length})`]
            ].map(([k, lbl]) => `<button class="sys-tab ${sheet === k ? "active" : ""}" type="button" data-exp-sheet="${k}">${esc(lbl)}</button>`).join("")}
          </div>
          <div class="table-wrap">${previewHtml}</div>
        </div>
      </section>
    `;
  }

  // ===================== VIEW 9: ADMIN Y AUDITORÍA =====================
  function viewConfiguracion() {
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Administración, roles y auditoría</h1>
          <p class="page-desc">Trazabilidad inmutable de cada acción clínica, matriz RBAC y arquitectura de ambientes sobre VPS (PostgreSQL + Docker).</p>
        </div>
      </div>

      <div class="grid-equal">
        <section class="panel">
          <div class="panel-head"><h2 class="panel-title">Ambientes y despliegue en VPS</h2></div>
          <div class="panel-body">
            <div class="derived-strip">
              <div class="derived-item"><span class="derived-label">Producción (prod)</span><span class="derived-val">Arranque limpio · PostgreSQL</span></div>
              <div class="derived-item"><span class="derived-label">Preproducción (preprod)</span><span class="derived-val">Réplica VPS · Demos</span></div>
              <div class="derived-item"><span class="derived-label">Pruebas (test / QA)</span><span class="derived-val">Base efímera + CI</span></div>
              <div class="derived-item"><span class="derived-label">Desarrollo (dev)</span><span class="derived-val">Local Docker + Seeds</span></div>
              <div class="derived-item"><span class="derived-label">Timeout sesión guardia</span><span class="derived-val">${state.sessionTimeoutMin} min</span></div>
              <div class="derived-item"><span class="derived-label">Backups VPS</span><span class="derived-val">Diarios cifrados 3-2-1</span></div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head"><h2 class="panel-title">Matriz de perfiles (RBAC)</h2></div>
          <div class="panel-body tight">
            <div class="table-wrap">
              <table class="clinical-table">
                <thead><tr><th>Perfil</th><th>Editar</th><th>Firmar</th><th>Importar</th><th>Exportar full</th></tr></thead>
                <tbody>
                  ${DATA.ROLES.map((rl) => `
                    <tr>
                      <td><strong>${esc(rl.roleLabel)}</strong><div class="field-hint">${esc(rl.name)}</div></td>
                      <td>${rl.permissions.editClinical ? "Sí" : "No"}</td>
                      <td>${rl.permissions.signDraft ? "Sí" : "No"}</td>
                      <td>${rl.permissions.importFiles ? "Sí" : "No"}</td>
                      <td>${rl.permissions.exportFull ? "Sí" : "No"}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Bitácora de auditoría en vivo (${state.auditLog.length} registros)</h2>
            <p class="panel-sub">Cada alta, cambio clínico, validación o importación que hagas en la maqueta queda registrada acá</p>
          </div>
        </div>
        <div class="panel-body tight">
          <div class="table-wrap">
            <table class="clinical-table">
              <thead><tr><th>Fecha / Hora</th><th>Usuario y rol</th><th>Acción</th><th>Registro</th><th>Detalle</th></tr></thead>
              <tbody>
                ${state.auditLog.map((a) => `
                  <tr>
                    <td class="mono" style="white-space:nowrap">${esc(ENG.fmtDate(a.ts))}</td>
                    <td><strong>${esc(a.user)}</strong><div class="field-hint">${esc(a.role)}</div></td>
                    <td>${esc(a.action)}</td>
                    <td class="mono">${esc(a.target)}</td>
                    <td>${esc(a.detail)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  // ===================== MAIN RENDER =====================
  function render() {
    ENG.setInstitution({ eosIncidence: state.eosIncidence });
    renderNav();
    renderTopbar();
    renderPatientStrip();

    const views = {
      inicio: viewInicio,
      pacientes: viewPacientes,
      ingreso: viewIngreso,
      hosp: viewHosp,
      epicrisis: viewEpicrisis,
      importar: viewImportar,
      estadisticas: viewEstadisticas,
      exportacion: viewExportacion,
      configuracion: viewConfiguracion
    };

    document.getElementById("main").innerHTML = (views[ui.route] || viewInicio)();
    bindViewEvents();
  }

  // ===================== MODALS & ACTIONS =====================
  function showRoleModal() {
    const body = DATA.ROLES.map((rl) => `
      <button class="role-option ${rl.id === state.activeRoleId ? "selected" : ""}" type="button" data-pick-role="${esc(rl.id)}">
        <div>
          <strong style="display:block;color:var(--navy)">${esc(rl.name)}</strong>
          <span class="field-hint">${esc(rl.roleLabel)} · ${esc(rl.matricula)}</span>
        </div>
        <span class="status-pill ${rl.permissions.signDraft ? "status-hosp" : rl.permissions.editClinical ? "status-warn" : "status-na"}">
          ${rl.permissions.signDraft ? "Firma médica" : rl.permissions.editClinical ? "Carga sin firma" : "Solo lectura"}
        </span>
      </button>
    `).join("");
    openModal("Cambiar perfil de demostración (RBAC)", body);
  }

  function showGuideModal() {
    openModal(
      "Guion de recorridos para presentar a la clínica",
      `<ol style="padding-left:18px;margin:0;display:grid;gap:10px;font-size:13.5px">
        <li><strong>Inicio y roles:</strong> mostrá la ocupación por sector, la bandeja de deuda clínica y cambiá el perfil arriba a la derecha a <em>Dirección · Solo consulta</em> o <em>Enfermería</em>.</li>
        <li><strong>Alta rápida e Ingreso condicional:</strong> creá un paciente o abrí <em>Lucas Pereyra</em> (Ingreso incompleto), activá <em>Reanimación = Sí</em> o <em>Diabetes = Sí</em>, generá el borrador y modificá la temperatura para ver el <strong>aviso de desfasaje</strong>.</li>
        <li><strong>Calculadoras automáticas:</strong> abrí <em>Mateo Cabrera (38+4)</em> para ver <strong>Kaiser 2024</strong> en vivo y <em>Alma Ríos (24+2)</em> para <strong>CRIB II</strong> y <strong>Fenton 2025</strong>.</li>
        <li><strong>Líneas de tiempo:</strong> en <em>Alma Ríos → Hospitalización</em> agregá un cambio respiratorio y probá alternar <em>Cobertura de cronología</em>.</li>
        <li><strong>Importación Excel / CSV segura:</strong> cargá el lote de ejemplo en <em>Importar</em> para mostrar el bloqueo por <strong>3 identificadores</strong> y la aprobación en bandeja humana.</li>
        <li><strong>Estadísticas y Exportación:</strong> filtrá por peso &lt; 1.500 g, señalá la separación entre <em>Fuera de riesgo</em> y <em>Sin dato</em>, y recorré las 5 hojas del Excel Maestro.</li>
      </ol>`
    );
  }

  function showNewPatientModal() {
    openModal(
      "Alta rápida de paciente",
      `<p class="field-hint" style="margin-bottom:12px">Solo el nombre es obligatorio. Lo que no completes queda como «Sin responder» y se carga después en la ficha de ingreso: la app nunca rellena datos clínicos por su cuenta.</p>
      <div class="form-grid">
        <div class="field"><label for="np-name">Nombre / RN de (obligatorio)</label><input class="input" id="np-name" placeholder="Ej. RN de Laura Rojas" /></div>
        <div class="field"><label for="np-sex">Sexo</label><select class="select" id="np-sex"><option value="">Sin consignar</option><option value="F">Femenino</option><option value="M">Masculino</option><option value="I">Indeterminado</option></select></div>
        <div class="field"><label for="np-hc">N° Historia Clínica</label><input class="input mono" id="np-hc" placeholder="Opcional" /></div>
        <div class="field"><label for="np-mother">Nombre de la madre</label><input class="input" id="np-mother" placeholder="Opcional" /></div>
        <div class="field"><label for="np-bdate">Fecha de nacimiento</label><input class="input" id="np-bdate" type="date" /></div>
        <div class="field"><label for="np-adate">Fecha de ingreso a la unidad</label><input class="input" id="np-adate" type="date" value="${ENG.REF_DATE}" /></div>
        <div class="field"><label for="np-sector">Sector inicial</label><select class="select" id="np-sector"><option value="">Sin asignar</option>${DATA.SECTORS.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select></div>
        <div class="field"><label for="np-gaw">EG semanas</label><input class="input num" id="np-gaw" type="number" min="22" max="43" placeholder="Opcional" /></div>
        <div class="field"><label for="np-gad">EG días</label><input class="input num" id="np-gad" type="number" min="0" max="6" placeholder="Opcional" /></div>
        <div class="field"><label for="np-wt">Peso al nacer (g)</label><input class="input num" id="np-wt" type="number" min="350" max="5500" placeholder="Opcional" /></div>
      </div>`,
      `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
       <button class="btn btn-primary" type="button" id="confirm-new-patient">Crear en Ingreso incompleto</button>`
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
      `<div style="background:#ffffff;border:1px solid var(--border-strong);padding:20px;font-family:var(--font-mono);font-size:12px;line-height:1.65;white-space:pre-wrap">${esc(text || "Generá primero el borrador para previsualizar el documento.")}</div>`,
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

    // New patient triggers
    const btnNew = document.getElementById("btn-new-patient");
    if (btnNew) btnNew.onclick = showNewPatientModal;

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

        // Cero datos huérfanos: si la respuesta cerró una rama condicional, se descartan
        // todos sus subcampos con valor y el descarte queda en la bitácora de auditoría.
        if (sf || pf || af) {
          const discarded = SCHEMA.discardClosedBranches(p);
          if (discarded.length) {
            const parent = SCHEMA.FIELD_BY_KEY[sf || pf || af];
            const branchName = parent ? parent.label : (sf || pf || af);
            const detail = discarded.map((d) => `${d.label}: ${d.value}`).join(", ");
            logAudit(`Descarte de rama «${branchName}»`, `${p.id} (${p.fullName})`, `Respuesta cambiada a «${val === "" ? "Sin responder" : val}» · Subcampos descartados: ${detail}`);
            toast(`Rama «${branchName}» cerrada: ${discarded.length} subcampo(s) descartado(s) y registrado(s) en auditoría.`);
          }
        }

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

    // Add timeline events modals
    const bAddResp = document.getElementById("btn-add-resp");
    if (bAddResp) {
      bAddResp.onclick = () => {
        const p = activePatient();
        const nextDay = ENG.getPatientStayDays(p);
        openModal(
          "Agregar cambio a línea de tiempo respiratoria",
          `<div class="form-grid">
            <div class="field"><label for="mr-day">Día de vida (DDV)</label><input class="input num" id="mr-day" type="number" min="0" value="${nextDay}" /></div>
            <div class="field"><label for="mr-ev">Evento</label><input class="input" id="mr-ev" value="Destete / ajuste de soporte" /></div>
            <div class="field"><label for="mr-mod">Modalidad</label><select class="select" id="mr-mod">${DATA.RESP_MODALITIES.map((m) => `<option value="${m}">${m}</option>`).join("")}</select></div>
            <div class="field"><label for="mr-fio2">FiO2 (%)</label><input class="input num" id="mr-fio2" type="number" min="21" max="100" value="25" /></div>
            <div class="field"><label for="mr-peep">PEEP (opcional)</label><input class="input num" id="mr-peep" type="number" placeholder="Ej. 5" /></div>
            <div class="field"><label for="mr-flow">Flujo L/min (opcional)</label><input class="input num" id="mr-flow" type="number" step="0.5" placeholder="Ej. 1.5" /></div>
          </div>`,
          `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
           <button class="btn btn-primary" type="button" id="confirm-add-resp">Guardar cambio</button>`
        );
      };
    }

    const bAddNutr = document.getElementById("btn-add-nutr");
    if (bAddNutr) {
      bAddNutr.onclick = () => {
        const p = activePatient();
        openModal(
          "Agregar evento nutricional",
          `<div class="form-grid">
            <div class="field"><label for="mn-day">DDV</label><input class="input num" id="mn-day" type="number" min="0" value="${ENG.getPatientStayDays(p)}" /></div>
            <div class="field"><label for="mn-route">Vía</label><select class="select" id="mn-route"><option value="Enteral">Enteral</option><option value="Parenteral">Parenteral</option><option value="Suplementos">Suplementos</option></select></div>
            <div class="field"><label for="mn-ev">Evento</label><input class="input" id="mn-ev" placeholder="Ej. Alcanza 100 cc/kg/d" /></div>
            <div class="field"><label for="mn-milk">Tipo de leche</label><input class="input" id="mn-milk" placeholder="Leche materna / Fórmula" /></div>
            <div class="field"><label for="mn-cc">Aporte (cc/kg/d)</label><input class="input num" id="mn-cc" type="number" placeholder="100" /></div>
            <div class="field"><label for="mn-det">Detalle</label><input class="input" id="mn-det" placeholder="Observaciones" /></div>
          </div>`,
          `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
           <button class="btn btn-primary" type="button" id="confirm-add-nutr">Guardar evento</button>`
        );
      };
    }

    const bAddIaas = document.getElementById("btn-add-iaas");
    if (bAddIaas) {
      bAddIaas.onclick = () => {
        const p = activePatient();
        openModal(
          "Agregar episodio infeccioso / IAAS",
          `<div class="form-grid">
            <div class="field"><label for="mi-day">DDV</label><input class="input num" id="mi-day" type="number" min="0" value="${ENG.getPatientStayDays(p)}" /></div>
            <div class="field"><label for="mi-syn">Síndrome</label><input class="input" id="mi-syn" value="Sepsis tardía sospechada" /></div>
            <div class="field"><label for="mi-foc">Foco / muestra</label><input class="input" id="mi-foc" value="Hemocultivo" /></div>
            <div class="field"><label for="mi-germ">Germen (catálogo)</label><select class="select" id="mi-germ">${DATA.MICROORGANISMS.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("")}</select></div>
            <div class="field"><label for="mi-abx1">Antibiótico 1</label><select class="select" id="mi-abx1">${DATA.ANTIBIOTICS.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("")}</select></div>
            <div class="field"><label for="mi-abx2">Antibiótico 2</label><select class="select" id="mi-abx2"><option value="">Ninguno</option>${DATA.ANTIBIOTICS.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("")}</select></div>
            <div class="field"><label for="mi-days">Duración (días)</label><input class="input num" id="mi-days" type="number" value="7" /></div>
            <div class="field"><label for="mi-cath">Asociado a catéter</label><select class="select" id="mi-cath"><option value="No">No</option><option value="Sí">Sí</option></select></div>
          </div>`,
          `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
           <button class="btn btn-primary" type="button" id="confirm-add-iaas">Guardar episodio</button>`
        );
      };
    }

    const bAddCath = document.getElementById("btn-add-cath");
    if (bAddCath) {
      bAddCath.onclick = () => {
        openModal(
          "Agregar acceso vascular central",
          `<div class="form-grid">
            <div class="field"><label for="mc-type">Tipo</label><select class="select" id="mc-type"><option value="CVU">CVU</option><option value="CAU">CAU</option><option value="PICC">PICC</option><option value="CVC">CVC</option></select></div>
            <div class="field"><label for="mc-in">DDV colocación</label><input class="input num" id="mc-in" type="number" value="1" /></div>
            <div class="field"><label for="mc-out">DDV retiro (vacío si activo)</label><input class="input num" id="mc-out" type="number" placeholder="Ej. 12" /></div>
            <div class="field"><label for="mc-site">Sitio anatómico</label><input class="input" id="mc-site" placeholder="Ej. MSD basílica" /></div>
            <div class="field"><label for="mc-rea">Motivo de retiro</label><input class="input" id="mc-rea" value="Fin de uso" /></div>
            <div class="field"><label for="mc-comp">Complicación</label><input class="input" id="mc-comp" value="Ninguna" /></div>
          </div>`,
          `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
           <button class="btn btn-primary" type="button" id="confirm-add-cath">Guardar catéter</button>`
        );
      };
    }

    const bAddTx = document.getElementById("btn-add-tx");
    if (bAddTx) {
      bAddTx.onclick = () => {
        openModal(
          "Agregar transfusión",
          `<div class="form-grid">
            <div class="field"><label for="mt-day">DDV</label><input class="input num" id="mt-day" type="number" value="${ENG.getPatientStayDays(activePatient())}" /></div>
            <div class="field"><label for="mt-comp">Hemocomponente</label><select class="select" id="mt-comp"><option value="Glóbulos rojos desplematizados">Glóbulos rojos desplematizados</option><option value="Plaquetas">Plaquetas</option><option value="Plasma fresco congelado">Plasma fresco congelado</option></select></div>
            <div class="field"><label for="mt-ind">Indicación</label><input class="input" id="mt-ind" value="Anemia del prematuro" /></div>
            <div class="field"><label for="mt-vol">Volumen (mL/kg)</label><input class="input num" id="mt-vol" type="number" value="15" /></div>
            <div class="field"><label for="mt-reac">Reacción adversa</label><select class="select" id="mt-reac"><option value="No">No</option><option value="Sí">Sí</option></select></div>
          </div>`,
          `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
           <button class="btn btn-primary" type="button" id="confirm-add-tx">Guardar transfusión</button>`
        );
      };
    }

    const bAddRop = document.getElementById("btn-add-rop");
    if (bAddRop) {
      bAddRop.onclick = () => {
        openModal(
          "Agregar control oftalmológico (ROP)",
          `<div class="form-grid">
            <div class="field"><label for="mrop-day">DDV</label><input class="input num" id="mrop-day" type="number" value="${ENG.getPatientStayDays(activePatient())}" /></div>
            <div class="field"><label for="mrop-st">Estadio (0–5)</label><input class="input num" id="mrop-st" type="number" min="0" max="5" value="1" /></div>
            <div class="field"><label for="mrop-zn">Zona</label><select class="select" id="mrop-zn"><option value="I">I</option><option value="II" selected>II</option><option value="III">III</option></select></div>
            <div class="field"><label for="mrop-pl">Enfermedad Plus</label><select class="select" id="mrop-pl"><option value="No">No</option><option value="Sí">Sí</option></select></div>
            <div class="field"><label for="mrop-tx">Conducta / Tratamiento</label><input class="input" id="mrop-tx" value="Control semanal" /></div>
          </div>`,
          `<button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
           <button class="btn btn-primary" type="button" id="confirm-add-rop">Guardar control</button>`
        );
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
        const dict = {
          version: "neosalud-dict-v1.0",
          rules: { NA: "Fuera de riesgo (excluido del denominador)", SD: "En riesgo sin dato (deuda de registro)" },
          calculators: ["Fenton 2025", "Kaiser 2024 (>=35 sem)", "CRIB II (<=32 sem o <=1500 g)", "DBP Jensen", "DBP Bancalari"]
        };
        downloadFile("diccionario_datos_neosalud_v1.json", JSON.stringify(dict, null, 2), "application/json");
        toast("Diccionario de datos descargado.");
      });
    }
  }

  // Global delegated clicks (nav, modals, patient buttons, tabs)
  document.addEventListener("click", (e) => {
    const t = e.target;

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

    const hospTab = t.closest("[data-hosp-tab]");
    if (hospTab) {
      ui.hospTab = hospTab.getAttribute("data-hosp-tab");
      render();
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

    const pickRole = t.closest("[data-pick-role]");
    if (pickRole) {
      state.activeRoleId = pickRole.getAttribute("data-pick-role");
      saveState();
      closeModal();
      toast(`Perfil activo: ${activeRole().name} (${activeRole().roleLabel}).`);
      render();
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
    if (t.id === "confirm-new-patient") {
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
      toast(`Paciente ${newId} creado en Ingreso incompleto.`);
      navigate("ingreso", newId);
      return;
    }

    if (t.id === "confirm-add-resp") {
      const p = activePatient();
      if (!p) return;
      p.hosp.respEvents.push({
        id: "r-" + Date.now(),
        day: Number(document.getElementById("mr-day")?.value || 0),
        date: ENG.REF_DATE,
        time: "",
        event: document.getElementById("mr-ev")?.value.trim() || "Ajuste soporte",
        modality: document.getElementById("mr-mod")?.value || "O2",
        fio2: Number(document.getElementById("mr-fio2")?.value || 21),
        peep: document.getElementById("mr-peep")?.value || "",
        flow: document.getElementById("mr-flow")?.value || ""
      });
      saveState();
      logAudit("Evento respiratorio", `${p.id} (${p.fullName})`, `Nuevo cambio agregado en línea de tiempo`);
      closeModal();
      toast("Cambio respiratorio agregado; totales y DBP recalculados.");
      render();
      return;
    }

    if (t.id === "confirm-add-nutr") {
      const p = activePatient();
      if (!p) return;
      p.hosp.nutrEvents.push({
        id: "n-" + Date.now(),
        day: Number(document.getElementById("mn-day")?.value || 0),
        date: ENG.REF_DATE,
        route: document.getElementById("mn-route")?.value || "Enteral",
        event: document.getElementById("mn-ev")?.value.trim() || "Actualización nutricional",
        milk: document.getElementById("mn-milk")?.value.trim() || "",
        ccKg: Number(document.getElementById("mn-cc")?.value || 0),
        detail: document.getElementById("mn-det")?.value.trim() || ""
      });
      saveState();
      logAudit("Evento nutricional", `${p.id} (${p.fullName})`, "Nuevo evento nutricional agregado");
      closeModal();
      toast("Evento nutricional agregado.");
      render();
      return;
    }

    if (t.id === "confirm-add-iaas") {
      const p = activePatient();
      if (!p) return;
      p.hosp.iaasEpisodes.push({
        id: "i-" + Date.now(),
        day: Number(document.getElementById("mi-day")?.value || 0),
        date: ENG.REF_DATE,
        syndrome: document.getElementById("mi-syn")?.value.trim() || "IAAS",
        cultureConfirmed: "Sí",
        focus: document.getElementById("mi-foc")?.value.trim() || "",
        germ: document.getElementById("mi-germ")?.value || "",
        abx1: document.getElementById("mi-abx1")?.value || "",
        abx2: document.getElementById("mi-abx2")?.value || "",
        days: Number(document.getElementById("mi-days")?.value || 7),
        catheterRelated: document.getElementById("mi-cath")?.value || "No"
      });
      saveState();
      logAudit("Episodio IAAS", `${p.id} (${p.fullName})`, "Episodio registrado en catálogo cerrado");
      closeModal();
      toast("Episodio infeccioso registrado.");
      render();
      return;
    }

    if (t.id === "confirm-add-cath") {
      const p = activePatient();
      if (!p) return;
      p.hosp.catheters.push({
        id: "c-" + Date.now(),
        type: document.getElementById("mc-type")?.value || "PICC",
        insertDay: Number(document.getElementById("mc-in")?.value || 0),
        removeDay: document.getElementById("mc-out")?.value === "" ? "" : Number(document.getElementById("mc-out")?.value),
        site: document.getElementById("mc-site")?.value.trim() || "",
        reason: document.getElementById("mc-rea")?.value.trim() || "",
        complication: document.getElementById("mc-comp")?.value.trim() || "Ninguna"
      });
      saveState();
      logAudit("Acceso vascular", `${p.id} (${p.fullName})`, "Catéter central agregado");
      closeModal();
      toast("Catéter registrado; días-catéter actualizados.");
      render();
      return;
    }

    if (t.id === "confirm-add-tx") {
      const p = activePatient();
      if (!p) return;
      p.hosp.transfusions.push({
        id: "t-" + Date.now(),
        day: Number(document.getElementById("mt-day")?.value || 0),
        component: document.getElementById("mt-comp")?.value || "",
        indication: document.getElementById("mt-ind")?.value.trim() || "",
        mlKg: Number(document.getElementById("mt-vol")?.value || 15),
        reaction: document.getElementById("mt-reac")?.value || "No"
      });
      saveState();
      logAudit("Transfusión", `${p.id} (${p.fullName})`, "Hemocomponente registrado");
      closeModal();
      toast("Transfusión registrada.");
      render();
      return;
    }

    if (t.id === "confirm-add-rop") {
      const p = activePatient();
      if (!p) return;
      p.hosp.ropExams.push({
        id: "rop-" + Date.now(),
        day: Number(document.getElementById("mrop-day")?.value || 0),
        stage: Number(document.getElementById("mrop-st")?.value || 0),
        zone: document.getElementById("mrop-zn")?.value || "II",
        plus: document.getElementById("mrop-pl")?.value || "No",
        treatment: document.getElementById("mrop-tx")?.value.trim() || "Control"
      });
      saveState();
      logAudit("Control ROP", `${p.id} (${p.fullName})`, "Fondo de ojo registrado");
      closeModal();
      toast("Control ROP guardado; peor estadio actualizado.");
      render();
      return;
    }
  });

  // Static shell buttons
  document.getElementById("brand-btn").onclick = () => navigate("inicio");
  document.getElementById("role-trigger").onclick = showRoleModal;
  document.getElementById("open-guide-btn").onclick = showGuideModal;
  document.getElementById("open-rail-btn").onclick = openDrawer;
  document.getElementById("close-rail-btn").onclick = closeDrawer;
  document.getElementById("drawer-scrim").onclick = closeDrawer;
  document.getElementById("reset-demo-btn").onclick = () => {
    state = DATA.createSeedState();
    ui.selectedPatientId = state.patients[0].id;
    ui.activeBatch = null;
    ui.importStep = 1;
    saveState();
    toast("Maqueta reiniciada a los 8 casos ficticios iniciales.");
    navigate("inicio");
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeDrawer();
    }
  });

  // Seed pre-generated drafts for Alma Rios so Epicrisis/Ingreso look rich out of the box
  (function hydrateInitialDrafts() {
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
  })();

  render();
})();
