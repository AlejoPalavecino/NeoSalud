# Guía de uso de la maqueta · NeoSalud

La maqueta navegable sirve para **validar con el servicio de Neonatología** si las secciones, los datos y los flujos propuestos son los que necesitan. Todo es simulado: datos ficticios, flujos y animaciones. Nada se guarda fuera del navegador y no hay IA.

> **Objetivo de la reunión:** salir con respuestas concretas a cuatro preguntas. ¿Falta alguna variable que hoy registran a mano? ¿Sobra alguna? ¿El borrador dice algo que redactarían distinto? ¿Las tasas son las que informan a Jefatura?

---

## 1. Cómo abrirla

- **En línea:** https://alejopalavecino.github.io/NeoSalud/
- **En la computadora:** desde la raíz del proyecto, `python -m http.server 5173 --directory maqueta` y abrir http://localhost:5173. Si se abre `index.html` con doble clic, el navegador bloquea el guardado local.

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

## 2. Perfiles (quién puede hacer qué)

Arriba a la derecha se cambia el perfil activo. La maqueta trae cinco:

| Perfil | Qué puede hacer |
| :--- | :--- |
| **Dra. Elena Torres** · Neonatóloga de planta | Carga, firma, importación y exportación completa. |
| **Dr. Lucas Benítez** · Médico de guardia | Carga, firma e importación. Sin exportación completa. |
| **Lic. Martín Vera** · Jefe de Enfermería | Carga e importación. **No firma** ingresos ni epicrisis. |
| **Dra. Carolina Méndez** · Jefa de Neonatología | Todo, incluidos los parámetros institucionales en Administración. |
| **Dirección** · Solo consulta | Lectura de censo, fichas y estadísticas, sin botones de escritura. |

**Preguntar:** ¿estos perfiles representan a quienes van a usar el sistema? ¿Los residentes firman solos o con co-firma?

---

## 3. Recorrido por sección: qué mostrar y qué preguntar

### 3.1 Unidad

Es la pantalla de inicio: un plano de cunas por sector. Cada cuna ocupada muestra al bebé, su EG, el día de vida, el peso y, si corresponde, una sola marca (rojo suave = falta una firma, amarillo = faltan datos).

**Mostrar:**

- 19 de 27 cunas ocupadas. Tocar una cuna abre la historia del bebé directamente en el paso que necesita atención: el ingreso si falta firmarlo, la internación si está internado, el egreso si ya se fue.
- Tocar una **cuna libre** abre el ingreso rápido con el sector ya elegido. Solo el nombre es obligatorio y todo lo clínico queda como «Sin responder».
- El panel **Para firmar** lista solo los documentos que esperan firma. La línea «N bebés tienen datos por completar» resalta esas cunas en el mapa.
- Debajo, **Egresos y fallecidos**, con búsqueda por nombre, HC o DNI de la madre.

**Preguntar:** ¿los sectores y la cantidad de cunas son los reales? ¿Qué quieren ver primero al empezar una guardia? ¿Con qué datos mínimos abren hoy un ingreso?

### 3.2 La historia de cada bebé

Arriba se ve quién es el bebé, con un enlace para volver a la unidad, y los tres pasos de la internación en orden: **1 Ingreso, 2 Internación, 3 Egreso**. Cada paso dice en qué estado está («Firmado», «Borrador sin firmar», «Al dar el alta»). Desde ahí también se cambia de sector.

**Preguntar:** ¿el recorrido Ingreso → Internación → Egreso refleja cómo trabajan?

### 3.3 Ficha de ingreso

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

### 3.4 Hospitalización y líneas de tiempo

**Mostrar con *Alma Ríos (24+2)*:** la línea respiratoria y su resumen calculado (días por modalidad, cánula de bajo y alto flujo por separado, O₂ al día 28 y a las 36 semanas, **DBP Jensen y Bancalari**). Agregar un cambio y ver el recálculo. Alternar la **cobertura de cronología**: con «incompleta», el sistema no afirma un «No».
**Mostrar también:**

- Debajo de cada línea de tiempo, los datos que se cargan una sola vez: NEC con estadio de Bell, perforación, peso mínimo, suplementos, cardio y neuro.
- En *Infeccioso*, las ramas de **transmisión vertical**: Chagas, sífilis, HIV y hepatitis B aparecen solo si la serología materna fue reactiva (*Delfina Herrera*, madre Chagas reactiva; *Martina Álvarez*, sífilis congénita en Aislamiento).

**Preguntar:** ¿registran por evento (cuando algo cambia) o día por día? ¿Usan los laboratorios quincenales del prematuro? ¿Qué falta en accesos vasculares o transfusiones?

### 3.5 Egreso y epicrisis

**Mostrar:** condición de egreso. Con *Fallecido* se abren causa básica (CIE-10), lugar y autopsia, y se ocultan los datos de egreso vivo. Pesquisas estructuradas (FEI, OEA, oximetría, reflejo rojo) y vacunas BCG y Hepatitis B. **Generar epicrisis** arma 12 secciones desde lo cargado.
**Preguntar:** ¿el orden de la epicrisis es el que usan? ¿Qué pesquisas y vacunas controlan al alta? ¿Quién firma la epicrisis de un fallecido?

### 3.6 Importar datos

Dos pestañas:

- **Planilla Excel / CSV:** el lote de ejemplo muestra un alta nueva, una actualización verificada por **HC + sexo + fecha de nacimiento** y un conflicto bloqueado.
- **Documento PDF / Word** (A confirmar): procesar la *nota de sala de partos* de *Lucas Pereyra*. Se ve el texto con los fragmentos reconocidos, la regla usada, los conflictos con la ficha y la decisión campo por campo. No usa IA: son reglas de texto fijas.

**Preguntar:** ¿tienen planillas históricas para migrar? ¿Reciben derivaciones en PDF o Word? ¿Les sirve importar desde documentos o prefieren cargar a mano?

### 3.7 Estadísticas

**Mostrar:** cada tasa con su denominador y la separación **Dato / Fuera de riesgo / Sin dato**. Con la cohorte demo: DBP 2/5 (40 %), mortalidad 9,1 % sobre desenlace conocido, sepsis precoz y tardía por separado, densidades por 1.000 días-catéter y días-ventilador. Filtrar por peso `< 1.500 g`.
**Preguntar:** ¿estas son las tasas que informan a Jefatura y Dirección? ¿Falta alguna (ocupación y giro cama, mortalidad por franja de peso, hipotermia al ingreso)? ¿Qué población define el riesgo para HIV y DAP?

### 3.8 Exportación

**Mostrar:** el Excel maestro de **7 hojas**, con «Cómo leer los valores», «Tasas de morbilidad» y el **diccionario de datos**, que lista todas las variables con su estado (núcleo, a confirmar o derivada). El diccionario se descarga en CSV.
**Preguntar:** ¿a quién le envían datos (red neonatal, Ministerio, comité de infecciones) y en qué formato?

> **Tip para la reunión:** descargar el diccionario CSV antes de empezar. Sirve como planilla de relevamiento: una fila por variable para marcar si se usa, si sobra o si falta algo.

### 3.9 Administración

**Mostrar:** con el perfil *Jefa de Neonatología*, editar los datos institucionales. La **incidencia local de sepsis precoz** cambia el resultado de Kaiser. También se ven sectores y camas, catálogos, perfiles y la bitácora de auditoría con todo lo hecho en la demo.
**Preguntar:** ¿cuál es la incidencia de sepsis precoz del hospital? ¿Qué tiempo de cierre de sesión necesitan en las PC compartidas de guardia?

---

## 4. Guion sugerido de 15 minutos

1. **0–2 · Unidad y perfiles:** plano de cunas, panel «Para firmar» y datos por completar. Cambiar a *Dirección* para mostrar la vista de solo lectura.
2. **2–6 · Ingreso:** tocar una cuna libre y crear un paciente con solo el nombre. Abrir *Mateo Cabrera* (Kaiser) y *Alma Ríos* (CRIB II). Abrir y cerrar la rama de embarazo gemelar. Recorrer las etiquetas «A confirmar» y preguntar cuáles usan.
3. **6–9 · Hospitalización y epicrisis:** *Alma Ríos* → línea respiratoria y DBP calculada. *Martina Álvarez* → sífilis congénita. Generar la epicrisis y leer dos secciones en voz alta.
4. **9–11 · Importación:** procesar la nota de sala de partos y aceptar o rechazar campos.
5. **11–13 · Estadísticas y exportación:** tasas con denominador y las 7 hojas del Excel.
6. **13–15 · Cierre:** volver a las cuatro preguntas y anotar las respuestas.

---

## 5. Lo que la maqueta no es

- **Las fórmulas son aproximadas.** Fenton, Kaiser y CRIB II reproducen el comportamiento de las calculadoras, pero no sus tablas y coeficientes oficiales. No usar para decisiones clínicas.
- **El catálogo CIE-10 tiene 32 diagnósticos.** En producción se usa el catálogo completo de la OPS.
- **La importación de documentos es una simulación** con dos documentos de ejemplo.
- **Los datos viven solo en el navegador** de quien la usa. No hay servidor, usuarios reales ni firma digital.
