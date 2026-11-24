# 02 · Secciones, Funcionalidades y Recorridos

Este documento define las **9 secciones** de NeoSalud y los **recorridos paso a paso** que deberá demostrar la maqueta navegable ante la clínica.

---

## 1. Arquitectura de Navegación (Sidebar)

Inspirada en `DocNeo-Demo` (dos grupos claros en barra lateral fija + barra superior con contexto del paciente activo y usuario logueado), eliminando el desborde horizontal de las 7 pestañas de la app de referencia.

| Grupo | Sección | Ruta sugerida | Rol principal |
| :--- | :--- | :--- | :--- |
| **Clínica** | 1. Inicio (Censo y Alertas) | `/inicio` | Todos |
| **Clínica** | 2. Pacientes (Padrón y Sectores) | `/pacientes` | Todos |
| **Clínica** | 3. Ficha de Ingreso | `/pacientes/:id/ingreso` | Medicina / Enfermería |
| **Clínica** | 4. Hospitalización y Líneas de Tiempo | `/pacientes/:id/hospitalizacion` | Medicina / Enfermería |
| **Clínica** | 5. Egreso y Epicrisis | `/pacientes/:id/epicrisis` | Medicina / Jefatura |
| **Gestión** | 6. Importar Excel / CSV y Bandeja | `/importar` | Medicina / Enfermería / Jefatura |
| **Gestión** | 7. Estadísticas e Indicadores | `/estadisticas` | Todos (según alcance) |
| **Gestión** | 8. Exportación y Diccionario | `/exportacion` | Planta / Jefatura / Estadística |
| **Sistema** | 9. Administración y Auditoría | `/configuracion` | Jefatura / Admin TI |

> **Nota UX:** las vistas 3, 4 y 5 aparecen como sub-navegación contextual dentro de la historia del paciente seleccionado (con encabezado persistente: *Nombre, ID, Estado, Sector/Cama, EG, Peso al nacer y Días de vida*), evitando que el usuario pierda de vista sobre qué recién nacido está escribiendo.

---

## 2. Detalle Funcional por Sección

### 2.1. Inicio · Censo y Tablero Operativo
- **4 KPIs principales:** En la unidad (internados hoy), Ingresos incompletos, Epicrisis pendientes de validación, Estadía promedio del período.
- **Ocupación por sector:** barras limpias por área (`UCIN`, `Cuidados Intermedios`, `Pre-alta / Engorde`, `Aislamiento`).
- **Panel de alertas accionables:** ingresos sin firmar, borradores desfasados respecto a los datos, cronologías incompletas en pacientes próximos al alta.
- **Actividad reciente:** acceso en un clic al paciente o a su borrador pendiente.

### 2.2. Pacientes · Padrón Vivo y Alta Rápida
- **Alta rápida modal o panel lateral:** Nombre/RN de..., Sexo, Fecha de nacimiento, Sector inicial (y opcionalmente HC, EG, Peso) → crea ID correlativo (`NEO-2026-000001`) en estado `Ingreso incompleto` y lleva directo a la ficha de ingreso.
- **Filtros combinables:** texto libre (nombre, ID, HC, DNI), estado (`Ingreso incompleto`, `Hospitalizado`, `En alta`, `Egresado`, `Fallecido`), sector, grupo de EG y peso.
- **Acciones por paciente:** abrir ficha, cambiar sector/cama (con historial de pases), ver línea resumen de estadía.

### 2.3. Ficha de Ingreso (Entrevista Condicional)
Organizada en bloques colapsables con **buscador de variables**:
1. **Nacimiento e identificación:** fecha/hora de nacimiento e ingreso, procedencia (intramuros / derivado), HC, DNI, obstetra, temperatura de ingreso, EG (`sem+días`), sexo.
2. **Antropometría (Fenton 2025):** peso, talla y perímetro cefálico → tarjetas calculadas al instante con **Z-score, percentil y clasificación (`PEG / AEG / GEG`)**.
3. **Antecedentes maternos y obstétricos (anidado):** paridad (si `Multípara` → detalle), diabetes (si `Sí` → tipo, tratamiento, HbA1c), HTA/preeclampsia, corticoides antenatales, MgSO₄, serologías, RPO (si `Sí` → horas y corioamnionitis).
4. **Transición y reanimación (anidado):** Apgar 1'/5'/10'; si `Reanimación = Sí` → VPPI, intubación, masaje, O₂ máx en sala de partos, adrenalina (si `Sí` → N° de dosis y vía).
5. **Calculadoras automáticas por criterio:**
   - **CRIB II:** visible automáticamente si `EG ≤ 32 sem` o `Peso ≤ 1.500 g`.
   - **Kaiser 2024 (Sepsis precoz):** visible automáticamente si `EG ≥ 35 sem` (riesgo basal, posterior y recomendación clínica).
6. **Diagnósticos de ingreso:** selector buscable sobre catálogo CIE-10 limpio (principal + secundarios), sin superponerse con los botones de acción.
7. **Generador de Borrador y Validación:**
   - Botón `Generar borrador` → arma tabla perinatal a 2 columnas, anamnesis narrativa, examen físico con placeholders `_____`, diagnósticos e indicaciones numeradas.
   - Si luego se edita cualquier variable estructurada, aparece un **banner ámbar de desfasaje** mostrando el campo modificado (`valor anterior → valor nuevo`) con botón `Regenerar borrador`.
   - Botón `Validar ingreso`: exige rol médico y cero placeholders `_____`. Cambia estado a `Hospitalizado` y habilita descarga de PDF.

### 2.4. Hospitalización y Líneas de Tiempo
Organizada en sub-pestañas o acordeón lateral por sistema, siempre con **resumen calculado de solo lectura** al pie o cabecera del bloque:
- **Respiratorio:** línea de tiempo horizontal por día de vida (`D0..Dn`) con eventos de cambio (`AA`, `O₂`, `CN`, `CNAF`, `CPAP`, `NIPPV`, `BiPAP`, `VMC`, `VAFO`, `ECMO`), FiO₂, PEEP, flujo y precisión temporal.
  - *Resumen autocalculado:* días de O₂/CPAP/VNI/VMC/VAFO, FiO₂ máx 24h, O₂ día 28, O₂ y VMI a las 36 sem, **DBP Jensen** y **Bancalari**. Incluye SDR, surfactante y neumotórax.
- **Nutricional y Digestivo:** línea de tiempo de **3 vías simultáneas** (enteral con cc/kg/día y tipo de leche, parenteral con AA/lípidos, suplementos) + NEC.
  - *Resumen autocalculado:* días NPT, día de inicio enteral, inicio con leche materna, día de logro 100 cc/kg/día, día de fortificación.
- **Infeccioso (IAAS / Sepsis):** serie de episodios con síndrome, foco, cultivo, germen y antibióticos de catálogo cerrado → resumen automático de sepsis precoz/tardía y asociación a catéter.
- **Accesos Vasculares:** línea unificada para `CVU`, `CAU`, `PICC/Silastic` y `CVC` con fechas de colocación/retiro, motivo y complicaciones → calcula **días-catéter por tipo**.
- **Hematología y Transfusiones:** serie de transfusiones (hemocomponente, indicación, mL y mL/kg, reacción) + fototerapia, hipoglucemia, plaquetopenia, Coombs.
- **Cardiovascular:** ecocardiograma, cardiopatía congénita, DAP, tratamiento farmacológico y cierre quirúrgico/invasivo.
- **Neurológico:** apneas, convulsiones, ecografía cerebral (HIV I–IV), RMN (LMPV), hidrocefalia post-hemorrágica y derivación.
- **ROP y Cirugías:** tablas estructuradas (en ROP deduce automáticamente el peor estadio/zona/plus).
- **Crecimiento seriado:** controles de peso/talla/PC por hito (`7d`, `14d`, `28d`, `36s`, `Alta`).
- **Control de Cobertura de Cronología:** indicador prominente (`En curso / Incompleta` vs. `Completa hasta el corte`) visible en cada línea de tiempo.

### 2.5. Egreso y Epicrisis
- Datos de egreso (fecha, condición, destino, antropometría, alimentación al alta, O₂ domiciliario, pesquisas obligatorias, vacunas, medicación, indicaciones y diagnósticos de egreso).
- Botón `Generar epicrisis`: sintetiza automáticamente los bloques por sistema desde las líneas de tiempo.
- Editor humano + detección de desfasaje + `Validar epicrisis` (cambia estado a `Egresado` o `Fallecido` y genera PDF institucional).

### 2.6. Importar Excel / CSV y Bandeja de Revisión
- **Paso 1 · Plantilla y carga:** descarga de plantilla oficial `.xlsx`/`.csv` + zona de carga de archivo.
- **Paso 2 · Validación automática:** resumen de filas válidas, con advertencias, duplicadas o con error de formato; para actualizaciones de pacientes existentes exige coincidencia de **3 identificadores** (`HC + Sexo + Fecha nacimiento`).
- **Paso 3 · Bandeja de revisión humana:** vista lado a lado (*Archivo importado vs. Valor actual*) con aceptación/rechazo por fila o campo y botón final `Confirmar importación`.

### 2.7. Estadísticas e Indicadores
- **Barra de filtros:** período (ingreso/egreso), sector, grupo de EG y grupo de peso al nacer.
- **Tricotomía visual explícita en cada tasa:** barra/etiqueta diferenciando *Casos (numerador/denominador)*, *Fuera de riesgo (No aplica)* y *En riesgo sin dato (Deuda de registro)*.
- **Bloques:** Distribución de prematuros, Morbilidades mayores (DBP, ROP, HIV, NEC, Sepsis, DAP), Mortalidad (desenlace conocido vs. aún hospitalizados), Densidades de incidencia (por 1.000 días-catéter y 1.000 días-ventilador) y Gestión (ocupación, estadía, lactancia al alta).

### 2.8. Exportación y Diccionario
- Descarga en un clic de:
  1. **Excel Maestro (`.xlsx`)** con 5 hojas (`Metadatos`, `Base maestra`, `Diccionario`, `Resumen estadístico`, `Errores y deuda de registro`).
  2. **CSV demográfico / pseudonimizado** (con opción de ocultar datos filiatorios).
  3. **JSON completo** y **Diccionario de datos JSON versionado**.

### 2.9. Administración y Auditoría
- Usuarios, roles y matrículas profesionales.
- Catálogos (sectores/camas, CIE-10, gérmenes, antibióticos).
- Bitácora de auditoría filtrable por usuario, paciente y tipo de acción.
- Estado de backups y parámetros institucionales (nombre del hospital/clínica, logo para PDFs, timeout de sesión).

---

## 3. Recorridos Clave a Demostrar en la Maqueta Navegable

La maqueta debe permitir recorrer en vivo estos **6 flujos completos** (basados en el guion del hospital + mejoras de NeoSalud):

1. **Recorrido 1 · Censo y cambio de rol:** entrar como *Médica Neonatóloga*, revisar KPIs y ocupación por sector, y conmutar a *Dirección (Solo lectura)* o *Enfermería* para demostrar permisos diferenciados.
2. **Recorrido 2 · Alta rápida + Ingreso condicional:** crear un RN nuevo, completar 4–5 campos mostrando apertura/cierre de ramas anidadas (`Reanimación`, `Diabetes`/`RPO`), cálculo automático de **Fenton 2025** y **Kaiser 2024** (caso `≥ 35 sem`), generar el borrador, editar un dato para ver el **aviso de desfasaje** y validar.
3. **Recorrido 3 · Prematuro extremo (`24+2`, `640 g`) y Líneas de Tiempo:** abrir el caso complejo precargado (en ambiente demo), recorrer la línea respiratoria (ver el resumen de días y **DBP Jensen/Bancalari** autocalculado), la nutricional de 3 vías, catéteres, IAAS y ROP, y marcar cobertura de cronología.
4. **Recorrido 4 · Epicrisis sin redactar de cero:** generar la epicrisis completa del prematuro extremo, hacer una edición manual y previsualizar el formato de salida/validación.
5. **Recorrido 5 · Importación Excel/CSV segura:** simular la carga de una planilla de pacientes/controles, mostrar un bloqueo por falta de coincidencia en los **3 identificadores** y aprobar un registro desde la bandeja de revisión humana.
6. **Recorrido 6 · Estadísticas filtrables y Exportación:** filtrar indicadores por período/peso, mostrar la diferencia entre *Fuera de riesgo* y *Deuda de registro*, y previsualizar la estructura del Excel Maestro de 5 hojas.
