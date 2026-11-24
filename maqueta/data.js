(function (global) {
  const ROLES = [
    {
      id: "planta",
      name: "Dra. Elena Torres",
      matricula: "MN 142.810",
      roleLabel: "Neonatóloga de planta",
      initials: "ET",
      permissions: {
        createPatient: true,
        editClinical: true,
        signDraft: true,
        importFiles: true,
        exportFull: true,
        admin: false
      }
    },
    {
      id: "guardia",
      name: "Dr. Lucas Benítez",
      matricula: "MN 168.420",
      roleLabel: "Médico de guardia",
      initials: "LB",
      permissions: {
        createPatient: true,
        editClinical: true,
        signDraft: true,
        importFiles: true,
        exportFull: false,
        admin: false
      }
    },
    {
      id: "enfermeria",
      name: "Lic. Martín Vera",
      matricula: "ME 49.210",
      roleLabel: "Jefe de Enfermería",
      initials: "MV",
      permissions: {
        createPatient: true,
        editClinical: true,
        signDraft: false,
        importFiles: true,
        exportFull: false,
        admin: false
      }
    },
    {
      id: "jefatura",
      name: "Dra. Carolina Méndez",
      matricula: "MN 109.304",
      roleLabel: "Jefa de Neonatología",
      initials: "CM",
      permissions: {
        createPatient: true,
        editClinical: true,
        signDraft: true,
        importFiles: true,
        exportFull: true,
        admin: true
      }
    },
    {
      id: "direccion",
      name: "Dra. Paula Ibarra",
      matricula: "MN 98.512",
      roleLabel: "Dirección · Solo consulta",
      initials: "PI",
      permissions: {
        createPatient: false,
        editClinical: false,
        signDraft: false,
        importFiles: false,
        exportFull: false,
        admin: false
      }
    }
  ];

  const SECTORS = [
    { id: "UCIN", name: "UCIN (Cuidados Intensivos)", capacity: 8 },
    { id: "Intermedios", name: "Cuidados Intermedios", capacity: 10 },
    { id: "Pre-alta", name: "Pre-alta / Engorde", capacity: 6 },
    { id: "Aislamiento", name: "Aislamiento Neonatal", capacity: 3 }
  ];

  const CIE10_CATALOG = [
    { code: "P07.0", label: "Peso extremadamente bajo al nacer (< 1000 g)" },
    { code: "P07.1", label: "Otro peso bajo al nacer (1000–2499 g)" },
    { code: "P07.2", label: "Inmaturidad extrema (< 28 semanas)" },
    { code: "P07.3", label: "Otros recién nacidos pretérmino (28–36+6 semanas)" },
    { code: "P05.1", label: "Pequeño para la edad gestacional (PEG)" },
    { code: "P08.1", label: "Grande para la edad gestacional (GEG)" },
    { code: "P22.0", label: "Síndrome de dificultad respiratoria del recién nacido (SDR)" },
    { code: "P22.1", label: "Taquipnea transitoria del recién nacido" },
    { code: "P24.0", label: "Aspiración neonatal de meconio" },
    { code: "P25.1", label: "Neumotórax originado en el período perinatal" },
    { code: "P27.1", label: "Displasia broncopulmonar (DBP) originada en el período perinatal" },
    { code: "P28.4", label: "Otras apneas del recién nacido" },
    { code: "P29.3", label: "Persistencia de la circulación fetal / hipertensión pulmonar" },
    { code: "Q25.0", label: "Conducto arterioso permeable (DAP)" },
    { code: "Q21.1", label: "Defecto del tabique auricular (CIA)" },
    { code: "P36.0", label: "Sepsis del recién nacido debida a estreptococo del grupo B" },
    { code: "P36.2", label: "Sepsis del recién nacido debida a Staphylococcus aureus" },
    { code: "P36.4", label: "Sepsis del recién nacido debida a Escherichia coli" },
    { code: "P36.8", label: "Otras sepsis bacterianas del recién nacido (IAAS / tardía)" },
    { code: "P36.9", label: "Sepsis bacteriana del recién nacido, sospecha / no especificada" },
    { code: "P39.9", label: "Infección propia del período perinatal (sospecha de sepsis precoz)" },
    { code: "P52.1", label: "Hemorragia intraventricular (no traumática) grado II" },
    { code: "P52.2", label: "Hemorragia intraventricular (no traumática) grado III–IV" },
    { code: "P91.2", label: "Leucomalacia cerebral neonatal (LMPV)" },
    { code: "G91.1", label: "Hidrocefalia post-hemorrágica del prematuro" },
    { code: "P77", label: "Enterocolitis necrotizante (NEC) del recién nacido" },
    { code: "H35.1", label: "Retinopatía del prematuro (ROP)" },
    { code: "P59.9", label: "Ictericia neonatal / hiperbilirrubinemia" },
    { code: "P70.4", label: "Otras hipoglucemias neonatales" },
    { code: "P61.0", label: "Trombocitopenia neonatal transitoria" },
    { code: "P21.0", label: "Asfixia del nacimiento, severa" },
    { code: "P91.6", label: "Encefalopatía hipóxico-isquémica del recién nacido" }
  ];

  const MICROORGANISMS = [
    "Staphylococcus epidermidis (SCN)",
    "Staphylococcus aureus",
    "Klebsiella pneumoniae",
    "Escherichia coli",
    "Pseudomonas aeruginosa",
    "Enterobacter cloacae",
    "Candida albicans",
    "Estreptococo grupo B (S. agalactiae)",
    "Sin aislamiento microbiológico"
  ];

  const ANTIBIOTICS = [
    "Ampicilina",
    "Gentamicina",
    "Vancomicina",
    "Amikacina",
    "Piperacilina-Tazobactam",
    "Meropenem",
    "Cefotaxima",
    "Fluconazol",
    "Metronidazol"
  ];

  const RESP_MODALITIES = [
    "AA", "O2", "CN", "CNAF", "CPAP", "NIPPV", "BiPAP", "VMC", "VAFO", "ECMO"
  ];

  // Versión del estado guardado en el navegador: si cambia la estructura, se recarga la demo.
  const STATE_VERSION = 3;

  // Paciente en blanco: todo lo clínico arranca vacío («Sin responder»). Nunca se completa
  // un dato por defecto, porque se leería como un hallazgo registrado.
  function createBlankPatient(init) {
    const i = init || {};
    return {
      id: i.id,
      hc: i.hc || "",
      fullName: i.fullName || "",
      motherName: i.motherName || "",
      motherDni: "",
      sex: i.sex || "",
      birthDate: i.birthDate || "",
      birthTime: "",
      admitDate: i.admitDate || "",
      dischargeDate: "",
      sector: i.sector || "",
      status: "ingreso_incompleto",
      gaWeeks: i.gaWeeks ?? "",
      gaDays: i.gaDays ?? "",
      birthWeight: i.birthWeight ?? "",
      birthLength: "",
      birthHc: "",
      admission: {
        origin: "", obstetrician: "", tempC: "", baseExcess: "", maternalAge: "", parity: "", parityDetail: "",
        antenatalSteroids: "", mgso4: "", diabetes: "", diabetesType: "", diabetesTx: "", hba1c: "",
        rpo: "", rpoHours: "", chorio: "", gbs: "", maternalAbx: "", maternalMaxTemp: "", examStatus: "",
        apgar1: "", apgar5: "", resuscitation: "", vppi: "", intubation: "", chestCompressions: "",
        maxO2Delivery: "", adrenaline: "", adrenalineDoses: "", diagnoses: [], validatedBy: "", validatedAt: ""
      },
      admissionDraft: { text: "", snapshot: null, validated: false, validatedBy: "", validatedAt: "" },
      hosp: {
        respCoverage: "incompleta", sdr: "", surfactantDoses: "", surfactantHours: "", surfactantRoute: "", pneumothorax: "",
        respEvents: [], nutrCoverage: "incompleta", nec: "", nutrEvents: [], iaasCoverage: "incompleta", earlySepsis: "",
        iaasEpisodes: [], catheters: [], transfusions: [],
        cardio: { echo: "", chd: "", dap: "", dapMed: "", dapInvasive: "" },
        neuro: { apnea: "", seizures: "", cranialUs: "", mri: "", hydrocephalus: "", hydroSurgery: "" },
        ropExams: [], surgeries: []
      },
      discharge: {
        date: "", condition: "", destination: "", weightG: "", lengthCm: "", hcCm: "", feeding: "", homeO2: "",
        screenFei: "", screenOea: "", screenOximetry: "", screenRedReflex: "", vaccines: "",
        diagnoses: [], medications: "", indications: ""
      },
      epicrisisDraft: { text: "", snapshot: null, validated: false, validatedBy: "", validatedAt: "" }
    };
  }

  function createSeedState() {
    const patients = [
      {
        id: "NEO-2026-000001",
        hc: "HC-88410",
        fullName: "Alma Ríos",
        motherName: "Sofía Ríos",
        motherDni: "34.812.904",
        sex: "F",
        birthDate: "2026-07-28",
        birthTime: "04:15",
        admitDate: "2026-07-28",
        dischargeDate: "2026-11-17",
        sector: "Pre-alta",
        status: "egresado",
        gaWeeks: 24,
        gaDays: 2,
        birthWeight: 640,
        birthLength: 31.5,
        birthHc: 22.0,
        admission: {
          origin: "Intramuros",
          obstetrician: "Dr. M. Salgado",
          tempC: 36.4,
          baseExcess: -7.2,
          maternalAge: 31,
          parity: "Multipara",
          parityDetail: "G3 P2 (1 cesárea previa)",
          antenatalSteroids: "Completo (2 dosis betametasona)",
          mgso4: "Sí",
          diabetes: "No",
          diabetesType: "",
          diabetesTx: "",
          hba1c: "",
          rpo: "Sí",
          rpoHours: 26,
          chorio: "Sospecha clínica",
          gbs: "Desconocido",
          maternalAbx: "Ampicilina >= 4 h",
          maternalMaxTemp: 37.8,
          examStatus: "Enfermedad clínica",
          apgar1: 4,
          apgar5: 7,
          resuscitation: "Sí",
          vppi: "Sí",
          intubation: "Sí",
          chestCompressions: "No",
          maxO2Delivery: 60,
          adrenaline: "No",
          adrenalineDoses: "",
          diagnoses: ["P07.0", "P07.2", "P22.0"],
          validatedBy: "Dra. Elena Torres",
          validatedAt: "2026-07-28 06:40"
        },
        admissionDraft: {
          text: "",
          snapshot: null,
          validated: true,
          validatedBy: "Dra. Elena Torres",
          validatedAt: "2026-07-28 06:40"
        },
        hosp: {
          respCoverage: "completa",
          sdr: "Sí",
          surfactantDoses: 3,
          surfactantHours: 1,
          surfactantRoute: "TET",
          pneumothorax: "No",
          respEvents: [
            { id: "r1", day: 0, date: "2026-07-28", time: "04:40", event: "Intubación inicial", modality: "VMC", fio2: 60, peep: 6, flow: "" },
            { id: "r2", day: 4, date: "2026-08-01", time: "14:00", event: "Escalamiento", modality: "VAFO", fio2: 55, peep: 11, flow: "" },
            { id: "r3", day: 11, date: "2026-08-08", time: "10:30", event: "Destete a VMC", modality: "VMC", fio2: 40, peep: 6, flow: "" },
            { id: "r4", day: 21, date: "2026-08-18", time: "11:00", event: "Extubación", modality: "NIPPV", fio2: 35, peep: 6, flow: "" },
            { id: "r5", day: 40, date: "2026-09-06", time: "09:00", event: "Destete a CPAP", modality: "CPAP", fio2: 30, peep: 5, flow: "" },
            { id: "r6", day: 62, date: "2026-09-28", time: "10:00", event: "Paso a cánula", modality: "CN", fio2: 28, peep: "", flow: 2.5 },
            { id: "r7", day: 96, date: "2026-11-01", time: "12:00", event: "O2 bajo flujo", modality: "O2", fio2: 25, peep: "", flow: 0.5 }
          ],
          nutrCoverage: "completa",
          nec: "Sí",
          nutrEvents: [
            { id: "n1", day: 0, date: "2026-07-28", route: "Parenteral", event: "Inicio NPT + AA", detail: "AA 2.5 g/kg/d" },
            { id: "n2", day: 1, date: "2026-07-29", route: "Parenteral", event: "Inicio lípidos", detail: "Lípidos 1.5 g/kg/d" },
            { id: "n3", day: 2, date: "2026-07-30", route: "Enteral", event: "Inicio estímulo enteral", milk: "Leche materna", ccKg: 12, detail: "Calostro 12 cc/kg/d" },
            { id: "n4", day: 14, date: "2026-08-11", route: "Enteral", event: "Suspensión por NEC", milk: "NPO", ccKg: 0, detail: "Ayuno por NEC IIA" },
            { id: "n5", day: 21, date: "2026-08-18", route: "Enteral", event: "Reinicio enteral", milk: "Leche materna", ccKg: 20, detail: "Buena tolerancia" },
            { id: "n6", day: 26, date: "2026-08-23", route: "Enteral", event: "Alcanza 100 cc/kg/d", milk: "Leche materna", ccKg: 100, detail: "Progresión completa" },
            { id: "n7", day: 30, date: "2026-08-27", route: "Enteral", event: "Fortificación leche materna", milk: "Leche materna fortificada", ccKg: 140, detail: "FM 4%" },
            { id: "n8", day: 32, date: "2026-08-29", route: "Parenteral", event: "Suspensión NPT", detail: "Total 32 días NPT" },
            { id: "n9", day: 35, date: "2026-09-01", route: "Suplementos", event: "Inicio hierro + Vit D", detail: "Hierro 3 mg/kg/d · Vit D 400 UI" }
          ],
          iaasCoverage: "completa",
          earlySepsis: "No",
          iaasEpisodes: [
            { id: "i1", day: 12, date: "2026-08-09", syndrome: "Sepsis tardía asociada a catéter", cultureConfirmed: "Sí", focus: "Hemocultivo periférico + catéter", germ: "Staphylococcus epidermidis (SCN)", abx1: "Vancomicina", abx2: "Amikacina", days: 10, catheterRelated: "Sí" },
            { id: "i2", day: 38, date: "2026-09-04", syndrome: "Neumonía asociada a ventilación", cultureConfirmed: "Sí", focus: "Aspirado traqueal", germ: "Klebsiella pneumoniae", abx1: "Meropenem", abx2: "Amikacina", days: 7, catheterRelated: "No" }
          ],
          catheters: [
            { id: "c1", type: "CVU", insertDay: 0, removeDay: 7, site: "Umbilical venoso", reason: "Fin de uso", complication: "Ninguna" },
            { id: "c2", type: "CAU", insertDay: 0, removeDay: 5, site: "Umbilical arterial", reason: "Fin de uso", complication: "Ninguna" },
            { id: "c3", type: "PICC", insertDay: 6, removeDay: 18, site: "MSD basílica", reason: "Sospecha IAAS", complication: "Bacteriemia SCN" },
            { id: "c4", type: "PICC", insertDay: 19, removeDay: 34, site: "MSI cefálica", reason: "Fin de NPT", complication: "Ninguna" }
          ],
          transfusions: [
            { id: "t1", day: 3, component: "Glóbulos rojos desplematizados", indication: "Anemia del prematuro / VMC", mlKg: 15, reaction: "No" },
            { id: "t2", day: 15, component: "Glóbulos rojos desplematizados", indication: "Hto 24% en sepsis", mlKg: 15, reaction: "No" },
            { id: "t3", day: 16, component: "Plaquetas", indication: "Plaquetopenia < 30.000", mlKg: 10, reaction: "No" }
          ],
          cardio: { echo: "Sí", chd: "No", dap: "Sí", dapMed: "Ibuprofeno", dapInvasive: "Quirúrgico" },
          neuro: { apnea: "Sí", seizures: "No", cranialUs: "HIV grado III", mri: "LMPV focal", hydrocephalus: "Sí", hydroSurgery: "Sí" },
          ropExams: [
            { id: "rop1", day: 35, stage: 1, zone: "II", plus: "No", treatment: "Control" },
            { id: "rop2", day: 52, stage: 2, zone: "II", plus: "No", treatment: "Control semanal" },
            { id: "rop3", day: 64, stage: 3, zone: "II", plus: "Sí", treatment: "Fotocoagulación láser" }
          ],
          surgeries: [
            { id: "s1", day: 17, procedure: "Cierre quirúrgico de DAP", outcome: "Sin complicaciones" },
            { id: "s2", day: 19, procedure: "Laparotomía exploradora por NEC", outcome: "Evolución favorable" },
            { id: "s3", day: 72, procedure: "Derivación ventrículo-peritoneal (DVP)", outcome: "Funcionante" }
          ]
        },
        discharge: {
          date: "2026-11-17",
          condition: "Enfermo (crónico estable)",
          destination: "Domicilio con seguimiento",
          weightG: 2680,
          lengthCm: 46.0,
          hcCm: 33.0,
          feeding: "Alimentación mixta",
          homeO2: "Sí",
          screenFei: "Normal",
          screenOea: "Pasa bilateral",
          screenOximetry: "Negativa",
          screenRedReflex: "Presente (post láser)",
          vaccines: "BCG + Hepatitis B aplicadas",
          diagnoses: ["P07.0", "P27.1", "H35.1", "P52.2", "G91.1"],
          medications: "Hierro 3 mg/kg/d · Vitamina D 400 UI/d · O2 domiciliario 0.25 L/min",
          indications: "Control en consultorio de alto riesgo en 7 días. Seguimiento oftalmológico, neurocirugía y neumonología pediátrica."
        },
        epicrisisDraft: {
          text: "",
          snapshot: null,
          validated: true,
          validatedBy: "Dra. Elena Torres",
          validatedAt: "2026-11-17 15:20"
        }
      },
      {
        id: "NEO-2026-000002",
        hc: "HC-91204",
        fullName: "Mateo Cabrera",
        motherName: "Lucía Cabrera",
        motherDni: "36.104.552",
        sex: "M",
        birthDate: "2026-11-18",
        birthTime: "19:30",
        admitDate: "2026-11-18",
        dischargeDate: "",
        sector: "UCIN",
        status: "hospitalizado",
        gaWeeks: 38,
        gaDays: 4,
        birthWeight: 3280,
        birthLength: 49.5,
        birthHc: 34.5,
        admission: {
          origin: "Intramuros",
          obstetrician: "Dra. V. Luna",
          tempC: 36.8,
          baseExcess: -2.1,
          maternalAge: 28,
          parity: "Primípara",
          parityDetail: "",
          antenatalSteroids: "No aplica",
          mgso4: "No",
          diabetes: "No",
          diabetesType: "",
          diabetesTx: "",
          hba1c: "",
          rpo: "Sí",
          rpoHours: 22,
          chorio: "Sí",
          gbs: "Positivo",
          maternalAbx: "Sin antibióticos / < 2 h",
          maternalMaxTemp: 38.6,
          examStatus: "Equívoco",
          apgar1: 7,
          apgar5: 9,
          resuscitation: "Sí",
          vppi: "Sí",
          intubation: "No",
          chestCompressions: "No",
          maxO2Delivery: 30,
          adrenaline: "No",
          adrenalineDoses: "",
          diagnoses: ["P39.9", "P22.1"],
          validatedBy: "Dr. Lucas Benítez",
          validatedAt: "2026-11-18 21:10"
        },
        admissionDraft: { text: "", snapshot: null, validated: true, validatedBy: "Dr. Lucas Benítez", validatedAt: "2026-11-18 21:10" },
        hosp: {
          respCoverage: "completa",
          sdr: "No",
          surfactantDoses: 0,
          surfactantHours: "",
          surfactantRoute: "",
          pneumothorax: "No",
          respEvents: [
            { id: "r21", day: 0, date: "2026-11-18", time: "20:00", event: "Inicio soporte", modality: "CPAP", fio2: 30, peep: 5, flow: "" },
            { id: "r22", day: 2, date: "2026-11-20", time: "09:00", event: "Destete a AA", modality: "AA", fio2: 21, peep: "", flow: "" }
          ],
          nutrCoverage: "completa",
          nec: "No",
          nutrEvents: [
            { id: "n21", day: 0, date: "2026-11-18", route: "Enteral", event: "Inicio lactancia", milk: "Leche materna", ccKg: 40, detail: "Pecho directo + complemento" },
            { id: "n22", day: 2, date: "2026-11-20", route: "Enteral", event: "Alcanza 100 cc/kg/d", milk: "Leche materna", ccKg: 110, detail: "LME exclusiva" }
          ],
          iaasCoverage: "completa",
          earlySepsis: "Sí",
          iaasEpisodes: [
            { id: "i21", day: 0, date: "2026-11-18", syndrome: "Sepsis neonatal precoz", cultureConfirmed: "Sí", focus: "Hemocultivo", germ: "Estreptococo grupo B (S. agalactiae)", abx1: "Ampicilina", abx2: "Gentamicina", days: 7, catheterRelated: "No" }
          ],
          catheters: [],
          transfusions: [],
          cardio: { echo: "No", chd: "No", dap: "No", dapMed: "", dapInvasive: "" },
          neuro: { apnea: "No", seizures: "No", cranialUs: "No realizada", mri: "No realizada", hydrocephalus: "No", hydroSurgery: "No" },
          ropExams: [],
          surgeries: []
        },
        discharge: { date: "", condition: "", destination: "", weightG: "", lengthCm: "", hcCm: "", feeding: "", homeO2: "No", screenFei: "Pendiente", screenOea: "Pendiente", screenOximetry: "Negativa", screenRedReflex: "Presente", vaccines: "Hepatitis B aplicada", diagnoses: [], medications: "", indications: "" },
        epicrisisDraft: { text: "", snapshot: null, validated: false, validatedBy: "", validatedAt: "" }
      },
      {
        id: "NEO-2026-000003",
        hc: "HC-90512",
        fullName: "Sofía Benítez",
        motherName: "Camila Benítez",
        motherDni: "38.490.118",
        sex: "F",
        birthDate: "2026-11-03",
        birthTime: "11:05",
        admitDate: "2026-11-03",
        dischargeDate: "",
        sector: "UCIN",
        status: "hospitalizado",
        gaWeeks: 29,
        gaDays: 1,
        birthWeight: 1180,
        birthLength: 37.0,
        birthHc: 26.2,
        admission: {
          origin: "Intramuros",
          obstetrician: "Dr. M. Salgado",
          tempC: 36.2,
          baseExcess: -4.5,
          maternalAge: 26,
          parity: "Primípara",
          parityDetail: "",
          antenatalSteroids: "Incompleto (1 dosis)",
          mgso4: "Sí",
          diabetes: "Sí",
          diabetesType: "Gestacional",
          diabetesTx: "Insulina",
          hba1c: "6.4%",
          rpo: "No",
          rpoHours: "",
          chorio: "",
          gbs: "Negativo",
          maternalAbx: "No requerido",
          maternalMaxTemp: 36.8,
          examStatus: "Enfermedad clínica",
          apgar1: 6,
          apgar5: 8,
          resuscitation: "Sí",
          vppi: "Sí",
          intubation: "No",
          chestCompressions: "No",
          maxO2Delivery: 40,
          adrenaline: "No",
          adrenalineDoses: "",
          diagnoses: ["P07.1", "P07.3", "P22.0"],
          validatedBy: "Dra. Elena Torres",
          validatedAt: "2026-11-03 13:20"
        },
        admissionDraft: { text: "", snapshot: null, validated: true, validatedBy: "Dra. Elena Torres", validatedAt: "2026-11-03 13:20" },
        hosp: {
          respCoverage: "incompleta",
          sdr: "Sí",
          surfactantDoses: 1,
          surfactantHours: 2,
          surfactantRoute: "LISA / MIST",
          pneumothorax: "No",
          respEvents: [
            { id: "r31", day: 0, date: "2026-11-03", time: "11:20", event: "Inicio CPAP", modality: "CPAP", fio2: 40, peep: 6, flow: "" },
            { id: "r32", day: 8, date: "2026-11-11", time: "10:00", event: "Paso a CNAF", modality: "CNAF", fio2: 28, peep: "", flow: 4 }
          ],
          nutrCoverage: "incompleta",
          nec: "No",
          nutrEvents: [
            { id: "n31", day: 0, date: "2026-11-03", route: "Parenteral", event: "Inicio NPT", detail: "AA + lípidos" },
            { id: "n32", day: 1, date: "2026-11-04", route: "Enteral", event: "Inicio estímulo enteral", milk: "Leche materna", ccKg: 15, detail: "Calostro" }
          ],
          iaasCoverage: "incompleta",
          earlySepsis: "No",
          iaasEpisodes: [],
          catheters: [
            { id: "c31", type: "PICC", insertDay: 1, removeDay: 14, site: "MSD", reason: "Fin de NPT", complication: "Ninguna" }
          ],
          transfusions: [],
          cardio: { echo: "Sí", chd: "No", dap: "Sí", dapMed: "Paracetamol", dapInvasive: "No" },
          neuro: { apnea: "Sí", seizures: "No", cranialUs: "HIV grado I", mri: "No realizada", hydrocephalus: "No", hydroSurgery: "No" },
          ropExams: [],
          surgeries: []
        },
        discharge: { date: "", condition: "", destination: "", weightG: "", lengthCm: "", hcCm: "", feeding: "", homeO2: "No", screenFei: "Normal", screenOea: "Pendiente", screenOximetry: "Pendiente", screenRedReflex: "Pendiente", vaccines: "Pendiente", diagnoses: [], medications: "", indications: "" },
        epicrisisDraft: { text: "", snapshot: null, validated: false, validatedBy: "", validatedAt: "" }
      },
      {
        id: "NEO-2026-000004",
        hc: "HC-91355",
        fullName: "Lucas Pereyra",
        motherName: "Marina Pereyra",
        motherDni: "35.612.880",
        sex: "M",
        birthDate: "2026-11-22",
        birthTime: "08:40",
        admitDate: "2026-11-22",
        dischargeDate: "",
        sector: "Intermedios",
        status: "ingreso_incompleto",
        gaWeeks: 35,
        gaDays: 6,
        birthWeight: 2410,
        birthLength: 46.5,
        birthHc: 32.5,
        admission: {
          origin: "Intramuros",
          obstetrician: "Dra. V. Luna",
          tempC: 36.5,
          baseExcess: "",
          maternalAge: "",
          parity: "Primípara",
          parityDetail: "",
          antenatalSteroids: "No",
          mgso4: "No",
          diabetes: "Sí",
          diabetesType: "Gestacional",
          diabetesTx: "Dieta",
          hba1c: "5.8%",
          rpo: "No",
          rpoHours: "",
          chorio: "",
          gbs: "Desconocido",
          maternalAbx: "Sin antibióticos / < 2 h",
          maternalMaxTemp: 37.1,
          examStatus: "Buen aspecto",
          apgar1: 8,
          apgar5: 9,
          resuscitation: "No",
          vppi: "",
          intubation: "",
          chestCompressions: "",
          maxO2Delivery: "",
          adrenaline: "",
          adrenalineDoses: "",
          diagnoses: ["P07.3", "P70.4"],
          validatedBy: "",
          validatedAt: ""
        },
        admissionDraft: { text: "", snapshot: null, validated: false, validatedBy: "", validatedAt: "" },
        hosp: {
          respCoverage: "incompleta",
          sdr: "No",
          surfactantDoses: 0,
          surfactantHours: "",
          surfactantRoute: "",
          pneumothorax: "No",
          respEvents: [],
          nutrCoverage: "incompleta",
          nec: "No",
          nutrEvents: [],
          iaasCoverage: "incompleta",
          earlySepsis: "No",
          iaasEpisodes: [],
          catheters: [],
          transfusions: [],
          cardio: { echo: "No", chd: "No", dap: "No", dapMed: "", dapInvasive: "" },
          neuro: { apnea: "No", seizures: "No", cranialUs: "No realizada", mri: "No realizada", hydrocephalus: "No", hydroSurgery: "No" },
          ropExams: [],
          surgeries: []
        },
        discharge: { date: "", condition: "", destination: "", weightG: "", lengthCm: "", hcCm: "", feeding: "", homeO2: "No", screenFei: "Pendiente", screenOea: "Pendiente", screenOximetry: "Pendiente", screenRedReflex: "Pendiente", vaccines: "Pendiente", diagnoses: [], medications: "", indications: "" },
        epicrisisDraft: { text: "", snapshot: null, validated: false, validatedBy: "", validatedAt: "" }
      },
      {
        id: "NEO-2026-000005",
        hc: "HC-89040",
        fullName: "Valentina Morales",
        motherName: "Julieta Morales",
        motherDni: "33.901.200",
        sex: "F",
        birthDate: "2026-08-25",
        birthTime: "15:10",
        admitDate: "2026-08-25",
        dischargeDate: "2026-11-07",
        sector: "Pre-alta",
        status: "egresado",
        gaWeeks: 27,
        gaDays: 4,
        birthWeight: 920,
        birthLength: 35.0,
        birthHc: 24.5,
        admission: {
          origin: "Intramuros",
          obstetrician: "Dr. M. Salgado",
          tempC: 36.6,
          baseExcess: -3.2,
          maternalAge: 33,
          parity: "Primípara",
          parityDetail: "",
          antenatalSteroids: "Completo (2 dosis betametasona)",
          mgso4: "Sí",
          diabetes: "No",
          diabetesType: "",
          diabetesTx: "",
          hba1c: "",
          rpo: "No",
          rpoHours: "",
          chorio: "",
          gbs: "Negativo",
          maternalAbx: "No requerido",
          maternalMaxTemp: 36.7,
          examStatus: "Enfermedad clínica",
          apgar1: 6,
          apgar5: 8,
          resuscitation: "Sí",
          vppi: "Sí",
          intubation: "No",
          chestCompressions: "No",
          maxO2Delivery: 35,
          adrenaline: "No",
          adrenalineDoses: "",
          diagnoses: ["P07.0", "P07.2", "P22.0"],
          validatedBy: "Dra. Elena Torres",
          validatedAt: "2026-08-25 17:00"
        },
        admissionDraft: { text: "", snapshot: null, validated: true, validatedBy: "Dra. Elena Torres", validatedAt: "2026-08-25 17:00" },
        hosp: {
          respCoverage: "completa",
          sdr: "Sí",
          surfactantDoses: 1,
          surfactantHours: 2,
          surfactantRoute: "LISA / MIST",
          pneumothorax: "No",
          respEvents: [
            { id: "r51", day: 0, date: "2026-08-25", time: "15:25", event: "Inicio CPAP", modality: "CPAP", fio2: 35, peep: 6, flow: "" },
            { id: "r52", day: 20, date: "2026-09-14", time: "10:00", event: "Destete a CN", modality: "CN", fio2: 26, peep: "", flow: 1.0 },
            { id: "r53", day: 64, date: "2026-10-28", time: "10:00", event: "Retiro O2", modality: "AA", fio2: 21, peep: "", flow: "" }
          ],
          nutrCoverage: "completa",
          nec: "No",
          nutrEvents: [
            { id: "n51", day: 0, date: "2026-08-25", route: "Parenteral", event: "Inicio NPT", detail: "AA + lípidos" },
            { id: "n52", day: 1, date: "2026-08-26", route: "Enteral", event: "Inicio estímulo enteral", milk: "Leche materna", ccKg: 15, detail: "Calostro" },
            { id: "n53", day: 12, date: "2026-09-06", route: "Enteral", event: "Alcanza 100 cc/kg/d", milk: "Leche materna", ccKg: 105, detail: "Buena tolerancia" },
            { id: "n54", day: 14, date: "2026-09-08", route: "Enteral", event: "Fortificación", milk: "Leche materna fortificada", ccKg: 140, detail: "FM" },
            { id: "n55", day: 15, date: "2026-09-09", route: "Parenteral", event: "Suspensión NPT", detail: "15 días NPT" }
          ],
          iaasCoverage: "completa",
          earlySepsis: "No",
          iaasEpisodes: [],
          catheters: [
            { id: "c51", type: "PICC", insertDay: 1, removeDay: 15, site: "MSD", reason: "Fin de NPT", complication: "Ninguna" }
          ],
          transfusions: [],
          cardio: { echo: "Sí", chd: "No", dap: "No", dapMed: "", dapInvasive: "" },
          neuro: { apnea: "Sí", seizures: "No", cranialUs: "Normal", mri: "Normal", hydrocephalus: "No", hydroSurgery: "No" },
          ropExams: [
            { id: "rop51", day: 35, stage: 1, zone: "III", plus: "No", treatment: "Regresión espontánea" }
          ],
          surgeries: []
        },
        discharge: { date: "2026-11-07", condition: "Sano / Estable", destination: "Domicilio", weightG: 2340, lengthCm: 45.0, hcCm: 32.0, feeding: "Lactancia materna exclusiva", homeO2: "No", screenFei: "Normal", screenOea: "Pasa bilateral", screenOximetry: "Negativa", screenRedReflex: "Presente", vaccines: "BCG + Hepatitis B aplicadas", diagnoses: ["P07.0", "P27.1"], medications: "Hierro + Vitamina D", indications: "Control pediátrico y seguimiento de prematuros en 7 días." },
        epicrisisDraft: { text: "", snapshot: null, validated: true, validatedBy: "Dra. Elena Torres", validatedAt: "2026-11-07 14:10" }
      },
      {
        id: "NEO-2026-000006",
        hc: "HC-90218",
        fullName: "Thiago Fernández",
        motherName: "Belén Fernández",
        motherDni: "37.220.415",
        sex: "M",
        birthDate: "2026-10-25",
        birthTime: "22:50",
        admitDate: "2026-10-25",
        dischargeDate: "",
        sector: "Intermedios",
        status: "hospitalizado",
        gaWeeks: 31,
        gaDays: 2,
        birthWeight: 1490,
        birthLength: 40.5,
        birthHc: 28.5,
        admission: {
          origin: "Derivado (Hospital Regional)",
          obstetrician: "No consignado",
          tempC: 36.1,
          baseExcess: -3.0,
          maternalAge: 29,
          parity: "Multipara",
          parityDetail: "G2 P1",
          antenatalSteroids: "Completo (2 dosis betametasona)",
          mgso4: "Sí",
          diabetes: "No",
          diabetesType: "",
          diabetesTx: "",
          hba1c: "",
          rpo: "No",
          rpoHours: "",
          chorio: "",
          gbs: "Negativo",
          maternalAbx: "No requerido",
          maternalMaxTemp: 36.6,
          examStatus: "Buen aspecto",
          apgar1: 7,
          apgar5: 9,
          resuscitation: "No",
          vppi: "",
          intubation: "",
          chestCompressions: "",
          maxO2Delivery: "",
          adrenaline: "",
          adrenalineDoses: "",
          diagnoses: ["P07.1", "P07.3", "Q25.0"],
          validatedBy: "Dra. Elena Torres",
          validatedAt: "2026-10-26 01:05"
        },
        admissionDraft: {
          text: "BORRADOR PREVIO (Temperatura registrada al momento de generar: 36.6 °C — ahora en ficha figura 36.1 °C).",
          snapshot: { tempC: 36.6, birthWeight: 1490, gaWeeks: 31, gaDays: 2, resuscitation: "No", diagnoses: "P07.1,P07.3,Q25.0" },
          validated: false,
          validatedBy: "",
          validatedAt: ""
        },
        hosp: {
          respCoverage: "completa",
          sdr: "No",
          surfactantDoses: 0,
          surfactantHours: "",
          surfactantRoute: "",
          pneumothorax: "No",
          respEvents: [
            { id: "r61", day: 0, date: "2026-10-25", time: "23:15", event: "Inicio CPAP", modality: "CPAP", fio2: 28, peep: 5, flow: "" },
            { id: "r62", day: 5, date: "2026-10-30", time: "10:00", event: "Retiro a AA", modality: "AA", fio2: 21, peep: "", flow: "" }
          ],
          nutrCoverage: "completa",
          nec: "No",
          nutrEvents: [
            { id: "n61", day: 0, date: "2026-10-25", route: "Parenteral", event: "Inicio NPT", detail: "AA" },
            { id: "n62", day: 1, date: "2026-10-26", route: "Enteral", event: "Inicio enteral", milk: "Leche materna", ccKg: 20, detail: "Buena tolerancia" },
            { id: "n63", day: 8, date: "2026-11-02", route: "Enteral", event: "Alcanza 100 cc/kg/d", milk: "Leche materna", ccKg: 110, detail: "Progresión completa" },
            { id: "n64", day: 10, date: "2026-11-04", route: "Parenteral", event: "Suspensión NPT", detail: "10 días NPT" }
          ],
          iaasCoverage: "completa",
          earlySepsis: "No",
          iaasEpisodes: [],
          catheters: [{ id: "c61", type: "PICC", insertDay: 1, removeDay: 10, site: "MSI", reason: "Fin de NPT", complication: "Ninguna" }],
          transfusions: [],
          cardio: { echo: "Sí", chd: "No", dap: "Sí", dapMed: "Ibuprofeno", dapInvasive: "No" },
          neuro: { apnea: "No", seizures: "No", cranialUs: "Normal", mri: "No realizada", hydrocephalus: "No", hydroSurgery: "No" },
          ropExams: [{ id: "rop61", day: 26, stage: 0, zone: "III", plus: "No", treatment: "Sin ROP" }],
          surgeries: []
        },
        discharge: { date: "", condition: "", destination: "", weightG: "", lengthCm: "", hcCm: "", feeding: "", homeO2: "No", screenFei: "Normal", screenOea: "Pasa bilateral", screenOximetry: "Negativa", screenRedReflex: "Presente", vaccines: "Hepatitis B aplicada", diagnoses: [], medications: "", indications: "" },
        epicrisisDraft: { text: "", snapshot: null, validated: false, validatedBy: "", validatedAt: "" }
      },
      {
        id: "NEO-2026-000007",
        hc: "HC-90910",
        fullName: "Emma Acosta",
        motherName: "Florencia Acosta",
        motherDni: "39.115.603",
        sex: "F",
        birthDate: "2026-11-12",
        birthTime: "09:20",
        admitDate: "2026-11-12",
        dischargeDate: "2026-11-17",
        sector: "Pre-alta",
        status: "egresado",
        gaWeeks: 39,
        gaDays: 2,
        birthWeight: 3510,
        birthLength: 50.0,
        birthHc: 35.0,
        admission: {
          origin: "Intramuros",
          obstetrician: "Dra. V. Luna",
          tempC: 36.9,
          baseExcess: -1.0,
          maternalAge: 25,
          parity: "Primípara",
          parityDetail: "",
          antenatalSteroids: "No aplica",
          mgso4: "No",
          diabetes: "No",
          diabetesType: "",
          diabetesTx: "",
          hba1c: "",
          rpo: "No",
          rpoHours: "",
          chorio: "",
          gbs: "Negativo",
          maternalAbx: "No requerido",
          maternalMaxTemp: 36.6,
          examStatus: "Buen aspecto",
          apgar1: 9,
          apgar5: 10,
          resuscitation: "No",
          vppi: "",
          intubation: "",
          chestCompressions: "",
          maxO2Delivery: "",
          adrenaline: "",
          adrenalineDoses: "",
          diagnoses: ["P59.9"],
          validatedBy: "Dr. Lucas Benítez",
          validatedAt: "2026-11-12 11:00"
        },
        admissionDraft: { text: "", snapshot: null, validated: true, validatedBy: "Dr. Lucas Benítez", validatedAt: "2026-11-12 11:00" },
        hosp: {
          respCoverage: "completa",
          sdr: "No",
          surfactantDoses: 0,
          surfactantHours: "",
          surfactantRoute: "",
          pneumothorax: "No",
          respEvents: [{ id: "r71", day: 0, date: "2026-11-12", time: "09:20", event: "Aire ambiente", modality: "AA", fio2: 21, peep: "", flow: "" }],
          nutrCoverage: "completa",
          nec: "No",
          nutrEvents: [{ id: "n71", day: 0, date: "2026-11-12", route: "Enteral", event: "Pecho exclusivo", milk: "Leche materna", ccKg: 100, detail: "LME" }],
          iaasCoverage: "completa",
          earlySepsis: "No",
          iaasEpisodes: [],
          catheters: [],
          transfusions: [],
          cardio: { echo: "No", chd: "No", dap: "No", dapMed: "", dapInvasive: "" },
          neuro: { apnea: "No", seizures: "No", cranialUs: "No realizada", mri: "No realizada", hydrocephalus: "No", hydroSurgery: "No" },
          ropExams: [],
          surgeries: []
        },
        discharge: { date: "2026-11-17", condition: "Sano", destination: "Domicilio", weightG: 3440, lengthCm: 50.2, hcCm: 35.1, feeding: "Lactancia materna exclusiva", homeO2: "No", screenFei: "Normal", screenOea: "Pasa bilateral", screenOximetry: "Negativa", screenRedReflex: "Presente", vaccines: "BCG + Hepatitis B aplicadas", diagnoses: ["P59.9"], medications: "Ninguna", indications: "Control pediátrico habitual a las 48–72 h." },
        epicrisisDraft: { text: "", snapshot: null, validated: true, validatedBy: "Dr. Lucas Benítez", validatedAt: "2026-11-17 12:15" }
      },
      {
        id: "NEO-2026-000008",
        hc: "HC-89701",
        fullName: "Bautista Silva",
        motherName: "Andrea Silva",
        motherDni: "32.488.019",
        sex: "M",
        birthDate: "2026-10-08",
        birthTime: "02:35",
        admitDate: "2026-10-08",
        dischargeDate: "2026-10-17",
        sector: "UCIN",
        status: "fallecido",
        gaWeeks: 25,
        gaDays: 0,
        birthWeight: 690,
        birthLength: 32.0,
        birthHc: 22.4,
        admission: {
          origin: "Derivado (Maternidad Oeste)",
          obstetrician: "No consignado",
          tempC: 35.8,
          baseExcess: -10.5,
          maternalAge: 35,
          parity: "Multipara",
          parityDetail: "G4 P3",
          antenatalSteroids: "No",
          mgso4: "No",
          diabetes: "No",
          diabetesType: "",
          diabetesTx: "",
          hba1c: "",
          rpo: "Sí",
          rpoHours: 36,
          chorio: "Sí",
          gbs: "Desconocido",
          maternalAbx: "Sin antibióticos / < 2 h",
          maternalMaxTemp: 38.4,
          examStatus: "Enfermedad clínica",
          apgar1: 3,
          apgar5: 6,
          resuscitation: "Sí",
          vppi: "Sí",
          intubation: "Sí",
          chestCompressions: "Sí",
          maxO2Delivery: 100,
          adrenaline: "Sí",
          adrenalineDoses: 1,
          diagnoses: ["P07.0", "P07.2", "P22.0", "P52.2"],
          validatedBy: "Dra. Carolina Méndez",
          validatedAt: "2026-10-08 04:15"
        },
        admissionDraft: { text: "", snapshot: null, validated: true, validatedBy: "Dra. Carolina Méndez", validatedAt: "2026-10-08 04:15" },
        hosp: {
          respCoverage: "completa",
          sdr: "Sí",
          surfactantDoses: 2,
          surfactantHours: 1,
          surfactantRoute: "TET",
          pneumothorax: "Sí",
          respEvents: [
            { id: "r81", day: 0, date: "2026-10-08", time: "02:55", event: "Intubación inicial", modality: "VMC", fio2: 90, peep: 6, flow: "" },
            { id: "r82", day: 2, date: "2026-10-10", time: "16:00", event: "Escalamiento VAFO", modality: "VAFO", fio2: 85, peep: 12, flow: "" }
          ],
          nutrCoverage: "completa",
          nec: "No",
          nutrEvents: [
            { id: "n81", day: 0, date: "2026-10-08", route: "Parenteral", event: "Inicio NPT", detail: "AA + dextrosa" }
          ],
          iaasCoverage: "completa",
          earlySepsis: "Sí",
          iaasEpisodes: [
            { id: "i81", day: 1, date: "2026-10-09", syndrome: "Sepsis precoz grave", cultureConfirmed: "Sí", focus: "Hemocultivo", germ: "Escherichia coli", abx1: "Ampicilina", abx2: "Gentamicina", days: 8, catheterRelated: "No" }
          ],
          catheters: [
            { id: "c81", type: "CVU", insertDay: 0, removeDay: 9, site: "Umbilical venoso", reason: "Fallecimiento", complication: "Ninguna" },
            { id: "c82", type: "CAU", insertDay: 0, removeDay: 9, site: "Umbilical arterial", reason: "Fallecimiento", complication: "Ninguna" }
          ],
          transfusions: [
            { id: "t81", day: 2, component: "Glóbulos rojos desplematizados", indication: "Shock séptico", mlKg: 15, reaction: "No" }
          ],
          cardio: { echo: "Sí", chd: "No", dap: "Sí", dapMed: "Ibuprofeno", dapInvasive: "No" },
          neuro: { apnea: "No", seizures: "Sí", cranialUs: "HIV grado IV", mri: "No realizada", hydrocephalus: "No", hydroSurgery: "No" },
          ropExams: [],
          surgeries: []
        },
        discharge: { date: "2026-10-17", condition: "Fallecido", destination: "Obituario", weightG: 710, lengthCm: "", hcCm: "", feeding: "NPO", homeO2: "No", screenFei: "No aplica", screenOea: "No aplica", screenOximetry: "No aplica", screenRedReflex: "No aplica", vaccines: "No aplica", diagnoses: ["P07.0", "P36.4", "P52.2"], medications: "", indications: "Se realizó contención familiar y cierre de historia clínica." },
        epicrisisDraft: { text: "", snapshot: null, validated: true, validatedBy: "Dra. Carolina Méndez", validatedAt: "2026-10-17 18:45" }
      }
    ];

    // Casos guía adaptados + cohorte generada (cohort.js), siempre con los mismos datos ficticios.
    const COHORT = global.NEOSALUD_COHORT;
    if (COHORT) {
      patients.forEach((p) => COHORT.patchSeed(p));
      patients.push(...COHORT.generate(createBlankPatient, patients.length + 1));
    }
    // Datos de demo coherentes: ningún subcampo con valor si su pregunta padre lo deja cerrado.
    const SCH = global.NEOSALUD_SCHEMA;
    if (SCH) patients.forEach((p) => SCH.discardClosedBranches(p));

    const sampleImportBatches = {
      censoSemanal: {
        fileName: "censo_neonatologia_semana47.xlsx",
        uploadedAt: "2026-11-22 10:15",
        rows: [
          {
            rowId: "row-1",
            action: "create",
            hc: "HC-91402",
            fullName: "Olivia Gómez",
            motherName: "Daniela Gómez",
            sex: "F",
            birthDate: "2026-11-21",
            gaWeeks: 36,
            gaDays: 4,
            birthWeight: 2640,
            sector: "Intermedios",
            idCheck: { hc: true, sex: true, birthDate: true, status: "new" },
            warnings: [],
            decision: "pending"
          },
          {
            rowId: "row-2",
            action: "update",
            targetId: "NEO-2026-000004",
            hc: "HC-91355",
            fullName: "Lucas Pereyra",
            motherName: "Marina Pereyra",
            sex: "M",
            birthDate: "2026-11-22",
            gaWeeks: 35,
            gaDays: 6,
            birthWeight: 2410,
            sector: "Intermedios",
            tempC: 36.7,
            maternalAge: 30,
            idCheck: { hc: true, sex: true, birthDate: true, status: "verified" },
            warnings: ["Actualiza Temperatura ingreso (36.5 → 36.7 °C) y Edad materna (Vacío → 30 años)"],
            decision: "pending"
          },
          {
            rowId: "row-3",
            action: "update",
            targetId: "NEO-2026-000002",
            hc: "HC-91204",
            fullName: "Mateo Cabrera",
            motherName: "Lucía Cabrera",
            sex: "F",
            birthDate: "2026-11-18",
            gaWeeks: 38,
            gaDays: 4,
            birthWeight: 3280,
            sector: "UCIN",
            idCheck: { hc: true, sex: false, birthDate: true, status: "blocked" },
            warnings: ["BLOQUEO 3-ID: Sexo en planilla (F) no coincide con ficha activa (M). Importación impedida para evitar cruce de pacientes."],
            decision: "rejected"
          }
        ]
      }
    };

    const auditLog = [
      { ts: "2026-11-22 09:05", user: "Lic. Martín Vera", role: "Jefe de Enfermería", action: "Alta rápida de paciente", target: "NEO-2026-000004 (Lucas Pereyra)", detail: "Creado en estado Ingreso incompleto · Sector Intermedios" },
      { ts: "2026-11-21 18:40", user: "Dra. Elena Torres", role: "Neonatóloga de planta", action: "Edición de ficha de ingreso", target: "NEO-2026-000006 (Thiago Fernández)", detail: "Temperatura ingreso: 36.6 °C → 36.1 °C (borrador marcado desfasado)" },
      { ts: "2026-11-18 21:10", user: "Dr. Lucas Benítez", role: "Médico de guardia", action: "Validación de ingreso", target: "NEO-2026-000002 (Mateo Cabrera)", detail: "Firma registrada · Estado actualizado a Hospitalizado" },
      { ts: "2026-11-17 15:20", user: "Dra. Elena Torres", role: "Neonatóloga de planta", action: "Validación de epicrisis", target: "NEO-2026-000001 (Alma Ríos)", detail: "Epicrisis firmada (112 días de internación) · Estado Egresado" }
    ];

    return {
      version: STATE_VERSION,
      activeRoleId: "planta",
      institutionName: "Clínica Materno-Infantil · Servicio de Neonatología",
      sessionTimeoutMin: 25,
      eosIncidence: 0.5,
      patients,
      sampleImportBatches,
      auditLog
    };
  }

  global.NEOSALUD_DATA = {
    ROLES,
    SECTORS,
    CIE10_CATALOG,
    MICROORGANISMS,
    ANTIBIOTICS,
    RESP_MODALITIES,
    STATE_VERSION,
    createBlankPatient,
    createSeedState
  };
})(window);
