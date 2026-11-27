# NeoSalud

Sistema de control clínico y gestión para Servicios de Neonatología / UCIN.

> **Estado:** fase de validación con la clínica mediante una maqueta navegable con **datos ficticios**. No contiene ni debe contener datos reales de pacientes.

## Maqueta navegable

- **En línea:** https://alejopalavecino.github.io/NeoSalud/
- **Local:** servir la carpeta por HTTP (abrir `index.html` como archivo bloquea el guardado local del navegador):

  ```bash
  python -m http.server 5180 --directory maqueta
  ```

  y abrir http://localhost:5180

Cada push a `main` que modifique `maqueta/` vuelve a publicar el sitio mediante el workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

## Documentación

Toda la definición funcional, UX/UI, arquitectura y decisiones (ADR) está en [`docs/`](docs/README.md). La guía para recorrer la maqueta está en [`docs/guia-uso-maqueta.md`](docs/guia-uso-maqueta.md).
