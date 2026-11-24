# 01 · Propuesta, Requisitos y Roles (RBAC)

NeoSalud es un sistema web de registro clínico, control evolutivo y estadística hospitalaria para Unidades de Neonatología / UCIN. Combina la claridad operativa de `DocNeo-Demo` con el rigor clínico del sistema de referencia del hospital, resolviendo concurrencia multiusuario, seguridad hospitalaria y auditoría.

---

## 1. Alcance de Fase 1 vs. Fuera de Alcance

| En alcance (Fase 1) | Fuera de alcance (Fase 1) |
| :--- | :--- |
| Gestión de censo, sectores y padrón de recién nacidos. | Asistentes de chat con IA, resúmenes generativos por LLM y dictado por voz. |
| Ficha de ingreso condicional + calculadoras determinísticas (`Fenton 2025`, `Kaiser 2024`, `CRIB II`) + catálogo CIE-10. | Integración en tiempo real con HIS, LIS o PACS (HL7 / FHIR). |
| Líneas de tiempo por eventos (respiratoria, nutricional, IAAS, catéteres, transfusiones), tablas (ROP, cirugías) y crecimiento. | OCR con servicios cloud externos sobre fotos manuscritas. |
| Generadores determinísticos de borrador de **Ingreso** y **Epicrisis** con detector de desfasaje, validación médica y PDF. | Prescripción electrónica de farmacia o facturación hospitalaria. |
| Importación estructurada de **Excel (`.xlsx`) y CSV** con plantilla oficial, barrera de 3 identificadores y bandeja de revisión humana. | App móvil nativa (se cubre con web responsive). |
| Estadísticas con filtros, tricotomía (*Dato / No aplica / Sin dato*) y tasas por 1.000 días-dispositivo. | |
| Exportación de Excel Maestro (5 hojas), CSV pseudonimizado, JSON y diccionario de datos versionado. | |
| Autenticación propia, RBAC, auditoría inmutable y despliegue contenedorizado en VPS con 4 ambientes. | |

---

## 2. Requisitos Funcionales (RF)

| ID | Módulo | Requisito observable | Prioridad |
| :--- | :--- | :--- | :---: |
| **RF-01** | Censo / Inicio | Mostrar pacientes internados, ocupación por sector, ingresos incompletos, altas pendientes y alertas de deuda clínica. | Alta |
| **RF-02** | Padrón | Crear un paciente con carga mínima rápida asignando ID correlativo (`NEO-AAAA-NNNNNN`) en estado `ingreso_incompleto`. | Alta |
| **RF-03** | Padrón | Filtrar pacientes por nombre, N° HC/ficha, DNI materno/RN, estado, sector, edad gestacional y peso al nacer. | Alta |
| **RF-04** | Ingreso | Formulario condicional por bloques: al cerrar una rama condicional se descartan sus subcampos para evitar datos huérfanos. | Alta |
| **RF-05** | Calculadoras | Calcular automáticamente `Fenton 2025` (Z-score, percentil, PEG/AEG/GEG), `Kaiser 2024` (`≥ 35 sem`) y `CRIB II` (`≤ 32 sem` o `≤ 1500 g`). | Alta |
| **RF-06** | Catálogos | Seleccionar diagnósticos desde catálogo cerrado normalizado (CIE-10 perinatal/malformaciones), diferenciando principal y secundarios. | Alta |
| **RF-07** | Borradores | Generar borradores determinísticos de Ingreso y Epicrisis sin inventar normalidad, conservando ediciones humanas y detectando desfasajes por campo. | Alta |
| **RF-08** | Validación | Bloquear validación si existen marcadores pendientes (`_____`) o usuario sin permiso médico; al validar, guardar versión inmutable y generar PDF. | Alta |
| **RF-09** | Timelines | Registrar eventos respiratorios (10 modalidades) derivando días de soporte, FiO₂ máx 24h, O₂ 28d/36s y clasificación DBP Jensen y Bancalari. | Alta |
| **RF-10** | Timelines | Registrar eventos nutricionales en 3 vías simultáneas (enteral, parenteral, suplementos) derivando días NPT, inicio enteral, 100 cc/kg y fortificación. | Alta |
| **RF-11** | Episodios | Registrar IAAS (germen/ATB de catálogo), catéteres centrales (días-catéter), transfusiones, controles ROP (peor estadio automático) y cirugías. | Alta |
| **RF-12** | Cronología | Exigir estado explícito de cobertura de cronología (`Incompleta` vs. `Completa al corte`) antes de deducir ausencias («No») en resúmenes y tasas. | Alta |
| **RF-13** | Importación | Importar planillas `.xlsx`/`.csv` con validación previa, barrera de 3 identificadores (HC + Sexo + Fecha nacimiento) para actualizaciones y bandeja de revisión humana. | Media-Alta |
| **RF-14** | Estadísticas | Calcular tasas con denominador explícito (*Dato / No aplica / Sin dato*) y filtros por fecha, sector, EG y peso al nacer, incluyendo tasas por 1.000 días-dispositivo. | Alta |
| **RF-15** | Exportación | Exportar Excel Maestro de 5 hojas, CSV demográfico/pseudonimizado, JSON completo y diccionario de datos versionado. | Alta |
| **RF-16** | Auditoría | Registrar en bitácora inmutable toda creación, edición, validación, enmienda, importación y exportación (usuario, rol, fecha/hora y diff). | Alta |

---

## 3. Requisitos No Funcionales (RNF)

| Categoría | Criterio verificable |
| :--- | :--- |
| **Concurrencia** | Múltiples profesionales trabajando en simultáneo sin pérdida silenciosa de datos (transacciones ACID + control de versión optimista por sección). |
| **Seguridad (Criticidad C)** | HTTPS obligatorio, contraseñas con Argon2id, cookies `HttpOnly/Secure/SameSite`, expiración de sesión por inactividad configurable (ej. 20–30 min), RBAC en cada endpoint y base de datos inaccesible desde internet pública. |
| **Privacidad y Respaldos** | Backups diarios cifrados antes de salir de la VPS (estrategia 3-2-1) y exportación pseudonimizada disponible para estadística/investigación. |
| **Integridad Clínica** | Toda regla clínica determinística (`Fenton`, `Kaiser`, `CRIB II`, `DBP`, denominadores) respaldada por tests automatizados con casos clínicos de referencia. |
| **Usabilidad y Rendimiento** | Carga de pantallas `< 1 s` en red estándar; interfaz usable en monitores `1366×768` y `1440×900` sin scroll horizontal en navegación, y soporte tablet/móvil para consulta y carga rápida. |
| **Arranque Limpio** | El ambiente de producción inicia sin registros clínicos precargados (solo catálogos base y usuario administrador inicial). |

---

## 4. Roles y Matriz de Permisos (RBAC)

| Rol | Censo y Lectura | Alta y Edic. Ficha / Timelines | Firmar Ingreso / Epicrisis | Importar / Aprobar Excel-CSV | Estadísticas | Exportar Base | Admin / Auditoría |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Neonatólogo/a de Planta** | Sí | Sí | **Sí** | Sí | Sí | Institucional / Anonimizado | No |
| **Médico/a de Guardia / Residente** | Sí | Sí | Según política (propios o co-firma) | Propone / revisa | Sí | Solo PDF clínico | No |
| **Enfermería / Jefatura Enfermería** | Sí | Sí (ingresos básicos, sectores, vías, nutrición, respiratorio, pesquisas) | No | Sí (en campos habilitados) | Sí | Reportes operativos | No |
| **Jefatura de Neonatología** | Sí | Sí | **Sí** (incluye enmiendas auditadas) | Sí | Completo | **Completo y anonimizado** | Lectura de auditoría clínica |
| **Dirección / Estadística / Comité IAAS** | Solo lectura | No | No | No | Completo | Agregados / pseudonimizado | No |
| **Administrador TI** | Sin texto clínico | No | No | No | Salud del sistema | Solo backups cifrados | **Sí** |

> **Regla de enmiendas:** un documento validado nunca se sobrescribe en silencio; se crea una nueva versión/adenda conservando la firma anterior y el motivo del cambio.

---

## 5. Checklist de Validación Clínica (4 Preguntas para la Clínica)

Estos 4 puntos deben cerrarse durante la presentación de la maqueta con el equipo médico:

- [ ] **1. Variables faltantes locales:** confirmar incorporación de DNI (RN y madre), obra social/cobertura, derivación/traslado extramuros, corticoides antenatales, sulfato de magnesio, serologías maternas (VDRL, HIV, Chagas, Toxo, Hep B, EGB), pesquisas obligatorias al alta (FEI metabólica, oximetría pre/postductal, reflejo rojo, OEA) y vacunas (BCG, Hep B).
- [ ] **2. Variables candidatas a simplificar/eliminar:** validar si los laboratorios quincenales fijos (`d15..d120`) se usarán o se omiten/hacen opcionales, eliminar duplicación entre booleanos manuales y líneas de tiempo completas, y limpiar términos específicos de la clínica de referencia (`RUT`, `CSM`, `fierro`).
- [ ] **3. Redacción de borradores (Ingreso y Epicrisis):** contrastar con 2–3 historias reales anonimizadas la terminología local (`ARM/VMC`, `HC`, `LME`), el orden por sistemas y si las marcas `Sin responder` salen impresas en el PDF final o solo bloquean/alertan antes de firmar.
- [ ] **4. Tasas para Jefatura y Dirección:** confirmar si además de las tasas de morbilidad (DBP, ROP, HIV, NEC, Sepsis, DAP, Mortalidad) requieren densidades de incidencia por **1.000 días-catéter** y **1.000 días-ventilador**, ocupación/giro cama, mortalidad por franja de peso (`<1000 g`, `<1500 g`), hipotermia al ingreso y tasa de lactancia exclusiva al alta.
