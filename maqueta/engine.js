(function (global) {
  const REF_DATE = "2026-11-22";

  // Parámetros institucionales que usan las calculadoras. La incidencia local de sepsis
  // precoz (por 1.000 nacidos vivos) es un dato del hospital: se configura en Administración.
  const institution = { eosIncidence: 0.5 };
  function setInstitution(params) {
    Object.assign(institution, params || {});
  }

  // Un valor vacío es «sin dato», nunca 0. Number("") devolvería 0 y haría pasar
  // a un paciente sin EG como prematuro extremo.
  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // Formato argentino para mostrar: 2026-07-28 → 28/07/2026 (conserva la hora si viene).
  function fmtDate(v) {
    if (!v) return "";
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}${m[4]}` : String(v);
  }

  function fmtGa(weeks, days, missing) {
    const w = num(weeks);
    if (w === null) return missing === undefined ? "Sin responder" : missing;
    const d = num(days);
    return d === null ? `${w}` : `${w}+${d}`;
  }

  function fmtWeight(g, missing) {
    const w = num(g);
    if (w === null) return missing === undefined ? "Sin responder" : missing;
    return `${w.toLocaleString("es-AR")} g`;
  }

  // Referencia aproximada Fenton 2025 por edad gestacional (23..42 sem) para la maqueta
  // Media de peso (g) y DE aproximada por semana (femenino ajusta -3.5%)
  const FENTON_WEIGHT_REF = {
    23: [560, 82], 24: [650, 95], 25: [750, 110], 26: [865, 130], 27: [1000, 150],
    28: [1145, 175], 29: [1310, 195], 30: [1490, 220], 31: [1685, 245], 32: [1890, 270],
    33: [2110, 295], 34: [2340, 320], 35: [2580, 345], 36: [2820, 365], 37: [3050, 385],
    38: [3260, 405], 39: [3440, 420], 40: [3580, 435], 41: [3680, 445], 42: [3740, 450]
  };

  function erf(x) {
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
    return sign * y;
  }

  function zToPercentile(z) {
    const p = 0.5 * (1 + erf(z / Math.SQRT2)) * 100;
    return Math.max(0.1, Math.min(99.9, p));
  }

  function calcFenton2025(gaWeeks, gaDays, sex, weightG) {
    const w = num(gaWeeks);
    const d = num(gaDays) || 0;
    const wt = num(weightG);
    if (w === null || wt === null || w < 22 || w > 43) {
      return { ready: false, zScore: null, percentile: null, classification: "Sin datos suficientes (EG y peso)" };
    }
    if (sex !== "F" && sex !== "M") {
      return { ready: false, zScore: null, percentile: null, classification: "Requiere sexo femenino o masculino" };
    }
    const baseW = Math.max(23, Math.min(41, Math.floor(w)));
    const nextW = Math.min(42, baseW + 1);
    const frac = Math.max(0, Math.min(1, d / 7));
    const [m1, s1] = FENTON_WEIGHT_REF[baseW] || [3300, 400];
    const [m2, s2] = FENTON_WEIGHT_REF[nextW] || [3400, 410];
    let mean = m1 + (m2 - m1) * frac;
    let sd = s1 + (s2 - s1) * frac;
    if (sex === "F") {
      mean *= 0.965;
      sd *= 0.97;
    }
    const z = (wt - mean) / sd;
    const pct = zToPercentile(z);
    let cls = "AEG (Adecuado para EG)";
    if (pct < 10) cls = "PEG (Pequeño para EG)";
    else if (pct > 90) cls = "GEG (Grande para EG)";
    return {
      ready: true,
      zScore: Number(z.toFixed(2)),
      percentile: Number(pct.toFixed(1)),
      classification: cls
    };
  }

  function calcCrib2(gaWeeks, weightG, sex, tempC, baseExcess) {
    const ga = num(gaWeeks);
    const wt = num(weightG);
    if (!((ga !== null && ga <= 32) || (wt !== null && wt <= 1500))) {
      return { applicable: false };
    }
    const t = num(tempC);
    const be = num(baseExcess);
    const missing = [];
    if (ga === null) missing.push("edad gestacional");
    if (wt === null) missing.push("peso al nacer");
    if (sex !== "F" && sex !== "M") missing.push("sexo");
    if (t === null) missing.push("temperatura de ingreso");
    if (be === null) missing.push("exceso de base");
    if (missing.length) return { applicable: true, ready: false, missing };

    let score = 0;
    if (ga <= 24) score += 7;
    else if (ga <= 26) score += 5;
    else if (ga <= 28) score += 3;
    else if (ga <= 30) score += 2;
    else score += 1;

    if (wt < 750) score += 4;
    else if (wt < 1000) score += 3;
    else if (wt < 1250) score += 2;
    else if (wt <= 1500) score += 1;

    if (sex === "M") score += 1;

    if (t < 35.5 || t > 38.0) score += 3;
    else if (t < 36.5 || t > 37.5) score += 1;

    if (be <= -10) score += 4;
    else if (be <= -6) score += 2;
    else if (be <= -3) score += 1;

    let level = "Riesgo bajo-moderado";
    if (score >= 12) level = "Riesgo elevado";
    else if (score >= 8) level = "Riesgo intermedio";
    return { applicable: true, ready: true, score, level };
  }

  // romHours: horas de bolsa rota. Si no hubo rotura prematura, quien llama pasa 0 explícito.
  function calcKaiser2024(gaWeeks, gaDays, maxTempC, romHours, gbs, maternalAbx, examStatus) {
    const ga = num(gaWeeks);
    if (ga === null || ga < 35) return { applicable: false };

    const temp = num(maxTempC);
    const rom = num(romHours);
    const missing = [];
    if (temp === null) missing.push("temperatura materna máxima");
    if (rom === null) missing.push("horas de bolsa rota");
    if (!gbs) missing.push("estado de estreptococo grupo B");
    if (!maternalAbx) missing.push("antibióticos intraparto");
    if (!examStatus) missing.push("estado clínico del recién nacido");
    if (missing.length) return { applicable: true, ready: false, missing };

    // Riesgo de base ajustado por la incidencia local (referencia 0,5 / 1.000).
    let baseRisk = 0.42 * ((num(institution.eosIncidence) || 0.5) / 0.5);
    if (temp >= 38.5) baseRisk *= 3.8;
    else if (temp >= 38.0) baseRisk *= 2.4;
    else if (temp >= 37.5) baseRisk *= 1.4;

    if (rom >= 24) baseRisk *= 2.0;
    else if (rom >= 18) baseRisk *= 1.5;

    if (gbs === "Positivo") baseRisk *= 1.7;
    else if (gbs === "Desconocido") baseRisk *= 1.15;

    if (maternalAbx === "Ampicilina >= 4 h" || maternalAbx === "Penicilina >= 4 h") baseRisk *= 0.45;
    else if (maternalAbx === "Sin antibióticos / < 2 h" && gbs === "Positivo") baseRisk *= 1.35;

    const riskBirth = Number(Math.min(18, baseRisk).toFixed(2));
    let mult = 0.41;
    if (examStatus === "Equívoco") mult = 3.6;
    else if (examStatus === "Enfermedad clínica") mult = 14.0;
    const posterior = Number(Math.min(45, riskBirth * mult).toFixed(2));

    let recommendation = "Cuidados habituales del recién nacido; control de signos vitales de rutina.";
    let severity = "ok";
    if (posterior >= 3.0) {
      recommendation = "Hemocultivo y antibióticos empíricos; monitorización continua y correlación clínica.";
      severity = "danger";
    } else if (posterior >= 1.0) {
      recommendation = "Hemocultivo y observación clínica estrecha (control de signos vitales cada 4 h por 24 h).";
      severity = "warn";
    }
    return { applicable: true, ready: true, riskBirth, posterior, recommendation, severity, incidence: num(institution.eosIncidence) || 0.5 };
  }

  function diffDays(startIso, endIso) {
    if (!startIso) return 0;
    const a = Date.parse(startIso + "T00:00:00Z");
    const b = Date.parse((endIso || REF_DATE) + "T00:00:00Z");
    return Math.max(0, Math.round((b - a) / 86400000));
  }

  function getPatientStayDays(p) {
    return diffDays(p.admitDate || p.birthDate, p.dischargeDate || REF_DATE);
  }

  function deriveRespiratory(p) {
    const events = [...(p.hosp.respEvents || [])].sort((a, b) => a.day - b.day);
    const stay = Math.max(getPatientStayDays(p), events.length ? events[events.length - 1].day + 1 : 0);
    const complete = p.hosp.respCoverage === "completa";

    const totals = { o2: 0, cpap: 0, cn: 0, cnaf: 0, vni: 0, vmc: 0, vafo: 0 };
    let maxFio224 = null;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const nextDay = i + 1 < events.length ? events[i + 1].day : stay;
      const dur = Math.max(0, nextDay - ev.day);
      if (ev.day === 0 && ev.fio2) {
        maxFio224 = maxFio224 === null ? Number(ev.fio2) : Math.max(maxFio224, Number(ev.fio2));
      }
      if (ev.modality !== "AA") totals.o2 += dur;
      if (ev.modality === "CPAP") totals.cpap += dur;
      if (ev.modality === "CN") totals.cn += dur;
      if (ev.modality === "CNAF") totals.cnaf += dur;
      if (ev.modality === "NIPPV" || ev.modality === "BiPAP") totals.vni += dur;
      if (ev.modality === "VMC") totals.vmc += dur;
      if (ev.modality === "VAFO") totals.vafo += dur;
    }

    function modalityAtDay(targetDay) {
      let cur = null;
      for (const ev of events) {
        if (ev.day <= targetDay) cur = ev;
      }
      return cur;
    }

    const ga = num(p.gaWeeks);
    const inRiskDbp = ga !== null && ga < 32;
    const day36w = ga === null ? 0 : Math.max(0, (36 - ga) * 7 - (num(p.gaDays) || 0));

    let o2Day28 = "Desconocido (cronología incompleta)";
    let o2At36w = "No aplica";
    let vmiAt36w = "No aplica";
    let jensen = "No aplica";
    let bancalari = "No aplica";
    let hasDbp = null; // true / false / null (missing) / "na"

    if (ga === null) {
      hasDbp = null;
      o2Day28 = "Sin EG registrada";
      o2At36w = "Sin EG registrada";
      vmiAt36w = "Sin EG registrada";
      jensen = "No evaluable: falta la edad gestacional";
      bancalari = "No evaluable: falta la edad gestacional";
    } else if (!inRiskDbp) {
      hasDbp = "na";
      o2Day28 = complete ? (stay >= 28 && modalityAtDay(28)?.modality !== "AA" ? "Sí" : "No") : "Incompleta";
    } else if (!complete) {
      hasDbp = null;
      o2Day28 = "Sin confirmar (cronología incompleta)";
      o2At36w = "Sin confirmar";
      vmiAt36w = "Sin confirmar";
      jensen = "Pendiente de cierre de cronología";
      bancalari = "Pendiente de cierre de cronología";
    } else if (p.status === "fallecido" && stay < 28) {
      hasDbp = "na";
      o2Day28 = "Fallecido antes del día 28";
      o2At36w = "No aplica";
      vmiAt36w = "No aplica";
      jensen = "No evaluable (fallecido < 28 d)";
      bancalari = "No evaluable";
    } else {
      const m28 = stay >= 28 ? modalityAtDay(28) : null;
      const onO2_28 = !!(m28 && m28.modality !== "AA");
      o2Day28 = stay < 28 ? "Aún < 28 días" : (onO2_28 ? "Sí" : "No");

      const m36 = stay >= day36w ? modalityAtDay(day36w) : null;
      if (stay < day36w) {
        hasDbp = null;
        o2At36w = "Aún < 36 sem EGC";
        vmiAt36w = "Aún < 36 sem EGC";
        jensen = "Pendiente (EGC < 36 sem)";
        bancalari = "Pendiente (EGC < 36 sem)";
      } else {
        const onO2_36 = !!(m36 && m36.modality !== "AA");
        const onVmi_36 = !!(m36 && (m36.modality === "VMC" || m36.modality === "VAFO"));
        o2At36w = onO2_36 ? "Sí" : "No";
        vmiAt36w = onVmi_36 ? "Sí" : "No";

        if (!onO2_28 && !onO2_36) {
          hasDbp = false;
          jensen = "Sin DBP";
          bancalari = "Sin DBP";
        } else if (onVmi_36) {
          hasDbp = true;
          jensen = "Grado 3 (ventilación mecánica invasiva)";
          bancalari = "Severa";
        } else if (onO2_36 && (["CPAP", "NIPPV", "BiPAP", "CNAF"].includes(m36.modality) || Number(m36.flow || 0) > 2)) {
          hasDbp = true;
          jensen = "Grado 2 (cánula > 2 L/min o soporte no invasivo)";
          bancalari = Number(m36.fio2 || 21) >= 30 ? "Severa" : "Moderada";
        } else if (onO2_36) {
          hasDbp = true;
          jensen = "Grado 1 (cánula <= 2 L/min)";
          bancalari = "Moderada";
        } else {
          hasDbp = true;
          jensen = "Sin soporte a las 36 sem (O2 al día 28)";
          bancalari = "Leve";
        }
      }
    }

    return {
      complete,
      eventCount: events.length,
      totals,
      maxFio224,
      o2Day28,
      o2At36w,
      vmiAt36w,
      jensen,
      bancalari,
      hasDbp,
      ventDays: totals.vmc + totals.vafo
    };
  }

  function deriveNutrition(p) {
    const events = [...(p.hosp.nutrEvents || [])].sort((a, b) => a.day - b.day);
    const enteralStart = events.find((e) => e.route === "Enteral" && Number(e.ccKg || 0) > 0);
    const reach100 = events.find((e) => e.route === "Enteral" && Number(e.ccKg || 0) >= 100);
    const fort = events.find((e) => /fortif/i.test(e.event || "") || /fortif/i.test(e.milk || ""));
    const nptStart = events.find((e) => e.route === "Parenteral" && /inicio/i.test(e.event || ""));
    const nptStop = events.find((e) => e.route === "Parenteral" && /suspensi/i.test(e.event || ""));
    const stay = getPatientStayDays(p);
    let nptDays = 0;
    if (nptStart) {
      nptDays = nptStop ? Math.max(1, nptStop.day - nptStart.day) : Math.max(1, stay - nptStart.day);
    }
    return {
      complete: p.hosp.nutrCoverage === "completa",
      nptDays,
      enteralStartDay: enteralStart ? enteralStart.day : null,
      startedHumanMilk: enteralStart ? /materna|calostro/i.test(enteralStart.milk || enteralStart.detail || "") : null,
      day100cc: reach100 ? reach100.day : null,
      fortificationDay: fort ? fort.day : null
    };
  }

  function deriveCatheters(p) {
    const list = p.hosp.catheters || [];
    const byType = { CVU: 0, CAU: 0, PICC: 0, CVC: 0 };
    let totalDays = 0;
    const stay = getPatientStayDays(p);
    for (const c of list) {
      const end = c.removeDay !== "" && c.removeDay !== null && c.removeDay !== undefined ? Number(c.removeDay) : stay;
      const d = Math.max(0, end - Number(c.insertDay || 0));
      byType[c.type] = (byType[c.type] || 0) + d;
      totalDays += d;
    }
    return { count: list.length, totalDays, byType };
  }

  function deriveRopWorst(p) {
    const exams = p.hosp.ropExams || [];
    const ga = num(p.gaWeeks);
    const bw = num(p.birthWeight);
    const inRisk = (ga !== null && ga < 32) || (bw !== null && bw <= 1500)
      ? true
      : (ga === null || bw === null ? null : false);
    if (inRisk === null && !exams.length) {
      return { inRisk: null, worstStage: null, treated: false, summary: "No se puede definir el riesgo: faltan EG o peso al nacer" };
    }
    if (inRisk === false) return { inRisk: false, summary: "Fuera de riesgo (No aplica)" };
    if (!exams.length) return { inRisk: true, worstStage: null, treated: false, summary: "Sin controles registrados (deuda de registro)" };
    let worst = exams[0];
    let treated = false;
    for (const ex of exams) {
      if (Number(ex.stage) > Number(worst.stage)) worst = ex;
      if (/láser|laser|anti-vegf|cirug/i.test(ex.treatment || "")) treated = true;
    }
    return {
      inRisk: true,
      worstStage: Number(worst.stage),
      zone: worst.zone,
      plus: worst.plus,
      treated,
      summary: Number(worst.stage) === 0
        ? "Sin ROP (vascularización completa / estadio 0)"
        : `Estadio ${worst.stage} · Zona ${worst.zone} · Plus: ${worst.plus}${treated ? " · Tratada" : ""}`
    };
  }

  // ---- Acceso al esquema (schema.js se carga después del motor; se lee al momento de usarlo) ----
  function schemaRef() {
    return global.NEOSALUD_SCHEMA || null;
  }

  function optionLabel(f, v) {
    const pair = (f.options || []).map((o) => (Array.isArray(o) ? o : [o, o])).find(([val]) => String(val) === String(v));
    return pair ? pair[1] : String(v);
  }

  // Valor legible de una variable del esquema; vacío → «Sin responder».
  function fieldText(p, key, missing) {
    const S = schemaRef();
    const miss = missing === undefined ? "Sin responder" : missing;
    if (!S || !S.FIELD_BY_KEY[key]) return miss;
    const f = S.FIELD_BY_KEY[key];
    const v = S.readField(p, f);
    if (v === "") return miss;
    if (f.type === "number" && num(v) !== null) return num(v).toLocaleString("es-AR");
    const out = optionLabel(f, v);
    return f.type === "date" ? fmtDate(out) : out;
  }

  function fieldIs(p, key, value) {
    const S = schemaRef();
    if (!S || !S.FIELD_BY_KEY[key]) return false;
    return String(S.readField(p, S.FIELD_BY_KEY[key])) === String(value);
  }

  // Tabla de texto a dos columnas alineadas (el borrador se ve en tipografía monoespaciada).
  function twoColumnTable(pairs, colWidth) {
    const w = colWidth || 48;
    const cells = pairs.map(([label, value]) => ` ${label}: ${value}`);
    const lines = [];
    for (let i = 0; i < cells.length; i += 2) {
      const left = cells[i];
      const right = cells[i + 1];
      if (right === undefined) lines.push(left);
      else if (left.length >= w) { lines.push(left); lines.push(right); }
      else lines.push(left.padEnd(w) + right);
    }
    return lines.join("\n");
  }

  // Variables del esquema visibles (rama abierta) de un conjunto de secciones.
  // Las núcleo vacías se informan como «Sin responder»; las «A confirmar» solo si tienen dato.
  function schemaPairs(p, sections, excludeKeys) {
    const S = schemaRef();
    if (!S) return [];
    const skip = new Set(excludeKeys || []);
    const pairs = [];
    for (const sec of sections) {
      for (const f of sec.fields) {
        if (skip.has(f.key) || !S.conditionMet(p, f)) continue;
        const v = S.readField(p, f);
        if (v === "" && !f.core) continue;
        pairs.push([f.label, fieldText(p, f.key)]);
      }
    }
    return pairs;
  }

  // Quita líneas vacías repetidas que dejan las condiciones no aplicables.
  // Frase del nacimiento solo con lo registrado (lo faltante ya figura como «Sin responder» en la tabla).
  function birthNarrative(p) {
    const bits = [];
    if (fieldText(p, "deliveryType", "")) bits.push("nacido por " + fieldText(p, "deliveryType").toLowerCase());
    if (fieldText(p, "presentation", "")) bits.push("presentación " + fieldText(p, "presentation").toLowerCase());
    if (fieldText(p, "amnioticFluid", "")) bits.push("líquido amniótico " + fieldText(p, "amnioticFluid").toLowerCase());
    if (!bits.length) return "";
    const t = bits.join(", ");
    return t.charAt(0).toUpperCase() + t.slice(1) + ".";
  }

  function compactLines(lines) {
    return lines.filter((x, i) => x !== "" || (lines[i - 1] !== "" && lines[i - 1] !== undefined)).join("\n");
  }

  // Snapshot para detectar desfasaje: todas las variables del ingreso del esquema + diagnósticos.
  function admissionSnapshot(p) {
    const S = schemaRef();
    const snap = {};
    if (S) {
      for (const sec of S.ADMISSION_SECTIONS) {
        for (const f of sec.fields) snap[f.key] = String(S.readField(p, f));
      }
    }
    snap.diagnoses = (p.admission.diagnoses || []).join(",");
    return snap;
  }

  function epicrisisSnapshot(p) {
    const r = deriveRespiratory(p);
    const n = deriveNutrition(p);
    const S = schemaRef();
    const snap = {
      respEvents: String(r.eventCount),
      respCoverage: p.hosp.respCoverage,
      jensen: r.jensen,
      nptDays: String(n.nptDays),
      nutrEvents: String((p.hosp.nutrEvents || []).length),
      iaasEpisodes: String((p.hosp.iaasEpisodes || []).length),
      catheters: String((p.hosp.catheters || []).length),
      ropExams: String((p.hosp.ropExams || []).length)
    };
    if (S) {
      for (const sec of [...S.HOSP_SECTIONS, ...S.DISCHARGE_SECTIONS]) {
        for (const f of sec.fields) snap[f.key] = String(S.readField(p, f));
      }
    }
    return snap;
  }

  const FIELD_LABELS = {
    tempC: "Temperatura ingreso (°C)",
    birthWeight: "Peso al nacer (g)",
    gaWeeks: "Edad gestacional (sem)",
    gaDays: "Edad gestacional (días)",
    resuscitation: "Reanimación",
    maternalAge: "Edad materna",
    diagnoses: "Diagnósticos de ingreso",
    respEvents: "Eventos respiratorios",
    respCoverage: "Cobertura respiratoria",
    nutrEvents: "Eventos nutricionales",
    iaasEpisodes: "Episodios infecciosos",
    catheters: "Catéteres",
    ropExams: "Controles de ROP",
    jensen: "Clasificación DBP Jensen",
    nptDays: "Días de NPT",
    condition: "Condición al egreso",
    weightG: "Peso al egreso (g)",
    homeO2: "Oxígeno domiciliario"
  };

  function computeDraftDiff(p, kind) {
    const draft = kind === "admission" ? p.admissionDraft : p.epicrisisDraft;
    if (!draft || !draft.snapshot) return [];
    const current = kind === "admission" ? admissionSnapshot(p) : epicrisisSnapshot(p);
    const diffs = [];
    for (const key of Object.keys(current)) {
      const prev = String(draft.snapshot[key] ?? "");
      const curr = String(current[key] ?? "");
      if (prev !== curr) {
        diffs.push({
          field: key,
          label: FIELD_LABELS[key] || (schemaRef() && schemaRef().FIELD_BY_KEY[key] ? schemaRef().FIELD_BY_KEY[key].label : key),
          prev: prev || "Sin responder",
          curr: curr || "Sin responder"
        });
      }
    }
    return diffs;
  }

  // Al regenerar, conserva las líneas «Etiqueta: valor» que el profesional ya completó
  // donde el nuevo borrador vuelve a traer el marcador «_____».
  function carryOverCompletedFields(prevText, nextText) {
    if (!prevText) return nextText;
    const completed = {};
    for (const line of prevText.split("\n")) {
      const m = line.match(/^([^:\n]+):\s*(.+)$/);
      if (m && !m[2].includes("_____")) completed[m[1].trim()] = line;
    }
    return nextText.split("\n").map((line) => {
      const m = line.match(/^([^:\n]+):\s*_____\s*$/);
      return m && completed[m[1].trim()] ? completed[m[1].trim()] : line;
    }).join("\n");
  }

  function sexLabel(s) {
    return s === "F" ? "Femenino" : s === "M" ? "Masculino" : s === "I" ? "Indeterminado" : "Sin responder";
  }

  // Si no hubo rotura prematura de membranas, las horas de bolsa rota son 0 por definición.
  function calcKaiserFor(p) {
    const a = p.admission;
    const rom = a.rpo === "No" ? 0 : a.rpoHours;
    return calcKaiser2024(p.gaWeeks, p.gaDays, a.maternalMaxTemp, rom, a.gbs, a.maternalAbx, a.examStatus);
  }

  function valOrMissing(v, suffix) {
    if (v === null || v === undefined || v === "") return "Sin responder";
    const shown = typeof v === "number" ? v.toLocaleString("es-AR") : v;
    return suffix ? `${shown} ${suffix}` : String(shown);
  }

  function lookupDx(code) {
    const found = global.NEOSALUD_DATA.CIE10_CATALOG.find((x) => x.code === code);
    return found ? `${found.code} - ${found.label}` : code;
  }

  function generateAdmissionDraft(p) {
    const a = p.admission;
    const S = schemaRef();
    const fenton = calcFenton2025(p.gaWeeks, p.gaDays, p.sex, p.birthWeight);
    const crib = calcCrib2(p.gaWeeks, p.birthWeight, p.sex, a.tempC, a.baseExcess);
    const kaiser = calcKaiserFor(p);
    const ga = num(p.gaWeeks);

    let transitionText = "";
    if (!a.apgar1 && !a.apgar5 && !a.resuscitation) {
      transitionText = "No se consignaron las condiciones de la transición ni las maniobras de reanimación.";
    } else {
      const apgarTxt = `Apgar ${valOrMissing(a.apgar1)} / ${valOrMissing(a.apgar5)}.`;
      if (a.resuscitation === "Sí") {
        const steps = [];
        if (a.vppi === "Sí") steps.push("VPPI");
        if (a.intubation === "Sí") steps.push("intubación endotraqueal");
        if (a.chestCompressions === "Sí") steps.push("masaje cardíaco");
        if (a.adrenaline === "Sí") steps.push(`adrenalina (${valOrMissing(a.adrenalineDoses, "dosis")})`);
        transitionText = `${apgarTxt} Requirió reanimación neonatal (${steps.length ? steps.join(", ") : "detalle no consignado"}; FiO2 máx en sala de partos: ${valOrMissing(a.maxO2Delivery, "%")}).`;
      } else if (a.resuscitation === "No") {
        transitionText = `${apgarTxt} No requirió maniobras avanzadas de reanimación.`;
      } else {
        transitionText = `${apgarTxt} Reanimación: Sin responder.`;
      }
    }
    if (a.asphyxia === "Sí") transitionText += ` Asfixia perinatal${a.therapeuticHypothermia === "Sí" ? ", con indicación de hipotermia terapéutica" : ""}.`;

    // Tabla perinatal a dos columnas, generada desde el esquema
    const perinatalSections = S ? S.ADMISSION_SECTIONS.filter((sec) => ["embarazo", "serologias", "parto"].includes(sec.id)) : [];
    const idPairs = S ? schemaPairs(p, S.ADMISSION_SECTIONS.filter((sec) => sec.id === "identificacion"), [
      "hc", "rnDni", "dniStatus", "motherName", "motherDni", "fatherName", "birthDate", "birthTime", "admitDate", "sex",
      "gaWeeks", "gaDays", "birthWeight", "birthLength", "birthHc", "tempC", "baseExcess", "idBand"
    ]) : [];
    const perinatalTable = twoColumnTable([...idPairs, ...schemaPairs(p, perinatalSections)]);

    const dxLines = (a.diagnoses || []).length
      ? a.diagnoses.map((c, idx) => `${idx + 1}. ${lookupDx(c)}${idx === 0 ? " (principal)" : ""}`).join("\n")
      : "1. Sin diagnósticos consignados.";

    const ind = [
      `Ingreso a sector ${p.sector || "(sin asignar)"} en incubadora / servocuna con control térmico.`,
      "Monitorización multiparamétrica continua (FC, FR, SatO2).",
      ga === null
        ? "Soporte y controles según evaluación clínica (edad gestacional sin registrar)."
        : ga < 32
          ? "Soporte respiratorio no invasivo/invasivo según protocolo de prematurez y control gasométrico."
          : "Control clínico evolutivo de signos vitales y glucemia según protocolo."
    ];
    if (kaiser.ready && kaiser.posterior >= 3.0) ind.push(`Según Kaiser 2024 (riesgo posterior ${kaiser.posterior}/1000): ${kaiser.recommendation}`);
    // Indicaciones que se derivan de las serologías maternas reactivas
    if (fieldIs(p, "chagas", "Reactiva")) ind.push("Madre con serología reactiva para Chagas: solicitar micrométodo (parasitológico directo) al RN.");
    if (fieldIs(p, "vdrl", "Reactiva")) ind.push("Madre con VDRL reactiva: VDRL del RN y evaluación de sífilis congénita.");
    if (fieldIs(p, "hivSerology", "Reactiva")) ind.push("Madre con HIV reactivo: iniciar profilaxis antirretroviral del RN según protocolo.");
    if (fieldIs(p, "hbsag", "Reactiva")) ind.push("Madre con HBsAg reactivo: gammaglobulina anti-hepatitis B y vacuna en las primeras 12 h.");
    if (fieldIs(p, "toxo", "IgM reactiva (sospecha de infección aguda)")) ind.push("Toxoplasmosis materna aguda sospechada: evaluación del RN (serología y fondo de ojo).");

    return compactLines([
      "INGRESO · UNIDAD DE NEONATOLOGÍA",
      "================================================================",
      `Paciente: ${p.fullName}          ID: ${p.id}          HC: ${valOrMissing(p.hc)}`,
      `Sexo: ${sexLabel(p.sex)}   DNI RN: ${a.dniStatus === "Con DNI" ? valOrMissing(a.rnDni) : fieldText(p, "dniStatus")}   Madre: ${valOrMissing(p.motherName)} (DNI ${valOrMissing(p.motherDni)})`,
      `Nacimiento: ${valOrMissing(fmtDate(p.birthDate))} ${valOrMissing(p.birthTime)}   Ingreso: ${valOrMissing(fmtDate(p.admitDate))}`,
      "",
      "1. ANTECEDENTES PERINATALES",
      perinatalTable || " Sin antecedentes registrados.",
      "",
      "2. ANAMNESIS",
      `Recién nacido de sexo ${sexLabel(p.sex).toLowerCase()}, edad gestacional ${ga === null ? "sin responder" : fmtGa(p.gaWeeks, p.gaDays) + " semanas"}, peso al nacer ${fmtWeight(p.birthWeight)} (Fenton 2025: ${fenton.ready ? `${fenton.classification}, Z ${fenton.zScore}, P${fenton.percentile}` : "no calculable"}).`,
      birthNarrative(p),
      transitionText,
      crib.applicable
        ? (crib.ready ? `Score CRIB II: ${crib.score} puntos (${crib.level}).` : `Score CRIB II: no calculable, falta ${crib.missing.join(", ")}.`)
        : "",
      kaiser.applicable
        ? (kaiser.ready ? `Calculadora Kaiser 2024: riesgo basal ${kaiser.riskBirth}/1000 · riesgo posterior ${kaiser.posterior}/1000.` : `Calculadora Kaiser 2024: no calculable, falta ${kaiser.missing.join(", ")}.`)
        : "",
      "",
      "3. EXAMEN FÍSICO DE INGRESO",
      `Temperatura de ingreso: ${valOrMissing(a.tempC, "°C")} · Talla: ${valOrMissing(p.birthLength, "cm")} · Perímetro cefálico: ${valOrMissing(p.birthHc, "cm")}`,
      "Estado general y piel: _____",
      "Respiratorio y cardiovascular: _____",
      "Abdomen y neurológico: _____",
      "",
      "4. DIAGNÓSTICOS DE INGRESO (CIE-10)",
      dxLines,
      "",
      "5. INDICACIONES DE INGRESO",
      ...ind.map((t, i) => `${i + 1}. ${t}`),
      "",
      "----------------------------------------------------------------",
      "Borrador generado por la aplicación. Requiere revisión y validación médica antes de archivarse en la ficha."
    ]);
  }

  function generateEpicrisisDraft(p) {
    const r = deriveRespiratory(p);
    const n = deriveNutrition(p);
    const c = deriveCatheters(p);
    const rop = deriveRopWorst(p);
    const stay = getPatientStayDays(p);
    const d = p.discharge;
    const h = p.hosp;
    const S = schemaRef();
    const deceased = d.condition === "Fallecido";

    const iaasTxt = (h.iaasEpisodes || []).length
      ? h.iaasEpisodes.map((e) => `Día ${e.day}: ${e.syndrome} (${e.germ}; ${e.abx1}${e.abx2 ? " + " + e.abx2 : ""}, ${e.days} d)`).join("; ")
      : (h.iaasCoverage === "completa" ? "Sin episodios de IAAS (cronología completa)." : "Sin episodios cargados (cronología incompleta).");

    const surgTxt = (h.surgeries || []).length
      ? h.surgeries.map((x) => `Día ${x.day}: ${x.procedure} (${x.outcome})`).join("; ")
      : "Sin cirugías registradas.";

    const respLines = r.eventCount
      ? [
          `Días acumulados: O2 ${r.totals.o2} d · Cánula bajo flujo ${r.totals.cn} d · Cánula alto flujo ${r.totals.cnaf} d · CPAP ${r.totals.cpap} d · VNI ${r.totals.vni} d · VMC ${r.totals.vmc} d · VAFO ${r.totals.vafo} d.`,
          `FiO2 máx primeras 24 h: ${r.maxFio224 ? r.maxFio224 + "%" : "Sin dato"} | O2 día 28: ${r.o2Day28} | O2 a las 36 sem: ${r.o2At36w}.`
        ]
      : [r.complete ? "Sin soporte respiratorio (cronología completa al corte)." : "Sin eventos respiratorios registrados (cronología incompleta)."];

    const nutrLine = (h.nutrEvents || []).length
      ? `Días de NPT: ${n.nptDays} d | Inicio enteral: ${n.enteralStartDay !== null ? "DDV " + n.enteralStartDay : "Sin dato"} | 100 cc/kg/d: ${n.day100cc !== null ? "DDV " + n.day100cc : "Sin dato"} | Fortificación: ${n.fortificationDay !== null ? "DDV " + n.fortificationDay : "Sin dato"}.`
      : "Sin eventos nutricionales registrados.";

    const vertical = [];
    if (fieldIs(p, "chagas", "Reactiva")) vertical.push(`Chagas congénito: ${fieldText(p, "chagasRn")}`);
    if (fieldIs(p, "vdrl", "Reactiva")) vertical.push(`Sífilis congénita: ${fieldText(p, "syphilisRn")}`);
    if (fieldIs(p, "hivSerology", "Reactiva")) vertical.push(`Profilaxis HIV: ${fieldText(p, "hivProphylaxis")}`);
    if (fieldIs(p, "hbsag", "Reactiva")) vertical.push(`Profilaxis hepatitis B: ${fieldText(p, "hbvProphylaxis")}`);

    const perinatal = S ? twoColumnTable(schemaPairs(p, S.ADMISSION_SECTIONS.filter((sec) => ["embarazo", "serologias", "parto"].includes(sec.id)))) : "";
    const admDx = p.admission.diagnoses || [];
    const dxOut = (d.diagnoses && d.diagnoses.length ? d.diagnoses : admDx).map((code, i) => `${i + 1}. ${lookupDx(code)}`).join("\n");

    const outcome = deceased
      ? [
          "10. FALLECIMIENTO",
          `Fecha: ${valOrMissing(fmtDate(d.date))} · Días de vida: ${p.birthDate && d.date ? diffDays(p.birthDate, d.date) : "Sin responder"} · Lugar: ${fieldText(p, "deathPlace")}.`,
          `Causa básica: ${fieldText(p, "deathCause")}${d.deathImmediate ? ` · Causa inmediata: ${d.deathImmediate}` : ""}${d.autopsy ? ` · Autopsia: ${fieldText(p, "autopsy")}` : ""}.`
        ]
      : [
          "10. CONDICIÓN AL EGRESO",
          `Condición: ${fieldText(p, "condition")}${d.destination ? ` (${d.destination})` : ""} | Peso: ${valOrMissing(d.weightG, "g")} | Talla: ${valOrMissing(d.lengthCm, "cm")} | PC: ${valOrMissing(d.hcCm, "cm")}.`,
          `Alimentación: ${fieldText(p, "feeding")} | Oxígeno domiciliario: ${fieldText(p, "homeO2")}.`,
          `Pesquisas: FEI ${fieldText(p, "screenFei")} · OEA ${fieldText(p, "screenOea")} · Oximetría ${fieldText(p, "screenOximetry")} · Reflejo rojo ${fieldText(p, "screenRedReflex")}.`,
          `Vacunas: BCG ${fieldText(p, "vacBcg", valOrMissing(d.vaccines))} · Hepatitis B ${fieldText(p, "vacHbv")}.`
        ];

    return compactLines([
      "EPICRISIS NEONATAL · UNIDAD DE NEONATOLOGÍA",
      "================================================================",
      "1. DATOS DEL PACIENTE Y DE LA HOSPITALIZACIÓN",
      `Paciente: ${p.fullName} | ID: ${p.id} | HC: ${valOrMissing(p.hc)} | Sexo: ${sexLabel(p.sex)}`,
      `EG: ${fmtGa(p.gaWeeks, p.gaDays)}${num(p.gaWeeks) !== null ? " sem" : ""} | Peso al nacer: ${fmtWeight(p.birthWeight)} | Estadía: ${p.admitDate || p.birthDate ? `${stay} días` : "Sin responder (falta fecha de ingreso)"}`,
      `Ingreso: ${valOrMissing(fmtDate(p.admitDate))} | Egreso: ${valOrMissing(fmtDate(d.date))} | Procedencia: ${fieldText(p, "origin")}`,
      "",
      "2. ANTECEDENTES PERINATALES",
      perinatal || " Sin antecedentes registrados.",
      "",
      "3. MOTIVO Y DIAGNÓSTICOS DE INGRESO",
      admDx.length ? `Motivo de ingreso: ${lookupDx(admDx[0])}.` : "Motivo de ingreso: Sin responder.",
      admDx.length > 1 ? `Otros diagnósticos de ingreso: ${admDx.slice(1).map(lookupDx).join("; ")}.` : "",
      "",
      "4. EVOLUCIÓN RESPIRATORIA",
      `Cobertura de cronología: ${r.complete ? "Completa hasta el corte" : "Incompleta"}.`,
      `SDR: ${fieldText(p, "sdr")}${h.sdr === "Sí" ? ` (surfactante: ${valOrMissing(h.surfactantDoses, "dosis")}, ${fieldText(p, "surfactantRoute")})` : ""}. Neumotórax: ${fieldText(p, "pneumothorax")}.`,
      ...respLines,
      `DBP Jensen: ${r.jensen} | DBP Bancalari: ${r.bancalari}.`,
      "",
      "5. EVOLUCIÓN CARDIOVASCULAR",
      `Ecocardiograma: ${fieldText(p, "cardio.echo")}${h.cardio.echo === "Sí" ? ` | Cardiopatía congénita: ${fieldText(p, "cardio.chd")} | DAP: ${fieldText(p, "cardio.dap")}` : ""}${h.cardio.dap === "Sí" ? ` (tratamiento: ${fieldText(p, "cardio.dapMed")}; cierre invasivo: ${fieldText(p, "cardio.dapInvasive")})` : ""}.`,
      "",
      "6. EVOLUCIÓN INFECCIOSA",
      `Sepsis precoz: ${fieldText(p, "earlySepsis")}${h.earlySepsis === "Sí" ? ` (${fieldText(p, "earlySepsisCulture")}${h.earlySepsisGerm ? ", " + h.earlySepsisGerm : ""})` : ""}.`,
      `Infecciones asociadas a cuidados: ${iaasTxt}`,
      vertical.length ? `Transmisión vertical: ${vertical.join(" · ")}.` : "",
      "",
      "7. EVOLUCIÓN NUTRICIONAL Y GASTROINTESTINAL",
      nutrLine,
      `Peso mínimo: ${valOrMissing(h.minWeight, "g")}${h.minWeightDay !== "" && h.minWeightDay !== undefined ? ` (DDV ${h.minWeightDay})` : ""}. NEC: ${fieldText(p, "nec")}${h.nec === "Sí" ? ` (Bell ${fieldText(p, "necStage")}; cirugía: ${fieldText(p, "necSurgery")})` : ""}. Perforación intestinal espontánea: ${fieldText(p, "sip")}.`,
      "",
      "8. EVOLUCIÓN NEUROLÓGICA Y OFTALMOLÓGICA",
      `Apneas: ${fieldText(p, "neuro.apnea")} | Convulsiones: ${fieldText(p, "neuro.seizures")} | Ecografía cerebral: ${fieldText(p, "neuro.cranialUs")} | RMN: ${fieldText(p, "neuro.mri")}.`,
      `Hidrocefalia: ${fieldText(p, "neuro.hydrocephalus")}${h.neuro.hydrocephalus === "Sí" ? ` (${fieldText(p, "neuro.hydroSurgery")})` : ""}. ROP: ${rop.summary}.`,
      "",
      "9. ACCESOS VASCULARES Y OTRAS TERAPIAS",
      `Catéteres centrales: ${c.count ? `${c.count} episodios (${c.totalDays} días-catéter)` : "sin registros"}. Transfusiones: ${(h.transfusions || []).length || "sin registros"}.`,
      `Procedimientos quirúrgicos: ${surgTxt}`,
      "",
      ...outcome,
      "",
      "11. DIAGNÓSTICOS DE EGRESO (CIE-10)",
      dxOut || "1. Sin diagnósticos consignados.",
      "",
      deceased ? "12. INDICACIONES" : "12. TRATAMIENTO E INDICACIONES AL ALTA",
      deceased ? `${valOrMissing(d.indications)}` : `Medicación: ${valOrMissing(d.medications)}`,
      deceased ? "" : `Indicaciones: ${valOrMissing(d.indications)}`,
      "",
      "----------------------------------------------------------------",
      "Borrador generado por la aplicación. Requiere revisión y validación médica antes de archivarse en la ficha."
    ]);
  }

  function computeStatistics(patients, filters) {
    const f = filters || {};
    const filtered = patients.filter((p) => {
      if (f.sector && f.sector !== "all" && p.sector !== f.sector) return false;
      if (f.gaGroup && f.gaGroup !== "all") {
        const ga = num(p.gaWeeks);
        if (ga === null) return false;
        if (f.gaGroup === "<28" && !(ga < 28)) return false;
        if (f.gaGroup === "28-31" && !(ga >= 28 && ga <= 31)) return false;
        if (f.gaGroup === "32-36" && !(ga >= 32 && ga <= 36)) return false;
        if (f.gaGroup === ">=37" && !(ga >= 37)) return false;
      }
      if (f.weightGroup && f.weightGroup !== "all") {
        const w = num(p.birthWeight);
        if (w === null) return false;
        if (f.weightGroup === "<1000" && !(w < 1000)) return false;
        if (f.weightGroup === "<1500" && !(w < 1500)) return false;
        if (f.weightGroup === "1500-2499" && !(w >= 1500 && w < 2500)) return false;
        if (f.weightGroup === ">=2500" && !(w >= 2500)) return false;
      }
      return true;
    });

    function tally(evalFn) {
      let yes = 0, no = 0, missing = 0, na = 0;
      for (const p of filtered) {
        const res = evalFn(p);
        if (res === true) yes++;
        else if (res === false) no++;
        else if (res === "na") na++;
        else missing++;
      }
      const denom = yes + no;
      const rate = denom > 0 ? Number(((yes / denom) * 100).toFixed(1)) : null;
      return { yes, no, missing, na, denom, rate };
    }

    const dbp = tally((p) => deriveRespiratory(p).hasDbp);
    const ropAny = tally((p) => {
      const r = deriveRopWorst(p);
      if (r.inRisk === null) return null;
      if (!r.inRisk) return "na";
      if (r.worstStage === null) return null;
      return r.worstStage >= 1;
    });
    const ropSevere = tally((p) => {
      const r = deriveRopWorst(p);
      if (r.inRisk === null) return null;
      if (!r.inRisk) return "na";
      if (r.worstStage === null) return null;
      return r.worstStage >= 3 || r.treated;
    });
    // Ecografía cerebral: si hay resultado, cuenta; si no, el RN ≥ 34 sem queda fuera de riesgo
    // y el resto (o sin EG) es deuda de registro.
    function cranialUsOutcome(p, pattern) {
      const us = p.hosp.neuro.cranialUs;
      if (us && us !== "No realizada") return pattern.test(us);
      const ga = num(p.gaWeeks);
      if (ga !== null && ga >= 34) return "na";
      return null;
    }
    const hivAny = tally((p) => cranialUsOutcome(p, /HIV/i));
    const hivSevere = tally((p) => cranialUsOutcome(p, /III|IV/i));
    // NEC: solo una respuesta explícita es dato; vacío es deuda de registro.
    const nec = tally((p) => (p.hosp.nec === "Sí" ? true : p.hosp.nec === "No" ? false : null));
    const dap = tally((p) => {
      if (p.hosp.cardio.echo === "Sí") return p.hosp.cardio.dap === "Sí";
      const ga = num(p.gaWeeks);
      if (ga !== null && ga >= 35) return "na";
      return null;
    });
    const earlySepsis = tally((p) => (p.hosp.earlySepsis === "Sí" ? true : p.hosp.earlySepsis === "No" ? false : null));
    const lateSepsis = tally((p) => {
      const eps = (p.hosp.iaasEpisodes || []).filter((e) => !/precoz/i.test(e.syndrome || ""));
      if (eps.some((e) => /sepsis|bacteriemia/i.test(e.syndrome || ""))) return true;
      if (p.hosp.iaasCoverage === "completa") return false;
      return null;
    });
    const iaas = tally((p) => {
      if (p.hosp.iaasCoverage !== "completa" && !(p.hosp.iaasEpisodes || []).length) return null;
      return (p.hosp.iaasEpisodes || []).some((e) => !/precoz/i.test(e.syndrome || ""));
    });

    const knownOutcome = filtered.filter((p) => p.status === "egresado" || p.status === "fallecido");
    const deceased = filtered.filter((p) => p.status === "fallecido").length;
    const stillHosp = filtered.filter((p) => p.status === "hospitalizado" || p.status === "ingreso_incompleto").length;
    const mortalityRate = knownOutcome.length ? Number(((deceased / knownOutcome.length) * 100).toFixed(1)) : null;

    let totalCatheterDays = 0;
    let clabsiEvents = 0;
    let totalVentDays = 0;
    let navEvents = 0;
    for (const p of filtered) {
      totalCatheterDays += deriveCatheters(p).totalDays;
      totalVentDays += deriveRespiratory(p).ventDays;
      for (const ep of p.hosp.iaasEpisodes || []) {
        if (ep.catheterRelated === "Sí") clabsiEvents++;
        if (/neumonía|nav/i.test(ep.syndrome || "")) navEvents++;
      }
    }

    const dischargedAlive = filtered.filter((p) => p.status === "egresado");
    const lmeAtDischarge = dischargedAlive.filter((p) => /exclusiva/i.test(p.discharge.feeding || "")).length;
    const avgStay = dischargedAlive.length
      ? Number((dischargedAlive.reduce((acc, p) => acc + getPatientStayDays(p), 0) / dischargedAlive.length).toFixed(1))
      : null;

    return {
      total: filtered.length,
      knownOutcomeCount: knownOutcome.length,
      deceased,
      stillHosp,
      mortalityRate,
      dbp,
      ropAny,
      ropSevere,
      hivAny,
      hivSevere,
      nec,
      dap,
      iaas,
      earlySepsis,
      lateSepsis,
      totalCatheterDays,
      clabsiEvents,
      clabsiRate1000: totalCatheterDays ? Number(((clabsiEvents / totalCatheterDays) * 1000).toFixed(1)) : null,
      totalVentDays,
      navEvents,
      navRate1000: totalVentDays ? Number(((navEvents / totalVentDays) * 1000).toFixed(1)) : null,
      dischargedAliveCount: dischargedAlive.length,
      lmeAtDischarge,
      avgStay
    };
  }

  global.NEOSALUD_ENGINE = {
    REF_DATE,
    setInstitution,
    num,
    fmtDate,
    fmtGa,
    fmtWeight,
    sexLabel,
    calcFenton2025,
    calcCrib2,
    calcKaiser2024,
    calcKaiserFor,
    getPatientStayDays,
    deriveRespiratory,
    deriveNutrition,
    deriveCatheters,
    deriveRopWorst,
    admissionSnapshot,
    epicrisisSnapshot,
    computeDraftDiff,
    fieldText,
    carryOverCompletedFields,
    generateAdmissionDraft,
    generateEpicrisisDraft,
    computeStatistics,
    lookupDx
  };
})(window);
