# Feature: Maqueta de validación con el hospital (Argentina)

- **Spec:** #especificacion
- **Design:** #diseno-tecnico
- **Approval:** approved

## Especificacion

La maqueta (`maqueta/`) sirve para que el hospital argentino valide secciones, variables y flujos, usando datos y flujos simulados. Decisiones del usuario (2026-11-24):

- Sin "modo validación" dentro de la maqueta: las devoluciones se toman como notas en la reunión.
- Se muestra el set completo de variables, adaptado a Argentina. Las que no son núcleo llevan la etiqueta «A confirmar».
- La importación se simula en dos modalidades: Excel/CSV y PDF/Word con revisión campo por campo, sin procesar archivos reales.
- Datos demo: unos 30 pacientes ficticios argentinos, conservando los casos guía del guion.
- Se trabaja en la rama `maqueta-validacion`, porque `main` se publica solo en GitHub Pages.

## Diseno tecnico

Se mantiene el stack (HTML/CSS/JS sin dependencias). El motor clínico (`engine.js`) es puro y los datos viven en `data.js`. Ningún valor clínico se completa por defecto: lo no registrado se muestra como «Sin responder». Fechas visibles en dd/mm/aaaa.

## Seguimiento Git (cuando corresponda)

Base `main` · rama `maqueta-validacion` · un commit por corte, probado en el navegador · merge a `main` (publica Pages) sujeto a OK del usuario.

## Tasks

### TASK-001 — La maqueta no inventa datos clínicos
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Acceptance:** Un paciente creado solo con nombre y sexo muestra EG, peso, temperatura y examen como «Sin responder»; Fenton, Kaiser y CRIB II no calculan sin datos; la epicrisis no afirma «No» en campos no registrados; al cerrar la rama de reanimación se descartan todos sus subcampos y queda registrado en la auditoría; las fechas visibles se muestran en dd/mm/aaaa.
- **Evidence:** 2026-11-24 · Prueba en navegador (python http.server :5173). Alta rápida solo con nombre → estado guardado con EG/peso/temperatura/examen/HC/SDR vacíos, selects en «Sin responder», Fenton «Sin datos suficientes». Con EG 39 + peso → Kaiser «No calculable» con 5 faltantes; con EG 28 + 1000 g → CRIB II «No calculable». Reanimación Sí → masaje + O2 → No: ambos descartados, auditoría «Descarte de rama «Reanimación»». Borradores con «Sin responder» y «sin registros». 9 pacientes × 3 vistas + 5 vistas sin errores de consola; sin fechas ISO visibles. Prueba de motor en Node con paciente en blanco (estadísticas → deuda de registro, filtros de EG lo excluyen).
- **Blocker:** none

### TASK-002 — Ficha de ingreso con set completo argentino
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Acceptance:** La ficha incluye identificación (DNI del RN con opción «en trámite», DNI materno, HC, cobertura), datos del parto, embarazo múltiple, serologías maternas (Chagas, VDRL, HIV, Toxoplasmosis, Hepatitis B, EGB), corticoides, MgSO₄, asfixia, sala de partos e incidencia local para Kaiser; los campos no núcleo muestran «A confirmar»; los bloques se pueden colapsar.
- **Evidence:** 2026-11-24 · Navegador (:5173). Ficha declarativa (maqueta/schema.js): 5 secciones colapsables, 59 campos visibles + ramas; identificación (DNI RN con «En trámite», DNI madre, HC, cobertura obra social/prepaga/sin cobertura + SUMAR), parto, múltiple, serologías (VDRL, HIV, Chagas, Toxo, HBsAg, EGB), corticoides, MgSO₄, asfixia, sala de partos; insignia «A confirmar» y contador por sección. Gemelar → corionicidad/orden/discordancia; volver a «No» descarta y audita; VDRL Reactiva → tratamiento, descartado y auditado al volver. Foco conservado tras cambiar un campo; colapso recordado; búsqueda «reanimacion» y «chagas» sin tildes. Kaiser muestra la incidencia local (0,5/1.000, A confirmar). Rol Dirección: 63 controles deshabilitados. 9 pacientes × 3 vistas sin errores. Móvil 375 px: 9 vistas sin desborde (corregido .grid-2 que se estiraba a 654 px).
- **Blocker:** none

### TASK-003 — Hospitalización y egreso completos
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Acceptance:** Se registran por separado sepsis precoz y tardía, peso mínimo, perforación intestinal, cirugía por NEC, cánula de bajo y alto flujo, y suplementos; el egreso incluye datos de fallecimiento, pesquisa neonatal y auditiva estructuradas, y vacunas BCG y Hepatitis B.
- **Evidence:** 2026-11-24 · Navegador (:5173). Esquema extendido a 129 campos (scope h/d, claves con punto). Pestañas de Hospitalización con secciones editables: respiratorio (SDR, surfactante, neumotórax), digestivo (NEC + Bell + cirugía, perforación, peso mínimo, hierro/vit D/zinc, quincenales «A confirmar»), infeccioso (sepsis precoz con confirmación, ramas Chagas/sífilis/HIV/HBV que dependen de la serología materna), cardio (DAP con tratamiento) y neuro. Resumen respiratorio con cánula de bajo y alto flujo por separado; FiO₂ máx 24 h solo día 0. Egreso: Fallecido abre causa/lugar/autopsia y descarta (con auditoría) peso, pesquisas y vacunas; pesquisas FEI/OEA/oximetría/reflejo rojo y BCG/HBV estructuradas; borrador imprime BCG y HBV. Valores de demo anteriores se muestran como «(valor cargado)». 9 pacientes × vistas y pestañas sin errores.
- **Blocker:** none

### TASK-004 — Borradores, Excel de 7 hojas y tasas
- **State:** DONE
- **Depends on:** TASK-002, TASK-003
- **Owner:** orchestrator
- **Acceptance:** La epicrisis incluye antecedentes perinatales, motivo de ingreso, tratamiento al alta y fallecimiento; el ingreso muestra la tabla perinatal a dos columnas; la vista previa del Excel tiene 7 hojas, entre ellas «Cómo leer los valores» y «Tasas de morbilidad»; las estadísticas separan sepsis precoz y tardía.
- **Evidence:** 2026-11-24 · Node + navegador (:5173). Borrador de ingreso con tabla perinatal a dos columnas generada del esquema (núcleo vacío = «Sin responder»; «A confirmar» solo si tiene dato), anamnesis sin frases vacías, decimales con coma e indicaciones derivadas de serologías reactivas (Chagas → micrométodo). Epicrisis con 12 secciones de la referencia (datos, antecedentes, motivo de ingreso, 6 sistemas, egreso o fallecimiento, diagnósticos, tratamiento). Desfasaje sobre las 75/63 variables del esquema: Chagas en ingreso firmado → banner «no refleja… Chagas (Sin responder → Reactiva)»; enmienda + regenerar → sin desfasaje. Excel 7 hojas (incluye «Cómo leer los valores», «Tasas de morbilidad», diccionario con 137 variables: 104 núcleo, 25 a confirmar, 8 derivadas) y diccionario descargable en CSV. Estadísticas: sepsis precoz 2/8 y tardía 1/6 por separado. Corregido: tras «Reiniciar maqueta» los documentos firmados quedaban sin texto ni snapshot. Sin errores en 9 pacientes × vistas y 7 hojas.
- **Blocker:** none

### TASK-005 — Datos demo, importación simulada y admin para el cliente
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Acceptance:** Unos 30 pacientes ficticios con ocupación y tasas plausibles, conservando los casos guía; la importación ofrece Excel/CSV y PDF/Word simulados con revisión campo por campo; Admin muestra usuarios, sectores y camas, catálogos y parámetros institucionales, sin infraestructura.
- **Evidence:** 2026-11-24 · Node + navegador (:5173). cohort.js: 8 casos guía adaptados + 22 generados con semilla fija → 30 pacientes, 19 internados (70 % de 27 camas: UCIN 7/8, Intermedios 8/10, Pre-alta 3/6, Aislamiento 1/3), 10 egresos y 1 fallecido. Tasas: DBP 2/5 (40 %), ROP 4/9, ROP grave 1/9, HIV 6/16, HIV III–IV 3/16, NEC 2/29, DAP 7/15, sepsis precoz 3/29, tardía 2/25, mortalidad 9,1 %; Fenton 28 AEG / 1 PEG / 1 GEG; 0 subcampos huérfanos. Casos argentinos: sífilis congénita (Aislamiento), Chagas, SUMAR, obras sociales. Importación: pestañas Planilla / Documento; documento simulado con texto resaltado, 17 campos, 4 conflictos, aceptar/rechazar, «aceptar los sin conflicto», confirmación con auditoría y aviso de subcampos que no entran por rama cerrada. Admin sin infraestructura: datos institucionales (Jefatura edita; Planta deshabilitado; incidencia 0,5 → 0,9 cambia Kaiser y queda auditado), sectores y camas, catálogos, perfiles, auditoría. Corregidos: «HIV grado III–IV» contaba cualquier HIV (la regex /III|IV/ coincidía con «HIV»). 30 pacientes × vistas sin errores; móvil 375 px sin desborde.
- **Blocker:** none

### TASK-006 — Guion y guía de demo actualizados
- **State:** DONE
- **Depends on:** TASK-004, TASK-005
- **Owner:** orchestrator
- **Acceptance:** `docs/guia-uso-maqueta.md` y el guion de la maqueta recorren el flujo nuevo e incluyen, para cada pantalla, las preguntas que hay que hacerle al hospital.
- **Evidence:** 2026-11-24 · docs/guia-uso-maqueta.md reescrita: objetivo (4 preguntas), cómo abrir (Pages / servidor local), lectura de etiquetas «A confirmar», qué mostrar y qué preguntar en las 9 secciones, guion de 15 min y límites de la maqueta. Modal «Guion de la reunión» con 6 pasos y 5 preguntas destacadas. Afirmaciones de la guía comprobadas en navegador: Kaiser en Mateo Cabrera, CRIB II 14 en Alma Ríos, DBP calculada en Alma, sífilis congénita en Martina Álvarez (Penicilina 10 días), Chagas en Delfina Herrera con indicación de micrométodo en el borrador. docs/README.md con estado y próximos pasos actualizados.
- **Blocker:** none
