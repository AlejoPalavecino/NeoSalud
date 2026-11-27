# Auditoría del sistema de referencia (Chile) y brecha con la maqueta

- **Fecha:** 2026-11-27
- **Referencia:** https://incomparable-souffle-34f234.netlify.app/ («UCIN DB CSM», base local en el navegador, recorrida con los 10 casos demo que trae el botón «Cargar 10 casos demo»).
- **Maqueta comparada:** `main` @ `26a6c26` (igual a https://alejopalavecino.github.io/NeoSalud/).
- **Pedido del cliente:** incorporar las funcionalidades de la referencia, adaptadas a Argentina, con mejor UX y diseño visual. Prioridad: **Hospitalización** y **Epicrisis**; también se audita el resto.

Leyenda de la brecha: ✅ ya está en la maqueta · 🟡 está parcial o con otro modelo · ❌ falta.

---

## 1. Estructura general de la referencia

| Elemento | Qué hace | Maqueta |
| --- | --- | --- |
| Barra superior | «Cargar 10 casos demo», «Backup» (descarga la base) | ✅ casos ficticios · ❌ backup manual |
| Pestañas | Inicio · Ingreso · Importar documentos · Hospitalización y epicrisis · Estadísticas · Exportación · Configuración | 🟡 la maqueta organiza por paciente (Unidad → historia en 3 pasos) |
| Panel izquierdo fijo | Alta rápida (nombres, apellidos, madre, ficha, fecha, EG, peso, sexo) + buscador + lista paginada de pacientes con estado, EG y peso | ✅ alta rápida desde cuna libre y buscador en Unidad |
| Contexto de paciente | **No muestra** cabecera de paciente en Hospitalización ni Ingreso: solo el resaltado en la lista izquierda | ✅ la maqueta lo resuelve mejor (cabecera + pasos) |
| Versionado | «Guardar versión» por módulo; nunca sobrescribe; lo vigente es la última versión; auditoría | ✅ versiones de borradores y auditoría |
| Bloqueo | «Liberar lock de paciente» (edición concurrente) | 🟡 hay lock de borrador, no se muestra liberar |
| Eliminar paciente | Botón en la ficha de Inicio | ❌ (decisión: ¿se permite borrar o solo anular?) |

**Crítica UX de la referencia** (lo que conviene no copiar):
1. Un solo scroll enorme con 9 sistemas: más de 300 controles en Hospitalización y no se sabe qué paciente se está editando.
2. Cada «Sí/No» es un desplegable de 6 opciones (`— Sin responder — | No | Si | Desconocido | No aplica | No consignado`): 3 clics por dato y mucha lectura.
3. Cronologías con regla de días de 0 a 112 y marcadores minúsculos; el editor del evento aparece abajo, lejos del marcador.
4. Las mismas variables aparecen dos veces (manual y «calculada»), p. ej. DBP de Jensen calculada y DBP de Jensen manual.
5. Etiquetas inconsistentes (mayúsculas en patologías, falta de tildes: «Condicion», «Oxigeno», «dias»).
6. «Validar» falla con un texto rojo pequeño («Configure el nombre del profesional antes de validar») sin llevar a la solución.

---

## 2. Inicio

Saludo con fecha y 4 indicadores: **En la unidad** (hospitalizados · en alta), **Ingresos incompletos**, **Altas pendientes** (epicrisis sin validar), **Registrados** (egresados). Debajo, «Actividad reciente» (últimos 6 pacientes con EG, peso, ficha y estado) y la ficha del seleccionado con versionado, liberar lock y eliminar.

Maqueta: ✅ Unidad cubre «en la unidad» y «para firmar» (equivale a ingresos/altas pendientes). 🟡 no hay «actividad reciente» ni contador de registrados/egresados en la portada.

---

## 3. Ingreso

Acciones: filtrar variables · Guardar versión · Validar ingreso · **Generar borrador**.

### 3.1 Nacimiento e identificación clínica
Fecha y hora de nacimiento, fecha de ingreso, RUT, **Lugar de nacimiento** (`CSM | Otro hospital | Otra clínica`), **Obstetra**, edad al ingreso (días), temperatura de ingreso (°C), EG semanas y días, Sexo (`Masculino | Femenino | Indeterminado | No consignado`), Tipo de parto (`Vaginal | Fórceps | Cesárea | Cesárea urgencia | Desconocido`), Presentación (`Cefálica | Podálica | Otra | Desconocida | No consignada`), Pinzamiento de cordón (`Inmediato | Tardío | Precoz | Desconocido | No consignado`).

Maqueta: ✅ casi todo, adaptado (DNI, cobertura, procedencia, traslado). ❌ **Obstetra**. 🟡 tipo de parto: verificar que distinga cesárea de urgencia y fórceps.

### 3.2 Antropometría de ingreso
Peso, talla y CC al nacer con **z-score y percentil Fenton 2025** de cada uno; clasificación `PEG | AEG | GEG` y texto con P3/P10/P90 para la EG.
Maqueta: ✅ Fenton 2025 y clasificación. 🟡 confirmar z/percentil de talla y CC además del peso.

### 3.3 Antecedentes obstétricos
Edad materna; Previsión (`FONASA | Isapres…` → en Argentina: obra social/prepaga/sin cobertura, ya resuelto); Paridad (`Primípara | Multípara` → **Multípara abre «Número de hijos previos»**); Corticoides prenatales (`2 dosis | 1 dosis | No | …`); **Madre vegana o vegetariana estricta** (Sí abre *Vitamina B12 materna preparto (pg/mL)* y *La madre recibió suplementación de B12*); Neuroprotección con sulfato de magnesio; Profilaxis antibiótica intraparto; Estado SGB; Horas de bolsa rota; Líquido amniótico (`Meconial | Claro | Sanguinolento | …`).

**Patologías obstétricas** (casillas): Sin patología · SHIE · RCIU · Síntomas de parto prematuro · RPO · Infección ovular · Oligoamnios · Polihidroamnios · Metrorragia · Placenta previa · Anemia · ITU · Rh (−) sensibilizada · CIE · Diabetes (gestacional o mellitus) · Fertilización · Antibióticos maternos · Portadora de SGB · Malformación fetal por eco · Distress fetal por eco · Embarazo múltiple · Otros.

Maqueta: ✅ la mayoría y además serologías argentinas (Chagas, VDRL, HIV, HBsAg). ❌ **madre vegana → B12**. 🟡 revisar que la lista de patologías tenga los 22 ítems.

### 3.4 Rotura de membranas e infección ovular
Corioamnionitis **clínica** y **histológica** (por separado). Maqueta: 🟡 una sola «Corioamnionitis».

### 3.5 Transición y reanimación
Apgar 1/5/10; Reanimación (Sí abre **Detalle de reanimación**: oxígeno, CPAP en sala de partos, VPPI, intubación, masaje cardíaco, adrenalina, surfactante en sala de partos); Asfixia perinatal (`Sí | No | Depresión neonatal leve | Depresión neonatal moderada | …`); FiO₂ máxima en sala de partos; Score CRIB II.
Maqueta: ✅ (incluye CRIB II calculado y Kaiser 2024, que la referencia no tiene). 🟡 asfixia con grados de depresión.

### 3.6 Diagnósticos de ingreso
Buscador **CIE-10 con sinónimos** («También registrado como…»), agrupado por categoría (`Infeccioso`, `CIE-10 Perinatal P00-P96`, «Diagnósticos históricos sin equivalencia confirmada · Revisión pendiente»); chips con código + nombre y botón Quitar.
Maqueta: 🟡 CIE-10 presente; ❌ sinónimos y categorías en el buscador.

### 3.7 Borrador de ingreso (generado)
Texto con 5 bloques: **Antecedentes perinatales** (tabla de 2 columnas), **Anamnesis** (narrativa), **Examen físico** (plantilla con «_____» por aparato, sin inventar hallazgos), **Diagnósticos** y **Indicaciones de ingreso** generadas por reglas (16 ítems: sector, monitorización, incubadora, soporte ventilatorio, surfactante, régimen cero, hidratación, NPT, exámenes, riesgo de sepsis por corioamnionitis/RPM, antibióticos empíricos, riesgo de hipoglucemia por peso < 2.000 g, ecografía cerebral, tamizaje de ROP, vitamina K, información a los padres). Cierra con «Requiere revisión y validación médica».
Maqueta: ✅ borrador con examen físico e indicaciones. 🟡 comparar reglas de indicaciones ítem por ítem.

---

## 4. Importar documentos
Selector de archivos + «Extraer datos» sobre el paciente activo. Maqueta: ✅ importación con propuestas resaltadas (sin IA, ADR-001).

---

## 5. Hospitalización (prioridad del cliente)

Acciones: filtrar variables · **Guardar datos acumulados**. Nueve sistemas en una sola página.

### 5.1 Respiratorio
- **Línea de tiempo respiratoria**: resumen arriba (*Soporte actual / al corte*, días de Oxígeno, CPAP, VNI, VMC, VAFO, con días y horas: «≈ 18 d 23 h»); «Cobertura de la cronología» (`Incompleta / aún en registro | Completa hasta el corte clínico`; solo una cronología completa permite inferir «No» y totales definitivos); regla de días D0…Dn con zoom («inicio», «calendario»).
- **Cada cambio**: Fecha · **Precisión temporal** (`Solo fecha | Fecha y hora`) · Hora · **Evento** (`Inicio de soporte | Escalamiento | Destete | Intubación | Extubación | Reintubación | Cambio programado | Traslado | Otro`) · FiO₂ % · **Modalidad en mosaico de 10**: AA aire ambiente, O₂ libre/halo, CN bajo flujo, CNAF alto flujo, CPAP, NIPPV/CPAP ciclado, BiPAP, VMC, VAFO, ECMO · **Flujo (L/min)** para cánulas · Motivo/observaciones.
- **Validación en vivo**: «Cronología incompleta · Cambio 4 (día 166): falta elegir la modalidad respiratoria · Ir al cambio».
- Diagnósticos y complicaciones: Membrana hialina/SDR, Surfactante (Sí abre *Detalle*: nº dosis, edad 1.ª dosis, método `INSURE | LISA/MIST | TET | Otro`), Neumotórax.
- **Displasia broncopulmonar**: evaluación a las 36 sem (`No | Sí | No evaluable`); Jensen y Bancalari **calculadas** desde la cronología + Jensen manual.
- **Resumen respiratorio calculado**: calidad de la cronología, precisión de totales (`Exacta | Días calendario | No calculable`), recibió/días de O₂, CPAP, VNI, VMC, VAFO, FiO₂ máx 24 h, O₂ a los 28 días, O₂ y VMI a las 36 semanas.

Maqueta: ✅ cronología, cobertura, totales, DBP Jensen/Bancalari. ❌ **precisión temporal**, **tipo de evento** (intubación/extubación/reintubación…), **flujo L/min**, **ECMO**, validación «ir al cambio», regla de días visual con zoom, totales con horas.

### 5.2 Cardiovascular
Ecocardiografía, Cardiopatía congénita, DAP → *Tratamiento*: farmacológico (`No | Indometacina | Ibuprofeno | Paracetamol | Otro`), cierre invasivo → tipo (`Quirúrgico | Cateterismo`).
Maqueta: ✅.

### 5.3 Infeccioso
Sepsis precoz, IAAS, Colonización sin infección. **Cronología de episodios IAAS** sobre la regla de días: fecha del diagnóstico · Cuadro (`Sepsis | Neumonía | Infección urinaria | Herida operatoria | Meningitis | Enterocolitis | Conjuntivitis | Otro`) · Confirmada por cultivo · Foco (`Torrente sanguíneo | Asociado a catéter | Respiratorio | Urinario | Piel y partes blandas | SNC | Gastrointestinal | Otro`) · **Microorganismo** (15 + otro: SCN, S. epidermidis, S. aureus, SAMR, Enterococcus, SGB, E. coli, Klebsiella, Enterobacter, Serratia, Pseudomonas, Acinetobacter, C. albicans, C. parapsilosis, Listeria) · **Antibiótico 1 y 2** (23 + otro: ampicilina, penicilina G, cloxacilina, cefadroxilo, gentamicina, amikacina, cefotaxima, ceftriaxona, ceftazidima, cefepime, vancomicina, meropenem, imipenem, piperacilina-tazobactam, clindamicina, metronidazol, linezolid, ciprofloxacino, cotrimoxazol, azitromicina, fluconazol, anfotericina B, aciclovir) · Días de tratamiento.
**Resumen inferido** (no se escribe a mano): sepsis tardía, confirmada, microorganismo, fecha/sitio/germen/tratamiento de la IIH, infección asociada a catéter.
Maqueta: ✅ episodios IAAS y germen/antibiótico. 🟡 verificar catálogos cerrados (15 gérmenes, 23 antibióticos, 2 antibióticos por episodio) y el resumen inferido. ✅ la maqueta suma la rama argentina de transmisión vertical (Chagas, sífilis, HIV, HBV).

### 5.4 Nutrición, crecimiento y digestivo
- **Cronología nutricional** con resumen (días de parenteral, inicio enteral DDV, 100 cc/kg/día DDV, fortificación DDV) y 14 tipos de evento: Régimen cero · Inicio/Suspensión/Reinicio de enteral · Cambio de aporte · Inicio de fortificación · Cambio de tipo de leche · Inicio/Suspensión/Reinicio de NPT · Inicio de aminoácidos · Inicio de lípidos · Inicio/Suspensión de suplemento (`Calcio | Fósforo | Fresubin protein | MCT | Zinc | Hierro | Vitamina D`).
- NPT, NEC (Sí → cirugía → tipo y fecha), perforación intestinal espontánea, días de NPT, día de enteral completa.
- **Evaluación nutricional seriada** (tabla por control: 7 d, 14 d, 28 d, 36 sem EGC, alta): fecha, peso, talla, CC, z de peso/talla/CC, leche materna y fórmula (cc/kg/día) y **calculados**: ganancia g/kg/día, g/semana, talla cm/sem, CC cm/sem.
- Peso mínimo y su día de vida. **Vitamina B12 del RN**.
- **Hitos calculados**: inicio enteral, 100 cc/kg/día, inició con leche materna, fortificación, horas de vida al iniciar aminoácidos, día de lípidos, hierro, vitamina D, zinc, calidad de la cronología.

Maqueta: ✅ cronología en 3 vías y hitos. ❌ **evaluación nutricional seriada con velocidades de crecimiento**, ❌ suspensión/reinicio y régimen cero como eventos, ❌ B12 del RN, 🟡 suplementos (hoy son 3 días sueltos).

### 5.5 Prematurez (< 32 sem o < 1.500 g)
**Exámenes quincenales** en tabla d15 / d30 / d45 / d60 / d75 / d90 / d105 / d120 (± 4 días), 20 analitos: hematocrito, hemoglobina, reticulocitos, calcio, fósforo, fosfatasa alcalina, GGT, reabsorción tubular de fósforo, vitamina D, PTH, ferritina, Na, K, Cl, BUN, creatinina, albúmina, bilirrubina total y directa.
**ROP**: controles (fecha de fondo de ojo, mayor estadio `Sin ROP | 1–5`, zona `I–III`, enfermedad plus, tratamiento `Ninguno | Láser | Antiangiogénico | Cirugía`, observaciones) + resumen inferido (peor estadio, zona del peor control, plus, resultado `Vascularización completa | incompleta sin ROP | ROP | Otro`, tratamiento, cirugía).
Maqueta: ✅ ROP por controles. ❌ **tabla de exámenes quincenales** (hoy es solo una pregunta Sí/No).

### 5.6 Neurológico
Apneas, convulsiones; ecografía y RM realizadas → **mayor compromiso** (`Sin hallazgos | HIV I–IV | LMPV | Otro | Pendiente`); hidrocefalia posthemorrágica → cirugía.
Maqueta: ✅.

### 5.7 Hematología y terapias
Fototerapia, transfusión, **hipoglucemia**, **trombocitopenia significativa**, **Coombs directo**. **Cronología de transfusiones**: fecha · hemocomponente (`Glóbulos rojos | Plaquetas | Plasma fresco | Crioprecipitado | Sangre total (exanguíneo) | Otro`) · motivo (`Anemia de la prematurez | Anemia sintomática | Hemorragia aguda | Trombocitopenia | Coagulopatía | Hiperbilirrubinemia (exanguíneo) | Perioperatorio | Otro`) · volumen cc/kg y mL · reacción transfusional · observaciones. Nº de transfusiones calculado.
Maqueta: ✅ transfusiones. ❌ **fototerapia, hipoglucemia, Coombs**, 🟡 trombocitopenia.

### 5.8 Accesos vasculares
Tuvo CVU / CAU / PICC / CVC; **cronología de catéteres** (tipo, instalación, retiro, sitio, motivo de retiro, complicaciones); días por tipo calculados. Maqueta: ✅.

### 5.9 Procedimientos y cirugía
Cirugía (sí/no), otros procedimientos (texto), tabla de cirugías (fecha, tipo, observaciones), nº de cirugías calculado. Maqueta: ✅.

---

## 6. Epicrisis y egreso (prioridad del cliente)

Acciones: filtrar campos · **Generar epicrisis** · Guardar versión · **Validar epicrisis** (exige profesional configurado).

- **Datos de egreso**: fecha, Condición (`Sano | Enfermo | Fallecido | Traslado | Desconocido`), edad al egreso.
- **Condición al alta** (vivo): Destino (`Domicilio | Traslado | Pediatría | Fallecido | Otro`), peso, talla, CC, Alimentación (`Materna exclusiva | Mixta | Fórmula | NPT`), Oxígeno al alta → *Detalle*: FiO₂ a las 36 sem.
- **Detalle fallecimiento** (si Fallecido, reemplaza a lo anterior): edad, **causa del fallecimiento**, **causa primaria**, lugar, falleció en sala de partos.
- **Diagnósticos de egreso** (CIE-10 con chips), **Indicaciones**, Requiere medicamentos → texto.
- **Tamizajes**: auditivo → otoemisiones (`Pasa ambos | No pasa OD | No pasa OI | No pasa ambos | Otro centro | Pendiente`).
- **Epicrisis generada** (texto): Datos del paciente y hospitalización (tabla) · Antecedentes perinatales · Motivo y diagnósticos de ingreso · **Evolución por sistema** (respiratoria con la secuencia de soporte día a día, cardiovascular, infecciosa, nutricional/GI, neurológica/oftalmológica, accesos y otras terapias con transfusiones y cirugías) · Condición al egreso · Diagnósticos de egreso numerados · Tratamiento e indicaciones. Aviso de procedencia: «texto escrito a mano… no se puede comprobar si corresponde a los datos actuales».

Maqueta: ✅ egreso con rama de fallecido, pesquisas argentinas (FEI, OEA, oximetría, reflejo rojo, BCG, HBV), epicrisis generada y firmada con versiones. 🟡 **evolución respiratoria narrada como secuencia de cambios** (la referencia la redacta evento por evento con FiO₂), 🟡 destino «Pediatría» (pase interno), ❌ condición «Sano/Enfermo» separada del destino, ❌ causa primaria separada de causa del fallecimiento y «falleció en sala de partos».

---

## 7. Estadísticas
Prematuros por EG (`<24 | 24–27+6 | 28–31+6 | 32–36+6`), DBP entre prematuros con «en riesgo sin dato», **morbilidades con denominador de evaluables** (excluye «no aplica» y «sin dato»), DAP (tratamiento médico / cierre quirúrgico), resumen general (registrados, fallecidos, mortalidad sobre desenlaces conocidos), resultados clínicos, soporte acumulado (días de O₂, CPAP, VM).
Maqueta: ✅ estadísticas y tasas de sepsis. 🟡 revisar denominadores «evaluables» y «soporte acumulado».

## 8. Exportación
Base maestra Excel (Metadatos, Base maestra, Diccionario, Resumen estadístico, Errores o faltantes) solo con datos validados · CSV demográfico reducido · JSON completo · Diccionario. Maqueta: ✅ Excel de 7 hojas y diccionario.

## 9. Configuración
Usuario médico, nombre de la clínica, aviso de privacidad (no envía datos afuera; cifrado local pendiente), Guardar, **Crear respaldo ahora**. Maqueta: ✅ Administración; ❌ respaldo manual.

---

## 10. Resumen de la brecha

Prioridad alta (Hospitalización y Epicrisis):
1. Cronología respiratoria: tipo de evento, precisión temporal, flujo L/min, ECMO, validación con «ir al cambio», regla de días visual.
2. Evaluación nutricional seriada con velocidades de crecimiento calculadas.
3. Exámenes quincenales del prematuro en tabla (20 analitos × 8 controles).
4. Hematología: fototerapia, hipoglucemia, Coombs, trombocitopenia.
5. Eventos nutricionales faltantes (régimen cero, suspensión/reinicio de enteral y NPT, suplementos como eventos).
6. Epicrisis: evolución respiratoria narrada como secuencia; condición separada de destino; causa primaria y fallecimiento en sala de partos.

Prioridad media (Ingreso y resto): obstetra, madre vegana → B12, corioamnionitis clínica/histológica, asfixia con grados, CIE-10 con sinónimos, actividad reciente en portada, respaldo manual.

Limitación: el barrido automático de todas las ramas condicionales de Hospitalización no terminó (el navegador frena la pestaña en segundo plano); las ramas se relevaron por los subtítulos que aparecen con cada «Sí» en los casos demo.
