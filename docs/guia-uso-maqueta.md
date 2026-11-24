# Guía de Uso de la Maqueta · NeoSalud

Instrucciones paso a paso para recorrer, probar y presentar la **maqueta navegable de NeoSalud** (`maqueta/`) ante el equipo médico y directivo de la clínica.

> **Importante:** esta maqueta utiliza **datos 100 % ficticios** guardados localmente en el navegador (`localStorage`) y opera **sin módulos de IA**. No requiere instalación ni compilación.

---

## 1. Cómo abrir y reiniciar la maqueta

1. Abrí el archivo `maqueta/index.html` con doble clic en tu navegador (Chrome, Edge o Firefox).
   - *Opcional (con servidor local):* desde la raíz del proyecto podés ejecutar `python -m http.server 8765 --directory maqueta` y entrar a `http://localhost:8765`.
2. Al pie del menú lateral izquierdo tenés dos utilidades siempre disponibles:
   - **Guion de recorridos:** resumen rápido de la demostración para tener a mano durante la reunión.
   - **Reiniciar maqueta:** restaura los **8 casos ficticios iniciales** y borra los cambios de prueba hechos en el navegador.

---

## 2. Cambio de perfil / rol (RBAC)

En la esquina superior derecha está el botón del profesional activo (por defecto **Dra. Elena Torres · Neonatóloga de planta**). Al hacer clic podés alternar entre **5 perfiles** para comprobar cómo cambian los permisos en tiempo real:

| Perfil | Qué puede hacer en la maqueta |
| :--- | :--- |
| **Dra. Elena Torres** *(Neonatóloga de planta)* | Carga completa, edición, firma de ingreso/epicrisis, importación y exportación completa. |
| **Dr. Lucas Benítez** *(Médico de guardia)* | Carga, edición, firma e importación; la exportación completa queda restringida. |
| **Lic. Martín Vera** *(Jefe de Enfermería)* | Carga de pacientes, edición clínica e importación; **no puede firmar** ingresos ni epicrisis médicas. |
| **Dra. Carolina Méndez** *(Jefa de Neonatología)* | Acceso completo a toda la operación clínica, firma y exportación. |
| **Dra. Paula Ibarra** *(Dirección · Solo consulta)* | Lectura de censo, fichas y estadísticas; **sin botones de alta, edición, firma ni importación**. |

---

## 3. Recorrido paso a paso por cada sección

### Sección 1 · Inicio y censo
**Propósito:** panorama inmediato del servicio al iniciar una guardia o pase de sala.

- **Qué ves:**
  - Franja superior de resumen operativo: *En la unidad hoy* (y % de ocupación), *Ingresos incompletos*, *Alertas de registro* y *Estadía media al alta*.
  - **Ocupación por sector:** barras por área (`UCIN`, `Cuidados Intermedios`, `Pre-alta / Engorde`, `Aislamiento`).
  - **Deuda clínica y validaciones pendientes:** lista accionable que detecta automáticamente ingresos sin firmar, borradores desfasados y cronologías abiertas.
  - **Última actividad auditada:** resumen de las últimas acciones registradas.
- **Qué podés hacer aquí:**
  - Hacer clic en **Crear paciente** para iniciar un alta rápida.
  - Hacer clic en **Completar ingreso**, **Revisar borrador** o **Abrir línea de tiempo** en cualquier alerta para saltar directo al problema.
  - Cambiar al perfil *Dirección · Solo consulta* para mostrar cómo desaparecen las acciones de escritura.

---

### Sección 2 · Pacientes (Padrón y pases de sector)
**Propósito:** buscar cualquier recién nacido histórico o activo y gestionar movimientos internos.

- **Qué podés hacer aquí:**
  1. **Filtrar el padrón:** combiná texto libre (nombre, ID `NEO-2026-...`, HC o DNI materno), **Estado**, **Sector** y **Edad gestacional**.
  2. **Crear un paciente nuevo:** hacé clic en **Crear paciente**, completá los datos mínimos (Nombre, Sexo, Fecha, EG, Peso y Sector) y confirmá. El sistema asigna el correlativo automático (`NEO-2026-000009`) en estado **Ingreso incompleto** y te lleva directo a su ficha.
  3. **Realizar un pase interno:** usá el botón **Pase** en cualquier fila para mover al paciente entre sectores (`UCIN → Intermedios → Pre-alta`) dejando registro en la auditoría.

---

### Sección 3 · Ficha de ingreso
**Propósito:** cargar el ingreso una sola vez con formulario condicional, calculadoras automáticas y borrador honesto.

> **Al entrar a cualquier ficha clínica** (Ingreso, Hospitalización o Epicrisis) aparece la **barra contextual del paciente** arriba, con un selector para cambiar rápido de recién nacido y sub-pestañas para moverte entre sus 3 vistas sin perder contexto.

- **Qué podés probar aquí:**
  1. **Filtrar bloques:** escribí `diabetes` o `reanimación` en el buscador superior para ver solo las secciones relevantes.
  2. **Antropometría y Fenton 2025:** modificá el peso o la edad gestacional (por ejemplo en **Lucas Pereyra**) y mirá cómo se recalculan al instante el **Z-score**, el **percentil** y la clasificación (`PEG / AEG / GEG`).
  3. **Lógica condicional sin datos huérfanos:** cambiá *Paridad* a `Multípara`, *Diabetes materna* a `Sí`, *RPO* a `Sí` o *¿Requirió reanimación?* a `Sí` para abrir sus subcampos. Si luego volvés la respuesta a `No`, la maqueta descarta los subcampos ocultos y avisa que no quedaron datos huérfanos.
  4. **Calculadoras automáticas por criterio:**
     - Seleccioná a **Alma Ríos (`24+2`, `640 g`)** → aparece automáticamente el **Score CRIB II**.
     - Seleccioná a **Mateo Cabrera (`38+4`)** → aparece automáticamente la **Calculadora Kaiser 2024** de sepsis precoz (cambiá el *Estado clínico* para ver variar el riesgo posterior y la recomendación).
  5. **Catálogo CIE-10 cerrado:** buscá `sepsis` o `ductus` en Diagnósticos de ingreso y agregá o quitá códigos como etiquetas.
  6. **Generador determinístico, desfasaje y validación:**
     - En **Lucas Pereyra**, hacé clic en **Generar borrador** (verás la animación de consolidación de datos). Notá que nunca inventa normalidad: lo vacío sale como `Sin responder` y el examen físico deja espacios `_____`.
     - Luego cambiá la **Temperatura de ingreso** (ej. `36.5 → 36.9`): aparece automáticamente el banner ámbar de **Borrador desfasado** indicando exactamente qué variable cambió.
     - Probá hacer clic en **Validar ingreso** con los `_____` sin completar (el sistema bloquea la firma) o regenerá el borrador, completá el examen físico y validá para pasarlo a estado **Hospitalizado**.
     - Usá **Vista impresión** para previsualizar el formato PDF/imprimible.

---

### Sección 4 · Hospitalización y líneas de tiempo
**Propósito:** registrar hechos clínicos por evento para que el sistema derive totales, clasificaciones y resúmenes sin contar días a mano.

> **Caso recomendado:** seleccioná a **Alma Ríos (`24+2`, `640 g`, `112 días`)** en el selector superior.

- **Sub-pestañas disponibles:**
  1. **Respiratorio:**
     - Muestra el **Resumen calculado** (días de O₂, CPAP, VNI, VMC, VAFO, FiO₂ máx 24 h, O₂ día 28, O₂ 36 sem, **DBP Jensen** y **DBP Bancalari**) y la línea de tiempo horizontal por día de vida.
     - Hacé clic en **Agregar cambio** para sumar un evento ventilatorio y ver el recálculo inmediato.
     - Alterná **Cobertura de cronología** (`Cronología incompleta` vs. `Completa al corte`) para ver cómo el sistema evita afirmar un «No» falso mientras el registro sigue abierto.
  2. **Nutrición y Digestivo:** muestra las **3 vías simultáneas** (Enteral, Parenteral y Suplementos) y deriva automáticamente días de NPT, inicio enteral, leche materna, día de 100 cc/kg/d y fortificación. Podés sumar eventos con **Agregar evento**.
  3. **Infeccioso / IAAS:** carga episodios con gérmenes y antibióticos desde catálogos cerrados e indica si hubo asociación a catéter.
  4. **Accesos Vasculares:** unifica `CVU`, `CAU`, `PICC` y `CVC` y deriva los **días-catéter totales y por tipo**.
  5. **Transfusiones:** registra episodios con hemocomponente, indicación, volumen (`mL/kg`) y reacción.
  6. **Cardio · Neuro · ROP · Cirugía:** agrupa DAP, ecografía/RMN cerebral, controles oftalmológicos **ROP** (calculando automáticamente el peor estadio) y procedimientos quirúrgicos.

---

### Sección 5 · Egreso y epicrisis
**Propósito:** cerrar la internación consolidando todas las líneas de tiempo en un documento estructurado por sistemas.

- **Qué podés hacer aquí:**
  1. Completar los datos de egreso: fecha, condición, destino, peso al alta, alimentación (`LME`, mixta, fórmula), oxígeno domiciliario, **pesquisas obligatorias** (FEI, OEA) y **vacunas** (BCG / Hep B).
  2. Hacer clic en **Generar epicrisis** (con animación de síntesis por sistemas) para producir el texto completo de 8 bloques desde todas las líneas de tiempo.
  3. Editar manualmente el borrador si hace falta, revisar el **Vista impresión** y hacer clic en **Validar epicrisis** (con rol médico) para cerrar el episodio en estado **Egresado** o **Fallecido**. La validación exige **fecha de egreso**, **condición al egreso** y ningún espacio `_____` pendiente.
  4. Un documento firmado (ingreso o epicrisis) queda en **solo lectura**. Para corregirlo, usar **Crear enmienda** e indicar el motivo: la versión firmada se conserva (botón **Ver**) y el texto vuelve a borrador para una nueva firma.
  5. Si regenerás un borrador con ediciones manuales, la maqueta pide confirmación: las líneas `_____` que ya completaste se conservan y el resto del texto se rearma desde los datos.

---

### Sección 6 · Importar Excel / CSV
**Propósito:** demostrar cómo incorporar planillas existentes sobre un sistema que arranca limpio en producción, sin IA y sin riesgo de cruzar pacientes.

- **Qué podés hacer aquí:**
  1. **Descargar plantilla CSV:** baja el archivo modelo oficial (`plantilla_neosalud_v1.csv`).
  2. **Cargar un CSV propio** o hacer clic en **Cargar lote de ejemplo (semana 47)** → se muestra la **animación de carga en 3 etapas** (lectura, verificación 3-ID y preparación de bandeja).
  3. **Revisar la barrera de 3 identificadores (`HC + Sexo + Fecha de nacimiento`):**
     - *Olivia Gómez* aparece lista como **Nuevo ingreso**.
     - *Lucas Pereyra* aparece como **Actualización verificada** con el detalle de los campos que modificaría.
     - *Mateo Cabrera* aparece **Bloqueado por 3-ID** porque el sexo en la planilla (`F`) no coincide con el de su ficha (`M`).
  4. **Aprobar / Rechazar y confirmar:** aprobá las filas válidas y hacé clic en **Confirmar lote** para ver la carga aplicada en el padrón y en la bitácora de auditoría.

---

### Sección 7 · Estadísticas e indicadores
**Propósito:** presentar tasas confiables para Jefatura y Dirección con denominadores explícitos.

- **Qué podés hacer aquí:**
  - Combinar los filtros de **Sector**, **Edad gestacional** y **Peso al nacer** (probá elegir `< 1.500 g` para ver la cohorte de muy bajo peso).
  - Revisar **Mortalidad sobre desenlace conocido** (separando los pacientes aún internados), **Bacteriemia por 1.000 días-catéter**, **NAV por 1.000 días-ventilador** y **Lactancia materna exclusiva al alta**.
  - Observar en cada morbilidad la **barra de tricotomía**: separa visualmente *Sí*, *No*, *En riesgo sin dato (deuda de registro)* y *Fuera de riesgo (No aplica)*.

---

### Sección 8 · Exportación y diccionario
**Propósito:** descargar bases listas para gestión, auditoría o investigación.

- **Qué podés hacer aquí:**
  - Descargar archivos reales generados desde el estado actual: **Base maestra (CSV)**, **CSV pseudonimizado** (sin nombres ni DNI), **JSON completo** y **Diccionario de datos v1.0** (cada descarga muestra una breve animación de preparación).
  - Recorrer las **5 pestañas de vista previa** que componen el Excel Maestro del producto final (`1. Metadatos y lectura`, `2. Base maestra`, `3. Diccionario`, `4. Resumen estadístico`, `5. Deuda de registro`).

---

### Sección 9 · Administración y auditoría
**Propósito:** mostrar gobernanza, roles, arquitectura de 4 ambientes en VPS y trazabilidad real.

- **Qué ves aquí:**
  - Resumen de los 4 ambientes (`dev`, `test`, `preprod`, `prod` con arranque limpio) y política de backups cifrados en VPS.
  - Tabla resumen de permisos **RBAC** por perfil.
  - **Bitácora de auditoría en vivo:** muestra cada alta, pase de sector, edición, validación, importación o exportación que ejecutaste durante la demostración.

---

## 4. Guion sugerido de presentación en 10 minutos (para la clínica)

1. **Minuto 0–2 · Inicio y Roles:** mostrar ocupación por sector, alertas de deuda clínica y el cambio de perfil a *Dirección (Solo consulta)* y *Enfermería*.
2. **Minuto 2–4 · Ingreso condicional:** en *Lucas Pereyra*, abrir `Reanimación = Sí`, generar el borrador y modificar la temperatura para demostrar el aviso de desfasaje. Mostrar *Mateo Cabrera* para **Kaiser 2024**.
3. **Minuto 4–6 · Líneas de tiempo y Epicrisis:** en *Alma Ríos (24+2)*, recorrer la línea respiratoria (y su DBP Jensen/Bancalari derivada), la nutricional de 3 vías, catéteres y generar/previsualizar la **Epicrisis**.
4. **Minuto 6–8 · Importación segura:** cargar el lote de ejemplo en *Importar Excel / CSV*, señalar el **bloqueo automático por 3-ID** en *Mateo Cabrera* y aprobar a *Olivia Gómez*.
5. **Minuto 8–10 · Estadísticas, Exportación y Auditoría:** filtrar `< 1.500 g` en Estadísticas, explicar *Fuera de riesgo vs. Deuda de registro*, mostrar las 5 hojas de Exportación y cerrar en la bitácora de auditoría mostrando todo lo registrado en vivo.
