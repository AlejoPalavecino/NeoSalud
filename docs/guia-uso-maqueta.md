# Guía de uso de la maqueta · NeoSalud

La maqueta navegable sirve para **validar con el servicio de Neonatología** si las secciones, los datos y los flujos propuestos son los que necesitan. Todo es simulado: datos ficticios, flujos y animaciones. Nada se guarda fuera del navegador y no hay IA.

> **Objetivo de la reunión:** salir con respuestas concretas a cuatro preguntas. ¿Falta alguna variable que hoy registran a mano? ¿Sobra alguna? ¿El borrador dice algo que redactarían distinto? ¿Las tasas son las que informan a Jefatura?

---

## 1. Cómo abrirla

- **En línea:** https://alejopalavecino.github.io/NeoSalud/
- **En la computadora:** desde la raíz del proyecto, `python -m http.server 5180 --directory maqueta` y abrir http://localhost:5180. Si se abre `index.html` con doble clic, el navegador bloquea el guardado local.

En el pie del menú lateral hay dos utilidades:

- **Guion de recorridos:** el resumen de esta guía, para tener a mano durante la reunión.
- **Reiniciar maqueta:** vuelve a los **30 pacientes ficticios** iniciales y borra lo que se haya cargado en la demo.

### Cómo leer las pantallas

| Señal | Qué significa | Para qué sirve en la reunión |
| :--- | :--- | :--- |
| <kbd>A confirmar</kbd> (etiqueta ámbar) | Variable propuesta, tomada del sistema de referencia o de la práctica habitual. | Preguntar si hoy la registran. Si nadie la usa, se elimina. |
| Campo con borde punteado | Variable sin responder. | Mostrar que la app nunca completa datos por su cuenta. |
| Campo con marca teal «↳» | Pregunta que se abre solo por la respuesta anterior (rama). | Mostrar que, al cerrar la rama, lo cargado se descarta y queda auditado. |
| «12/20 completos» en cada sección | Avance de la carga en esa sección. | Detectar secciones que se completan poco en la práctica. |

---

## 2. Perfiles e ingreso a la maqueta (quién puede hacer qué)

Al abrir la maqueta aparece una pantalla con una tarjeta por usuario. Cada tarjeta dice qué puede hacer ese rol (✓) y qué no (—). Se entra con un clic; en producción será con usuario y contraseña. Para cambiar de perfil, tocar el nombre arriba a la derecha: cierra la sesión y vuelve a esta pantalla.

| Rol | Usuarios de la demo | Qué puede hacer |
| :--- | :--- | :--- |
| **Jefatura de Neonatología** | Dra. Carolina Méndez | Todo, incluida la **Administración** de usuarios y permisos. |
| **Neonatología de planta** | Dra. Elena Torres | Carga, firma, importación y exportación completa. |
| **Guardia médica** | Dr. Lucas Benítez | Carga, firma e importación. Sin exportación completa. |
| **Residencia** | Dra. Sofía Ruiz | Ingresa y carga; **no firma**. |
| **Enfermería** | Lic. Martín Vera, Lic. Ana Paz | Ingresa, carga e importa. **No firma**. |
| **Dirección · solo consulta** | Dra. Paula Ibarra | Ve todo sin poder modificar nada. |

**Preguntar:** ¿estos roles representan a quienes van a usar el sistema? ¿Los residentes firman solos o con co-firma? ¿Enfermería carga las cronologías de soporte y accesos?

---

## 3. Recorrido por sección: qué mostrar y qué preguntar

### 3.1 Inicio

Un tablero para empezar la guardia: internados y cunas libres, ingresos y egresos del día, ingresos sin firmar, altas pendientes (epicrisis sin firmar) e internados con datos por completar. Cada número lleva al lugar donde se resuelve.

**Mostrar:**

- **Para resolver:** firmas pendientes, registros con problemas (por ejemplo, un cambio respiratorio sin modalidad) y cronologías abiertas. Cada línea abre al paciente en la pestaña justa.
- **Actividad reciente:** lo último que quedó en la bitácora.
- **Mapa de cunas** por sector, con búsqueda por nombre, HC o DNI de la madre. Una **cuna libre** abre el ingreso rápido con el sector ya elegido.

**Preguntar:** ¿qué quieren ver primero al empezar una guardia? ¿Los sectores y la cantidad de cunas son los reales?

### 3.2 Ingreso

**Ingreso rápido** en la misma página: solo el nombre es obligatorio y todo lo clínico queda «Sin responder». «Crear y seguir ingresando» deja el formulario listo para el próximo; «Crear y completar la ficha» abre la ficha completa. Al lado, las **fichas de ingreso** por completar o firmar y las firmadas, con buscador. El mismo ingreso rápido está en Inicio, en las cunas libres y en Hospitalización.

**Preguntar:** ¿con qué datos mínimos abren hoy un ingreso? ¿Quién completa la ficha y quién la firma?

### 3.3 Ficha de ingreso completa

Cinco secciones que se pliegan: identificación y nacimiento, embarazo, serologías, parto y recepción. El buscador de arriba encuentra variables sin importar tildes (probar «chagas» o «reanimacion»).

**Mostrar:**

1. **Identificación argentina:** DNI del RN (con «En trámite»), DNI materno, HC, cobertura (obra social / prepaga / sin cobertura y SUMAR), procedencia y derivación.
2. **Ramas condicionales:** *Embarazo múltiple = Gemelar* abre corionicidad y orden. *Sífilis (VDRL) = Reactiva* abre el tratamiento materno. Volver a «No» los descarta y lo registra en la auditoría.
3. **Calculadoras:** *Mateo Cabrera (38+4)* muestra **Kaiser 2024**. *Alma Ríos (24+2)* muestra **CRIB II** y **Fenton 2025**. Si falta un dato, la calculadora dice cuál falta en lugar de suponerlo.
4. **Borrador:** tabla perinatal a dos columnas, anamnesis, examen físico con `_____`, diagnósticos e indicaciones. Si la madre es Chagas reactiva, la indicación del micrométodo aparece sola.
5. **Desfasaje y enmienda:** en un ingreso firmado, cambiar una serología muestra qué cambió. El documento firmado no se toca: **Crear enmienda** pide un motivo y conserva la versión anterior.

**Preguntar:**

- Recorrer las variables con etiqueta **A confirmar**: ¿las registran hoy? ¿Cuáles sobran?
- ¿Falta alguna variable que hoy anotan a mano?
- ¿La redacción del borrador es la que usan? ¿Las marcas «Sin responder» deben salir impresas o solo bloquear la firma?
- ¿Cargan el **SIP** (Sistema Informático Perinatal)? Si sí, conviene alinear las variables para no cargar dos veces.

### 3.4 Hospitalización y epicrisis

A la izquierda, los pacientes (internados, egresados o todos, con buscador); a la derecha, la cabecera del bebé y una pestaña por sistema: **Resumen, Respiratorio, Cardiovascular, Infeccioso, Nutrición y crecimiento, Prematurez, Neurológico, Hematología, Accesos vasculares, Procedimientos y Epicrisis y egreso**. Cada pestaña muestra cuántas preguntas quedan sin responder. Incluye todo lo relevado del sistema de referencia (ver `docs/07-hospitalizacion-epicrisis-referencia.md`).

**Mostrar con *Alma Ríos (24+2)*:**

1. **Resumen:** una tarjeta por sistema con su estado y los datos clave.
2. **Respiratorio:** la línea de tiempo con su resumen calculado (días por modalidad, O₂ al día 28 y a las 36 semanas, **DBP Jensen y Bancalari**). «Agregar cambio» abre el formulario con el mosaico de 10 modalidades; con cánula aparece el flujo y con «Fecha y hora» aparece la hora. Guardar un cambio sin modalidad muestra el aviso con «Ir al cambio».
3. **Sí / No con un clic:** marcar «Neumotórax: Sí» abre «Requirió drenaje pleural»; volver a «No» lo descarta y queda en la auditoría.
4. **Nutrición y crecimiento:** la evaluación nutricional seriada calcula sola la ganancia de peso (g/kg/día y g/semana) y el crecimiento de talla y perímetro cefálico.
5. **Prematurez:** exámenes quincenales del día 15 al 120, con aviso cuando un control cae fuera de la ventana de ± 4 días; controles de ROP con el peor estadio calculado. En un bebé de término la pestaña dice «No aplica» y por qué.
6. **Infeccioso:** episodios de IAAS con germen y antibióticos de lista cerrada; ramas de **transmisión vertical** si la serología materna fue reactiva (*Delfina Herrera*, Chagas; *Martina Álvarez*, sífilis congénita).
7. **Epicrisis y egreso:** condición y destino; con *Fallecido* se abren causas, lugar y autopsia. Pesquisas (FEI, OEA, oximetría, reflejo rojo) y vacunas. **Generar epicrisis** arma el texto por sistemas, incluida la secuencia de soporte respiratorio cambio por cambio. Lo que falta responder lleva a cada campo.

**Preguntar:** ¿registran por evento (cuando algo cambia) o día por día? ¿Usan los laboratorios quincenales del prematuro? ¿El orden de la epicrisis es el que usan? ¿Qué pesquisas y vacunas controlan al alta? ¿Quién firma la epicrisis de un fallecido?

### 3.5 Importar datos

Dos pestañas:

- **Planilla Excel / CSV:** el lote de ejemplo muestra un alta nueva, una actualización verificada por **HC + sexo + fecha de nacimiento** y un conflicto bloqueado.
- **Documento PDF / Word** (A confirmar): procesar la *nota de sala de partos* de *Lucas Pereyra*. Se ve el texto con los fragmentos reconocidos, la regla usada, los conflictos con la ficha y la decisión campo por campo. No usa IA: son reglas de texto fijas.

**Preguntar:** ¿tienen planillas históricas para migrar? ¿Reciben derivaciones en PDF o Word? ¿Les sirve importar desde documentos o prefieren cargar a mano?

### 3.6 Estadísticas

**Mostrar:** cada tasa con su denominador y la separación **Dato / Fuera de riesgo / Sin dato**. Con la cohorte demo: DBP 2/5 (40 %), mortalidad 9,1 % sobre desenlace conocido, sepsis precoz y tardía por separado, densidades por 1.000 días-catéter y días-ventilador. Filtrar por peso `< 1.500 g`.
**Preguntar:** ¿estas son las tasas que informan a Jefatura y Dirección? ¿Falta alguna (ocupación y giro cama, mortalidad por franja de peso, hipotermia al ingreso)? ¿Qué población define el riesgo para HIV y DAP?

### 3.7 Exportación

**Mostrar:** el Excel maestro de **7 hojas**, con «Cómo leer los valores», «Tasas de morbilidad» y el **diccionario de datos**, que lista todas las variables con su estado (núcleo, a confirmar o derivada). El diccionario se descarga en CSV.
**Preguntar:** ¿a quién le envían datos (red neonatal, Ministerio, comité de infecciones) y en qué formato?

> **Tip para la reunión:** descargar el diccionario CSV antes de empezar. Sirve como planilla de relevamiento: una fila por variable para marcar si se usa, si sobra o si falta algo.

### 3.8 Configuración y Administración

- **Configuración** (todos): «Mi perfil profesional» (el nombre y la matrícula con que se firma), datos institucionales, sectores y camas, catálogos y la descarga de una copia de seguridad. Con la jefatura, la **incidencia local de sepsis precoz** cambia el resultado de Kaiser.
- **Administración** (solo jefatura): **usuarios** (alta, edición, desactivar y reactivar), **roles y permisos** (una tabla de casillas que se aplica al instante) y la **bitácora de auditoría**. Para mostrarlo: quitarle «Firmar» a Guardia médica, entrar como *Dr. Lucas Benítez* y ver que «Validar ingreso» queda deshabilitado. La jefatura no puede quitarse la administración ni desactivarse a sí misma.

**Preguntar:** ¿quién da de alta a los usuarios? ¿Hace falta un rol más (por ejemplo, kinesiología o nutrición)? ¿Cuál es la incidencia de sepsis precoz del hospital? ¿Qué tiempo de cierre de sesión necesitan en las PC compartidas de guardia?

---

## 4. Guion sugerido de 15 minutos

1. **0–2 · Perfiles e Inicio:** la pantalla de perfiles con sus permisos; entrar como jefatura y recorrer el tablero. Volver a perfiles y entrar como *Dirección* para mostrar la vista de solo lectura.
2. **2–6 · Ingreso:** crear un paciente con solo el nombre desde Ingreso. Abrir *Mateo Cabrera* (Kaiser) y *Alma Ríos* (CRIB II). Abrir y cerrar la rama de embarazo gemelar. Recorrer las etiquetas «A confirmar» y preguntar cuáles usan.
3. **6–9 · Hospitalización y epicrisis:** *Alma Ríos* → Resumen, línea respiratoria (agregar un cambio), evaluación nutricional y quincenales. *Martina Álvarez* → sífilis congénita. Generar la epicrisis y leer dos secciones en voz alta.
4. **9–11 · Importación:** procesar la nota de sala de partos y aceptar o rechazar campos.
5. **11–13 · Estadísticas y exportación:** tasas con denominador y las 7 hojas del Excel.
6. **13–15 · Cierre:** volver a las cuatro preguntas y anotar las respuestas.

---

## 5. Lo que la maqueta no es

- **Las fórmulas son aproximadas.** Fenton, Kaiser y CRIB II reproducen el comportamiento de las calculadoras, pero no sus tablas y coeficientes oficiales. No usar para decisiones clínicas.
- **El catálogo CIE-10 tiene 32 diagnósticos.** En producción se usa el catálogo completo de la OPS.
- **La importación de documentos es una simulación** con dos documentos de ejemplo.
- **Los datos viven solo en el navegador** de quien la usa. No hay servidor, usuarios reales, contraseñas ni firma digital: el ingreso por perfil es una simulación.
