// Cronologías de la internación (docs/07 §2): qué se registra en cada evento o episodio.
//
// Cada cronología declara:
//   list     · arreglo dentro de p.hosp donde se guardan los registros
//   fields   · campos del formulario. type: date | time | number | select | text | textarea | tiles
//              showIf(rec) decide si el campo existe para ese registro (al ocultarse se borra)
//   columns  · columnas de la tabla [encabezado, (rec, p) => texto]
//   normalize(rec, p) · completa los campos que usan los cálculos (día de vida, vía, etc.)
//   issues(list, p)   · problemas para avisar con «Ir al registro»
//
// Los nombres de campos que ya usaban los cálculos (day, modality, fio2, flow, route, event, ccKg,
// type, insertDay, removeDay, stage, zone, plus, treatment…) se conservan.
(function (global) {
  const DATA = global.NEOSALUD_DATA;

  const MODALITIES = [
    ["AA", "AA", "Aire ambiente"],
    ["O2", "O₂", "Oxígeno libre / halo"],
    ["CN", "CN", "Cánula nasal bajo flujo"],
    ["CNAF", "CNAF", "Cánula nasal alto flujo"],
    ["CPAP", "CPAP", "CPAP continuo"],
    ["NIPPV", "NIPPV", "NIPPV / CPAP ciclado"],
    ["BiPAP", "BiPAP", "BiPAP"],
    ["VMC", "VMC", "Ventilación mecánica convencional"],
    ["VAFO", "VAFO", "Ventilación de alta frecuencia"],
    ["ECMO", "ECMO", "ECMO"]
  ];
  const MOD_RANK = { AA: 0, O2: 1, CN: 2, CNAF: 3, CPAP: 4, NIPPV: 5, BiPAP: 5, VMC: 6, VAFO: 7, ECMO: 8 };
  const RESP_EVENTS = ["Inicio de soporte", "Escalamiento", "Destete", "Intubación", "Extubación", "Reintubación",
    "Cambio programado", "Traslado", "Otro"];

  // Evento nutricional → vía (la usan los hitos calculados).
  const NUTR_EVENTS = [
    ["Régimen cero", "Enteral"],
    ["Inicio de alimentación enteral", "Enteral"],
    ["Suspensión de alimentación enteral", "Enteral"],
    ["Reinicio de alimentación enteral", "Enteral"],
    ["Cambio de aporte enteral", "Enteral"],
    ["Inicio de fortificación", "Enteral"],
    ["Cambio de tipo de leche", "Enteral"],
    ["Inicio de nutrición parenteral", "Parenteral"],
    ["Suspensión de nutrición parenteral", "Parenteral"],
    ["Reinicio de nutrición parenteral", "Parenteral"],
    ["Inicio de aminoácidos", "Parenteral"],
    ["Inicio de lípidos", "Parenteral"],
    ["Inicio de suplemento", "Suplementos"],
    ["Suspensión de suplemento", "Suplementos"]
  ];
  const NUTR_ROUTE = Object.fromEntries(NUTR_EVENTS);
  const WITH_VOLUME = ["Inicio de alimentación enteral", "Reinicio de alimentación enteral", "Cambio de aporte enteral",
    "Inicio de fortificación", "Cambio de tipo de leche"];
  const MILKS = ["Calostro / leche materna", "Leche materna fortificada", "Leche humana de banco", "Fórmula para prematuros", "Fórmula de inicio", "Fórmula especial"];
  const SUPPLEMENTS = ["Calcio", "Fósforo", "Proteína (módulo)", "MCT", "Zinc", "Hierro", "Vitamina D"];

  const IAAS_SYNDROMES = ["Sepsis", "Neumonía", "Infección urinaria", "Infección de herida operatoria", "Meningitis", "Enterocolitis", "Conjuntivitis", "Otro"];
  const IAAS_FOCUS = ["Torrente sanguíneo", "Asociado a catéter", "Respiratorio", "Urinario", "Piel y partes blandas", "Sistema nervioso central", "Gastrointestinal", "Otro"];
  const CATH_TYPES = [["CVU", "CVU · venoso umbilical"], ["CAU", "CAU · arterial umbilical"], ["PICC", "Silastic / PICC"], ["CVC", "CVC · otro venoso central"], ["Otro", "Otro"]];
  const COMPONENTS = ["Glóbulos rojos", "Plaquetas", "Plasma fresco congelado", "Crioprecipitado", "Sangre total (exanguinotransfusión)", "Otro"];
  const TX_REASONS = ["Anemia de la prematurez", "Anemia sintomática", "Hemorragia aguda", "Trombocitopenia", "Coagulopatía / sangrado", "Hiperbilirrubinemia (exanguinotransfusión)", "Perioperatorio", "Otro"];
  const ROP_STAGES = [["0", "Sin ROP"], ["1", "Estadio 1"], ["2", "Estadio 2"], ["3", "Estadio 3"], ["4", "Estadio 4"], ["5", "Estadio 5"]];
  const ROP_TX = ["Ninguno · control", "Fotocoagulación láser", "Antiangiogénico intravítreo (anti-VEGF)", "Cirugía"];

  const DAY_MS = 86400000;
  function dayOf(p, iso) {
    if (!iso || !p.birthDate) return "";
    return Math.max(0, Math.round((Date.parse(iso) - Date.parse(p.birthDate)) / DAY_MS));
  }
  function isoOf(p, day) {
    if (day === "" || day === null || day === undefined || !p.birthDate) return "";
    return new Date(Date.parse(p.birthDate) + Number(day) * DAY_MS).toISOString().slice(0, 10);
  }
  const fmt = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
  const dash = (v) => (v === "" || v === undefined || v === null ? "—" : String(v));
  const labelOf = (pairs, v) => { const m = pairs.find((x) => x[0] === v); return m ? m[1] : dash(v); };

  const TIMELINES = {
    resp: {
      list: "respEvents", title: "Línea de tiempo respiratoria", item: "cambio", addLabel: "Agregar cambio", coverage: "respCoverage",
      sub: "Registrá solo los cambios de soporte; días, totales y clasificación de DBP se calculan solos",
      fields: [
        { key: "date", label: "Fecha", type: "date", required: true },
        { key: "precision", label: "Precisión temporal", type: "select", options: ["Solo fecha", "Fecha y hora"] },
        { key: "time", label: "Hora", type: "time", showIf: (r) => r.precision === "Fecha y hora" },
        { key: "event", label: "Evento", type: "select", options: RESP_EVENTS },
        { key: "modality", label: "Modalidad", type: "tiles", options: MODALITIES, wide: true },
        { key: "fio2", label: "FiO₂ (%)", type: "number", min: 21, max: 100 },
        { key: "flow", label: "Flujo (L/min)", type: "number", step: 0.1, min: 0, showIf: (r) => ["CN", "CNAF"].includes(r.modality) },
        { key: "peep", label: "PEEP (cm H₂O)", type: "number", min: 0, max: 20, showIf: (r) => ["CPAP", "NIPPV", "BiPAP", "VMC"].includes(r.modality) },
        { key: "note", label: "Motivo / observaciones", type: "text", wide: true }
      ],
      columns: [
        ["Día", (r) => `D${dash(r.day)}`],
        ["Fecha", (r) => fmt(r.date) + (r.precision === "Fecha y hora" && r.time ? ` ${r.time}` : "")],
        ["Evento", (r) => dash(r.event)],
        ["Modalidad", (r) => (r.modality ? labelOf(MODALITIES.map((m) => [m[0], m[2]]), r.modality) : "Falta elegir")],
        ["FiO₂", (r) => (r.fio2 ? `${r.fio2}%` : "—")],
        ["Parámetros", (r) => [r.flow ? `${r.flow} L/min` : "", r.peep ? `PEEP ${r.peep}` : ""].filter(Boolean).join(" · ") || "—"]
      ],
      normalize: (r, p) => { r.day = dayOf(p, r.date); },
      issues: (list, p) => {
        const out = [];
        const sorted = [...list].sort((a, b) => a.day - b.day);
        sorted.forEach((r, i) => {
          const n = `Cambio ${i + 1} (día ${dash(r.day)})`;
          if (!r.modality) out.push([r.id, `${n}: falta elegir la modalidad respiratoria`]);
          if (r.modality && r.modality !== "AA" && !r.fio2) out.push([r.id, `${n}: falta la FiO₂`]);
          if (r.precision === "Fecha y hora" && !r.time) out.push([r.id, `${n}: se indicó fecha y hora pero falta la hora`]);
          if (p.dischargeDate && r.date > p.dischargeDate) out.push([r.id, `${n}: la fecha es posterior al egreso`]);
          if (i > 0 && sorted[i - 1].day === r.day && sorted[i - 1].modality === r.modality) out.push([r.id, `${n}: repite la modalidad del cambio anterior el mismo día`]);
        });
        return out;
      }
    },

    nutr: {
      list: "nutrEvents", title: "Línea de tiempo nutricional", item: "evento", addLabel: "Agregar evento", coverage: "nutrCoverage",
      sub: "Enteral, parenteral y suplementos conviven en paralelo; hitos y días de parenteral se calculan solos",
      fields: [
        { key: "date", label: "Fecha", type: "date", required: true },
        { key: "time", label: "Hora (opcional)", type: "time" },
        { key: "event", label: "Evento", type: "select", options: NUTR_EVENTS.map((e) => e[0]), required: true },
        { key: "milk", label: "Tipo de leche", type: "select", options: MILKS, showIf: (r) => WITH_VOLUME.includes(r.event) },
        { key: "ccKg", label: "Aporte enteral (cc/kg/día)", type: "number", min: 0, max: 250, showIf: (r) => WITH_VOLUME.includes(r.event) },
        { key: "supplement", label: "Suplemento", type: "select", options: SUPPLEMENTS, showIf: (r) => /suplemento/i.test(r.event || "") },
        { key: "detail", label: "Motivo / observaciones", type: "text", wide: true }
      ],
      columns: [
        ["Día", (r) => `D${dash(r.day)}`],
        ["Fecha", (r) => fmt(r.date)],
        ["Vía", (r) => dash(r.route)],
        ["Evento", (r) => dash(r.event) + (r.supplement ? ` · ${r.supplement}` : "")],
        ["Leche / aporte", (r) => [r.milk, r.ccKg ? `${r.ccKg} cc/kg/d` : ""].filter(Boolean).join(" · ") || "—"],
        ["Observaciones", (r) => dash(r.detail)]
      ],
      normalize: (r, p) => {
        r.day = dayOf(p, r.date);
        r.route = NUTR_ROUTE[r.event] || r.route || "";
        if (r.event === "Régimen cero" || /suspensión de alimentación/i.test(r.event || "")) r.ccKg = 0;
      },
      issues: (list) => list.filter((r) => WITH_VOLUME.includes(r.event) && r.ccKg === "").map((r) => [r.id, `Día ${dash(r.day)}: «${r.event}» sin aporte en cc/kg/día`])
    },

    iaas: {
      list: "iaasEpisodes", title: "IAAS · infecciones asociadas a la atención en salud", item: "episodio", addLabel: "Agregar episodio", coverage: "iaasCoverage",
      sub: "Gérmenes y antibióticos de lista cerrada; la sepsis tardía es un episodio con cuadro «Sepsis»",
      fields: [
        { key: "date", label: "Fecha del diagnóstico", type: "date", required: true },
        { key: "syndrome", label: "Cuadro clínico", type: "select", options: IAAS_SYNDROMES, required: true },
        { key: "cultureConfirmed", label: "Confirmada por cultivo", type: "select", options: ["Sí", "No", "Desconocido"] },
        { key: "focus", label: "Foco / sitio", type: "select", options: IAAS_FOCUS },
        { key: "germ", label: "Microorganismo", type: "select", options: DATA.MICROORGANISMS },
        { key: "germOther", label: "Microorganismo (si es «otro»)", type: "text", showIf: (r) => r.germ === "Otro (detallar)" },
        { key: "abx1", label: "Antibiótico 1", type: "select", options: DATA.ANTIBIOTICS },
        { key: "abx2", label: "Antibiótico 2", type: "select", options: DATA.ANTIBIOTICS },
        { key: "abxOther", label: "Antibiótico (si es «otro»)", type: "text", showIf: (r) => r.abx1 === "Otro (detallar)" || r.abx2 === "Otro (detallar)" },
        { key: "days", label: "Días de tratamiento", type: "number", min: 0, max: 60 }
      ],
      columns: [
        ["Día", (r) => `D${dash(r.day)}`],
        ["Cuadro", (r) => dash(r.syndrome)],
        ["Foco", (r) => dash(r.focus)],
        ["Germen", (r) => (r.germ === "Otro (detallar)" ? dash(r.germOther) : dash(r.germ)) + (r.cultureConfirmed === "Sí" ? " · cultivo +" : "")],
        ["Antibióticos", (r) => [r.abx1, r.abx2].filter(Boolean).join(" + ") || "—"],
        ["Días", (r) => (r.days !== "" && r.days !== undefined ? `${r.days} d` : "—")]
      ],
      normalize: (r, p) => { r.day = dayOf(p, r.date); r.catheterRelated = r.focus === "Asociado a catéter" ? "Sí" : "No"; },
      issues: (list) => list.filter((r) => r.cultureConfirmed === "Sí" && !r.germ).map((r) => [r.id, `Día ${dash(r.day)}: cultivo positivo sin microorganismo`])
    },

    cath: {
      list: "catheters", title: "Catéteres centrales", item: "catéter", addLabel: "Agregar catéter",
      sub: "CVU, CAU, PICC y CVC en una sola serie; los días-catéter se calculan solos",
      fields: [
        { key: "type", label: "Tipo de catéter", type: "select", options: CATH_TYPES, required: true },
        { key: "typeOther", label: "Tipo (si es «otro»)", type: "text", showIf: (r) => r.type === "Otro" },
        { key: "insertDate", label: "Fecha de instalación", type: "date", required: true },
        { key: "removeDate", label: "Fecha de retiro (vacío si sigue)", type: "date" },
        { key: "site", label: "Sitio de inserción", type: "text" },
        { key: "reason", label: "Motivo de retiro", type: "text", showIf: (r) => !!r.removeDate },
        { key: "complication", label: "Complicaciones", type: "text", wide: true }
      ],
      columns: [
        ["Tipo", (r) => labelOf(CATH_TYPES, r.type) + (r.type === "Otro" && r.typeOther ? ` (${r.typeOther})` : "")],
        ["Instalación", (r) => `${fmt(r.insertDate)} · D${dash(r.insertDay)}`],
        ["Retiro", (r) => (r.removeDate ? `${fmt(r.removeDate)} · D${r.removeDay}` : "En uso")],
        ["Días", (r, p) => `${Math.max(0, (r.removeDay !== "" ? Number(r.removeDay) : dayOf(p, p.dischargeDate || global.NEOSALUD_ENGINE.REF_DATE)) - Number(r.insertDay || 0))} d`],
        ["Sitio", (r) => dash(r.site)],
        ["Complicaciones", (r) => dash(r.complication)]
      ],
      normalize: (r, p) => { r.insertDay = dayOf(p, r.insertDate); r.removeDay = r.removeDate ? dayOf(p, r.removeDate) : ""; },
      issues: (list) => list.filter((r) => r.removeDate && r.insertDate && r.removeDate < r.insertDate).map((r) => [r.id, `${labelOf(CATH_TYPES, r.type)}: el retiro es anterior a la instalación`])
    },

    tx: {
      list: "transfusions", title: "Transfusiones", item: "transfusión", addLabel: "Agregar transfusión",
      sub: "El número de transfusiones se calcula solo",
      fields: [
        { key: "date", label: "Fecha", type: "date", required: true },
        { key: "component", label: "Hemocomponente", type: "select", options: COMPONENTS, required: true },
        { key: "componentOther", label: "Hemocomponente (si es «otro»)", type: "text", showIf: (r) => r.component === "Otro" },
        { key: "indication", label: "Motivo", type: "select", options: TX_REASONS },
        { key: "indicationOther", label: "Motivo (si es «otro»)", type: "text", showIf: (r) => r.indication === "Otro" },
        { key: "mlKg", label: "Volumen (cc/kg)", type: "number", min: 0, max: 40 },
        { key: "ml", label: "Volumen (mL)", type: "number", min: 0 },
        { key: "reaction", label: "Reacción transfusional", type: "select", options: ["No", "Sí", "Desconocido"] },
        { key: "note", label: "Observaciones", type: "text", wide: true }
      ],
      columns: [
        ["Día", (r) => `D${dash(r.day)}`],
        ["Fecha", (r) => fmt(r.date)],
        ["Hemocomponente", (r) => dash(r.component)],
        ["Motivo", (r) => dash(r.indication)],
        ["Volumen", (r) => [r.mlKg ? `${r.mlKg} cc/kg` : "", r.ml ? `${r.ml} mL` : ""].filter(Boolean).join(" · ") || "—"],
        ["Reacción", (r) => dash(r.reaction)]
      ],
      normalize: (r, p) => { r.day = dayOf(p, r.date); }
    },

    rop: {
      list: "ropExams", title: "Controles de retinopatía del prematuro", item: "control", addLabel: "Agregar control",
      sub: "El peor estadio, la zona y el tratamiento se resumen solos",
      fields: [
        { key: "date", label: "Fecha del fondo de ojo", type: "date", required: true },
        { key: "stage", label: "Mayor estadio", type: "select", options: ROP_STAGES, required: true },
        { key: "zone", label: "Zona", type: "select", options: ["I", "II", "III"], showIf: (r) => r.stage !== "" && r.stage !== "0" },
        { key: "plus", label: "Enfermedad plus", type: "select", options: ["No", "Sí"], showIf: (r) => r.stage !== "" && r.stage !== "0" },
        { key: "treatment", label: "Tratamiento", type: "select", options: ROP_TX },
        { key: "note", label: "Observaciones", type: "text", wide: true }
      ],
      columns: [
        ["Día", (r) => `D${dash(r.day)}`],
        ["Fecha", (r) => fmt(r.date)],
        ["Estadio", (r) => labelOf(ROP_STAGES, String(r.stage))],
        ["Zona", (r) => dash(r.zone)],
        ["Plus", (r) => dash(r.plus)],
        ["Tratamiento", (r) => dash(r.treatment)]
      ],
      normalize: (r, p) => { r.day = dayOf(p, r.date); r.stage = r.stage === "" ? "" : String(r.stage); }
    },

    surg: {
      list: "surgeries", title: "Procedimientos quirúrgicos", item: "cirugía", addLabel: "Agregar cirugía",
      sub: "El número de cirugías se calcula solo",
      fields: [
        { key: "date", label: "Fecha", type: "date", required: true },
        { key: "procedure", label: "Tipo de cirugía", type: "text", required: true, wide: true },
        { key: "outcome", label: "Observaciones", type: "text", wide: true }
      ],
      columns: [
        ["Día", (r) => `D${dash(r.day)}`],
        ["Fecha", (r) => fmt(r.date)],
        ["Cirugía", (r) => dash(r.procedure)],
        ["Observaciones", (r) => dash(r.outcome)]
      ],
      normalize: (r, p) => { r.day = dayOf(p, r.date); }
    }
  };

  // Datos de antes de la v2: completa fechas y lleva los textos libres a las listas nuevas.
  const OLD_NUTR = {
    "Inicio NPT + AA": "Inicio de nutrición parenteral",
    "Inicio estímulo enteral": "Inicio de alimentación enteral",
    "Inicio alimentación enteral": "Inicio de alimentación enteral",
    "Alcanza 100 cc/kg/d": "Cambio de aporte enteral",
    "Suspensión NPT": "Suspensión de nutrición parenteral",
    "Fortificación leche materna": "Inicio de fortificación"
  };
  function upgradeRecords(p) {
    const h = p.hosp;
    let prev = null;
    [...(h.respEvents || [])].sort((a, b) => a.day - b.day).forEach((r, i) => {
      if (!r.date) r.date = isoOf(p, r.day);
      if (!RESP_EVENTS.includes(r.event)) {
        r.event = i === 0 ? "Inicio de soporte"
          : MOD_RANK[r.modality] > MOD_RANK[prev] ? (["VMC", "VAFO"].includes(r.modality) && !["VMC", "VAFO"].includes(prev) ? "Intubación" : "Escalamiento")
          : (["VMC", "VAFO"].includes(prev) && !["VMC", "VAFO"].includes(r.modality) ? "Extubación" : "Destete");
      }
      if (!r.precision) r.precision = "Solo fecha";
      prev = r.modality;
    });
    (h.nutrEvents || []).forEach((r) => {
      if (!r.date) r.date = isoOf(p, r.day);
      if (OLD_NUTR[r.event]) r.event = OLD_NUTR[r.event];
      if (r.milk === "Leche materna") r.milk = "Calostro / leche materna";
      if (r.milk === "Fórmula") r.milk = "Fórmula de inicio";
    });
    (h.iaasEpisodes || []).forEach((r) => {
      if (!r.date) r.date = isoOf(p, r.day);
      if (!IAAS_SYNDROMES.includes(r.syndrome)) r.syndrome = /neumon/i.test(r.syndrome || "") ? "Neumonía" : /urin/i.test(r.syndrome || "") ? "Infección urinaria" : "Sepsis";
      if (!IAAS_FOCUS.includes(r.focus)) r.focus = r.catheterRelated === "Sí" ? "Asociado a catéter" : "Torrente sanguíneo";
    });
    (h.catheters || []).forEach((r) => {
      if (!r.insertDate) r.insertDate = isoOf(p, r.insertDay);
      if (r.removeDate === undefined) r.removeDate = isoOf(p, r.removeDay);
    });
    (h.transfusions || []).forEach((r) => {
      if (!r.date) r.date = isoOf(p, r.day);
      if (/glóbulos rojos/i.test(r.component || "")) r.component = "Glóbulos rojos";
      if (/anemia del prematuro/i.test(r.indication || "")) r.indication = "Anemia de la prematurez";
    });
    (h.ropExams || []).forEach((r) => {
      if (!r.date) r.date = isoOf(p, r.day);
      r.stage = String(r.stage);
      if (r.treatment && !ROP_TX.includes(r.treatment)) {
        r.treatment = /láser|laser/i.test(r.treatment) ? "Fotocoagulación láser" : /vegf|bevaci|ranibi/i.test(r.treatment) ? "Antiangiogénico intravítreo (anti-VEGF)" : /cirug/i.test(r.treatment) ? "Cirugía" : "Ninguno · control";
      }
    });
    (h.surgeries || []).forEach((r) => { if (!r.date) r.date = isoOf(p, r.day); });
  }

  // ---------- Tablas de controles seriados ----------
  // «target» es el día de vida esperado de cada control; null = no corresponde a este paciente.
  const stayDays = (p) => global.NEOSALUD_ENGINE.getPatientStayDays(p);
  const day36w = (p) => {
    const ga = Number(p.gaWeeks);
    return ga && ga < 36 ? (36 - ga) * 7 - (Number(p.gaDays) || 0) : null;
  };
  const GROWTH = {
    store: "growthControls",
    rows: [
      { id: "d7", label: "7 días", target: () => 7 },
      { id: "d14", label: "14 días", target: () => 14 },
      { id: "d28", label: "28 días", target: () => 28 },
      { id: "w36", label: "36 semanas EGC", target: day36w },
      { id: "alta", label: "Alta", target: (p) => (p.dischargeDate ? stayDays(p) : null) }
    ],
    inputs: [
      ["weight", "Peso", "g"], ["length", "Talla", "cm"], ["hc", "CC", "cm"],
      ["zWeight", "z peso", ""], ["zLength", "z talla", ""], ["zHc", "z CC", ""],
      ["milk", "Leche materna", "cc/kg/d"], ["formula", "Fórmula", "cc/kg/d"]
    ]
  };
  // Velocidades contra el control anterior con dato (o el nacimiento). Ganancia en g/kg/día por
  // el método exponencial: 1000 · ln(P2/P1) / días.
  function growthVelocities(p) {
    const out = {};
    let prev = { day: 0, weight: Number(p.birthWeight) || null, length: Number(p.birthLength) || null, hc: Number(p.birthHc) || null };
    const ctrl = (p.hosp.growthControls || {});
    for (const row of GROWTH.rows) {
      const c = ctrl[row.id];
      if (!c || !c.date) continue;
      const day = dayOf(p, c.date);
      const days = day - prev.day;
      const v = {};
      if (days > 0) {
        if (c.weight && prev.weight) {
          v.gkgd = Number((1000 * Math.log(c.weight / prev.weight) / days).toFixed(1));
          v.gweek = Number((((c.weight - prev.weight) / days) * 7).toFixed(0));
        }
        if (c.length && prev.length) v.lweek = Number((((c.length - prev.length) / days) * 7).toFixed(2));
        if (c.hc && prev.hc) v.hcweek = Number((((c.hc - prev.hc) / days) * 7).toFixed(2));
      }
      out[row.id] = v;
      prev = { day, weight: c.weight || prev.weight, length: c.length || prev.length, hc: c.hc || prev.hc };
    }
    return out;
  }

  const LABS = {
    store: "biweeklyControls",
    rows: [15, 30, 45, 60, 75, 90, 105, 120].map((d) => ({ id: `d${d}`, label: `Día ${d}`, target: () => d })),
    inputs: [
      ["hto", "Hematocrito", "%"], ["hb", "Hemoglobina", "g/dL"], ["retic", "Reticulocitos", "%"],
      ["ca", "Calcio", "mg/dL"], ["p", "Fósforo", "mg/dL"], ["fal", "Fosfatasa alcalina", "U/L"], ["ggt", "GGT", "U/L"],
      ["rtp", "Reabs. tubular P", "%"], ["vitd", "Vitamina D", "ng/mL"], ["pth", "PTH", "pg/mL"], ["ferritin", "Ferritina", "ng/mL"],
      ["na", "Sodio", "mEq/L"], ["k", "Potasio", "mEq/L"], ["cl", "Cloro", "mEq/L"], ["bun", "BUN", "mg/dL"],
      ["creat", "Creatinina", "mg/dL"], ["alb", "Albúmina", "g/dL"], ["bt", "Bilirrubina total", "mg/dL"], ["bd", "Bilirrubina directa", "mg/dL"]
    ],
    window: 4
  };

  // Datos ficticios para la demo: controles coherentes con el peso al nacer y la estadía.
  function seedSeries(p) {
    const h = p.hosp;
    const ga = Number(p.gaWeeks);
    const bw = Number(p.birthWeight);
    const stay = stayDays(p);
    let seed = [...String(p.id)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    if (h.growthSeries === undefined && ga) {
      h.growthSeries = ga < 35 ? "Sí" : "No";
      if (h.growthSeries === "Sí" && !h.growthControls) {
        h.growthControls = {};
        let w = bw, l = Number(p.birthLength) || 0, c = Number(p.birthHc) || 0, last = 0;
        for (const row of GROWTH.rows) {
          const t = row.target(p);
          if (t === null || t > stay || t <= last) continue;
          const days = t - last;
          w = Math.round(t <= 7 ? w * 0.93 : w * Math.exp(((14 + rnd() * 5) * days) / 1000));
          if (l) l = Number((l + (days / 7) * (0.8 + rnd() * 0.4)).toFixed(1));
          if (c) c = Number((c + (days / 7) * (0.7 + rnd() * 0.3)).toFixed(1));
          h.growthControls[row.id] = { date: isoOf(p, t + Math.round(rnd() * 2)), weight: w, length: t >= 28 ? l : "", hc: t >= 14 ? c : "", zWeight: "", zLength: "", zHc: "", milk: Math.round(100 + rnd() * 60), formula: "" };
          last = t;
        }
      }
    }
    if (h.biweeklyLabs === undefined && (ga < 32 || bw < 1500)) {
      h.biweeklyLabs = stay >= 15 ? "Sí" : "";
      if (h.biweeklyLabs === "Sí" && !h.biweeklyControls) {
        h.biweeklyControls = {};
        for (const row of LABS.rows) {
          const t = row.target(p);
          if (t > stay) break;
          const off = Math.round(rnd() * 10) - 3;   // a veces cae fuera de la ventana de ± 4 días
          h.biweeklyControls[row.id] = {
            date: isoOf(p, t + off), hto: Math.round(30 + rnd() * 12), hb: Number((9.5 + rnd() * 4).toFixed(1)),
            ca: Number((8.6 + rnd() * 1.6).toFixed(1)), p: Number((4.2 + rnd() * 2.6).toFixed(1)), fal: Math.round(300 + rnd() * 450),
            na: Math.round(134 + rnd() * 8), k: Number((4 + rnd() * 1.6).toFixed(1)), creat: Number((0.3 + rnd() * 0.5).toFixed(2)),
            alb: Number((2.6 + rnd() * 1).toFixed(1)), bt: Number((1 + rnd() * 6).toFixed(1))
          };
        }
      }
    }
  }

  global.NEOSALUD_TIMELINES = { TIMELINES, MODALITIES, GROWTH, LABS, upgradeRecords, seedSeries, growthVelocities, dayOf, isoOf };
})(window);
