// Cohorte de demostración (datos 100 % ficticios).
//
// 1) patchSeed: adapta los 8 casos guía de data.js al vocabulario actual del esquema
//    (Argentina) y completa sus datos de identificación, serologías y parto.
// 2) generate: crea 22 pacientes más a partir de perfiles clínicos fijos, para que la
//    unidad tenga una ocupación y unas tasas creíbles. Lo aleatorio (nombres, DNI,
//    pequeñas variaciones) sale de un generador con semilla fija: siempre da lo mismo.
(function (global) {
  const REF_DATE = "2026-11-22";

  // Generador pseudoaleatorio determinístico (mulberry32)
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function addDays(iso, n) {
    const d = new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000);
    return d.toISOString().slice(0, 10);
  }

  const GIRLS = ["Martina", "Isabella", "Catalina", "Delfina", "Emilia", "Julieta", "Lucía", "Mía", "Renata", "Victoria", "Guadalupe", "Agustina"];
  const BOYS = ["Benjamín", "Joaquín", "Santino", "Bastián", "Felipe", "Lorenzo", "Tomás", "Valentino", "Ignacio", "Juan Cruz", "Francisco", "Facundo"];
  const MOTHERS = ["Carla", "Romina", "Daiana", "Micaela", "Florencia", "Yamila", "Natalia", "Sabrina", "Antonella", "Gisela", "Belén", "Rocío", "Melina", "Lorena"];
  const SURNAMES = ["González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez", "Pérez", "Romero", "Sosa", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores", "Acosta", "Benítez", "Medina", "Herrera", "Suárez", "Aguirre", "Giménez"];
  const OBRAS = ["IOMA", "OSECAC", "OSPRERA", "Unión Personal", "OSDE", "Swiss Medical"];
  const DOCTORS = ["Dra. Elena Torres", "Dr. Lucas Benítez", "Dra. Carolina Méndez"];
  const REFERRALS = ["Hospital Zonal de Ezeiza", "Maternidad Oeste", "Hospital Municipal de Cañuelas"];

  // Peso medio aproximado por EG (g), solo para que los pesos de la demo sean verosímiles.
  const MEAN_WEIGHT = { 24: 650, 25: 750, 26: 865, 27: 1000, 28: 1145, 29: 1310, 30: 1490, 31: 1685, 32: 1890, 33: 2110, 34: 2340, 35: 2580, 36: 2820, 37: 3050, 38: 3260, 39: 3440, 40: 3580, 41: 3680 };

  // ---------------------------------------------------------------------------
  // Casos guía existentes: vocabulario nuevo + datos argentinos
  // ---------------------------------------------------------------------------
  const SEED_PATCH = {
    "NEO-2026-000001": { // Alma · 24+2, egresada con DBP
      a: { dniStatus: "Con DNI", rnDni: "58.214.630", coverage: "Sin cobertura (sistema público)", sumar: "Sí", prenatalCare: "Insuficiente (menos de 5)",
        multiple: "No", hypertension: "No", deliveryType: "Cesárea de urgencia", presentation: "Podálica / pelviana", amnioticFluid: "Claro",
        vdrl: "No reactiva", hivSerology: "No reactiva", chagas: "No reactiva", toxo: "IgG reactiva (inmune)", hbsag: "No reactiva", asphyxia: "No" },
      h: { minWeight: 560, minWeightDay: 6, sip: "No", ironDay: 28, vitDDay: 14 }
    },
    "NEO-2026-000002": { // Mateo · 38+4, sepsis precoz
      a: { dniStatus: "En trámite", coverage: "Obra social", coverageName: "OSECAC", prenatalCare: "Controlado (5 o más controles)", multiple: "No",
        hypertension: "No", deliveryType: "Vaginal espontáneo", presentation: "Cefálica", amnioticFluid: "Fétido / purulento",
        vdrl: "No reactiva", hivSerology: "No reactiva", chagas: "No reactiva", toxo: "IgG no reactiva (susceptible)", hbsag: "No reactiva", asphyxia: "No" },
      h: { earlySepsisCulture: "Hemocultivo positivo", earlySepsisGerm: "Estreptococo grupo B (S. agalactiae)", sip: "No" }
    },
    "NEO-2026-000003": { // Sofía · 29+1
      a: { dniStatus: "En trámite", coverage: "Obra social", coverageName: "IOMA", prenatalCare: "Controlado (5 o más controles)", multiple: "No",
        hypertension: "Preeclampsia", deliveryType: "Cesárea de urgencia", presentation: "Cefálica", amnioticFluid: "Claro",
        vdrl: "No reactiva", hivSerology: "No reactiva", chagas: "No reactiva", hbsag: "No reactiva", asphyxia: "No" },
      h: { minWeight: 1090, minWeightDay: 5, sip: "No" }
    },
    "NEO-2026-000004": { // Lucas · 35+6, ingreso incompleto: se deja casi todo sin responder a propósito
      a: { dniStatus: "En trámite" }
    },
    "NEO-2026-000005": { // Valentina · 27+x, egresada
      a: { dniStatus: "Con DNI", rnDni: "58.390.112", coverage: "Prepaga", coverageName: "Swiss Medical", prenatalCare: "Controlado (5 o más controles)",
        multiple: "Gemelar", chorionicity: "Bicorial biamniótico", birthOrder: 1, hypertension: "No", deliveryType: "Cesárea de urgencia",
        presentation: "Cefálica", amnioticFluid: "Claro", vdrl: "No reactiva", hivSerology: "No reactiva", chagas: "No reactiva",
        toxo: "IgG no reactiva (susceptible)", hbsag: "No reactiva", asphyxia: "No" },
      h: { minWeight: 880, minWeightDay: 5, sip: "No", ironDay: 30, vitDDay: 15 }
    },
    "NEO-2026-000006": { // Thiago · 31+x
      a: { dniStatus: "En trámite", coverage: "Sin cobertura (sistema público)", sumar: "Sí", prenatalCare: "Controlado (5 o más controles)",
        multiple: "No", hypertension: "HTA gestacional", deliveryType: "Cesárea programada", presentation: "Cefálica", amnioticFluid: "Claro",
        vdrl: "No reactiva", hivSerology: "No reactiva", chagas: "No reactiva", toxo: "IgG reactiva (inmune)", hbsag: "No reactiva", asphyxia: "No" },
      h: { minWeight: 1480, minWeightDay: 4, sip: "No" }
    },
    "NEO-2026-000007": { // Emma · 39+x, egresada
      a: { dniStatus: "Con DNI", rnDni: "58.611.457", coverage: "Obra social", coverageName: "OSDE", prenatalCare: "Controlado (5 o más controles)",
        multiple: "No", hypertension: "No", deliveryType: "Vaginal espontáneo", presentation: "Cefálica", amnioticFluid: "Claro",
        vdrl: "No reactiva", hivSerology: "No reactiva", chagas: "No reactiva", toxo: "IgG no reactiva (susceptible)", hbsag: "No reactiva", asphyxia: "No" },
      h: { sip: "No" }
    },
    "NEO-2026-000008": { // Bautista · 25+x, fallecido
      a: { dniStatus: "En trámite", coverage: "Sin cobertura (sistema público)", sumar: "Sí", prenatalCare: "Sin controles", multiple: "No",
        hypertension: "No", deliveryType: "Vaginal espontáneo", presentation: "Cefálica", amnioticFluid: "Claro",
        vdrl: "No reactiva", hivSerology: "No reactiva", chagas: "No reactiva", hbsag: "No reactiva", asphyxia: "No" },
      h: { sip: "No" },
      d: { deathCause: "P36.4 · Sepsis del recién nacido debida a Escherichia coli", deathPlace: "Unidad de neonatología", autopsy: "No" }
    }
  };

  const CONDITION_MAP = {
    "Sano": "Alta a domicilio", "Sano / Estable": "Alta a domicilio", "Enfermo (crónico estable)": "Alta a domicilio",
    "Trasladado": "Derivado a otra institución"
  };

  function mapScreen(field, v) {
    if (!v || v === "Pendiente" || v === "No aplica") return field === "screenFei" && v === "Pendiente" ? "Tomada · sin resultado aún" : "";
    if (field === "screenFei") return /alter/i.test(v) ? "Tomada · resultado alterado (en seguimiento)" : "Tomada · resultado normal";
    if (field === "screenOea") return /pasa/i.test(v) && !/no pasa/i.test(v) ? "Pasa ambos oídos" : /no pasa/i.test(v) ? "No pasa · derivar a ORL" : "No realizada";
    return /normal/i.test(v) ? "Normal" : v;
  }

  function patchSeed(p) {
    const patch = SEED_PATCH[p.id] || {};
    Object.assign(p.admission, patch.a || {});
    Object.assign(p.hosp, patch.h || {});
    // Procedencia «Derivado (X)» → rama derivado + institución de origen
    const der = /^Derivado \((.+)\)$/.exec(p.admission.origin || "");
    if (der) {
      p.admission.origin = "Derivado de otra institución";
      p.admission.referralFrom = der[1];
      p.admission.transport = "Traslado neonatal en incubadora";
    }
    const d = p.discharge;
    if (CONDITION_MAP[d.condition]) d.condition = CONDITION_MAP[d.condition];
    for (const f of ["screenFei", "screenOea", "screenOximetry", "screenRedReflex"]) d[f] = mapScreen(f, d[f]);
    if (d.vaccines && /BCG/i.test(d.vaccines)) { d.vacBcg = "Aplicada"; d.vacHbv = /hepatitis/i.test(d.vaccines) ? "Aplicada" : ""; }
    delete d.vaccines;
    if (d.condition === "Fallecido") {
      for (const k of ["destination", "weightG", "lengthCm", "hcCm", "feeding", "homeO2", "medications", "screenFei", "screenOea", "screenOximetry", "screenRedReflex", "vacBcg", "vacHbv"]) d[k] = "";
      Object.assign(d, patch.d || {});
    }
    return p;
  }

  // ---------------------------------------------------------------------------
  // Perfiles de los 22 pacientes nuevos
  //   st: estado · sec: sector · ago: días desde el ingreso (internados)
  //   adm/los: fecha de ingreso y días de estadía (egresados)
  // ---------------------------------------------------------------------------
  const PROFILES = [
    // ----- Internados (15) -----
    { ga: [25, 3], sex: "M", st: "hospitalizado", sec: "UCIN", ago: 18, resp: [[0, "VMC", 55], [9, "NIPPV", 35], [14, "CPAP", 30]], respCov: "incompleta",
      dx: ["P07.0", "P07.2", "P22.0", "Q25.0"], us: "HIV grado II", echo: { dap: "Sí", dapMed: "Ibuprofeno" }, cath: [["CVU", 0, 7], ["PICC", 7, ""]], resus: "full" },
    { ga: [26, 5], sex: "F", st: "hospitalizado", sec: "UCIN", ago: 32, resp: [[0, "VMC", 50], [6, "CPAP", 30], [22, "CNAF", 28]], respCov: "completa",
      dx: ["P07.0", "P07.2", "P22.0", "P36.8"], us: "HIV grado III", echo: { dap: "Sí", dapMed: "Paracetamol" }, cath: [["CVU", 0, 6], ["PICC", 6, 24]],
      iaas: { day: 15, syndrome: "Sepsis tardía asociada a catéter", germ: "Staphylococcus epidermidis (SCN)", abx1: "Vancomicina", abx2: "Amikacina", days: 10, catheterRelated: "Sí" },
      rop: [[30, 1, "II", "No", "Control"]], transf: 2, resus: "full" },
    { ga: [28, 2], sex: "M", st: "hospitalizado", sec: "UCIN", ago: 21, resp: [[0, "CPAP", 40], [8, "CNAF", 30], [17, "AA", 21]], respCov: "completa",
      dx: ["P07.1", "P07.3", "P22.0", "P77"], us: "Normal", echo: { dap: "No" }, cath: [["CVU", 0, 8]], nec: "II (confirmada)", rop: [[20, 0, "II", "No", "Control"]], resus: "vppi" },
    { ga: [29, 4], sex: "F", st: "hospitalizado", sec: "Intermedios", ago: 26, resp: [[0, "CPAP", 35], [4, "CNAF", 28], [10, "AA", 21]], respCov: "completa",
      dx: ["P07.1", "P07.3", "P22.0"], us: "Normal", echo: { dap: "No" }, cath: [["CVU", 0, 5]], rop: [[24, 0, "II", "No", "Control"]], twin: true },
    { ga: [30, 6], sex: "M", st: "hospitalizado", sec: "Intermedios", ago: 6, resp: [[0, "CPAP", 30], [3, "AA", 21]], respCov: "incompleta",
      dx: ["P07.1", "P07.3", "P22.0"], us: "", echo: { dap: "No" }, missingToxo: true },
    { ga: [31, 3], sex: "F", st: "hospitalizado", sec: "Intermedios", ago: 12, resp: [], respCov: "completa",
      dx: ["P07.1", "P07.3", "P59.9"], us: "Normal", echo: { dap: "No" } },
    { ga: [33, 1], sex: "M", st: "hospitalizado", sec: "Intermedios", ago: 9, resp: [[0, "CPAP", 30], [2, "AA", 21]], respCov: "completa",
      dx: ["P07.3", "P22.1"], us: "Normal", echo: { dap: "No" } },
    { ga: [34, 0], sex: "F", st: "hospitalizado", sec: "Intermedios", ago: 5, resp: [], respCov: "completa",
      dx: ["P07.3", "P59.9"], us: "Normal", chagas: true },
    { ga: [35, 2], sex: "M", st: "hospitalizado", sec: "Pre-alta", ago: 14, resp: [], respCov: "completa", dx: ["P07.3", "P59.9"] },
    { ga: [35, 6], sex: "F", st: "hospitalizado", sec: "Pre-alta", ago: 11, resp: [], respCov: "completa", dx: ["P07.3", "P70.4", "P08.1"], diabetes: true, lga: true },
    { ga: [36, 5], sex: "M", st: "hospitalizado", sec: "Pre-alta", ago: 7, resp: [], respCov: "completa", dx: ["P05.1", "P07.3"], peg: true, missingToxo: true },
    { ga: [37, 2], sex: "F", st: "hospitalizado", sec: "Aislamiento", ago: 4, resp: [], respCov: "completa", dx: ["P59.9"], syphilis: true },
    { ga: [38, 6], sex: "M", st: "hospitalizado", sec: "UCIN", ago: 2, resp: [[0, "CPAP", 30], [1, "AA", 21]], respCov: "incompleta",
      dx: ["P39.9", "P36.9"], earlySepsis: true },
    { ga: [40, 1], sex: "F", st: "ingreso_incompleto", sec: "UCIN", ago: 1, resp: [[0, "VMC", 40]], respCov: "incompleta",
      dx: ["P21.0", "P91.6"], asphyxia: true, resus: "advanced" },
    { ga: [41, 0], sex: "M", st: "hospitalizado", sec: "Intermedios", ago: 3, resp: [[0, "CPAP", 40], [3, "AA", 21]], respCov: "completa",
      dx: ["P24.0"], meconium: true, missingToxo: true },
    // ----- Egresados (7) -----
    { ga: [27, 1], sex: "F", st: "egresado", adm: "2026-06-02", los: 78, resp: [[0, "VMC", 50], [3, "CPAP", 30], [12, "CNAF", 28], [24, "AA", 21]],
      respCov: "completa", dx: ["P07.0", "P07.2", "P22.0", "P27.1", "H35.1"], us: "Normal", echo: { dap: "No" }, cath: [["CVU", 0, 7], ["PICC", 7, 30]],
      rop: [[35, 1, "II", "No", "Control"], [49, 2, "II", "No", "Control"], [70, 0, "III", "No", "Alta oftalmológica"]], transf: 2, feeding: "Alimentación mixta", resus: "full" },
    { ga: [30, 0], sex: "M", st: "egresado", adm: "2026-07-10", los: 45, resp: [[0, "CPAP", 35], [6, "AA", 21]], respCov: "completa",
      dx: ["P07.1", "P07.3", "P22.0", "Q25.0"], us: "HIV grado I", echo: { dap: "Sí", dapMed: "Ibuprofeno" }, cath: [["CVU", 0, 6]],
      rop: [[28, 0, "II", "No", "Control"]], feeding: "Lactancia materna exclusiva" },
    { ga: [31, 0], sex: "F", st: "egresado", adm: "2026-08-14", los: 40, resp: [[0, "CPAP", 30], [2, "AA", 21]], respCov: "completa",
      dx: ["P07.1", "P07.3", "P22.0"], rop: [[28, 0, "II", "No", "Control"]], us: "Normal", echo: { dap: "No" }, feeding: "Lactancia materna exclusiva" },
    { ga: [34, 4], sex: "M", st: "egresado", adm: "2026-09-03", los: 15, resp: [], respCov: "completa", dx: ["P07.3", "P59.9"], us: "Normal", feeding: "Alimentación mixta" },
    { ga: [36, 1], sex: "F", st: "egresado", adm: "2026-09-20", los: 9, resp: [], respCov: "completa", dx: ["P07.3", "P59.9"], feeding: "Lactancia materna exclusiva" },
    { ga: [38, 0], sex: "M", st: "egresado", adm: "2026-10-05", los: 6, resp: [[0, "CPAP", 30], [1, "AA", 21]], respCov: "completa", dx: ["P22.1"], feeding: "Lactancia materna exclusiva" },
    { ga: [39, 3], sex: "F", st: "egresado", adm: "2026-10-20", los: 5, resp: [], respCov: "completa", dx: ["P70.4", "P08.1"], diabetes: true, lga: true, feeding: "Fórmula" }
  ];

  function generate(createBlankPatient, startIndex) {
    const rnd = makeRng(20261122);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
    const dec = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 10) / 10;
    const dni = (lo, hi) => {
      const n = String(between(lo, hi));
      return n.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };
    const out = [];

    PROFILES.forEach((pr, i) => {
      const [gw, gd] = pr.ga;
      const preterm = gw < 37;
      const surname = pick(SURNAMES);
      const mother = `${pick(MOTHERS)} ${surname}`;
      const discharged = pr.st === "egresado";
      const admitDate = discharged ? pr.adm : addDays(REF_DATE, -pr.ago);
      const dischargeDate = discharged ? addDays(pr.adm, pr.los) : "";
      const factor = pr.peg ? 0.74 : pr.lga ? 1.24 : 0.88 + rnd() * 0.24;
      const birthWeight = Math.round(((MEAN_WEIGHT[gw] || 3300) * (pr.sex === "F" ? 0.965 : 1) * factor) / 5) * 5;

      const p = createBlankPatient({
        id: `NEO-2026-${String(startIndex + i).padStart(6, "0")}`,
        fullName: `${pr.sex === "F" ? pick(GIRLS) : pick(BOYS)} ${surname}`,
        hc: `HC-${between(90000, 99999)}`,
        motherName: mother,
        sex: pr.sex,
        birthDate: admitDate,
        admitDate,
        sector: pr.sec || "Pre-alta",
        gaWeeks: gw,
        gaDays: gd,
        birthWeight
      });
      p.motherDni = dni(28000000, 46000000);
      p.birthTime = `${String(between(0, 23)).padStart(2, "0")}:${String(between(0, 59)).padStart(2, "0")}`;
      p.birthLength = dec(gw < 28 ? 30 : gw < 32 ? 36 : gw < 37 ? 42 : 47, gw < 28 ? 34 : gw < 32 ? 41 : gw < 37 ? 47 : 52);
      p.birthHc = dec(gw < 28 ? 21 : gw < 32 ? 25 : gw < 37 ? 29 : 33, gw < 28 ? 24 : gw < 32 ? 29 : gw < 37 ? 33 : 36);
      p.status = pr.st === "egresado" ? "egresado" : pr.st;
      p.dischargeDate = dischargeDate;

      // ----- Ingreso -----
      const a = p.admission;
      const coverageRoll = rnd();
      Object.assign(a, {
        dniStatus: discharged ? "Con DNI" : "En trámite",
        rnDni: discharged ? dni(58000000, 59000000) : "",
        coverage: coverageRoll < 0.55 ? "Sin cobertura (sistema público)" : coverageRoll < 0.88 ? "Obra social" : "Prepaga",
        origin: i % 7 === 3 ? "Derivado de otra institución" : "Intramuros",
        tempC: dec(preterm ? 35.8 : 36.3, 37.0),
        baseExcess: gw <= 32 ? dec(-9, -2) : "",
        maternalAge: between(18, 39),
        parity: rnd() < 0.45 ? "Primípara" : "Multipara",
        prenatalCare: pr.syphilis ? "Sin controles" : rnd() < 0.82 ? "Controlado (5 o más controles)" : "Insuficiente (menos de 5)",
        multiple: pr.twin ? "Gemelar" : "No",
        antenatalSteroids: gw >= 35 ? "No aplica" : rnd() < 0.75 ? "Completo (2 dosis betametasona)" : "Incompleto (1 dosis)",
        mgso4: gw < 32 ? "Sí" : "No",
        hypertension: pr.peg ? "Preeclampsia" : "No",
        diabetes: pr.diabetes ? "Sí" : "No",
        vdrl: pr.syphilis ? "Reactiva" : "No reactiva",
        hivSerology: "No reactiva",
        chagas: pr.chagas ? "Reactiva" : "No reactiva",
        toxo: pr.missingToxo ? "" : rnd() < 0.6 ? "IgG no reactiva (susceptible)" : "IgG reactiva (inmune)",
        hbsag: "No reactiva",
        gbs: preterm ? "Desconocido" : rnd() < 0.8 ? "Negativo" : "Positivo",
        deliveryType: gw < 32 ? "Cesárea de urgencia" : rnd() < 0.6 ? "Vaginal espontáneo" : "Cesárea programada",
        presentation: rnd() < 0.88 ? "Cefálica" : "Podálica / pelviana",
        amnioticFluid: pr.meconium ? "Meconial" : pr.earlySepsis ? "Fétido / purulento" : "Claro",
        rpo: pr.earlySepsis ? "Sí" : rnd() < 0.2 ? "Sí" : "No",
        maternalMaxTemp: pr.earlySepsis ? 38.6 : dec(36.4, 37.4),
        apgar1: pr.asphyxia ? 2 : between(gw < 28 ? 3 : 6, gw < 28 ? 6 : 9),
        apgar5: pr.asphyxia ? 4 : between(gw < 28 ? 6 : 8, gw < 28 ? 8 : 10),
        resuscitation: pr.resus ? "Sí" : "No",
        asphyxia: pr.asphyxia ? "Sí" : "No",
        diagnoses: pr.dx
      });
      if (a.parity === "Multipara") a.parityDetail = `G${between(2, 4)} P${between(1, 2)} C${between(0, 1)} A0`;
      if (a.coverage === "Obra social") a.coverageName = pick(OBRAS.slice(0, 4));
      if (a.coverage === "Prepaga") a.coverageName = pick(OBRAS.slice(4));
      if (a.coverage === "Sin cobertura (sistema público)") a.sumar = "Sí";
      if (a.origin === "Derivado de otra institución") { a.referralFrom = pick(REFERRALS); a.transport = "Traslado neonatal en incubadora"; }
      if (pr.twin) { a.chorionicity = "Bicorial biamniótico"; a.birthOrder = 2; }
      if (pr.diabetes) { a.diabetesType = "Gestacional"; a.diabetesTx = rnd() < 0.5 ? "Insulina" : "Dieta"; }
      if (pr.syphilis) a.syphilisTx = "Sin tratamiento";
      if (a.rpo === "Sí") { a.rpoHours = pr.earlySepsis ? 30 : between(19, 40); a.chorio = pr.earlySepsis ? "Sí" : "No"; }
      a.maternalAbx = a.gbs === "Positivo" ? "Ampicilina >= 4 h" : a.rpo === "Sí" ? "Sin antibióticos / < 2 h" : "No requerido";
      if (gw >= 35) a.examStatus = pr.earlySepsis || pr.asphyxia ? "Enfermedad clínica" : "Buen aspecto";
      if (pr.resus) {
        a.vppi = "Sí";
        a.intubation = pr.resus === "vppi" ? "No" : "Sí";
        a.chestCompressions = pr.resus === "advanced" ? "Sí" : "No";
        a.maxO2Delivery = pr.resus === "vppi" ? 40 : 60;
        a.adrenaline = pr.resus === "advanced" ? "Sí" : "No";
        if (pr.resus === "advanced") a.adrenalineDoses = 1;
      }
      if (pr.asphyxia) a.therapeuticHypothermia = "Sí";

      // ----- Hospitalización -----
      const h = p.hosp;
      const hadSupport = pr.resp.some(([, m]) => m !== "AA");
      h.respCoverage = pr.respCov;
      h.respEvents = pr.resp.map(([day, modality, fio2], k) => ({
        id: `g${i}r${k}`, day, date: addDays(admitDate, day), time: `${String(between(6, 22)).padStart(2, "0")}:00`,
        event: k === 0 ? "Soporte inicial" : modality === "AA" ? "Destete a aire ambiente" : "Cambio de soporte",
        modality, fio2, peep: ["CPAP", "NIPPV", "VMC"].includes(modality) ? between(5, 7) : "", flow: modality === "CN" ? 1 : modality === "CNAF" ? 6 : ""
      }));
      if (pr.st !== "ingreso_incompleto") {
        h.sdr = gw < 34 && hadSupport ? "Sí" : "No";
        if (h.sdr === "Sí" && gw < 30) { h.surfactantDoses = between(1, 2); h.surfactantRoute = gw < 27 ? "Por tubo en ventilación mecánica" : "LISA / MIST"; h.surfactantHours = between(1, 6); }
        h.pneumothorax = "No";
        h.nec = pr.nec ? "Sí" : "No";
        if (pr.nec) { h.necStage = pr.nec; h.necSurgery = "No"; }
        h.sip = "No";
        h.earlySepsis = pr.earlySepsis ? "Sí" : "No";
        if (pr.earlySepsis) h.earlySepsisCulture = "Sepsis clínica (hemocultivo negativo)";
        if (gw < 34) { h.minWeight = Math.round(birthWeight * 0.9 / 5) * 5; h.minWeightDay = between(3, 6); }
        h.cardio = { echo: pr.echo ? "Sí" : "", chd: pr.echo ? "No" : "", dap: pr.echo ? pr.echo.dap : "", dapMed: pr.echo && pr.echo.dapMed ? pr.echo.dapMed : "", dapInvasive: pr.echo && pr.echo.dap === "Sí" ? "No" : "" };
        h.neuro = { apnea: gw < 32 ? "Sí" : "No", seizures: pr.asphyxia ? "Sí" : "No", cranialUs: pr.us === undefined ? "" : pr.us, mri: "", hydrocephalus: pr.us ? "No" : "", hydroSurgery: "" };
        if (pr.chagas) h.chagasRn = "Micrométodo negativo · serología a los 10 meses";
        if (pr.syphilis) h.syphilisRn = "Penicilina 10 días";
      }
      h.nutrCoverage = discharged || pr.ago > 10 ? "completa" : "incompleta";
      h.iaasCoverage = discharged || pr.ago > 3 ? "completa" : "incompleta";
      h.nutrEvents = [];
      if (gw < 34) {
        h.nutrEvents.push({ id: `g${i}n0`, day: 0, date: admitDate, route: "Parenteral", event: "Inicio NPT + AA", detail: "AA 3 g/kg/d" });
        h.nutrEvents.push({ id: `g${i}n1`, day: 1, date: addDays(admitDate, 1), route: "Enteral", event: "Inicio estímulo enteral", milk: "Leche materna", ccKg: 15, detail: "Calostro" });
        const full = gw < 28 ? 16 : gw < 32 ? 11 : 6;
        if ((discharged ? pr.los : pr.ago) > full) {
          h.nutrEvents.push({ id: `g${i}n2`, day: full, date: addDays(admitDate, full), route: "Enteral", event: "Alcanza 100 cc/kg/d", milk: "Leche materna", ccKg: 100, detail: "" });
          h.nutrEvents.push({ id: `g${i}n3`, day: full + 1, date: addDays(admitDate, full + 1), route: "Parenteral", event: "Suspensión NPT", detail: "" });
        }
        if (gw < 32 && (discharged ? pr.los : pr.ago) > full + 4) {
          h.nutrEvents.push({ id: `g${i}n4`, day: full + 4, date: addDays(admitDate, full + 4), route: "Enteral", event: "Fortificación leche materna", milk: "Leche materna fortificada", ccKg: 150, detail: "" });
          h.ironDay = full + 14;
          h.vitDDay = full + 2;
        }
      } else {
        h.nutrEvents.push({ id: `g${i}n0`, day: 0, date: admitDate, route: "Enteral", event: "Inicio alimentación enteral", milk: pr.feeding === "Fórmula" ? "Fórmula de inicio" : "Leche materna", ccKg: 60, detail: "" });
      }
      h.catheters = (pr.cath || []).map(([type, insertDay, removeDay], k) => ({
        id: `g${i}c${k}`, type, insertDay, removeDay, site: type === "CVU" ? "Umbilical venoso" : "Miembro superior", reason: removeDay === "" ? "" : "Fin de uso", complication: pr.iaas && type === "PICC" ? "Bacteriemia asociada" : "Ninguna"
      }));
      h.iaasEpisodes = pr.iaas ? [Object.assign({ id: `g${i}i0`, date: addDays(admitDate, pr.iaas.day), cultureConfirmed: "Sí", focus: "Hemocultivo periférico + catéter" }, pr.iaas)] : [];
      h.ropExams = (pr.rop || []).map(([day, stage, zone, plus, treatment], k) => ({ id: `g${i}rop${k}`, day, stage, zone, plus, treatment }));
      h.transfusions = Array.from({ length: pr.transf || 0 }, (_, k) => ({ id: `g${i}t${k}`, day: 5 + k * 12, component: "Glóbulos rojos desplasmatizados", indication: "Anemia del prematuro", mlKg: 15, reaction: "No" }));

      // ----- Egreso -----
      if (discharged) {
        const d = p.discharge;
        Object.assign(d, {
          date: dischargeDate, condition: "Alta a domicilio",
          weightG: Math.max(birthWeight + pr.los * 18, 2000), lengthCm: dec(44, 50), hcCm: dec(31, 35),
          feeding: pr.feeding || "Lactancia materna exclusiva", homeO2: "No",
          screenFei: "Tomada · resultado normal", screenOea: "Pasa ambos oídos", screenOximetry: "Normal", screenRedReflex: "Normal",
          vacBcg: "Aplicada", vacHbv: "Aplicada",
          medications: gw < 34 ? "Hierro 2 mg/kg/día · Vitamina D 400 UI/día" : "Sin medicación",
          indications: gw < 32 ? "Control en consultorio de seguimiento de alto riesgo a los 7 días; control oftalmológico y auditivo según programa." : "Control pediátrico a las 48–72 h; pautas de alarma.",
          diagnoses: pr.dx
        });
      }

      // ----- Documentos firmados (el texto se genera al hidratar la demo) -----
      const doctor = DOCTORS[i % DOCTORS.length];
      if (pr.st !== "ingreso_incompleto") {
        Object.assign(p.admissionDraft, { validated: true, validatedBy: doctor, validatedAt: `${admitDate} ${String(between(1, 9)).padStart(2, "0")}:${String(between(0, 59)).padStart(2, "0")}` });
      }
      if (discharged) {
        Object.assign(p.epicrisisDraft, { validated: true, validatedBy: doctor, validatedAt: `${dischargeDate} 12:30` });
      }
      out.push(p);
    });
    return out;
  }

  global.NEOSALUD_COHORT = { patchSeed, generate };
})(window);
