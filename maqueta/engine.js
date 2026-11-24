(function (global) {
  const REF_DATE = "2026-11-22";

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
    const w = Number(gaWeeks);
    const d = Number(gaDays || 0);
    const wt = Number(weightG);
    if (!w || !wt || w < 22 || w > 43) {
      return { ready: false, zScore: null, percentile: null, classification: "Sin datos suficientes" };
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
    const ga = Number(gaWeeks);
    const wt = Number(weightG);
    if (!(ga <= 32 || (wt > 0 && wt <= 1500))) {
      return { applicable: false };
    }
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

    const t = Number(tempC);
    if (!isNaN(t) && tempC !== "") {
      if (t < 35.5 || t > 38.0) score += 3;
      else if (t < 36.5 || t > 37.5) score += 1;
    }

    const be = Number(baseExcess);
    if (!isNaN(be) && baseExcess !== "") {
      if (be <= -10) score += 4;
      else if (be <= -6) score += 2;
      else if (be <= -3) score += 1;
    }

    let level = "Riesgo bajo-moderado";
    if (score >= 12) level = "Riesgo elevado";
    else if (score >= 8) level = "Riesgo intermedio";
    return { applicable: true, score, level };
  }

  function calcKaiser2024(gaWeeks, gaDays, maxTempC, romHours, gbs, maternalAbx, examStatus) {
    const ga = Number(gaWeeks);
    if (!ga || ga < 35) return { applicable: false };

    let baseRisk = 0.42;
    const temp = Number(maxTempC || 37.0);
    if (temp >= 38.5) baseRisk *= 3.8;
    else if (temp >= 38.0) baseRisk *= 2.4;
    else if (temp >= 37.5) baseRisk *= 1.4;

    const rom = Number(romHours || 0);
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
    return { applicable: true, riskBirth, posterior, recommendation, severity };
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

    const totals = { o2: 0, cpap: 0, vni: 0, vmc: 0, vafo: 0 };
    let maxFio224 = null;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const nextDay = i + 1 < events.length ? events[i + 1].day : stay;
      const dur = Math.max(0, nextDay - ev.day);
      if (ev.day <= 1 && ev.fio2) {
        maxFio224 = maxFio224 === null ? Number(ev.fio2) : Math.max(maxFio224, Number(ev.fio2));
      }
      if (ev.modality !== "AA") totals.o2 += dur;
      if (ev.modality === "CPAP") totals.cpap += dur;
      if (ev.modality === "NIPPV" || ev.modality === "BiPAP" || ev.modality === "CNAF") totals.vni += dur;
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

    const ga = Number(p.gaWeeks || 0);
    const inRiskDbp = ga > 0 && ga < 32;
    const day36w = Math.max(0, (36 - ga) * 7 - Number(p.gaDays || 0));

    let o2Day28 = "Desconocido (cronología incompleta)";
    let o2At36w = "No aplica";
    let vmiAt36w = "No aplica";
    let jensen = "No aplica";
    let bancalari = "No aplica";
    let hasDbp = null; // true / false / null (missing) / "na"

    if (!inRiskDbp) {
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
    const inRisk = Number(p.gaWeeks) < 32 || Number(p.birthWeight) <= 1500;
    if (!inRisk) return { inRisk: false, summary: "Fuera de riesgo (No aplica)" };
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

  function admissionSnapshot(p) {
    return {
      tempC: String(p.admission.tempC ?? ""),
      birthWeight: String(p.birthWeight ?? ""),
      gaWeeks: String(p.gaWeeks ?? ""),
      gaDays: String(p.gaDays ?? ""),
      resuscitation: String(p.admission.resuscitation ?? ""),
      maternalAge: String(p.admission.maternalAge ?? ""),
      diagnoses: (p.admission.diagnoses || []).join(",")
    };
  }

  function epicrisisSnapshot(p) {
    const r = deriveRespiratory(p);
    const n = deriveNutrition(p);
    return {
      respEvents: String(r.eventCount),
      respCoverage: p.hosp.respCoverage,
      jensen: r.jensen,
      nptDays: String(n.nptDays),
      condition: String(p.discharge.condition || ""),
      weightG: String(p.discharge.weightG || ""),
      homeO2: String(p.discharge.homeO2 || "")
    };
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
          label: FIELD_LABELS[key] || key,
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

  function valOrMissing(v, suffix) {
    if (v === null || v === undefined || v === "") return "Sin responder";
    return suffix ? `${v} ${suffix}` : String(v);
  }

  function lookupDx(code) {
    const found = global.NEOSALUD_DATA.CIE10_CATALOG.find((x) => x.code === code);
    return found ? `${found.code} - ${found.label}` : code;
  }

  function generateAdmissionDraft(p) {
    const a = p.admission;
    const fenton = calcFenton2025(p.gaWeeks, p.gaDays, p.sex, p.birthWeight);
    const crib = calcCrib2(p.gaWeeks, p.birthWeight, p.sex, a.tempC, a.baseExcess);
    const kaiser = calcKaiser2024(p.gaWeeks, p.gaDays, a.maternalMaxTemp, a.rpoHours, a.gbs, a.maternalAbx, a.examStatus);

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

    const dxLines = (a.diagnoses || []).length
      ? a.diagnoses.map((c, idx) => `${idx + 1}. ${lookupDx(c)}`).join("\n")
      : "1. Sin diagnósticos consignados.";

    const ind = [
      `1. Ingreso a sector ${p.sector} en incubadora / servocuna con control térmico.`,
      "2. Monitorización multiparamétrica continua (FC, FR, SatO2).",
      Number(p.gaWeeks) < 32
        ? "3. Soporte respiratorio no invasivo/invasivo según protocolo de prematurez y control gasométrico."
        : "3. Control clínico evolutivo de signos vitales y glucemia según protocolo."
    ];
    if (kaiser.applicable && kaiser.posterior >= 3.0) {
      ind.push(`4. Según Kaiser 2024 (riesgo posterior ${kaiser.posterior}/1000): ${kaiser.recommendation}`);
    }

    const lines = [
      "NOTA DE INGRESO · SERVICIO DE NEONATOLOGÍA",
      "================================================================",
      `Paciente: ${p.fullName}          ID: ${p.id}`,
      `HC: ${valOrMissing(p.hc)}        Sexo: ${p.sex === "F" ? "Femenino" : p.sex === "M" ? "Masculino" : "Sin responder"}`,
      `Nacimiento: ${p.birthDate} ${valOrMissing(p.birthTime)}   Ingreso: ${p.admitDate}`,
      "",
      "1. ANTECEDENTES PERINATALES",
      `Edad materna: ${valOrMissing(a.maternalAge, "años")} | Paridad: ${valOrMissing(a.parity)}${a.parityDetail ? ` (${a.parityDetail})` : ""}`,
      `Corticoides antenatales: ${valOrMissing(a.antenatalSteroids)} | MgSO4: ${valOrMissing(a.mgso4)}`,
      `Diabetes materna: ${valOrMissing(a.diabetes)}${a.diabetes === "Sí" ? ` (${valOrMissing(a.diabetesType)}, ${valOrMissing(a.diabetesTx)}, HbA1c ${valOrMissing(a.hba1c)})` : ""}`,
      `RPO: ${valOrMissing(a.rpo)}${a.rpo === "Sí" ? ` (${valOrMissing(a.rpoHours, "h")} · Corioamnionitis: ${valOrMissing(a.chorio)})` : ""} | EGB: ${valOrMissing(a.gbs)}`,
      "",
      "2. ANAMNESIS Y ANTROPOMETRÍA AL NACER",
      `Recién nacido de ${p.gaWeeks}+${p.gaDays} semanas, procedencia ${valOrMissing(a.origin)}, temperatura de ingreso ${valOrMissing(a.tempC, "°C")}.`,
      `Peso al nacer: ${valOrMissing(p.birthWeight, "g")} · Fenton 2025: ${fenton.ready ? `${fenton.classification} (Z ${fenton.zScore}, P${fenton.percentile})` : "Sin datos suficientes"}.`,
      `Talla: ${valOrMissing(p.birthLength, "cm")} · Perímetro cefálico: ${valOrMissing(p.birthHc, "cm")}.`,
      transitionText,
      crib.applicable ? `Score CRIB II calculado: ${crib.score} puntos (${crib.level}).` : "",
      kaiser.applicable ? `Calculadora Kaiser 2024: riesgo basal ${kaiser.riskBirth}/1000 · riesgo posterior ${kaiser.posterior}/1000.` : "",
      "",
      "3. EXAMEN FÍSICO DE INGRESO",
      "Estado general y piel: _____",
      "Respiratorio y cardiovascular: _____",
      "Abdomen y neurológico: _____",
      "",
      "4. DIAGNÓSTICOS DE INGRESO (CIE-10)",
      dxLines,
      "",
      "5. INDICACIONES DE INGRESO",
      ...ind,
      "",
      "----------------------------------------------------------------",
      "Borrador generado por la aplicación. Requiere revisión y validación médica antes de archivarse en la ficha."
    ].filter((x) => x !== "");

    return lines.join("\n");
  }

  function generateEpicrisisDraft(p) {
    const r = deriveRespiratory(p);
    const n = deriveNutrition(p);
    const c = deriveCatheters(p);
    const rop = deriveRopWorst(p);
    const stay = getPatientStayDays(p);
    const d = p.discharge;

    const iaasTxt = (p.hosp.iaasEpisodes || []).length
      ? p.hosp.iaasEpisodes.map((e) => `Día ${e.day}: ${e.syndrome} (${e.germ}; ${e.abx1}${e.abx2 ? " + " + e.abx2 : ""}, ${e.days} d)`).join("; ")
      : (p.hosp.iaasCoverage === "completa" ? "Sin episodios de IAAS registrados (cronología completa)." : "Sin episodios cargados (cronología incompleta).");

    const surgTxt = (p.hosp.surgeries || []).length
      ? p.hosp.surgeries.map((s) => `Día ${s.day}: ${s.procedure} (${s.outcome})`).join("; ")
      : "No requirió procedimientos quirúrgicos.";

    const dxOut = (d.diagnoses && d.diagnoses.length ? d.diagnoses : p.admission.diagnoses || [])
      .map((code, i) => `${i + 1}. ${lookupDx(code)}`).join("\n");

    return [
      "EPICRISIS NEONATAL · SERVICIO DE NEONATOLOGÍA",
      "================================================================",
      `Paciente: ${p.fullName} | ID: ${p.id} | HC: ${valOrMissing(p.hc)}`,
      `EG: ${p.gaWeeks}+${p.gaDays} sem | Peso nacimiento: ${p.birthWeight} g | Estadía: ${stay} días`,
      `Ingreso: ${p.admitDate} | Egreso: ${valOrMissing(d.date)} | Condición: ${valOrMissing(d.condition)}`,
      "",
      "1. EVOLUCIÓN RESPIRATORIA",
      `Cobertura de cronología: ${r.complete ? "Completa hasta el corte" : "Incompleta"}.`,
      `SDR: ${valOrMissing(p.hosp.sdr)}${p.hosp.surfactantDoses ? ` (Surfactante: ${p.hosp.surfactantDoses} dosis, vía ${p.hosp.surfactantRoute})` : ""}. Neumotórax: ${valOrMissing(p.hosp.pneumothorax)}.`,
      `Días acumulados: O2 ${r.totals.o2} d · CPAP ${r.totals.cpap} d · VNI ${r.totals.vni} d · VMC ${r.totals.vmc} d · VAFO ${r.totals.vafo} d.`,
      `FiO2 máx 24h: ${r.maxFio224 ? r.maxFio224 + "%" : "Sin dato"} | O2 día 28: ${r.o2Day28} | O2 36 sem: ${r.o2At36w}.`,
      `DBP Jensen: ${r.jensen} | DBP Bancalari: ${r.bancalari}.`,
      "",
      "2. EVOLUCIÓN CARDIOVASCULAR",
      `Ecocardiograma: ${valOrMissing(p.hosp.cardio.echo)} | DAP: ${valOrMissing(p.hosp.cardio.dap)}${p.hosp.cardio.dap === "Sí" ? ` (Tratamiento médico: ${valOrMissing(p.hosp.cardio.dapMed)} · Cierre invasivo: ${valOrMissing(p.hosp.cardio.dapInvasive)})` : ""}.`,
      "",
      "3. EVOLUCIÓN INFECCIOSA",
      `Sepsis precoz: ${valOrMissing(p.hosp.earlySepsis)}. Episodios: ${iaasTxt}`,
      "",
      "4. NUTRICIÓN, CRECIMIENTO Y DIGESTIVO",
      `Días de NPT: ${n.nptDays} d | Inicio enteral: ${n.enteralStartDay !== null ? "DDV " + n.enteralStartDay : "Sin dato"} | 100 cc/kg/d: ${n.day100cc !== null ? "DDV " + n.day100cc : "Sin dato"} | Fortificación: ${n.fortificationDay !== null ? "DDV " + n.fortificationDay : "Sin dato"}.`,
      `NEC: ${valOrMissing(p.hosp.nec)}.`,
      "",
      "5. NEUROLÓGICO Y OFTALMOLÓGICO (ROP)",
      `Ecografía cerebral: ${valOrMissing(p.hosp.neuro.cranialUs)} | RMN: ${valOrMissing(p.hosp.neuro.mri)} | Hidrocefalia: ${valOrMissing(p.hosp.neuro.hydrocephalus)}.`,
      `ROP: ${rop.summary}.`,
      "",
      "6. ACCESOS VASCULARES, TRANSFUSIONES Y CIRUGÍAS",
      `Catéteres centrales: ${c.count} episodios (${c.totalDays} días-catéter totales). Transfusiones: ${(p.hosp.transfusions || []).length}.`,
      `Procedimientos quirúrgicos: ${surgTxt}`,
      "",
      "7. CONDICIÓN AL EGRESO, PESQUISAS E INDICACIONES",
      `Destino: ${valOrMissing(d.destination)} | Peso egreso: ${valOrMissing(d.weightG, "g")} | Alimentación: ${valOrMissing(d.feeding)} | O2 domiciliario: ${valOrMissing(d.homeO2)}.`,
      `Pesquisas: FEI ${valOrMissing(d.screenFei)} · OEA ${valOrMissing(d.screenOea)} · Oximetría ${valOrMissing(d.screenOximetry)} · Reflejo rojo ${valOrMissing(d.screenRedReflex)}.`,
      `Vacunas: ${valOrMissing(d.vaccines)}.`,
      `Medicación al alta: ${valOrMissing(d.medications)}`,
      `Indicaciones: ${valOrMissing(d.indications)}`,
      "",
      "8. DIAGNÓSTICOS DE EGRESO (CIE-10)",
      dxOut || "1. Sin diagnósticos consignados.",
      "",
      "----------------------------------------------------------------",
      "Borrador generado por la aplicación. Requiere revisión y validación médica antes de archivarse en la ficha."
    ].join("\n");
  }

  function computeStatistics(patients, filters) {
    const f = filters || {};
    const filtered = patients.filter((p) => {
      if (f.sector && f.sector !== "all" && p.sector !== f.sector) return false;
      if (f.gaGroup && f.gaGroup !== "all") {
        const ga = Number(p.gaWeeks);
        if (f.gaGroup === "<28" && !(ga < 28)) return false;
        if (f.gaGroup === "28-31" && !(ga >= 28 && ga <= 31)) return false;
        if (f.gaGroup === "32-36" && !(ga >= 32 && ga <= 36)) return false;
        if (f.gaGroup === ">=37" && !(ga >= 37)) return false;
      }
      if (f.weightGroup && f.weightGroup !== "all") {
        const w = Number(p.birthWeight);
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
      if (!r.inRisk) return "na";
      if (r.worstStage === null) return null;
      return r.worstStage >= 1;
    });
    const ropSevere = tally((p) => {
      const r = deriveRopWorst(p);
      if (!r.inRisk) return "na";
      if (r.worstStage === null) return null;
      return r.worstStage >= 3 || r.treated;
    });
    const hivAny = tally((p) => {
      if (Number(p.gaWeeks) >= 34 && p.hosp.neuro.cranialUs === "No realizada") return "na";
      if (!p.hosp.neuro.cranialUs || p.hosp.neuro.cranialUs === "No realizada") return null;
      return /HIV/i.test(p.hosp.neuro.cranialUs);
    });
    const hivSevere = tally((p) => {
      if (Number(p.gaWeeks) >= 34 && p.hosp.neuro.cranialUs === "No realizada") return "na";
      if (!p.hosp.neuro.cranialUs || p.hosp.neuro.cranialUs === "No realizada") return null;
      return /III|IV/i.test(p.hosp.neuro.cranialUs);
    });
    const nec = tally((p) => {
      if (p.hosp.nutrCoverage !== "completa" && p.hosp.nec !== "Sí") return null;
      return p.hosp.nec === "Sí";
    });
    const dap = tally((p) => {
      if (Number(p.gaWeeks) >= 35 && p.hosp.cardio.echo === "No") return "na";
      if (p.hosp.cardio.echo !== "Sí") return null;
      return p.hosp.cardio.dap === "Sí";
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
    calcFenton2025,
    calcCrib2,
    calcKaiser2024,
    getPatientStayDays,
    deriveRespiratory,
    deriveNutrition,
    deriveCatheters,
    deriveRopWorst,
    admissionSnapshot,
    epicrisisSnapshot,
    computeDraftDiff,
    carryOverCompletedFields,
    generateAdmissionDraft,
    generateEpicrisisDraft,
    computeStatistics,
    lookupDx
  };
})(window);
