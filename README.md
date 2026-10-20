# Plantillas Auge

Sitio estático con las plantillas para Grist.

## Demo local

```bash
docker compose up
```

- <http://localhost:8585/> — índice principal (enlaces a cada plantilla)
- <http://localhost:8585/diplomas_tribus/> — Diplomas Tribus

### Modos de prueba

Cada página de plantilla entiende dos query params:

- `?demo=1` — renderiza con datos de ejemplo (`exampleData.js`)
- `?labels=1` — muestra el nombre de cada columna (`<<Campo>>`), útil para
  armar la tabla en Grist

## Producción

`nginx/default.conf` sirve el repo tal cual es. Si más adelante querés
exponer cada plantilla en su propio subdominio, agregá bloques `server` con
`server_name` y `root` apuntando a la carpeta de la plantilla.

## Agregar una plantilla

1. Creá la carpeta `<nombre>/` al estilo de las existentes: `index.html`,
   `widget.js`, `exampleData.js`, `package.json` (manifiesto del widget de
   Grist) y carpetas `css/` e `image/`.
2. Agregá el enlace en el `index.html` raíz.


