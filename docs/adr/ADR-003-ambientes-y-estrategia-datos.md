# ADR-003 · Estrategia de 4 Ambientes, Arranque Limpio e Importación Excel/CSV

- **Estado:** Aprobado
- **Fecha:** 2026-11-22
- **Requisitos afectados:** RF-13 (Importación Excel/CSV), RF-16 (Auditoría), RNF (Arranque Limpio, Privacidad)

---

## Contexto

La clínica no tiene confirmada integración inicial con un HIS/LIS externo, por lo que NeoSalud debe poder comenzar desde cero sin datos precargados en producción, pero ofreciendo un mecanismo práctico y seguro para cargar planillas existentes (Excel/CSV). Además, se requiere separar desarrollo, pruebas, demostraciones/preproducción y operación real.

## Decisión

1. **Cuatro ambientes aislados:**
   - `dev` (local, datos ficticios).
   - `test` (QA/CI automatizado, base efímera con casos borde clínicos).
   - `preprod` (VPS aislada, réplica de producción para validar despliegues y realizar demos con casos ficticios y banner visible).
   - `prod` (VPS productiva, arranque **100% limpio**: únicamente catálogos normalizados y cuenta Admin inicial; scripts de seed demo bloqueados por variable de entorno).
2. **Importación estructurada de Excel (`.xlsx`) y CSV en 3 pasos:**
   - **Plantillas oficiales versionadas** descargables desde la app para evitar planillas ambiguas.
   - **Validación previa + Barrera de 3 identificadores (`HC + Sexo + Fecha de nacimiento`)** obligatoria al actualizar fichas existentes.
   - **Bandeja de Revisión Humana** antes de confirmar el lote en PostgreSQL, registrando auditoría del importador y permitiendo identificar todo lo cargado por `batch_id`.

## Alternativas descartadas

- **Arrancar producción con casos demo precargados:** alto riesgo de contaminar estadísticas reales de la unidad con pacientes ficticios.
- **Importación directa de Excel sin revisión previa:** riesgo clínico grave de sobrescribir un recién nacido equivocado o introducir fechas/pesos corruptos.

## Consecuencias

- **Positivas:** producción impecable desde el día 1; demos seguras ante directivos y médicos en `preprod` sin exponer historias reales; migración inicial desde planillas del servicio controlada y auditable.
- **Compromisos:** mantener versionadas las plantillas Excel/CSV cada vez que cambie el diccionario de datos.

## Condición para reconsiderar

Si posteriormente el hospital solicita sincronización automática con su HIS/LIS, la capa de importación por archivos convivirá con un adaptador HL7/FHIR reutilizando las mismas reglas de validación y verificación de identidad.
