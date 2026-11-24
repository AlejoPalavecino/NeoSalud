# ADR-002 · Elección de Backend: Next.js/TypeScript + Prisma vs. Python (FastAPI)

- **Estado:** Aprobado (Opción A: Next.js + TypeScript + PostgreSQL + Prisma)
- **Fecha:** 2026-11-22
- **Requisitos afectados:** RF-05 (Calculadoras), RF-07 (Borradores), RF-09/10 (Timelines), RF-13/15 (Excel/CSV y PDF), RNF (Integridad Clínica y Mantenibilidad)

---

## Contexto

El frontend de NeoSalud estará construido en **Next.js + TypeScript** y la base de datos en **PostgreSQL**. Quedan dos opciones viables para la capa de backend:
- **Opción A:** Backend integrado en **TypeScript (Next.js / Node.js) + Prisma ORM**.
- **Opción B:** Backend separado en **Python (FastAPI) + SQLAlchemy/Alembic**, manteniendo el frontend en Next.js + TypeScript.

## Comparativa de alternativas viables

| Criterio | Opción A · Next.js + TypeScript + Prisma (Recomendada) | Opción B · Frontend Next.js (TS) + Backend Python (FastAPI) |
| :--- | :--- | :--- |
| **Motor clínico compartido (`Fenton`, `Kaiser`, `CRIB II`, `DBP`, borradores)** | **Se escribe una sola vez en TypeScript** y corre igual en cliente (feedback instantáneo) y servidor (validación final). Cero riesgo de divergencia entre fórmulas. | Si se quiere feedback instantáneo sin latencia de red, hay que duplicar reglas en TS y Python, o depender de round-trips a la API en cada cambio de campo. |
| **Velocidad de desarrollo (MVP + mantenimiento)** | Mayor: un solo lenguaje, un solo repositorio de tipos (Zod/Prisma) y contratos siempre sincronizados. | Menor inicial: mantener 2 stacks, 2 toolchains, contratos OpenAPI sincronizados y dos pipelines de CI. |
| **Operación en VPS** | Más liviana: 1 contenedor aplicativo + PostgreSQL + Caddy. Menor consumo de RAM. | 2 contenedores aplicativos (`web` + `api`) + PostgreSQL + Caddy. Perfectamente viable en 4 GB RAM, algo más de configuración. |
| **Procesamiento de Excel, CSV y analítica avanzada** | Muy bueno con `ExcelJS` + `csv-parse`; suficiente para Excel de 5 hojas y tasas UCIN. | **Superior** (`openpyxl`, `pandas`, `scipy`, `WeasyPrint`) si a futuro se incorporan análisis bioestadísticos complejos, curvas avanzadas o módulos de ciencia de datos/IA. |
| **Riesgo principal** | Mantener disciplina modular dentro de Next.js para no mezclar UI con lógica de negocio/DB. | Duplicación de lógica clínica y mayor costo de mantenimiento si el equipo es pequeño. |

## Decisión

Se aprueba la **Opción A: Next.js + TypeScript + PostgreSQL + Prisma**, aislando toda la lógica clínica determinística en un paquete interno puro (`src/clinical-engine/`) sin dependencia del framework web.

Como paso previo a la implementación productiva, se construirá una **maqueta navegable en HTML, CSS y JavaScript puro** (`maqueta/`) con datos ficticios para validar recorridos, pantallas, componentes y flujos de información junto a la clínica antes de levantar el backend y las migraciones en PostgreSQL.

## Consecuencias y costo de cambio

- **Positivas:** un único lenguaje (TypeScript) de punta a punta, motor clínico compartido entre cliente y servidor sin duplicación de fórmulas, menor consumo de recursos en VPS y entrega más ágil.
- **Compromisos:** mantener disciplina modular estricta separando UI, motor clínico y acceso a datos (Prisma). Si en Fase 2 surgiera necesidad de analítica bioestadística avanzada en Python, podrá agregarse como servicio auxiliar sin reescribir el núcleo.

## Condición para reconsiderar

Revisar solo si en futuras etapas el hospital exige librerías científicas exclusivamente disponibles en Python para módulos nuevos de investigación o ML.
