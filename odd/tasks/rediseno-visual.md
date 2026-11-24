# Feature: Rediseño visual y flujos simples de la maqueta

- **Spec:** #especificacion
- **Design:** #diseno-tecnico
- **Approval:** approved

## Especificacion

Pedido del usuario (2026-11-24): un diseño propio, no genérico, agradable a la vista, con poco ruido visual y poco cansancio, fácil y cómodo de leer. Flujos simples, sin vueltas para llegar a un lugar. Se conserva la barra lateral, reducida a 5 destinos y sin los ítems de paciente duplicados.

## Diseno tecnico

Estilo «calma clínica»: fondo gris verdoso de poco brillo, texto gris oscuro, un solo acento azul y estados en tintes suaves solo donde informan. Tipografía Atkinson Hyperlegible Next (la mono solo para identificadores), escala de 13 a 28 px y sin sombras. Unidad (plano de cunas por sector) reemplaza a Inicio y Pacientes; cada bebé se abre en su historia con 3 pasos (Ingreso, Internación, Egreso) y un enlace para volver a la unidad.

## Seguimiento Git (cuando corresponda)

Base `main` · rama `rediseno-visual` · merge a `main` (publica Pages) sujeto a OK del usuario.

## Tasks

### TASK-001 — Rediseño visual y navegación simplificada
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Acceptance:** La barra lateral tiene 5 destinos. Unidad muestra las cunas por sector, abre cada bebé en el paso que necesita atención y permite ingresar desde una cuna libre con el sector precargado. La historia muestra los 3 pasos con su estado y un enlace para volver a la unidad. No hay títulos duplicados en los pasos. Las tipografías y colores salen de los tokens (tamaño mínimo de 13 px). No hay desborde en 375 px.
- **Evidence:** 2026-11-24 · Navegador (:5173). Navegación: Unidad (19), Estadísticas, Importar datos, Exportar, Administración. Unidad: 19 cunas, 8 libres, 11 egresos; «Para firmar» con 2 pendientes y resaltado de 13 bebés con datos por completar; la búsqueda «alvarez» deja visible solo a Martina Álvarez y conserva el foco. Cuna libre de Aislamiento → alta rápida con sector Aislamiento (enfocable con teclado). Los 30 pacientes se abren desde Unidad (11 en Egreso, 16 en Internación, 3 en Ingreso) y recorren los 3 pasos y las 6 pestañas sin errores. 5 destinos + 3 pasos sin desborde en 375 px; los pasos de la historia quedan en una fila sin superposición y las pestañas de sistemas en una sola fila. Se eliminaron 330 líneas de las vistas Inicio y Pacientes, que habían quedado sin uso.
- **Blocker:** none
