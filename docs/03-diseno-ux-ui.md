# 03 · Diseño UX / UI y Especificación de la Maqueta

Este documento establece la dirección visual, ergonomía clínica, estados de interfaz y criterios de accesibilidad de NeoSalud, tomando como base la identidad limpia de `DocNeo-Demo` y escalándola para formularios complejos y líneas de tiempo UCIN.

---

## 1. Usuarios, Contexto de Uso y Criterios UX

- **Ambiente real de uso:** salas de neonatología y puestos de guardia con iluminación variable, turnos largos, interrupciones frecuentes y PCs compartidas.
- **Objetivos UX medibles:**
  - **Cero ambigüedad de paciente activo:** siempre visible el banner del recién nacido seleccionado al cargar datos clínicos.
  - **Baja carga cognitiva en formularios largos:** campos condicionales ocultos por defecto, buscador interno de variables y secciones colapsables con indicador de completitud.
  - **Prevención de errores clínicos:** confirmaciones explícitas al descartar ramas condicionales con datos, bloqueo visible de validación si faltan placeholders y barrera de 3 identificadores al importar archivos.
  - **Sin scroll horizontal accidental:** corregir el overflow de pestañas de la app de referencia usando navegación lateral colapsable.

---

## 2. Sistema Visual (Evolución de `DocNeo-Demo`)

Se conserva la identidad serena y hospitalaria de `DocNeo-Demo` —evitando saturación visual y colores estridentes— y se incorporan tokens semánticos clínicos para alertas, deuda de registro y estados de cronología.

### Paleta de colores

| Token | Hex | Uso principal |
| :--- | :--- | :--- |
| `--teal` | `#087970` | Acción primaria, foco activo, indicadores de completitud. |
| `--teal-dark` | `#005f58` | Hover de botones primarios y encabezados de énfasis. |
| `--navy` | `#102f39` | Títulos principales, sidebar activo y contraste alto. |
| `--ink` | `#19383d` | Texto principal (contraste WCAG AA/AAA sobre blanco). |
| `--muted` | `#526b70` | Etiquetas secundarias, metadatos y ayuda contextual. |
| `--bg` | `#f5f8f8` | Fondo general de la aplicación. |
| `--surface` | `#ffffff` | Tarjetas, paneles de formulario y tablas. |
| `--soft` | `#e6f3f0` | Fondos suaves de selección, resúmenes autocalculados y badges OK. |
| `--line` | `#d9e3e4` | Bordes sutiles de tarjetas, inputs y divisores. |
| `--amber-bg` / `--amber` | `#fef3e2` / `#85571d` | Alertas clínicas: borrador desfasado, deuda de registro (*Sin dato*), cronología incompleta. |
| `--danger-bg` / `--danger` | `#fdecec` / `#9b2226` | Errores de validación, bloqueo por identidad (3-ID), estado crítico. |
| `--lav` | `#eeeaf8` | Etiquetas neutras / *No aplica (fuera de riesgo)* para distinguir claramente de deuda de registro. |

### Tipografía y densidad
- **Familia principal:** `Lexend` (con fallback `system-ui, -apple-system, "Segoe UI", sans-serif`) — alta legibilidad en lectura rápida de valores numéricos y abreviaturas clínicas.
- **Números tabulares:** aplicar `font-variant-numeric: tabular-nums` en todas las tablas, Z-scores, percentiles, días de ventilación y tasas estadísticas para alinear columnas correctamente.
- **Escala base:** `14px` texto general, `12px–13px` etiquetas y badges, `20px–24px` títulos de pantalla, con espaciado generoso (`16px–24px`) entre bloques clínicos.

---

## 3. Patrones de Interfaz Clave

| Patrón | Diseño en NeoSalud | Qué problema de la referencia resuelve |
| :--- | :--- | :--- |
| **Shell principal** | Sidebar izquierdo fijo (`240px`, colapsable en móvil/tablet) + Topbar (`56px`) con breadcrumb, ambiente actual (badge `DEMO / DEV / PREPROD`, oculto en `PROD`) y selector de usuario/rol. | Elimina la barra de 7 pestañas con overflow horizontal en `1440×900`. |
| **Header de paciente** | Franja fija superior dentro de `/pacientes/:id/*` con nombre, ID correlativo, estado, sector, EG, peso y sub-tabs (`Ingreso`, `Hospitalización`, `Epicrisis`). | Evita confundir pacientes cuando hay varias pestañas o cambios de guardia. |
| **Campos calculados** | Chips/tarjetas de solo lectura con fondo `--soft` y texto completo (sin truncar dentro de un `<input>` angosto). | Corrige los inputs cortados de Fenton y procedimientos en la referencia. |
| **Buscador CIE-10** | Combobox con portal/popover flotante que calcula espacio hacia arriba/abajo y nunca tapa botones inferiores. | Corrige el bug donde la lista abierta tapaba `Generar borrador`. |
| **Líneas de tiempo** | Eje cronológico scrolleable con chips de evento por día (`D0..Dn`), botón `+ Agregar cambio`, tarjeta de resumen derivado visible al costado o arriba, y control claro de `Cobertura de cronología`. | Hace visible la cobertura de cronología (ya no escondida en un `<select>` secundario). |
| **Banner de desfasaje** | Banner ámbar sticky sobre el editor del borrador detallando campo por campo qué cambió, con acciones `Regenerar borrador` o `Revisar cambios`. | Mantiene transparencia total entre datos estructurados y texto médico. |
| **Tricotomía estadística** | Cada tarjeta de indicador muestra: tasa principal (`2/5 · 40%`), badge neutro `3 fuera de riesgo` y badge ámbar `2 en riesgo sin dato`. | Impide que el lector interprete «sin dato» como «paciente sano». |

---

## 4. Estados Obligatorios en Todas las Vistas

Cada pantalla de la maqueta y del producto final debe contemplar explícitamente:

1. **Estado vacío (`empty`):** mensaje claro y acción principal (ej.: en producción limpia, *"Todavía no hay pacientes registrados — Crear primer paciente o Importar Excel/CSV"*).
2. **Carga (`loading`):** skeletons ligeros que preserven el layout sin saltos visuales.
3. **Error de validación (`error`):** mensajes inline junto al campo afectado + resumen navegable arriba del formulario.
4. **Permiso denegado / Solo lectura (`denied` / `readonly`):** para roles como *Dirección*, ocultar o deshabilitar con explicación los botones de edición/firma sin romper la consulta.
5. **Borrador desfasado (`stale`):** bloqueo visual de validación hasta revisar o regenerar.
6. **Confirmación destructiva o de rama condicional:** modal de confirmación si al cambiar una respuesta condicional se descartarán datos ya cargados en subcampos.

---

## 5. Accesibilidad y Responsive

- **Teclado y foco:** navegación completa por `Tab`, foco visible (`2px solid var(--teal)`), cierre de modales/drawers con `Esc` y atajos básicos en buscadores.
- **Semántica ARIA:** landmarks (`<aside>`, `<header>`, `<main>`), `aria-live="polite"` para toasts y cálculos automáticos (Fenton, Kaiser, CRIB II), etiquetas `<label>` vinculadas a cada input.
- **Contraste:** mínimo `4.5:1` para texto normal y `3:1` para badges, bordes activos y elementos de gráfico.
- **Breakpoints:**
  - **Desktop amplio (`≥ 1280px`):** sidebar fijo + grilla de 2 columnas en formularios/estadísticas.
  - **Laptop estándar (`1024px – 1279px`):** sidebar compacto o colapsable + formularios holgados sin cortes.
  - **Tablet / Móvil (`< 1024px`):** sidebar en cajón deslizable (`drawer` con scrim) + tarjetas apiladas y tablas con scroll horizontal contenido dentro de su panel.

---

## 6. Alcance de la Maqueta Navegable (Siguiente Entrega)

Para validar rápidamente con la clínica antes de programar el backend completo, la maqueta navegable deberá cumplir con:

- [ ] **Estética definitiva NeoSalud** (paleta, tipografía y sidebar de esta especificación).
- [ ] **Selector de rol interactivo** en la barra superior (Médica Neonatóloga, Enfermería, Guardia, Jefatura, Dirección solo lectura) para demostrar permisos en vivo.
- [ ] **Datos ficticios realistas precargados en modo Maqueta/Demo** (incluyendo al menos: prematuro extremo `24+2` con todas las líneas de tiempo, RN término `38+4` para demostrar Kaiser 2024, un ingreso incompleto y un egresado) más un botón de *Resetear demo*.
- [ ] **Las 9 secciones navegables** cubriendo los 6 recorridos definidos en [02 · Secciones y Recorridos](./02-secciones-y-recorridos.md), con interactividad real en formularios condicionales, calculadoras, desfasaje de borradores, filtros de estadísticas y simulación de importación Excel/CSV.
- [ ] **Banner discreto de «Maqueta interactiva · Datos ficticios»** para evitar cualquier confusión durante la presentación institucional.
