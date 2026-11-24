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
  // «tab» indica en qué pestaña de Hospitalización se muestra cada sección.
  const HOSP_SECTIONS = [
    {
      id: "h-resp", tab: "respiratorio", title: "Datos respiratorios estructurados",
      sub: "Lo que no surge de la línea de tiempo se pregunta una sola vez",
      fields: [
        { key: "sdr", scope: "h", label: "Síndrome de dificultad respiratoria (EMH)", type: "select", core: true, options: YES_NO },
        { key: "surfactantDoses", scope: "h", label: "Dosis de surfactante", type: "number", core: true, min: 0, max: 4, showIf: { key: "sdr", eq: "Sí" } },
        { key: "surfactantRoute", scope: "h", label: "Técnica de administración", type: "select", core: true,
          options: ["INSURE", "LISA / MIST", "Por tubo en ventilación mecánica"], showIf: { key: "sdr", eq: "Sí" } },
        { key: "surfactantHours", scope: "h", label: "Edad a la primera dosis (horas)", type: "number", core: false, min: 0, showIf: { key: "sdr", eq: "Sí" } },
        { key: "pneumothorax", scope: "h", label: "Neumotórax", type: "select", core: true, options: YES_NO },
        { key: "pneumoDrain", scope: "h", label: "Requirió drenaje pleural", type: "select", core: true, options: YES_NO, showIf: { key: "pneumothorax", eq: "Sí" } }
      ]
    },
    {
      id: "h-nutr", tab: "nutricion", title: "Digestivo y crecimiento",
      sub: "Enterocolitis, perforación, peso mínimo y suplementos",
      fields: [
        { key: "nec", scope: "h", label: "Enterocolitis necrotizante (NEC)", type: "select", core: true, options: YES_NO },
        { key: "necStage", scope: "h", label: "Estadio de Bell", type: "select", core: true,
          options: ["I (sospecha)", "II (confirmada)", "III (avanzada)"], showIf: { key: "nec", eq: "Sí" } },
        { key: "necSurgery", scope: "h", label: "Cirugía por NEC", type: "select", core: true, options: YES_NO, showIf: { key: "nec", eq: "Sí" } },
        { key: "sip", scope: "h", label: "Perforación intestinal espontánea", type: "select", core: true, options: YES_NO },
        { key: "minWeight", scope: "h", label: "Peso mínimo (g)", type: "number", core: true, min: 300 },
        { key: "minWeightDay", scope: "h", label: "Día de vida del peso mínimo", type: "number", core: true, min: 0 },
        { key: "ironDay", scope: "h", label: "Día de inicio de hierro", type: "number", core: false, min: 0 },
        { key: "vitDDay", scope: "h", label: "Día de inicio de vitamina D", type: "number", core: false, min: 0 },
        { key: "zincDay", scope: "h", label: "Día de inicio de zinc", type: "number", core: false, min: 0 },
        { key: "biweeklyLabs", scope: "h", label: "Laboratorios quincenales del prematuro (d15 a d120)", type: "select", core: false, options: YES_NO }
      ]
    },
    {
      id: "h-inf", tab: "infeccioso", title: "Sepsis precoz e infecciones de transmisión vertical",
      sub: "Las ramas de Chagas, sífilis, HIV y hepatitis B aparecen solo si la serología materna fue reactiva",
      fields: [
        { key: "earlySepsis", scope: "h", label: "Sepsis precoz (< 72 h)", type: "select", core: true, options: YES_NO },
        { key: "earlySepsisCulture", scope: "h", label: "Confirmación", type: "select", core: true,
          options: ["Hemocultivo positivo", "Sepsis clínica (hemocultivo negativo)"], showIf: { key: "earlySepsis", eq: "Sí" } },
        { key: "earlySepsisGerm", scope: "h", label: "Germen aislado", type: "text", core: true, showIf: { key: "earlySepsisCulture", eq: "Hemocultivo positivo" } },
        { key: "colonization", scope: "h", label: "Colonización sin infección (vigilancia)", type: "select", core: false, options: YES_NO },
        { key: "chagasRn", scope: "h", label: "Chagas congénito: estudio del RN", type: "select", core: true,
          options: ["Micrométodo negativo · serología a los 10 meses", "Micrométodo positivo · en tratamiento", "Pendiente"],
          showIf: { key: "chagas", eq: "Reactiva" } },
        { key: "syphilisRn", scope: "h", label: "Sífilis congénita: conducta con el RN", type: "select", core: true,
          options: ["VDRL del RN no reactiva · seguimiento", "Penicilina 10 días", "Penicilina benzatínica dosis única", "En evaluación"],
          showIf: { key: "vdrl", eq: "Reactiva" } },
        { key: "hivProphylaxis", scope: "h", label: "HIV: profilaxis antirretroviral del RN", type: "select", core: true, options: YES_NO,
          showIf: { key: "hivSerology", eq: "Reactiva" } },
        { key: "hbvProphylaxis", scope: "h", label: "Hepatitis B: gammaglobulina + vacuna en 12 h", type: "select", core: true, options: YES_NO,
          showIf: { key: "hbsag", eq: "Reactiva" } }
      ]
    },
    {
      id: "h-cardio", tab: "otros", title: "Cardiovascular",
      sub: "Ecocardiograma, cardiopatía congénita y ductus",
      fields: [
        { key: "cardio.echo", scope: "h", label: "Ecocardiograma realizado", type: "select", core: true, options: YES_NO },
        { key: "cardio.chd", scope: "h", label: "Cardiopatía congénita", type: "select", core: true, options: YES_NO, showIf: { key: "cardio.echo", eq: "Sí" } },
        { key: "cardio.dap", scope: "h", label: "Ductus arterioso permeable (DAP)", type: "select", core: true, options: YES_NO, showIf: { key: "cardio.echo", eq: "Sí" } },
        { key: "cardio.dapMed", scope: "h", label: "Tratamiento farmacológico del DAP", type: "select", core: true,
          options: ["No", "Ibuprofeno", "Indometacina", "Paracetamol"], showIf: { key: "cardio.dap", eq: "Sí" } },
        { key: "cardio.dapInvasive", scope: "h", label: "Cierre invasivo del DAP", type: "select", core: true,
          options: ["No", "Ligadura quirúrgica", "Cierre percutáneo"], showIf: { key: "cardio.dap", eq: "Sí" } }
      ]
    },
    {
      id: "h-neuro", tab: "otros", title: "Neurológico",
      sub: "Apneas, convulsiones y neuroimágenes",
      fields: [
        { key: "neuro.apnea", scope: "h", label: "Apneas", type: "select", core: true, options: YES_NO },
        { key: "neuro.seizures", scope: "h", label: "Convulsiones", type: "select", core: true, options: YES_NO },
        { key: "neuro.cranialUs", scope: "h", label: "Ecografía cerebral (peor resultado)", type: "select", core: true,
          options: ["Normal", "HIV grado I", "HIV grado II", "HIV grado III", "HIV grado IV", "Leucomalacia periventricular", "No realizada"] },
        { key: "neuro.mri", scope: "h", label: "Resonancia magnética cerebral", type: "select", core: false,
          options: ["Normal", "LMPV focal", "LMPV quística", "Otra lesión", "No realizada"] },
        { key: "neuro.hydrocephalus", scope: "h", label: "Hidrocefalia posthemorrágica", type: "select", core: true, options: YES_NO },
        { key: "neuro.hydroSurgery", scope: "h", label: "Tratamiento de la hidrocefalia", type: "select", core: true,
          options: ["Sin cirugía", "Reservorio", "Derivación ventrículo-peritoneal"], showIf: { key: "neuro.hydrocephalus", eq: "Sí" } }
      ]
    }
  ];

  // Egreso (scope "d" → p.discharge). Si la condición es «Fallecido» se abre la rama de
  // fallecimiento y se ocultan los datos que solo aplican a un egreso vivo.
  const DISCHARGE_SECTIONS = [
    {
      id: "d-egreso", title: "Condición de egreso",
      sub: "Fecha, condición y destino. Cierra la internación al firmar la epicrisis",
      fields: [
        { key: "date", scope: "d", label: "Fecha de egreso", type: "date", core: true },
        { key: "condition", scope: "d", label: "Condición al egreso", type: "select", core: true,
          options: ["Alta a domicilio", "Derivado a otra institución", "Fallecido"] },
        { key: "destination", scope: "d", label: "Institución de destino", type: "text", core: true,
          showIf: { key: "condition", eq: "Derivado a otra institución" } },
        { key: "weightG", scope: "d", label: "Peso al egreso (g)", type: "number", core: true, showIf: { key: "condition", notEq: "Fallecido" } },
        { key: "lengthCm", scope: "d", label: "Talla al egreso (cm)", type: "number", core: true, step: 0.1, showIf: { key: "condition", notEq: "Fallecido" } },
        { key: "hcCm", scope: "d", label: "Perímetro cefálico al egreso (cm)", type: "number", core: true, step: 0.1, showIf: { key: "condition", notEq: "Fallecido" } },
        { key: "feeding", scope: "d", label: "Alimentación al alta", type: "select", core: true,
          options: [["Lactancia materna exclusiva", "Lactancia materna exclusiva (LME)"], "Alimentación mixta", "Fórmula", "Sonda / NPO"],
          showIf: { key: "condition", notEq: "Fallecido" } },
        { key: "homeO2", scope: "d", label: "Oxígeno domiciliario", type: "select", core: true, options: YES_NO, showIf: { key: "condition", notEq: "Fallecido" } },
        { key: "deathCause", scope: "d", label: "Causa básica de muerte (CIE-10)", type: "text", core: true,
          placeholder: "Ej. P07.0 · Peso extremadamente bajo al nacer", showIf: { key: "condition", eq: "Fallecido" } },
        { key: "deathImmediate", scope: "d", label: "Causa inmediata", type: "text", core: false, showIf: { key: "condition", eq: "Fallecido" } },
        { key: "deathPlace", scope: "d", label: "Lugar del fallecimiento", type: "select", core: true,
          options: ["Unidad de neonatología", "Sala de partos", "Quirófano", "Otro sector"], showIf: { key: "condition", eq: "Fallecido" } },
        { key: "autopsy", scope: "d", label: "Autopsia solicitada", type: "select", core: false, options: YES_NO, showIf: { key: "condition", eq: "Fallecido" } }
      ]
    },
    {
      id: "d-pesquisas", title: "Pesquisas y vacunas al alta",
      sub: "Pesquisa neonatal (Ley 26.279), hipoacusia (Ley 25.415), cardiopatías, reflejo rojo y calendario nacional",
      fields: [
        { key: "screenFei", scope: "d", label: "Pesquisa endócrino-metabólica (FEI)", type: "select", core: true,
          options: ["Tomada · resultado normal", "Tomada · resultado alterado (en seguimiento)", "Tomada · sin resultado aún", "No tomada"],
          showIf: { key: "condition", notEq: "Fallecido" } },
        { key: "screenOea", scope: "d", label: "Otoemisiones acústicas (OEA)", type: "select", core: true,
          options: ["Pasa ambos oídos", "No pasa · derivar a ORL", "No realizada"], showIf: { key: "condition", notEq: "Fallecido" } },
        { key: "screenOximetry", scope: "d", label: "Oximetría de pulso pre y posductal", type: "select", core: true,
          options: ["Normal", "Alterada · derivar a cardiología", "No realizada"], showIf: { key: "condition", notEq: "Fallecido" } },
        { key: "screenRedReflex", scope: "d", label: "Reflejo rojo", type: "select", core: true,
          options: ["Normal", "Alterado · derivar a oftalmología", "No realizado"], showIf: { key: "condition", notEq: "Fallecido" } },
        { key: "vacBcg", scope: "d", label: "Vacuna BCG", type: "select", core: true,
          options: ["Aplicada", "Diferida (peso < 2.000 g u otra causa)", "Pendiente"], showIf: { key: "condition", notEq: "Fallecido" } },
        { key: "vacHbv", scope: "d", label: "Vacuna Hepatitis B (primeras 12 h)", type: "select", core: true,
          options: ["Aplicada", "Pendiente"], showIf: { key: "condition", notEq: "Fallecido" } }
      ]
    },
    {
      id: "d-indicaciones", title: "Medicación e indicaciones al alta",
      sub: "Texto libre del equipo tratante",
      fields: [
        { key: "medications", scope: "d", label: "Medicación al alta", type: "textarea", core: true, showIf: { key: "condition", notEq: "Fallecido" } },
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

  global.NEOSALUD_SCHEMA = {
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
