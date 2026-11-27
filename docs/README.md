# Documentación de NeoSalud

Base documental de arquitectura, producto, UX/UI y decisiones técnicas para **NeoSalud**, el sistema de control clínico y gestión para Servicios de Neonatología / UCIN.

> **Estado actual:** maqueta navegable lista para validar con el servicio de un hospital de **Argentina** ([guía de uso](./guia-uso-maqueta.md) · [maqueta en línea](https://alejopalavecino.github.io/NeoSalud/)).  
> **Alcance Fase 1:** Sistema web standalone 100% determinístico (**sin módulos de IA**), desplegable en VPS con base limpia e importación estructurada de Excel/CSV.

---

## Mapa rápido de lectura

| Documento | Qué resuelve | Estado |
| :--- | :--- | :--- |
| [01 · Propuesta y Requisitos](./01-propuesta-y-requisitos.md) | Visión, principios clínicos, alcance Fase 1, requisitos funcionales/no funcionales, matriz RBAC y guía de validación con la clínica. | Base aprobada · 4 preguntas clínicas pendientes |
| [02 · Secciones y Recorridos](./02-secciones-y-recorridos.md) | Mapa de navegación, detalle funcional de las 9 secciones, reglas clínicas determinísticas y recorridos paso a paso para la maqueta. | Listo para maquetado |
| [03 · Diseño UX / UI](./03-diseno-ux-ui.md) | Sistema visual (evolución de `DocNeo-Demo`), tipografía, paleta, componentes, estados obligatorios, accesibilidad, responsive y guion de demo. | Listo para maquetado |
| [04 · Arquitectura y Ambientes](./04-arquitectura-y-ambientes.md) | Arquitectura de despliegue en VPS con Docker, endurecimiento de seguridad, estrategia de 4 ambientes (`dev`, `test`, `preprod`, `prod`) y modelo de dominio. | Aprobado |
| [05 · Stack Tecnológico](./05-stack-tecnologico.md) | Stack definitivo por capa (Next.js, TypeScript, PostgreSQL, Prisma), herramientas de archivos, testing e infraestructura. | Aprobado |
| [06 · Auditoría del sistema de referencia](./06-auditoria-sistema-referencia.md) | Inventario completo del sistema chileno (secciones, desplegables y ramas) y brecha con la maqueta. | Borrador |
| [07 · Hospitalización y Epicrisis en la referencia](./07-hospitalizacion-epicrisis-referencia.md) | Auditoría campo por campo: 51 secciones, 128 campos, 9 cronologías y qué se abre en cada paciente demo. | Borrador |
| [Guía de Uso de la Maqueta](./guia-uso-maqueta.md) | Qué mostrar y qué preguntarle al servicio en cada sección, cómo leer las etiquetas «A confirmar» y guion de 15 minutos para la reunión de validación. | Disponible |
| [Registro de ADRs](./adr/README.md) | Decisiones arquitectónicas duraderas con alternativas, costos, riesgos y condiciones de revisión. | 3 aprobados |

---

## Principios innegociables del proyecto

1. **Dato clínico único:** cada hecho se registra una sola vez; de ahí derivan ingresos, epicrisis, resúmenes por sistema, tasas y exportaciones.
2. **Honestidad determinística (sin IA en Fase 1):** el sistema nunca rellena omisiones como «normal». Lo no consignado se informa como tal.
3. **Cero datos huérfanos:** al cambiar una respuesta condicional en un formulario, las subramas ocultas se descartan de manera limpia y auditada.
4. **Firma médica humana:** los borradores generados no validan ingresos ni egresos automáticamente; cualquier edición posterior en la ficha dispara aviso de desfasaje.
5. **Rigor epidemiológico:** todo indicador separa explícitamente *Dato*, *No aplica (fuera de riesgo)* y *En riesgo sin dato (deuda de registro)*.
6. **Seguridad desde el día 1:** datos sensibles de salud en VPS implican autenticación real, RBAC, auditoría inmutable, HTTPS, base no expuesta y backups cifrados.

---

## Referentes utilizados

- **Referente UX/UI y roles:** prototipo `DocNeo-Demo` (estética clínica calma, navegación por sidebar, perfiles, sectores y bandeja de revisión humana; excluyendo sus vistas de IA).
- **Referente funcional UCIN:** sistema de Neonatología de referencia enviado por el hospital (formulario condicional, calculadoras Fenton 2025 / Kaiser 2024 / CRIB II, líneas de tiempo por eventos, generadores determinísticos de ingreso/epicrisis, tricotomía estadística y exportación maestra).

---

## Próximo paso acordado

1. ~~Revisar y ajustar esta carpeta `docs/`.~~
2. ~~Construir la maqueta navegable con datos ficticios.~~ Hecho: 30 pacientes ficticios, ficha completa para Argentina y variables marcadas «A confirmar».
3. **Validar la maqueta con el servicio** siguiendo la [guía de uso](./guia-uso-maqueta.md): responder las 4 preguntas clínicas y marcar qué variables «A confirmar» quedan.
4. Con esas respuestas, cerrar el diccionario de datos e iniciar la implementación real por etapas (stack aprobado en [ADR-002](./adr/ADR-002-backend-ts-prisma-vs-python.md)).
