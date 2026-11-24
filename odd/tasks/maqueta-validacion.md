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
- **State:** IN_PROGRESS
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Acceptance:** Se registran por separado sepsis precoz y tardía, peso mínimo, perforación intestinal, cirugía por NEC, cánula de bajo y alto flujo, y suplementos; el egreso incluye datos de fallecimiento, pesquisa neonatal y auditiva estructuradas, y vacunas BCG y Hepatitis B.
- **Evidence:** none
- **Blocker:** none

### TASK-004 — Borradores, Excel de 7 hojas y tasas
- **State:** PLANNED
- **Depends on:** TASK-002, TASK-003
- **Owner:** orchestrator
- **Acceptance:** La epicrisis incluye antecedentes perinatales, motivo de ingreso, tratamiento al alta y fallecimiento; el ingreso muestra la tabla perinatal a dos columnas; la vista previa del Excel tiene 7 hojas, entre ellas «Cómo leer los valores» y «Tasas de morbilidad»; las estadísticas separan sepsis precoz y tardía.
- **Evidence:** none
- **Blocker:** none

### TASK-005 — Datos demo, importación simulada y admin para el cliente
- **State:** PLANNED
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Acceptance:** Unos 30 pacientes ficticios con ocupación y tasas plausibles, conservando los casos guía; la importación ofrece Excel/CSV y PDF/Word simulados con revisión campo por campo; Admin muestra usuarios, sectores y camas, catálogos y parámetros institucionales, sin infraestructura.
- **Evidence:** none
- **Blocker:** none

### TASK-006 — Guion y guía de demo actualizados
- **State:** PLANNED
- **Depends on:** TASK-004, TASK-005
- **Owner:** orchestrator
- **Acceptance:** `docs/guia-uso-maqueta.md` y el guion de la maqueta recorren el flujo nuevo e incluyen, para cada pantalla, las preguntas que hay que hacerle al hospital.
- **Evidence:** none
- **Blocker:** none
