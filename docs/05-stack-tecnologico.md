# 05 · Stack Tecnológico

Definición tecnológica aprobada de NeoSalud (**Next.js + TypeScript + PostgreSQL + Prisma**, ver [ADR-002](./adr/ADR-002-backend-ts-prisma-vs-python.md)).

---

## 1. Resumen por Capa

| Capa | Tecnología aprobada | Estado | Notas clave |
| :--- | :--- | :---: | :--- |
| **Maqueta de validación** | **HTML5 + CSS3 + JavaScript puro (`maqueta/`)** | **En curso** | Sin dependencias ni compilación; permite validar UX, UI, secciones y recorridos con la clínica antes de programar el backend. |
| **Frontend + Backend (Producto)** | **Next.js (App Router) + React + TypeScript** | **Aprobado** | Monólito modular en un solo lenguaje; comparte motor clínico y validaciones Zod entre cliente y servidor. |
| **Estilos y UI (Producto)** | **Tailwind CSS + componentes accesibles (Radix / shadcn/ui)** | **Aprobado** | Implementa los tokens visuales validados en la maqueta con accesibilidad WCAG AA y teclado completo. |
| **Base de datos y ORM** | **PostgreSQL 16+ con Prisma ORM** | **Aprobado** | Integridad relacional estricta, migraciones versionadas, transacciones ACID y JSONB para snapshots/auditoría. |
| **Importación / Exportación Excel-CSV** | **ExcelJS + csv-parse** | **Aprobado** | Excel Maestro de 5 hojas, plantillas descargables oficiales y CSV pseudonimizado. |
| **Generación de PDFs clínicos** | **Playwright / Puppeteer (HTML→PDF)** | **Aprobado** | PDF institucional con membrete, tabla perinatal a 2 columnas y bloque de firma médica. |
| **Validación de esquemas** | **Zod** | **Aprobado** | Validación determinística de formularios condicionales y descarte limpio de ramas cerradas. |
| **Autenticación** | Sesiones `HttpOnly` + **Argon2id** (+ TOTP opcional) | **Aprobado** | Usuarios propios con RBAC por endpoint y timeout por inactividad. |
| **Testing** | **Vitest** (motor clínico/UI) + **Playwright** (E2E) | **Aprobado** | Cobertura obligatoria en fórmulas clínicas (Fenton, Kaiser, CRIB II, DBP, tricotomía). |
| **Contenedores e Infra (VPS)** | **Docker + Docker Compose + Caddy** (HTTPS automático) | **Aprobado** | Misma definición reproducible en `dev`, `test`, `preprod` y `prod`. |

---

## 2. Estrategia de Transición: Maqueta HTML/CSS/JS → Producto Next.js

1. **Fase Maqueta (`maqueta/`):** prototipo interactivo autocontenido en HTML, CSS y JS con datos ficticios para revisar con la clínica todas las pantallas, los 6 recorridos, los componentes reutilizables y la relación entre datos.
2. **Fase Producto (`src/` + `prisma/`):** una vez aprobada la maqueta por la clínica, los tokens visuales, los componentes validados y las reglas del motor clínico se portan directamente a Next.js + TypeScript + PostgreSQL + Prisma.

---

## 3. Estructura Objetivo del Repositorio (Producto)

```text
NEOSalud/
├── docs/                  # Documentación funcional, UX/UI, arquitectura y ADRs
├── maqueta/               # Maqueta navegable en HTML/CSS/JS para validación con la clínica
├── prisma/                # Esquema PostgreSQL, migraciones y seeds (solo dev/test/preprod)
├── src/
│   ├── app/               # Rutas Next.js (UI + API route handlers)
│   ├── components/        # Sistema de diseño y componentes clínicos reutilizables
│   ├── clinical-engine/   # Motor determinístico puro (Fenton, Kaiser, CRIB II, DBP, borradores, tasas)
│   ├── server/            # Servicios de dominio, RBAC, import/export, auditoría
│   └── types/             # Tipos y esquemas Zod compartidos
├── tests/                 # Vitest (motor clínico) + Playwright (E2E)
├── docker/                # Dockerfiles, Caddyfile y scripts de backup cifrado
└── docker-compose.*.yml   # Perfiles dev / test / preprod / prod
```
