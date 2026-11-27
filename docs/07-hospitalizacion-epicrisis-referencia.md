# Hospitalización y Epicrisis en el sistema de referencia: auditoría campo por campo

- **Fecha:** 2026-11-27 · complementa a [06 · Auditoría del sistema de referencia](./06-auditoria-sistema-referencia.md).
- **Cómo se relevó:** (1) el esquema declarativo de la referencia (secciones, condiciones, campos y listas cerradas), leído del código publicado; (2) su diccionario de variables (255 variables: 171 manuales, 63 calculadas, 17 repetibles); (3) los 10 pacientes demo abiertos uno por uno, con cada desplegable y cada cronología desplegados.
- **Totales:** Hospitalización tiene **43 secciones y 106 campos** más **7 cronologías y 2 tablas seriadas**; Epicrisis y egreso tiene **8 secciones y 22 campos** más la epicrisis generada.

## 1. Cómo funciona una sección en la referencia

- Cada sección es un bloque plegable. Las secciones «hijas» aparecen solo cuando el padre vale «Sí» (o la condición indicada).
- Casi todos los Sí/No son un desplegable de 6 valores: `— Sin responder — · No · Sí · Desconocido · No aplica · No consignado`. En las tablas de abajo se abrevia **SíNo+**.
- Lo marcado **calculado** no se escribe a mano: sale de una cronología. La referencia igual lo muestra como desplegable deshabilitado.
- Los 9 grupos se ven de una vez, uno debajo de otro, sin pestañas ni cabecera de paciente.

## 2. Cronologías y tablas seriadas

Todas comparten una regla de días (D0 … último día de internación) con marcadores por evento; al elegir un marcador se abre su formulario debajo. Arriba muestran contadores y el selector **Cobertura de la cronología**: `Incompleta / aún en registro | Completa hasta el corte clínico` (solo una cronología completa permite inferir «No» y totales definitivos).

| Cronología | Grupo | Campos de cada registro |
| --- | --- | --- |
| **Línea de tiempo respiratoria** | Respiratorio | Fecha · Precisión temporal (Solo fecha / Fecha y hora) · Hora · Evento (No consignado / Inicio de soporte / Escalamiento / Destete / Intubación / Extubación / Reintubación / Cambio programado / Traslado / Otro) · FiO₂ % · Modalidad en mosaico (AA aire ambiente / O₂ libre o halo / CN cánula bajo flujo / CNAF alto flujo / CPAP continuo / NIPPV o CPAP ciclado / BiPAP / VMC / VAFO / ECMO) · Flujo L/min (solo cánulas) · Motivo / observaciones. Resumen: soporte actual o al corte y días-horas de oxígeno, CPAP, VNI, VMC y VAFO. Valida en vivo («Cambio 4 (día 166): falta elegir la modalidad respiratoria · Ir al cambio»). |
| **IAAS** | Infeccioso | Fecha del diagnóstico · Cuadro clínico (Sepsis / Neumonía / Infección urinaria / Infección de herida operatoria / Meningitis / Enterocolitis / Conjuntivitis / Otro) · Confirmada por cultivo (No / Sí / Desconocido) · Foco (Torrente sanguíneo / Asociado a catéter / Respiratorio / Urinario / Piel y partes blandas / SNC / Gastrointestinal / Otro) · Microorganismo (§3) · Antibiótico 1 y 2 (§3) · «otro» de cada uno · Días de tratamiento. |
| **Línea de tiempo nutricional** | Nutrición | Fecha · Hora · Evento (Régimen cero / Inicio, Suspensión y Reinicio de alimentación enteral / Cambio de aporte enteral / Inicio de fortificación / Cambio de tipo de leche / Inicio, Suspensión y Reinicio de nutrición parenteral / Inicio de aminoácidos / Inicio de lípidos / Inicio y Suspensión de suplemento) · Suplemento (Calcio / Fósforo / Fresubin protein / MCT / Zinc / Hierro / Vitamina D) · Motivo. Resumen: días de parenteral, inicio enteral, 100 cc/kg/día y fortificación (en días de vida). |
| **Evaluación nutricional seriada** (tabla) | Nutrición | Filas: 7 días · 14 días · 28 días · 36 semanas de edad corregida · Alta. Columnas: fecha, peso, talla, CC, z de peso, talla y CC (se copian de la calculadora Fenton), leche materna y fórmula cc/kg/día, y **calculadas**: ganancia g/kg/día, g/semana, talla cm/semana, CC cm/semana. |
| **Exámenes quincenales del prematuro** (tabla) | Prematurez | Filas: día 15, 30, 45, 60, 75, 90, 105, 120 (± 4 días; avisa si la muestra cae fuera de la ventana). Columnas: fecha, hematocrito, hemoglobina, reticulocitos, calcio, fósforo, fosfatasas alcalinas, GGT, reabsorción tubular de fósforo, vitamina D, PTH, ferritina, sodio, potasio, cloro, BUN, creatinina, albúmina, bilirrubina total y directa. |
| **Controles de ROP** | Prematurez | Fecha del fondo de ojo · Mayor estadio (Sin ROP / Estadio 1 a 5) · Zona (I / II / III) · Enfermedad plus · Tratamiento (Ninguno / Fotocoagulación láser / Antiangiogénico intravítreo / Cirugía) · Observaciones. |
| **Transfusiones** | Hematología | Fecha · Hemocomponente (Glóbulos rojos / Plaquetas / Plasma fresco congelado / Crioprecipitado / Sangre total (exanguíneo) / Otro) · Motivo (Anemia de la prematurez / Anemia sintomática / Hemorragia aguda / Trombocitopenia / Coagulopatía o sangrado / Hiperbilirrubinemia (exanguíneo) / Perioperatorio / Otro) · Volumen cc/kg y mL · Reacción transfusional · Observaciones. |
| **Catéteres centrales** | Accesos | Tipo (CVU / CAU / Silastic o PICC / CVC / Otro) · Instalación · Retiro · Sitio de inserción · Motivo de retiro · Complicaciones. |
| **Procedimientos quirúrgicos** | Procedimientos | Fecha · Tipo de cirugía · Observaciones. |

## 3. Listas cerradas compartidas

- **Microorganismos (15 + otro):** Staphylococcus coagulasa negativo · S. epidermidis · S. aureus · SAMR · Enterococcus spp. · Streptococcus agalactiae (grupo B) · Escherichia coli · Klebsiella pneumoniae · Enterobacter cloacae · Serratia marcescens · Pseudomonas aeruginosa · Acinetobacter baumannii · Candida albicans · Candida parapsilosis · Listeria monocytogenes · Otro. La misma lista sirve para sepsis precoz y para IAAS.
- **Antibióticos (23 + otro):** ampicilina · penicilina G · cloxacilina · cefadroxilo · gentamicina · amikacina · cefotaxima · ceftriaxona · ceftazidima · cefepime · vancomicina · meropenem · imipenem · piperacilina-tazobactam · clindamicina · metronidazol · linezolid · ciprofloxacino · cotrimoxazol · azitromicina · fluconazol · anfotericina B · aciclovir · otro.
- **Diagnósticos de egreso:** buscador CIE-10 con sinónimos («También registrado como…»), agrupado por categoría; se agregan como chips «código · nombre».

## 4. Qué se abre en cada paciente demo

| Paciente demo | EG · peso | Estado | Ramas abiertas destacadas | Cronologías con datos |
| --- | --- | --- | --- | --- |
| Alma | 24+2 · 640 g | Egresada (enferma, O₂ domiciliario) | Todas: surfactante, DBP y clasificación, ductus → cierre, IAAS y resumen, NEC → cirugía, quincenales, ROP y resumen, eco y RM, hidrocefalia → cirugía, transfusiones, CVU/CAU/PICC, cirugías, O₂ domiciliario, medicamentos, otoemisiones | Resp 7 · IAAS 2 · Nutr 11 · ROP 3 · Transf 3 · Catéteres 4 · Cirugías 3 |
| Bruno | 25+0 · 720 g | Fallecido (día 5) | Surfactante, ductus, sepsis precoz → cultivo → germen, quincenales, transfusiones, CVU/CAU y **Detalle fallecimiento** (sin condición al alta ni tamizajes) | Resp 2 · Nutr 3 · Transf 2 · Catéteres 2 |
| Catalina | 27+3 · 1.080 g | Egresada | Surfactante, DBP, ductus, quincenales, ROP, transfusiones, CVU/PICC, medicamentos, otoemisiones | Resp 6 · Nutr 9 · ROP 3 · Transf 1 · Catéteres 2 |
| Diego | 30+1 · 940 g | Hospitalizado | DBP sin clasificar, quincenales, ROP, CVU; epicrisis vacía | Resp 3 · Nutr 7 · ROP 1 · Catéteres 1 |
| Emilia | 32+4 · 1.680 g | Egresada | DBP, ROP sin controles, medicamentos, otoemisiones | Resp 3 · Nutr 4 |
| Facundo | 34+2 · 2.150 g | Egresado | DBP, sepsis precoz → cultivo, CVU, otoemisiones | Resp 4 · Nutr 6 · Catéteres 1 |
| Gaspar | 36+1 · 3.980 g | Egresado | DBP; sin NPT ni accesos | Resp 2 · Nutr 2 |
| Tomás | 39+1 · 3.420 g | Egresado | Ductus, CVU/CAU/CVC, cirugía, transfusión, medicamentos | Resp 4 · Nutr 7 · Transf 1 · Catéteres 3 · Cirugías 1 |
| Helena | 38+4 · 3.210 g | Egresada | Eco y RM, CVU/CAU, medicamentos, otoemisiones | Resp 4 · Nutr 6 · Catéteres 2 |
| Ignacio | 41+2 · 3.860 g | Hospitalizado | Surfactante, ductus, sepsis precoz, transfusión, CVU/CAU/PICC; epicrisis vacía | Resp 4 · Nutr 5 · Transf 1 · Catéteres 3 |

Lectura: los menores de 32 semanas o de 1.500 g abren **Prematurez** (quincenales y ROP); el fallecido cambia todo el bloque de egreso; los hospitalizados tienen la epicrisis vacía. La maqueta tiene que reproducir esas mismas ramas con sus 30 pacientes.

## 5. Inventario exacto de secciones y campos

**Opciones** copia la lista cerrada tal cual figura en la referencia; **Origen** distingue lo que se escribe a mano de lo calculado.

### 5.1 Hospitalización


#### Grupo «respiratorio»

##### Diagnósticos y complicaciones respiratorias  `hosp-respiratorio`

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Membrana hialina / SDR | coded | SíNo+ | manual |
| Surfactante | coded | SíNo+ | manual |
| Neumotórax | coded | SíNo+ | manual |

##### Resumen respiratorio calculado  `hosp-respiratorio-calculado`
**Resumen calculado** (no se escribe a mano)  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Calidad de la cronología | coded | Completa · Incompleta | calculado |
| Precisión de los totales | coded | Exacta · Dias calendario · No calculable | calculado |
| Recibió oxígeno suplementario | coded | SíNo+ | calculado |
| Días totales con oxígeno | number · dias |  | calculado |
| Recibió CPAP continuo | coded | SíNo+ | calculado |
| Días totales de CPAP | number · dias |  | calculado |
| Recibió VNI / CPAP ciclado | coded | SíNo+ | calculado |
| Días totales de VNI | number · dias |  | calculado |
| Recibió ventilación invasiva | coded | SíNo+ | calculado |
| Días totales de VMC | number · dias |  | calculado |
| Recibió VAFO | coded | SíNo+ | calculado |
| Días totales de VAFO | number · dias |  | calculado |
| FiO2 máxima primeras 24 h | number · % |  | calculado |
| Oxígeno al día 28 | coded · dias | SíNo+ | calculado |
| Oxígeno a las 36 semanas | coded | SíNo+ | calculado |
| VMI a las 36 semanas | coded | SíNo+ | calculado |

##### Detalle surfactante  `hosp-surfactante`
**Se muestra si:** Surfactante = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Numero dosis surfactante | number |  | manual |
| Edad primera dosis | number · horas/dias |  | manual |
| Metodo surfactante | coded | Insure · Lisa/mist · Tet · Otro · Desconocido | manual |

##### Displasia broncopulmonar  `hosp-dbp-evaluacion`
**Se muestra si:** el paciente estuvo internado a las 36 semanas de edad corregida (o nació antes)  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Evaluación de DBP a las 36 semanas — Pregunta si el paciente LLEGÓ a evaluarse a las 36 semanas, no si tuvo displasia.  «Sí» abre la clasificación, y ahí se consigna «sin DBP» cuando no la tuvo. Responder «No» significa que la evaluación no se hizo: el paciente sale del denominador de la tasa y cuenta como deuda de registro, no como caso sano. «No evaluable» es para quien no llegó a las 36 semanas —por egreso o fallecimiento—, y ese sí queda fuera de la población en riesgo. | coded | No · Sí · No evaluable · Desconocido | manual |

##### Clasificación de DBP  `hosp-dbp-clasificacion`
_Las dos calculadas salen de la cronología respiratoria a las 36 semanas_  
**Se muestra si:** Evaluación de DBP a las 36 semanas = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Clasificación DBP de Jensen (calculada) | coded | Sin dbp · Grado 1 canula nasal 2 l min o menos · Grado 2 canula mayor 2 l min o soporte no invasivo · Grado 3 ventilacion mecanica invasiva · No aplica | calculado |
| Clasificación DBP de Bancalari (calculada) | coded | Sin dbp · Leve · Moderada · Grave · No aplica | calculado |
| Clasificación DBP según Jensen — Se propone la calculada desde la cronología. Puede consignar otra con fundamento: ambas quedan guardadas y consta cuál usó el profesional. | coded | Sin dbp · Grado 1 canula nasal 2 l min o menos · Grado 2 canula mayor 2 l min o soporte no invasivo · Grado 3 ventilacion mecanica invasiva · No evaluable | manual |


#### Grupo «cardiovascular»

##### Cardiovascular  `hosp-ductus`

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Ecocardiografia realizada | coded | SíNo+ | manual |
| Cardiopatía congénita | coded | SíNo+ | manual |

##### Resultado ecocardiográfico  `hosp-ductus-resultado`
**Se muestra si:** Ecocardiografia realizada = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Ductus arterioso persistente | coded | SíNo+ | manual |

##### Tratamiento de ductus  `hosp-ductus-tratamiento`
**Se muestra si:** Ductus arterioso persistente = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Tratamiento farmacologico | coded | No · Indometacina · Ibuprofeno · Paracetamol · Otro · Desconocido | manual |
| Se realizó cierre invasivo | coded | SíNo+ | manual |

##### Tipo de cierre de ductus  `hosp-ductus-cierre`
**Se muestra si:** Se realizó cierre invasivo = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Tipo de cierre | coded | Quirurgico · Cateterismo · Desconocido | manual |


#### Grupo «infeccioso»

##### Infeccioso  `hosp-infeccioso`

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Sepsis precoz | coded | SíNo+ | manual |
| IAAS (infección asociada a la atención en salud) — Al marcar «Sí» aparece la cronología de episodios. La sepsis tardía se registra ahí como un episodio cuyo cuadro clínico es sepsis: es una IAAS más, y así deja de pedirse dos veces. | coded | SíNo+ | manual |
| Colonización microbiológica sin infección | coded | SíNo+ | manual |

##### Detalle sepsis precoz  `hosp-sepsis-precoz`
**Se muestra si:** Sepsis precoz = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Cultivo confirmado | coded | SíNo+ | manual |

##### Cultivo de sepsis precoz  `hosp-sepsis-precoz-germen`
**Se muestra si:** Cultivo confirmado = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Microorganismo de la sepsis precoz — Misma lista cerrada que los episodios de IAAS, para que el mismo germen se cuente igual en los dos sitios. Lo que la lista no cubra va en «Otro» con su detalle. | select | Lista cerrada de 15 microorganismos + «Otro» (ver §3) | manual |

##### Microorganismo no listado  `hosp-sepsis-precoz-germen-otro`
**Se muestra si:** sepsis_precoz_microorganismo = otro  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Microorganismo (si es «otro») | text |  | manual |

##### Detalle de colonización microbiológica  `hosp-colonizacion-detalle`
**Se muestra si:** Colonización microbiológica sin infección = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Microorganismo y resistencia | text |  | manual |

##### Resumen inferido de los episodios  `hosp-infeccioso-resumen`
_Sale de la cronología de IAAS; no se escribe a mano_  
**Se muestra si:** IAAS (infección asociada a la atención en salud) = si  
**Resumen calculado** (no se escribe a mano)  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Sepsis tardía | coded | SíNo+ | calculado |
| Sepsis tardía confirmada por cultivo | coded | No · Sí · Desconocido | calculado |
| Microorganismo de la sepsis tardía | text |  | calculado |
| Fecha de la IIH | date |  | calculado |
| Sitio de la IIH | coded | Sangre · Cateter · Pulmonar · Urinario · Piel tejidos blandos · Sitio quirurgico · Otro · Desconocido | calculado |
| Microorganismo de la IIH | text |  | calculado |
| Tratamiento de la IIH | text |  | calculado |
| Infección asociada a catéter | coded | SíNo+ | calculado |


#### Grupo «nutricional»

##### Gastrointestinal / nutricion  `hosp-nec`

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Nutricion parenteral | coded | SíNo+ | manual |
| Enterocolitis necrotizante | coded | SíNo+ | manual |
| Perforacion intestinal espontanea | coded | SíNo+ | manual |

##### Detalle nutricion parenteral  `hosp-npt-detalle`
**Se muestra si:** Nutricion parenteral = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Días totales de NPT | number · dias |  | calculado |

##### Hitos nutricionales calculados  `hosp-nutricion-derivada`
_Salen de la línea de tiempo nutricional; no se escriben a mano_  
**Resumen calculado** (no se escribe a mano)  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Se inició alimentación enteral | coded | No · Sí · Desconocido | calculado |
| Día de inicio de estímulo enteral | number · días de vida |  | calculado |
| Día que logra 100 cc/kg/día enteral | number · días de vida |  | calculado |
| Inicia alimentación con leche materna | coded | SíNo+ | calculado |
| Día de inicio de fortificación | number · días de vida |  | calculado |
| Horas de vida al iniciar aminoácidos | number · horas |  | calculado |
| Día de inicio de lípidos | number · días de vida |  | calculado |
| Día de inicio de fierro | number · días de vida |  | calculado |
| Día de inicio de vitamina D | number · días de vida |  | calculado |
| Día de inicio de zinc | number · días de vida |  | calculado |
| Calidad de la cronología nutricional | coded | Completa · Incompleta | calculado |

##### Alimentación enteral  `hosp-enteral-detalle`
**Se muestra si:** Se inició alimentación enteral = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Día alimentación enteral completa | number |  | manual |

##### Crecimiento y evaluación nutricional  `hosp-crecimiento`

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Peso mínimo | number · g |  | manual |
| Día de vida del peso mínimo | number · días de vida |  | manual |
| Registra evaluación nutricional seriada — Al marcar «Sí» aparece la tabla de controles (7 días, 14 días, 28 días, 36 semanas y alta).  Los z-score se copian de su calculadora de Fenton: la app no los calcula porque los parámetros LMS de la curva postnatal no están publicados. Las velocidades en g/semana y cm/semana sí se derivan solas al exportar. | coded | SíNo+ | manual |

##### Detalle NEC  `hosp-nec-detalle`
**Se muestra si:** Enterocolitis necrotizante = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Cirugía por NEC | coded | SíNo+ | manual |

##### Cirugía por NEC  `hosp-nec-cirugia`
**Se muestra si:** Cirugía por NEC = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Tipo cirugía | coded |  | manual |
| Fecha cirugía | date |  | manual |


#### Grupo «prematurez»

##### Exámenes quincenales del prematuro  `hosp-examenes-prematuro`
_Solo para menores de 32 semanas o de 1.500 g_  
**Se muestra si:** EG al nacer < 32 semanas O peso al nacer < 1.500 g  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Registra los exámenes quincenales del prematuro — Al marcar «Sí» aparece la tabla de controles. Cada control tiene su día esperado (15, 30, 45… días) con un margen de ±4 días. Si la muestra se toma fuera de esa ventana la app lo dice: el dato vale igual, pero no es comparable con el mismo control de otra serie. | coded | SíNo+ | manual |


#### Grupo «nutricional»

##### Vitamina B12 del recién nacido  `hosp-b12`

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Se estudió vitamina B12 del recién nacido — Se estudia sobre todo cuando la madre es vegana o vegetariana estricta. | coded | SíNo+ | manual |

##### Resultado y tratamiento de B12  `hosp-b12-detalle`
**Se muestra si:** Se estudió vitamina B12 del recién nacido = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Vitamina B12 del recién nacido | number · pg/mL |  | manual |
| El recién nacido recibió tratamiento con B12 | coded | SíNo+ | manual |


#### Grupo «accesos»

##### Accesos vasculares  `hosp-accesos`
_Marque los que tuvo; los períodos se registran en la cronología de catéteres_  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Catéter venoso umbilical | coded | SíNo+ | manual |
| Catéter arterial umbilical | coded | SíNo+ | manual |
| Catéter Silastic / PICC | coded | No · Sí · Desconocido | manual |
| Cateter venoso central | coded | SíNo+ | manual |

##### Catéter venoso umbilical  `hosp-cvu-detalle`
_Los días salen de la cronología de catéteres; no se escriben a mano_  
**Se muestra si:** Catéter venoso umbilical = si  
**Resumen calculado** (no se escribe a mano)  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Días de catéter venoso umbilical | number · dias |  | calculado |

##### Catéter arterial umbilical  `hosp-cau-detalle`
**Se muestra si:** Catéter arterial umbilical = si  
**Resumen calculado** (no se escribe a mano)  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Días de catéter arterial umbilical | number · dias |  | calculado |

##### Catéter Silastic / PICC  `hosp-silastic-detalle`
**Se muestra si:** Catéter Silastic / PICC = si  
**Resumen calculado** (no se escribe a mano)  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Días de catéter Silastic / PICC | number · dias |  | calculado |

##### Catéter venoso central  `hosp-cvc-detalle`
**Se muestra si:** Cateter venoso central = si  
**Resumen calculado** (no se escribe a mano)  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Días totales de CVC | number · dias |  | calculado |


#### Grupo «neurologico»

##### Neurológico  `hosp-neuro-oftalmo`

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Apneas | coded | SíNo+ | manual |
| Convulsiones | coded | SíNo+ | manual |

##### Neuroimagen  `hosp-neuroimagen`
_Qué estudio se realizó y el mayor compromiso que mostró_  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Ecografia cerebral realizada | coded | SíNo+ | manual |
| Resonancia magnética cerebral realizada | coded | SíNo+ | manual |

##### Hallazgos de la ecografía cerebral  `hosp-neuroimagen-eco`
**Se muestra si:** Ecografia cerebral realizada = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Mayor compromiso en la ecografía | select | Sin hallazgos · HIV grado I · HIV grado II · HIV grado III · HIV grado IV · Leucomalacia periventricular (LMPV) · Otro hallazgo · Pendiente · Desconocido | manual |

##### Hallazgos de la resonancia cerebral  `hosp-neuroimagen-resonancia`
**Se muestra si:** Resonancia magnética cerebral realizada = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Mayor compromiso en la resonancia | select | (misma lista que la ecografía) | manual |

##### Hidrocefalia posthemorrágica  `hosp-hidrocefalia`
**Se muestra si:** Ecografia cerebral realizada = si O Resonancia magnética cerebral realizada = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Hidrocefalia posthemorrágica | coded | No · Sí · Desconocido | manual |

##### Cirugía por hidrocefalia  `hosp-hidrocefalia-cirugia`
**Se muestra si:** Hidrocefalia posthemorrágica = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Cirugía por hidrocefalia | coded | SíNo+ | manual |


#### Grupo «prematurez»

##### Retinopatía del prematuro  `hosp-rop-screening`
**Se muestra si:** EG al nacer < 32 semanas O peso al nacer < 1.500 g  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Evaluación ROP realizada | coded | SíNo+ | manual |

##### Resumen inferido de los controles de ROP  `hosp-rop-resumen`
_Sale de la serie de fondos de ojo; no se escribe a mano_  
**Se muestra si:** Evaluación ROP realizada = si  
**Resumen calculado** (no se escribe a mano)  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Mayor estadio de la serie | coded | 0 · 1 · 2 · 3 · 4 · 5 · Desconocido | calculado |
| Zona del peor control | coded | I · Ii · Iii · Desconocido | calculado |
| Enfermedad plus | coded | SíNo+ | calculado |
| Resultado del fondo de ojo | coded | Vascularizacion completa · Vascularizacion incompleta sin rop · Rop · Otro · Desconocido | calculado |
| Tratamiento ROP | coded | SíNo+ | calculado |
| Cirugía ROP | coded | SíNo+ | calculado |


#### Grupo «hematologico»

##### Hematología y otras terapias  `hosp-hematologia-terapias`

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Fototerapia | coded | SíNo+ | manual |
| Requirió transfusión | coded | SíNo+ | manual |
| Hipoglicemia | coded | SíNo+ | manual |
| Trombocitopenia significativa | coded | SíNo+ | manual |
| Coombs directo | coded | Negativo · Positivo · Desconocido | manual |

##### Transfusiones  `hosp-transfusiones`
_Sale de la cronología de transfusiones; no se escribe a mano_  
**Se muestra si:** Requirió transfusión = si  
**Resumen calculado** (no se escribe a mano)  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Número de transfusiones | number |  | calculado |


#### Grupo «procedimientos»

##### Procedimientos relevantes  `hosp-procedimientos-relevantes`

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Cirugía durante la hospitalización | coded | SíNo+ | manual |
| ¿Tuvo otros procedimientos relevantes? | coded | SíNo+ | manual |

##### Detalle de procedimientos  `hosp-procedimientos-relevantes-detalle`
**Se muestra si:** ¿Tuvo otros procedimientos relevantes? = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Procedimientos realizados | text |  | manual |

##### Cirugía  `hosp-cirugia`
_Sale de la tabla de procedimientos quirúrgicos; no se escribe a mano_  
**Se muestra si:** Cirugía durante la hospitalización = si  
**Resumen calculado** (no se escribe a mano)  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Número de cirugías | number |  | calculado |


### 5.2 Epicrisis y egreso

##### Datos de egreso  `dis-alta`

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Fecha egreso | date |  | manual |
| Condicion al alta | coded | Sano · Enfermo · Fallecido · Traslado · Desconocido | manual |
| Edad al egreso | number · días |  | manual |

##### Condición al alta  `dis-alta-vivo`
**Se muestra si:** hay condición al alta Y no es «Fallecido»  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Destino | coded | Domicilio · Traslado · Pediatria · Fallecido · Otro · Desconocido | manual |
| Peso egreso | number · g |  | manual |
| Talla egreso | number · cm |  | manual |
| CC egreso | number · cm |  | manual |
| Alimentacion al alta | coded | Materna exclusiva · Mixta · Formula · Npt · No aplica · Desconocido | manual |
| Oxigeno al alta | coded | SíNo+ | manual |

##### Detalle fallecimiento  `dis-fallecido`
**Se muestra si:** Condicion al alta = fallecido  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Edad fallecimiento | number · dias |  | manual |
| Causa fallecimiento | text |  | manual |
| Causa primaria | text |  | manual |
| Lugar muerte | text |  | manual |
| Fallece en sala de partos | coded | SíNo+ | manual |

##### Detalle oxigeno domiciliario  `dis-oxigeno`
**Se muestra si:** Oxigeno al alta = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Oxigeno al alta / exitus | coded | SíNo+ | manual |
| FiO2 36 semanas | number · % |  | calculado |

##### Diagnósticos e indicaciones  `dis-diagnosticos`

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Diagnósticos de egreso | coded |  | manual |
| Indicaciones de egreso | text |  | manual |
| Requiere medicamentos al alta | coded | No · Sí · Desconocido | manual |

##### Medicamentos al alta  `dis-medicamentos`
**Se muestra si:** Requiere medicamentos al alta = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Medicamentos al alta | text |  | manual |

##### Tamizajes de egreso  `dis-tamizajes`
**Se muestra si:** hay condición al alta Y no es «Fallecido»  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Tamizaje auditivo realizado | coded | No · Sí · Pendiente · Desconocido | manual |

##### Emisiones otoacústicas  `dis-eoa`
**Se muestra si:** Tamizaje auditivo realizado = si  

| Campo | Tipo / unidad | Opciones | Origen |
| --- | --- | --- | --- |
| Resultado de otoemisiones acústicas | coded | Pasa ambos oidos · No pasa oido derecho · No pasa oido izquierdo · No pasa ambos oidos · Realizado en otro centro · Pendiente · Desconocido | manual |

## 6. Epicrisis generada (texto)

«Generar epicrisis» arma un borrador con: datos del paciente y de la hospitalización (tabla de 2 columnas) · antecedentes perinatales · motivo y diagnósticos de ingreso · evolución respiratoria (incluye **la secuencia de soporte cambio por cambio con día de vida, hora y FiO₂**, surfactante y DBP) · cardiovascular · infecciosa · nutricional y gastrointestinal · neurológica y oftalmológica · accesos vasculares y otras terapias (catéteres con fechas, transfusiones por tipo, cirugías con fecha) · condición al egreso · diagnósticos de egreso numerados · tratamiento e indicaciones al alta · aviso «Requiere revisión y validación médica».

«Validar epicrisis» exige tener configurado el nombre del profesional; si falta, muestra un texto rojo sin llevar a la configuración. Si el borrador se editó a mano, avisa que no puede comprobar que corresponda a los datos actuales.
