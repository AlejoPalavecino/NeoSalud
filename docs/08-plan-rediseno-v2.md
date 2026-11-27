# Plan de diseño v2: navegación por tareas, Hospitalización y epicrisis, roles y estilo hospitalario

- **Fecha:** 2026-11-27 · **Estado:** los 4 cortes hechos.
- **Pedido:** incorporar todo lo que la referencia chilena registra en Hospitalización y Epicrisis ([07](./07-hospitalizacion-epicrisis-referencia.md)), sin copiar su forma de mostrarlo; reorganizar la navegación en accesos que sirvan; sumar login simulado y administración de usuarios; y un estilo visual de software hospitalario, cálido y descansado.

## 1. Problemas de la referencia que este diseño resuelve

| Problema en la referencia | Respuesta en NeoSalud |
| --- | --- |
| 9 sistemas, ~300 controles en un solo scroll | Una pestaña por sistema, con un **Resumen** que muestra el estado de cada uno y lleva directo a lo pendiente |
| No se ve qué paciente se está editando | Lista de pacientes a la izquierda + cabecera fija con nombre, EG, peso, día de vida, sector y estado |
| Sí/No en desplegables de 6 valores | Botones segmentados **No · Sí** y un tercero **Otro ▾** (Desconocido / No aplica / No consignado): 1 clic |
| Subsecciones sueltas al abrir un «Sí» | La rama aparece pegada y sangrada bajo la pregunta que la abrió |
| Lo calculado se ve como desplegable deshabilitado | Lo calculado se muestra como **dato leído** con la etiqueta «calculado de la cronología» |
| Marcadores diminutos sobre una regla de días | Barra de soporte por bandas de color (intensidad) + lista de cambios legible; cada cambio se edita en un panel |
| «Validar» falla con un texto rojo | Lista de faltantes con enlace a cada campo antes de firmar |

## 2. Navegación (barra lateral)

| Destino | Para qué | Quién lo ve |
| --- | --- | --- |
| **Inicio** | Tablero rápido: internados, ingresos incompletos, altas pendientes (epicrisis sin firmar), ingresos y egresos del día, mapa de cunas compacto, actividad reciente | Todos |
| **Ingreso** | Ingreso rápido (datos mínimos para abrir la cuna) e ingreso completo (ficha por secciones + borrador) | Quien puede crear pacientes |
| **Hospitalización y epicrisis** | Elegir paciente y completar los sistemas y el egreso | Todos (edición según rol) |
| **Importar datos** | Planillas y documentos | Quien puede importar |
| **Estadísticas** | Análisis detallado con filtros (período, sector, EG, peso, desenlace) | Todos |
| **Exportar** | Excel maestro, CSV, diccionario | Según rol |
| **Configuración** | Datos del profesional (para firmar), institución, respaldo | Todos (lo propio) |
| **Administración** | Usuarios, roles y permisos | Solo administrador (jefatura) |

El **ingreso rápido** queda disponible desde Inicio, desde una cuna libre y desde Hospitalización (botón «Nuevo ingreso»), siempre con el mismo formulario corto.

**Login simulado:** pantalla inicial con una tarjeta por perfil (Jefa de Neonatología, Neonatóloga de planta, Médico de guardia, Enfermería, Dirección) y debajo de cada una qué puede hacer. Se puede volver a ella desde el menú del usuario («Cambiar de perfil»).

## 3. Hospitalización y epicrisis

### 3.1 Disposición

```
┌ Pacientes ─────────┐┌ Cabecera: nombre · estado · EG · peso · DDV · sector ──────────────┐
│ Buscar             ││ Resumen │ Respiratorio │ Cardiovascular │ Infeccioso │ Nutrición … │
│ Internados │ Egres.││─────────────────────────────────────────────────────────────────────│
│ ● Paciente A  D18  ││ Contenido de la pestaña                                             │
│ ● Paciente B  D3   ││                                                                     │
└────────────────────┘└─────────────────────────────────────────────────────────────────────┘
```

En pantallas angostas la lista se vuelve un selector arriba y las pestañas se desplazan horizontalmente.

### 3.2 Pestañas y contenido (todo lo relevado en la referencia, adaptado)

| Pestaña | Contenido |
| --- | --- |
| **Resumen** | Una tarjeta por sistema: estado (completo / faltan N / no aplica), 2–3 datos clave y «Ir». Alertas: cronología abierta, epicrisis sin firmar |
| **Respiratorio** | Línea de tiempo (evento, precisión temporal, hora, FiO₂, modalidad en mosaico de 10, flujo para cánulas, PEEP, motivo) · Cobertura · Diagnósticos y complicaciones (SDR, surfactante → dosis, edad 1.ª dosis, método; neumotórax → drenaje) · DBP a las 36 semanas → Jensen y Bancalari calculadas + Jensen consignada · Resumen calculado |
| **Cardiovascular** | Ecocardiograma → cardiopatía, DAP → tratamiento farmacológico, cierre invasivo → tipo |
| **Infeccioso** | Sepsis precoz → cultivo → germen (lista cerrada) · Colonización → germen y resistencia · Transmisión vertical (Chagas, sífilis, HIV, HBV; adaptación argentina) · IAAS → episodios (cuadro, cultivo, foco, germen, 2 antibióticos, días) · Resumen inferido |
| **Nutrición y crecimiento** | Línea de tiempo nutricional (14 eventos + suplementos) · NPT, NEC → cirugía, perforación · Peso mínimo · Evaluación nutricional seriada (7 d, 14 d, 28 d, 36 sem, alta con velocidades calculadas) · Vitamina B12 del RN · Hitos calculados |
| **Prematurez** (< 32 sem o < 1.500 g) | Exámenes quincenales d15–d120 (20 analitos) · ROP: controles y resumen |
| **Neurológico** | Apneas, convulsiones · Ecografía y RM → mayor compromiso · Hidrocefalia → cirugía |
| **Hematología** | Fototerapia, hipoglucemia, trombocitopenia, Coombs · Transfusiones (hemocomponente, motivo, volumen, reacción) |
| **Accesos vasculares** | CVU, CAU, PICC, CVC → cronología de catéteres con días calculados |
| **Procedimientos** | Cirugías (tabla) · Otros procedimientos relevantes → detalle |
| **Epicrisis y egreso** | Datos de egreso (condición y destino separados; rama de fallecimiento con causa primaria y lugar) · Diagnósticos CIE-10 · Indicaciones · Medicamentos · Pesquisas argentinas (FEI, OEA, oximetría, reflejo rojo, BCG, HBV) · Documento generado con evolución por sistema · Faltantes antes de firmar · Firma y enmiendas |

Si un sistema no aplica (por ejemplo, Prematurez en un término), la pestaña se muestra atenuada con el motivo.

### 3.3 Reglas de interacción

- Cada cambio se guarda al salir del campo y queda en auditoría; cerrar una rama descarta sus subcampos (comportamiento actual).
- Lectura sin edición para los roles de solo consulta.
- Teclado: pestañas con flechas, botones segmentados con Tab/Espacio, foco visible.

## 4. Estilo visual «sala cálida»

- **Fondo crema** (#f5f1e8) y superficies marfil (#fffcf5), nunca blanco puro; bordes cálidos suaves.
- **Acento hospitalario verde azulado** (#0f6b6e, oscuro #0a5053) para acción y selección; azul clínico (#2d5f8f) para información; estados en tintes suaves (verde, ámbar, rojo ladrillo).
- **Tipografía:** Atkinson Hyperlegible Next para texto y datos (diseñada para legibilidad) y Lexend para títulos (pensada para reducir la fatiga visual); tamaño mínimo 13 px.
- **Bordes redondeados** 10–18 px, sombras muy suaves solo en tarjetas flotantes, contraste AA en todo el texto.

## 5. Cortes de entrega

| Corte | Contenido | Estado |
| --- | --- | --- |
| 1 | Estilo visual nuevo · barra lateral nueva · sección Hospitalización y epicrisis (lista, cabecera, pestañas, Resumen, todos los campos de esquema con Sí/No segmentado, Epicrisis y egreso con documento) | Hecho |
| 2 | Cronologías editables con todos los campos de la referencia · tablas seriadas (evaluación nutricional, quincenales) | Hecho |
| 3 | Inicio (tablero) · Ingreso rápido y completo · login simulado · Administración de usuarios y permisos | Hecho |
| 4 | Estadísticas detalladas con filtros y cohorte descargable (Configuración se separó en el corte 3; Exportar sin cambios) | Hecho |
