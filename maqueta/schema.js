// Esquema declarativo de la ficha de ingreso (Argentina).
//
// Cada campo declara:
//   key      · nombre del dato
//   scope    · "p" (dato del paciente) o "a" (dato del ingreso, p.admission)
//   type     · select | number | text | date | time
//   core     · true = variable núcleo; false = propuesta «A confirmar» con el servicio
//   showIf   · { key, eq }, { key, in: [...] } o { key, notEq }: el campo solo existe si la respuesta del
//              campo padre coincide. Al cerrarse la rama, su valor se descarta (cero huérfanos).
//   options  · lista de valores o pares [valor, etiqueta]
//
// La maqueta usa este esquema para validar con el hospital qué variables se cargan.
(function (global) {
  const YES_NO = ["Sí", "No"];
  const SEROLOGY = ["No reactiva", "Reactiva", "No realizada"];

  const ADMISSION_SECTIONS = [
    {
      id: "identificacion",
      title: "Identificación y nacimiento",
      sub: "Datos filiatorios del recién nacido y de la madre, fecha y procedencia",
      after: "fenton",
      fields: [
        { key: "hc", scope: "p", label: "N° de historia clínica", type: "text", core: true, mono: true },
        { key: "dniStatus", scope: "a", label: "DNI del recién nacido", type: "select", core: true,
          options: ["Con DNI", "En trámite", "Sin DNI (extranjero / sin documentación)"] },
        { key: "rnDni", scope: "a", label: "N° de DNI del RN", type: "text", core: true, mono: true, showIf: { key: "dniStatus", eq: "Con DNI" } },
        { key: "motherName", scope: "p", label: "Nombre y apellido de la madre", type: "text", core: true },
        { key: "motherDni", scope: "p", label: "DNI de la madre", type: "text", core: true, mono: true },
        { key: "fatherName", scope: "a", label: "Nombre del padre", type: "text", core: false },
        { key: "coverage", scope: "a", label: "Cobertura de salud", type: "select", core: true,
          options: ["Obra social", "Prepaga", "Sin cobertura (sistema público)"] },
        { key: "coverageName", scope: "a", label: "Nombre de la obra social / prepaga", type: "text", core: true,
          showIf: { key: "coverage", in: ["Obra social", "Prepaga"] } },
        { key: "sumar", scope: "a", label: "Inscripto en Programa SUMAR", type: "select", core: false, options: YES_NO,
          showIf: { key: "coverage", eq: "Sin cobertura (sistema público)" } },
        { key: "birthDate", scope: "p", label: "Fecha de nacimiento", type: "date", core: true },
        { key: "birthTime", scope: "p", label: "Hora de nacimiento", type: "time", core: true },
        { key: "admitDate", scope: "p", label: "Fecha de ingreso a la unidad", type: "date", core: true },
        { key: "origin", scope: "a", label: "Procedencia", type: "select", core: true,
          options: ["Intramuros", "Derivado de otra institución", "Nacido en domicilio / en tránsito"] },
        { key: "referralFrom", scope: "a", label: "Institución de origen", type: "text", core: true,
          showIf: { key: "origin", eq: "Derivado de otra institución" } },
        { key: "transport", scope: "a", label: "Traslado", type: "select", core: false,
          options: ["Traslado neonatal en incubadora", "Ambulancia sin incubadora", "Medios propios"],
          showIf: { key: "origin", eq: "Derivado de otra institución" } },
        { key: "idBand", scope: "a", label: "Pulsera de identificación madre-hijo colocada", type: "select", core: false, options: YES_NO },
        { key: "sex", scope: "p", label: "Sexo", type: "select", core: true,
          options: [["F", "Femenino"], ["M", "Masculino"], ["I", "Indeterminado"]] },
        { key: "gaWeeks", scope: "p", label: "EG semanas", type: "number", core: true, min: 22, max: 43 },
        { key: "gaDays", scope: "p", label: "EG días (0–6)", type: "number", core: true, min: 0, max: 6 },
        { key: "gaMethod", scope: "a", label: "Método de estimación de la EG", type: "select", core: false,
          options: ["FUM confiable", "Ecografía precoz (< 20 sem)", "Examen físico (Capurro / Ballard)"] },
        { key: "birthWeight", scope: "p", label: "Peso al nacer (g)", type: "number", core: true, min: 300, max: 6000 },
        { key: "birthLength", scope: "p", label: "Talla (cm)", type: "number", core: true, step: 0.1 },
        { key: "birthHc", scope: "p", label: "Perímetro cefálico (cm)", type: "number", core: true, step: 0.1 },
        { key: "tempC", scope: "a", label: "Temperatura al ingreso (°C)", type: "number", core: true, step: 0.1 },
        { key: "baseExcess", scope: "a", label: "Exceso de base inicial", type: "number", core: true, step: 0.1 }
      ]
    },
    {
      id: "embarazo",
      title: "Embarazo y antecedentes maternos",
      sub: "Controles, embarazo múltiple, maduración pulmonar y patología materna",
      fields: [
        { key: "maternalAge", scope: "a", label: "Edad materna (años)", type: "number", core: true, min: 10, max: 60 },
        { key: "parity", scope: "a", label: "Paridad", type: "select", core: true, options: [["Primípara", "Primípara"], ["Multipara", "Multípara"]] },
        { key: "parityDetail", scope: "a", label: "Fórmula obstétrica (G P C A)", type: "text", core: true, showIf: { key: "parity", eq: "Multipara" },
          placeholder: "Ej. G3 P1 C1 A0" },
        { key: "prenatalCare", scope: "a", label: "Controles prenatales", type: "select", core: true,
          options: ["Controlado (5 o más controles)", "Insuficiente (menos de 5)", "Sin controles"] },
        { key: "multiple", scope: "a", label: "Embarazo múltiple", type: "select", core: true, options: ["No", "Gemelar", "Triple o más"] },
        { key: "chorionicity", scope: "a", label: "Corionicidad", type: "select", core: false,
          options: ["Bicorial biamniótico", "Monocorial biamniótico", "Monocorial monoamniótico"],
          showIf: { key: "multiple", in: ["Gemelar", "Triple o más"] } },
        { key: "birthOrder", scope: "a", label: "Orden de nacimiento", type: "number", core: true, min: 1, max: 6,
          showIf: { key: "multiple", in: ["Gemelar", "Triple o más"] } },
        { key: "weightDiscordance", scope: "a", label: "Discordancia de peso ≥ 20 %", type: "select", core: false, options: YES_NO,
          showIf: { key: "multiple", in: ["Gemelar", "Triple o más"] } },
        { key: "antenatalSteroids", scope: "a", label: "Corticoides antenatales", type: "select", core: true,
          options: [["Completo (2 dosis betametasona)", "Curso completo"], ["Incompleto (1 dosis)", "Curso incompleto"], ["No", "No recibió"], ["No aplica", "No aplica (término)"]] },
        { key: "mgso4", scope: "a", label: "Sulfato de magnesio (neuroprotección)", type: "select", core: true, options: YES_NO },
        { key: "hypertension", scope: "a", label: "Hipertensión en el embarazo", type: "select", core: true,
          options: ["No", "HTA crónica", "HTA gestacional", "Preeclampsia", "Eclampsia / HELLP"] },
        { key: "diabetes", scope: "a", label: "Diabetes materna", type: "select", core: true, options: YES_NO },
        { key: "diabetesType", scope: "a", label: "Tipo de diabetes", type: "select", core: true,
          options: ["Gestacional", "Pre-gestacional tipo 1", "Pre-gestacional tipo 2"], showIf: { key: "diabetes", eq: "Sí" } },
        { key: "diabetesTx", scope: "a", label: "Tratamiento de la diabetes", type: "select", core: true,
          options: ["Dieta", "Insulina", "Metformina"], showIf: { key: "diabetes", eq: "Sí" } },
        { key: "hba1c", scope: "a", label: "HbA1c (%)", type: "number", core: false, step: 0.1, showIf: { key: "diabetes", eq: "Sí" } },
        { key: "substanceUse", scope: "a", label: "Consumo de sustancias en el embarazo", type: "select", core: false,
          options: ["No", "Tabaco", "Alcohol", "Otras sustancias", "Más de una"] },
        { key: "veganDiet", scope: "a", label: "Dieta vegana / vegetariana estricta", type: "select", core: false, options: YES_NO },
        { key: "otherMaternal", scope: "a", label: "Otra patología materna", type: "text", core: false }
      ]
    },
    {
      id: "serologias",
      title: "Serologías y tamizajes maternos",
      sub: "Infecciones de transmisión vertical controladas en el embarazo",
      fields: [
        { key: "vdrl", scope: "a", label: "Sífilis (VDRL)", type: "select", core: true, options: SEROLOGY },
        { key: "syphilisTx", scope: "a", label: "Tratamiento materno de sífilis", type: "select", core: true,
          options: ["Adecuado (penicilina, > 30 días antes del parto)", "Inadecuado o incompleto", "Sin tratamiento"],
          showIf: { key: "vdrl", eq: "Reactiva" } },
        { key: "hivSerology", scope: "a", label: "HIV", type: "select", core: true, options: SEROLOGY },
        { key: "chagas", scope: "a", label: "Chagas", type: "select", core: true, options: SEROLOGY },
        { key: "toxo", scope: "a", label: "Toxoplasmosis", type: "select", core: true,
          options: ["IgG no reactiva (susceptible)", "IgG reactiva (inmune)", "IgM reactiva (sospecha de infección aguda)", "No realizada"] },
        { key: "hbsag", scope: "a", label: "Hepatitis B (HBsAg)", type: "select", core: true, options: SEROLOGY },
        { key: "gbs", scope: "a", label: "Estreptococo grupo B (EGB)", type: "select", core: true, options: ["Negativo", "Positivo", "Desconocido"] }
      ]
    },
    {
      id: "parto",
      title: "Parto y rotura de membranas",
      sub: "Vía de nacimiento, líquido amniótico y datos que usa la calculadora Kaiser",
      fields: [
        { key: "deliveryType", scope: "a", label: "Tipo de parto", type: "select", core: true,
          options: ["Vaginal espontáneo", "Vaginal instrumental (fórceps / vacuum)", "Cesárea programada", "Cesárea de urgencia"] },
        { key: "presentation", scope: "a", label: "Presentación", type: "select", core: true, options: ["Cefálica", "Podálica / pelviana", "Transversa"] },
        { key: "amnioticFluid", scope: "a", label: "Líquido amniótico", type: "select", core: true, options: ["Claro", "Meconial", "Hemático", "Fétido / purulento"] },
        { key: "rpo", scope: "a", label: "Rotura prematura de membranas (RPM)", type: "select", core: true, options: YES_NO },
        { key: "rpoHours", scope: "a", label: "Horas de bolsa rota", type: "number", core: true, min: 0, showIf: { key: "rpo", eq: "Sí" } },
        { key: "chorio", scope: "a", label: "Corioamnionitis", type: "select", core: true,
          options: [["No", "No"], ["Sospecha clínica", "Sospecha clínica"], ["Sí", "Confirmada"]], showIf: { key: "rpo", eq: "Sí" } },
        { key: "maternalMaxTemp", scope: "a", label: "Temperatura materna máxima intraparto (°C)", type: "number", core: true, step: 0.1 },
        { key: "maternalAbx", scope: "a", label: "Antibióticos intraparto", type: "select", core: true,
          options: [["No requerido", "No requerido"], ["Sin antibióticos / < 2 h", "Sin antibióticos o < 2 h"], ["Ampicilina >= 4 h", "Ampicilina ≥ 4 h"], ["Penicilina >= 4 h", "Penicilina ≥ 4 h"]] },
        { key: "cordClamping", scope: "a", label: "Pinzamiento del cordón", type: "select", core: false,
          options: ["Inmediato (< 30 s)", "Tardío (≥ 30–60 s)", "Ordeñe de cordón"] }
      ]
    },
    {
      id: "recepcion",
      title: "Recepción y reanimación",
      sub: "Apgar, maniobras en sala de partos y calculadoras automáticas",
      after: "calculators",
      fields: [
        { key: "apgar1", scope: "a", label: "Apgar 1 min", type: "number", core: true, min: 0, max: 10 },
        { key: "apgar5", scope: "a", label: "Apgar 5 min", type: "number", core: true, min: 0, max: 10 },
        { key: "apgar10", scope: "a", label: "Apgar 10 min", type: "number", core: false, min: 0, max: 10 },
        { key: "resuscitation", scope: "a", label: "¿Requirió reanimación?", type: "select", core: true, options: YES_NO },
        { key: "vppi", scope: "a", label: "VPPI", type: "select", core: true, options: YES_NO, showIf: { key: "resuscitation", eq: "Sí" } },
        { key: "intubation", scope: "a", label: "Intubación endotraqueal", type: "select", core: true, options: YES_NO, showIf: { key: "resuscitation", eq: "Sí" } },
        { key: "chestCompressions", scope: "a", label: "Masaje cardíaco", type: "select", core: true, options: YES_NO, showIf: { key: "resuscitation", eq: "Sí" } },
        { key: "maxO2Delivery", scope: "a", label: "FiO₂ máxima en sala de partos (%)", type: "number", core: true, min: 21, max: 100, showIf: { key: "resuscitation", eq: "Sí" } },
        { key: "adrenaline", scope: "a", label: "Adrenalina", type: "select", core: true, options: YES_NO, showIf: { key: "resuscitation", eq: "Sí" } },
        { key: "adrenalineDoses", scope: "a", label: "Número de dosis de adrenalina", type: "number", core: true, min: 1, max: 10, showIf: { key: "adrenaline", eq: "Sí" } },
        { key: "drCpap", scope: "a", label: "CPAP en sala de partos", type: "select", core: false, options: YES_NO },
        { key: "drSurfactant", scope: "a", label: "Surfactante en sala de partos", type: "select", core: false, options: YES_NO },
        { key: "asphyxia", scope: "a", label: "Asfixia perinatal", type: "select", core: true, options: YES_NO },
        { key: "therapeuticHypothermia", scope: "a", label: "Hipotermia terapéutica", type: "select", core: false, options: YES_NO,
          showIf: { key: "asphyxia", eq: "Sí" } },
        { key: "examStatus", scope: "a", label: "Estado clínico del RN (Kaiser 2024)", type: "select", core: true,
          options: ["Buen aspecto", "Equívoco", "Enfermedad clínica"], onlyWhen: "kaiser" }
      ]
    }
  ];

  // Datos estructurados por sistema durante la internación (scope "h" → p.hosp).
  // Relevado campo por campo de la referencia (docs/07) y adaptado a Argentina.
  //   tab      · pestaña de «Hospitalización y epicrisis» donde se muestra
  //   applies  · contexto clínico en que la sección existe ("lt36": nació antes de las 36 sem;
  //              "preterm": < 32 sem o < 1.500 g). Si no aplica, no se pide.
  //   type "yesno" · botones No / Sí + «otra respuesta» (Desconocido, No aplica, No consignado)
  const GERMS = (global.NEOSALUD_DATA && global.NEOSALUD_DATA.MICROORGANISMS) || [];
  const BRAIN_FINDINGS = ["Sin hallazgos", "HIV grado I", "HIV grado II", "HIV grado III", "HIV grado IV",
    "Leucomalacia periventricular", "Otro hallazgo", "Pendiente"];
  const JENSEN = ["Sin DBP", "Grado 1 · cánula ≤ 2 L/min", "Grado 2 · cánula > 2 L/min o soporte no invasivo",
    "Grado 3 · ventilación mecánica invasiva", "No evaluable"];

  const HOSP_SECTIONS = [
    // ---------- Respiratorio ----------
    {
      id: "h-resp", tab: "respiratorio", title: "Diagnósticos y complicaciones respiratorias",
      sub: "Lo que no surge de la línea de tiempo se pregunta una sola vez",
      fields: [
        { key: "sdr", scope: "h", label: "Membrana hialina / SDR", type: "yesno", core: true },
        { key: "surfactant", scope: "h", label: "Surfactante", type: "yesno", core: true },
        { key: "surfactantDoses", scope: "h", label: "Número de dosis", type: "number", core: true, min: 1, max: 4, showIf: { key: "surfactant", eq: "Sí" } },
        { key: "surfactantHours", scope: "h", label: "Edad a la primera dosis (horas)", type: "number", core: true, min: 0, showIf: { key: "surfactant", eq: "Sí" } },
        { key: "surfactantRoute", scope: "h", label: "Método", type: "select", core: true,
          options: ["INSURE", "LISA / MIST", "Por tubo en ventilación mecánica", "Otro"], showIf: { key: "surfactant", eq: "Sí" } },
        { key: "pneumothorax", scope: "h", label: "Neumotórax", type: "yesno", core: true },
        { key: "pneumoDrain", scope: "h", label: "Requirió drenaje pleural", type: "yesno", core: false, showIf: { key: "pneumothorax", eq: "Sí" } }
      ]
    },
    {
      id: "h-dbp", tab: "respiratorio", applies: "lt36", title: "Displasia broncopulmonar",
      sub: "Si llegó a evaluarse a las 36 semanas. «No evaluable»: egresó o falleció antes",
      fields: [
        { key: "dbpEval36", scope: "h", label: "Evaluación de DBP a las 36 semanas", type: "select", core: true,
          options: ["Sí", "No", "No evaluable", "Desconocido"] },
        { key: "dbpJensenConsigned", scope: "h", label: "Clasificación de Jensen consignada", type: "select", core: true,
          options: JENSEN, showIf: { key: "dbpEval36", eq: "Sí" },
          help: "Se propone la calculada desde la cronología; si consignás otra, quedan las dos" }
      ]
    },

    // ---------- Cardiovascular ----------
    {
      id: "h-cardio", tab: "cardio", title: "Ecocardiograma y ductus",
      sub: "Cada respuesta abre solo lo que corresponde",
      fields: [
        { key: "cardio.echo", scope: "h", label: "Ecocardiograma realizado", type: "yesno", core: true },
        { key: "cardio.chd", scope: "h", label: "Cardiopatía congénita", type: "yesno", core: true },
        { key: "cardio.chdDetail", scope: "h", label: "Cardiopatía (detalle)", type: "text", core: false, showIf: { key: "cardio.chd", eq: "Sí" } },
        { key: "cardio.dap", scope: "h", label: "Ductus arterioso persistente", type: "yesno", core: true, showIf: { key: "cardio.echo", eq: "Sí" } },
        { key: "cardio.dapMed", scope: "h", label: "Tratamiento farmacológico", type: "select", core: true,
          options: ["No", "Ibuprofeno", "Indometacina", "Paracetamol", "Otro"], showIf: { key: "cardio.dap", eq: "Sí" } },
        { key: "cardio.dapInvasive", scope: "h", label: "Cierre invasivo", type: "select", core: true,
          options: ["No", "Ligadura quirúrgica", "Cierre percutáneo (cateterismo)"], showIf: { key: "cardio.dap", eq: "Sí" } }
      ]
    },

    // ---------- Infeccioso ----------
    {
      id: "h-inf", tab: "infeccioso", title: "Sepsis precoz y colonización",
      sub: "El germen sale de la misma lista cerrada que los episodios de IAAS",
      fields: [
        { key: "earlySepsis", scope: "h", label: "Sepsis precoz (< 72 h)", type: "yesno", core: true },
        { key: "earlySepsisCulture", scope: "h", label: "Confirmación", type: "select", core: true,
          options: ["Hemocultivo positivo", "Sepsis clínica (hemocultivo negativo)"], showIf: { key: "earlySepsis", eq: "Sí" } },
        { key: "earlySepsisGerm", scope: "h", label: "Germen aislado", type: "select", core: true, options: GERMS,
          showIf: { key: "earlySepsisCulture", eq: "Hemocultivo positivo" } },
        { key: "earlySepsisGermOther", scope: "h", label: "Germen (si es «otro»)", type: "text", core: true,
          showIf: { key: "earlySepsisGerm", eq: "Otro (detallar)" } },
        { key: "iaas", scope: "h", label: "IAAS (infección asociada a la atención en salud)", type: "yesno", core: true,
          help: "Con «Sí» se registran los episodios abajo; la sepsis tardía es un episodio más" },
        { key: "colonization", scope: "h", label: "Colonización sin infección", type: "yesno", core: false },
        { key: "colonizationDetail", scope: "h", label: "Germen y resistencia", type: "text", core: false, showIf: { key: "colonization", eq: "Sí" } }
      ]
    },
    {
      id: "h-vertical", tab: "infeccioso", title: "Infecciones de transmisión vertical",
      sub: "Aparecen solo si la serología materna del ingreso fue reactiva",
      fields: [
        { key: "chagasRn", scope: "h", label: "Chagas congénito: estudio del RN", type: "select", core: true,
          options: ["Micrométodo negativo · serología a los 10 meses", "Micrométodo positivo · en tratamiento", "Pendiente"],
          showIf: { key: "chagas", eq: "Reactiva" } },
        { key: "syphilisRn", scope: "h", label: "Sífilis congénita: conducta con el RN", type: "select", core: true,
          options: ["VDRL del RN no reactiva · seguimiento", "Penicilina 10 días", "Penicilina benzatínica dosis única", "En evaluación"],
          showIf: { key: "vdrl", eq: "Reactiva" } },
        { key: "hivProphylaxis", scope: "h", label: "HIV: profilaxis antirretroviral del RN", type: "yesno", core: true,
          showIf: { key: "hivSerology", eq: "Reactiva" } },
        { key: "hbvProphylaxis", scope: "h", label: "Hepatitis B: gammaglobulina + vacuna en 12 h", type: "yesno", core: true,
          showIf: { key: "hbsag", eq: "Reactiva" } }
      ]
    },

    // ---------- Nutrición y crecimiento ----------
    {
      id: "h-nutr", tab: "nutricion", title: "Gastrointestinal y nutrición",
      sub: "Parenteral, enterocolitis y perforación",
      fields: [
        { key: "npt", scope: "h", label: "Nutrición parenteral", type: "yesno", core: true },
        { key: "nec", scope: "h", label: "Enterocolitis necrotizante (NEC)", type: "yesno", core: true },
        { key: "necStage", scope: "h", label: "Estadio de Bell", type: "select", core: true,
          options: ["I (sospecha)", "II (confirmada)", "III (avanzada)"], showIf: { key: "nec", eq: "Sí" } },
        { key: "necSurgery", scope: "h", label: "Cirugía por NEC", type: "yesno", core: true, showIf: { key: "nec", eq: "Sí" } },
        { key: "necSurgeryType", scope: "h", label: "Tipo de cirugía", type: "text", core: true, showIf: { key: "necSurgery", eq: "Sí" },
          placeholder: "Ej. Laparotomía con resección e ileostomía" },
        { key: "necSurgeryDate", scope: "h", label: "Fecha de la cirugía", type: "date", core: true, showIf: { key: "necSurgery", eq: "Sí" } },
        { key: "sip", scope: "h", label: "Perforación intestinal espontánea", type: "yesno", core: true }
      ]
    },
    {
      id: "h-growth", tab: "nutricion", title: "Crecimiento",
      sub: "Peso mínimo y controles seriados (7 d, 14 d, 28 d, 36 semanas y alta)",
      fields: [
        { key: "minWeight", scope: "h", label: "Peso mínimo (g)", type: "number", core: true, min: 300 },
        { key: "minWeightDay", scope: "h", label: "Día de vida del peso mínimo", type: "number", core: true, min: 0 },
        { key: "enteralFullDay", scope: "h", label: "Día de alimentación enteral completa", type: "number", core: false, min: 0 },
        { key: "growthSeries", scope: "h", label: "Registra evaluación nutricional seriada", type: "yesno", core: true,
          help: "Los z-score se copian de la calculadora Fenton; las velocidades de crecimiento se calculan solas" }
      ]
    },
    {
      id: "h-b12", tab: "nutricion", title: "Vitamina B12 del recién nacido",
      sub: "Se estudia sobre todo cuando la madre es vegana o vegetariana estricta",
      fields: [
        { key: "b12Study", scope: "h", label: "Se estudió vitamina B12 del RN", type: "yesno", core: false },
        { key: "b12Value", scope: "h", label: "Vitamina B12 del RN (pg/mL)", type: "number", core: false, showIf: { key: "b12Study", eq: "Sí" } },
        { key: "b12Treatment", scope: "h", label: "Recibió tratamiento con B12", type: "yesno", core: false, showIf: { key: "b12Study", eq: "Sí" } }
      ]
    },
    {
      id: "h-suppl", tab: "nutricion", title: "Inicio de suplementos",
      sub: "Día de vida en que empezó cada uno",
      fields: [
        { key: "ironDay", scope: "h", label: "Hierro (día de inicio)", type: "number", core: false, min: 0 },
        { key: "vitDDay", scope: "h", label: "Vitamina D (día de inicio)", type: "number", core: false, min: 0 },
        { key: "zincDay", scope: "h", label: "Zinc (día de inicio)", type: "number", core: false, min: 0 }
      ]
    },

    // ---------- Prematurez ----------
    {
      id: "h-prem-labs", tab: "prematurez", applies: "preterm", title: "Exámenes quincenales del prematuro",
      sub: "Días 15 a 120 (± 4 días): hemograma, metabolismo óseo, función renal, hígado y hierro",
      fields: [
        { key: "biweeklyLabs", scope: "h", label: "Registra los exámenes quincenales", type: "yesno", core: true }
      ]
    },
    {
      id: "h-rop", tab: "prematurez", applies: "preterm", title: "Retinopatía del prematuro",
      sub: "Los controles se cargan abajo; el peor estadio se calcula solo",
      fields: [
        { key: "ropScreening", scope: "h", label: "Evaluación de ROP realizada", type: "yesno", core: true }
      ]
    },

    // ---------- Neurológico ----------
    {
      id: "h-neuro", tab: "neuro", title: "Clínica neurológica",
      sub: "Apneas y convulsiones",
      fields: [
        { key: "neuro.apnea", scope: "h", label: "Apneas", type: "yesno", core: true },
        { key: "neuro.seizures", scope: "h", label: "Convulsiones", type: "yesno", core: true }
      ]
    },
    {
      id: "h-neuroimg", tab: "neuro", title: "Neuroimagen",
      sub: "Qué estudio se hizo y el mayor compromiso que mostró",
      fields: [
        { key: "neuro.usDone", scope: "h", label: "Ecografía cerebral realizada", type: "yesno", core: true },
        { key: "neuro.cranialUs", scope: "h", label: "Mayor compromiso en la ecografía", type: "select", core: true,
          options: BRAIN_FINDINGS, showIf: { key: "neuro.usDone", eq: "Sí" } },
        { key: "neuro.mriDone", scope: "h", label: "Resonancia magnética realizada", type: "yesno", core: false },
        { key: "neuro.mri", scope: "h", label: "Mayor compromiso en la resonancia", type: "select", core: false,
          options: ["Sin hallazgos", "LMPV focal", "LMPV quística", "Hemorragia parenquimatosa", "Otra lesión", "Pendiente"],
          showIf: { key: "neuro.mriDone", eq: "Sí" } },
        { key: "neuro.hydrocephalus", scope: "h", label: "Hidrocefalia posthemorrágica", type: "yesno", core: true,
          showIf: { anyOf: [{ key: "neuro.usDone", eq: "Sí" }, { key: "neuro.mriDone", eq: "Sí" }] } },
        { key: "neuro.hydroSurgery", scope: "h", label: "Tratamiento de la hidrocefalia", type: "select", core: true,
          options: ["Sin cirugía", "Reservorio", "Derivación ventrículo-peritoneal"], showIf: { key: "neuro.hydrocephalus", eq: "Sí" } }
      ]
    },

    // ---------- Hematología ----------
    {
      id: "h-hemato", tab: "hemato", title: "Hematología y otras terapias",
      sub: "Con «Requirió transfusión» se registran los episodios abajo",
      fields: [
        { key: "phototherapy", scope: "h", label: "Fototerapia", type: "yesno", core: true },
        { key: "transfusionNeeded", scope: "h", label: "Requirió transfusión", type: "yesno", core: true },
        { key: "hypoglycemia", scope: "h", label: "Hipoglucemia", type: "yesno", core: true },
        { key: "thrombocytopenia", scope: "h", label: "Trombocitopenia significativa", type: "yesno", core: true },
        { key: "coombs", scope: "h", label: "Coombs directo", type: "select", core: false, options: ["Negativo", "Positivo", "No realizado"] }
      ]
    },

    // ---------- Accesos vasculares ----------
    {
      id: "h-access", tab: "accesos", title: "Accesos vasculares",
      sub: "Marcá los que tuvo; los períodos se registran en la cronología de catéteres",
      fields: [
        { key: "access.cvu", scope: "h", label: "Catéter venoso umbilical", type: "yesno", core: true },
        { key: "access.cau", scope: "h", label: "Catéter arterial umbilical", type: "yesno", core: true },
        { key: "access.picc", scope: "h", label: "Catéter Silastic / PICC", type: "yesno", core: true },
        { key: "access.cvc", scope: "h", label: "Otro catéter venoso central", type: "yesno", core: true }
      ]
    },

    // ---------- Procedimientos ----------
    {
      id: "h-proc", tab: "procedimientos", title: "Procedimientos relevantes",
      sub: "Las cirugías se registran en la tabla de abajo",
      fields: [
        { key: "surgeryDuring", scope: "h", label: "Cirugía durante la internación", type: "yesno", core: true },
        { key: "otherProcedures", scope: "h", label: "Otros procedimientos relevantes", type: "yesno", core: false },
        { key: "otherProceduresDetail", scope: "h", label: "Procedimientos realizados", type: "textarea", core: false,
          showIf: { key: "otherProcedures", eq: "Sí" }, placeholder: "Ej. Fotocoagulación láser, cierre de ileostomía" }
      ]
    }
  ];

  // Egreso (scope "d" → p.discharge). Si la condición es «Fallecido» se abre la rama de
  // fallecimiento y se ocultan los datos que solo aplican a un egreso vivo.
  const ALIVE = { key: "condition", notEq: "Fallecido" };
  const DISCHARGE_SECTIONS = [
    {
      id: "d-egreso", title: "Datos de egreso",
      sub: "Fecha, condición y destino. Cierra la internación al firmar la epicrisis",
      fields: [
        { key: "date", scope: "d", label: "Fecha de egreso", type: "date", core: true },
        { key: "condition", scope: "d", label: "Condición al egreso", type: "select", core: true,
          options: ["Alta a domicilio", "Derivado a otra institución", "Pase a otro servicio (pediatría)", "Fallecido"] },
        { key: "destination", scope: "d", label: "Institución o servicio de destino", type: "text", core: true,
          showIf: { key: "condition", in: ["Derivado a otra institución", "Pase a otro servicio (pediatría)"] } },
        { key: "healthStatus", scope: "d", label: "Estado al egreso", type: "select", core: true,
          options: ["Sano", "Con patología en seguimiento"], showIf: ALIVE }
      ]
    },
    {
      id: "d-vivo", title: "Condición al alta",
      sub: "Antropometría, alimentación y oxígeno al egreso",
      fields: [
        { key: "weightG", scope: "d", label: "Peso al egreso (g)", type: "number", core: true, showIf: ALIVE },
        { key: "lengthCm", scope: "d", label: "Talla al egreso (cm)", type: "number", core: true, step: 0.1, showIf: ALIVE },
        { key: "hcCm", scope: "d", label: "Perímetro cefálico al egreso (cm)", type: "number", core: true, step: 0.1, showIf: ALIVE },
        { key: "feeding", scope: "d", label: "Alimentación al alta", type: "select", core: true,
          options: [["Lactancia materna exclusiva", "Lactancia materna exclusiva (LME)"], "Alimentación mixta", "Fórmula", "Sonda / NPO"],
          showIf: ALIVE },
        { key: "homeO2", scope: "d", label: "Oxígeno domiciliario", type: "yesno", core: true, showIf: ALIVE },
        { key: "homeO2Flow", scope: "d", label: "Flujo de oxígeno al alta (L/min)", type: "number", core: false, step: 0.05,
          showIf: { key: "homeO2", eq: "Sí" } }
      ]
    },
    {
      id: "d-fallecido", title: "Detalle del fallecimiento",
      sub: "Reemplaza a la condición al alta",
      fields: [
        { key: "deathCause", scope: "d", label: "Causa básica de muerte (CIE-10)", type: "text", core: true,
          placeholder: "Ej. P07.0 · Peso extremadamente bajo al nacer", showIf: { key: "condition", eq: "Fallecido" } },
        { key: "deathImmediate", scope: "d", label: "Causa inmediata", type: "text", core: true, showIf: { key: "condition", eq: "Fallecido" } },
        { key: "deathPlace", scope: "d", label: "Lugar del fallecimiento", type: "select", core: true,
          options: ["Unidad de neonatología", "Sala de partos", "Quirófano", "Otro sector"], showIf: { key: "condition", eq: "Fallecido" } },
        { key: "autopsy", scope: "d", label: "Autopsia solicitada", type: "yesno", core: false, showIf: { key: "condition", eq: "Fallecido" } }
      ]
    },
    {
      id: "d-pesquisas", title: "Pesquisas y vacunas al alta",
      sub: "Pesquisa neonatal (Ley 26.279), hipoacusia (Ley 25.415), cardiopatías, reflejo rojo y calendario nacional",
      fields: [
        { key: "screenFei", scope: "d", label: "Pesquisa endócrino-metabólica (FEI)", type: "select", core: true,
          options: ["Tomada · resultado normal", "Tomada · resultado alterado (en seguimiento)", "Tomada · sin resultado aún", "No tomada"],
          showIf: ALIVE },
        { key: "screenOea", scope: "d", label: "Otoemisiones acústicas (OEA)", type: "select", core: true,
          options: ["Pasa ambos oídos", "No pasa oído derecho", "No pasa oído izquierdo", "No pasa ambos oídos · derivar a ORL", "Realizada en otro centro", "No realizada"],
          showIf: ALIVE },
        { key: "screenOximetry", scope: "d", label: "Oximetría de pulso pre y posductal", type: "select", core: true,
          options: ["Normal", "Alterada · derivar a cardiología", "No realizada"], showIf: ALIVE },
        { key: "screenRedReflex", scope: "d", label: "Reflejo rojo", type: "select", core: true,
          options: ["Normal", "Alterado · derivar a oftalmología", "No realizado"], showIf: ALIVE },
        { key: "vacBcg", scope: "d", label: "Vacuna BCG", type: "select", core: true,
          options: ["Aplicada", "Diferida (peso < 2.000 g u otra causa)", "Pendiente"], showIf: ALIVE },
        { key: "vacHbv", scope: "d", label: "Vacuna Hepatitis B (primeras 12 h)", type: "select", core: true,
          options: ["Aplicada", "Pendiente"], showIf: ALIVE }
      ]
    },
    {
      id: "d-indicaciones", title: "Medicación e indicaciones al alta",
      sub: "Texto del equipo tratante",
      fields: [
        { key: "requiresMeds", scope: "d", label: "Requiere medicamentos al alta", type: "yesno", core: true, showIf: ALIVE },
        { key: "medications", scope: "d", label: "Medicación al alta", type: "textarea", core: true, showIf: { key: "requiresMeds", eq: "Sí" } },
        { key: "indications", scope: "d", label: "Indicaciones y controles", type: "textarea", core: true }
      ]
    }
  ];

  const ALL_FIELDS = [...ADMISSION_SECTIONS, ...HOSP_SECTIONS, ...DISCHARGE_SECTIONS]
    .flatMap((s) => s.fields.map((f) => Object.assign({ sectionId: s.id }, f)));
  const FIELD_BY_KEY = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f]));

  function container(p, f) {
    if (f.scope === "p") return p;
    if (f.scope === "h") return p.hosp;
    if (f.scope === "d") return p.discharge;
    return p.admission;
  }

  // Admite claves con punto («cardio.echo» → p.hosp.cardio.echo).
  function readField(p, f) {
    let obj = container(p, f);
    for (const k of f.key.split(".")) {
      if (obj === undefined || obj === null) return "";
      obj = obj[k];
    }
    return obj === undefined || obj === null ? "" : obj;
  }

  function writeField(p, f, v) {
    let obj = container(p, f);
    const parts = f.key.split(".");
    for (const k of parts.slice(0, -1)) {
      if (obj[k] === undefined || obj[k] === null) obj[k] = {};
      obj = obj[k];
    }
    obj[parts[parts.length - 1]] = v;
  }

  function conditionMet(p, f) {
    if (!f.showIf) return true;
    // «anyOf»: la rama se abre si se cumple cualquiera de las condiciones.
    if (f.showIf.anyOf) return f.showIf.anyOf.some((c) => conditionMet(p, { showIf: c }));
    const parent = FIELD_BY_KEY[f.showIf.key];
    if (parent && !conditionMet(p, parent)) return false;
    const v = parent ? readField(p, parent) : "";
    if (f.showIf.notEq !== undefined) return v !== f.showIf.notEq;
    return f.showIf.in ? f.showIf.in.includes(v) : v === f.showIf.eq;
  }

  // Descarta los subcampos de ramas que quedaron cerradas. Devuelve lo descartado
  // (con su valor anterior) para registrarlo en auditoría.
  function discardClosedBranches(p) {
    const discarded = [];
    for (const f of ALL_FIELDS) {
      if (!f.showIf) continue;
      const v = readField(p, f);
      if (v !== "" && !conditionMet(p, f)) {
        discarded.push({ key: f.key, label: f.label, value: v });
        writeField(p, f, "");
      }
    }
    return discarded;
  }

  // Respuestas que no son ni Sí ni No (se ofrecen aparte para no ensuciar el botón principal).
  const YESNO_OTHER = ["Desconocido", "No aplica", "No consignado"];

  global.NEOSALUD_SCHEMA = {
    YESNO_OTHER,
    ADMISSION_SECTIONS,
    HOSP_SECTIONS,
    DISCHARGE_SECTIONS,
    writeField,
    FIELD_BY_KEY,
    readField,
    conditionMet,
    discardClosedBranches
  };
})(window);
