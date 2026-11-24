# ADR-001 · Arquitectura web contenerizada en VPS con PostgreSQL y motor determinístico (sin IA)

- **Estado:** Aprobado
- **Fecha:** 2026-11-22
- **Requisitos afectados:** RF-04 a RF-16, RNF (Concurrencia, Seguridad, Integridad Clínica, Arranque Limpio)

---

## Contexto

El sistema de referencia enviado por el hospital opera bajo un modelo local (SQLite + sincronización por carpeta OneDrive + bloqueo manual de paciente) sin autenticación real, sin RBAC, sin auditoría inmutable y sin cifrado local. Paralelamente, la clínica solicitó descartar módulos de IA en esta etapa y correr NeoSalud completo en una VPS.

## Alternativas evaluadas

| Alternativa | Ventajas | Desventajas / Riesgos | Costo operativo |
| :--- | :--- | :--- | :--- |
| **1. App local + SQLite sincronizado (modelo referencia)** | Cero costo de servidor. | Corrupción de BD y conflictos en uso concurrente de guardia; sin RBAC ni auditoría real; riesgo crítico de seguridad física/local. | Bajo inicial, altísimo ante incidentes clínicos. |
| **2. Microservicios distribuidos en nube gestionada** | Escalado independiente por servicio. | Complejidad innecesaria para un servicio departamental; mayor costo mensual, más puntos de falla y despliegue pesado. | Alto. |
| **3. Monólito modular web en VPS + Docker Compose + PostgreSQL (Elegida)** | Concurrencia ACID real, RBAC, auditoría inmutable, HTTPS automático, backups cifrados y despliegue simple y reproducible en una VPS. | Requiere mantenimiento básico de VPS (actualizaciones SO, monitoreo de disco y prueba periódica de backups). | Bajo-medio y predecible. |

## Decisión

Adoptar un **monólito modular contenerizado en una VPS dedicada** (`Caddy` + `NeoSalud` + `PostgreSQL 16` en red privada Docker), con **lógica clínica 100% determinística** (cero dependencias de LLM/IA) y módulos desacoplados por adaptadores para eventuales integraciones futuras.

## Consecuencias

- **Positivas:** múltiples médicos y enfermeros pueden trabajar en simultáneo sin perder cambios; trazabilidad completa de quién cargó y validó cada dato; costos predecibles de infraestructura; resultados clínicos 100% reproducibles y auditables.
- **Compromisos:** obliga a implementar hardening de VPS (firewall UFW, SSH por clave, TLS, backups cifrados off-site y timeout de sesión) antes de ingresar datos reales de pacientes.

## Condición para reconsiderar

Si el hospital exige posteriormente alojar el sistema dentro de su propia red física (intranet sin salida a internet), la misma arquitectura Docker Compose se traslada on-premise sin cambios de código. Si en el futuro aprueban IA o integración HL7/FHIR, se agregan como adaptadores externos sin modificar el núcleo determinístico.
