# Feature: Rediseño v2 · Hospitalización y epicrisis, navegación por tareas y estilo hospitalario

- **Spec:** docs/08-plan-rediseno-v2.md
- **Design:** docs/08-plan-rediseno-v2.md#3-hospitalización-y-epicrisis
- **Approval:** approved
- **Approval note:** pedido del usuario 2026-11-27: auditar la referencia, diseñar y arrancar por Hospitalización y epicrisis

## Seguimiento Git

Base `main` · rama `rediseno-hospital-epicrisis` · commit y merge sujetos a OK del usuario.

## Tasks

### TASK-001 — Auditoría completa de la referencia
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Acceptance:** docs/06 y docs/07 listan cada sección, campo, lista cerrada, condición y cronología de Hospitalización y Epicrisis de la referencia, y qué ramas abre cada uno de sus 10 pacientes demo.
- **Evidence:** 2026-11-27 · esquema extraído del código publicado (43 + 8 secciones, 106 + 22 campos, 255 variables de diccionario) y 10 pacientes recorridos en el navegador; docs/07 con 51 secciones de inventario.
- **Blocker:** none

### TASK-002 — Estilo visual «sala cálida» y barra lateral nueva
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Acceptance:** Fondo y superficies crema (sin #fff en fondos de lectura), acento verde azulado, títulos en Lexend y texto en Atkinson Hyperlegible Next, radios 10–18 px. La barra lateral tiene Inicio, Ingreso, Hospitalización y epicrisis, Importar datos, Estadísticas, Exportar, Configuración y Administración (esta solo con permiso de administración). Sin desborde en 375 px.
- **Evidence:** 2026-11-27 · Navegador (:5180). styles.css sin #ffffff (0 apariciones); tokens crema/marfil y acento #0f6b6e; Lexend en títulos. Barra: Inicio, Ingreso, Hospitalización y epicrisis, Importar datos, Estadísticas, Exportar, Configuración; Administración aparece solo con la Jefa de Neonatología. 375 px: scrollWidth 375 y ningún elemento desbordado.
- **Blocker:** none

### TASK-003 — Sección Hospitalización y epicrisis
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** orchestrator
- **Acceptance:** Desde la barra lateral se abre la sección con la lista de pacientes (búsqueda y filtro Internados / Egresados / Todos) y, al elegir uno, su cabecera y las pestañas Resumen, Respiratorio, Cardiovascular, Infeccioso, Nutrición y crecimiento, Prematurez, Neurológico, Hematología, Accesos vasculares, Procedimientos y Epicrisis y egreso. Cada campo de docs/07 §5 (adaptado a Argentina) existe en su pestaña con la misma rama condicional. Los Sí/No se responden con botones segmentados (No · Sí · Otro). Prematurez queda atenuada con su motivo en ≥ 32 sem y ≥ 1.500 g. El fallecido muestra la rama de fallecimiento y oculta condición al alta y pesquisas. La epicrisis lista los faltantes con enlace antes de firmar. Un rol de solo consulta ve todo sin poder editar.
- **Evidence:** 2026-11-27 · Navegador (:5180). 30 pacientes × 11 pestañas sin contenido vacío ni errores de consola. Neumotórax «Sí» abre «Requirió drenaje pleural», «No» la cierra y el foco queda en el botón. Fallecido (Bautista Silva): egreso muestra solo fecha, condición, causas, lugar, autopsia e indicaciones. Término 41+0: Prematurez «No aplica» con motivo. Dirección (solo consulta): 6/6 Sí/No deshabilitados, sin «Agregar cambio» ni «Nuevo ingreso». Inicio, Ingreso, Importar, Estadísticas, Exportar, Configuración, Administración y la ficha de ingreso abren sin errores. Cierre 2026-11-27 (corte 2): en un egresado sin firmar, «Estado al egreso» de la lista de faltantes lleva el foco a fx-healthStatus; un internado no lista faltantes de egreso.
- **Blocker:** none

### TASK-004 — Cronologías editables y tablas seriadas
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Acceptance:** Cada cronología admite alta, edición y baja con los campos de docs/07 §2; la respiratoria valida modalidad faltante con «Ir al cambio»; la evaluación nutricional calcula g/kg/día, g/semana y cm/semana; los quincenales avisan fuera de la ventana ± 4 días.
- **Evidence:** 2026-11-27 · Navegador (:5180). Respiratoria (Francisco Herrera): CN muestra «Flujo» y no «PEEP»; «Fecha y hora» muestra «Hora»; sin fecha → «Falta completar: Fecha.»; cambio sin modalidad → «Cambio 5 (día 23): falta elegir la modalidad respiratoria · Ir al cambio», que abre «Editar cambio»; «Eliminar» pide «Confirmar eliminación»; auditoría registra alta y baja. Las 7 cronologías de Alma Ríos (7/9/2/4/3/3/3 registros) se abren y re-guardan sin errores ni cambios de conteo. Evaluación nutricional: 14 → 28 días = 14,1 g/kg/día y 73 g/semana, igual al cálculo manual (1000·ln(812/667)/14). Quincenales: «Fuera de la ventana: Día 45, Día 90, Día 105» y nota por celda; editar una celda guarda el valor y Tab pasa a la siguiente. Epicrisis generada incluye «Secuencia de soporte: día 0: inicio de soporte → VMC, FiO2 55%; …». 30 pacientes × 11 pestañas sin contenido vacío ni errores; 375 px: scrollWidth 375 en todas las pestañas y en el editor.
- **Blocker:** none

### TASK-005 — Inicio, Ingreso, login simulado y Administración
- **State:** PLANNED
- **Depends on:** TASK-002
- **Owner:** orchestrator
- **Acceptance:** Ver docs/08 §2.
- **Evidence:** pendiente
- **Blocker:** none
