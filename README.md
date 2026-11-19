# La Gran Nuez — Tienda de postres caseros

Sitio web de venta de postres caseros hecho con **HTML5, CSS3 y JavaScript vanilla**.
Incluye tienda pública, carrito de compras, checkout con fecha de pedido y de entrega,
métodos de pago peruanos (Yape, Plin, efectivo y transferencia) y un panel de
administración en `/panel/`.

## Rutas

| Página | Ruta |
| --- | --- |
| Tienda | `/` |
| Panel | `/panel/` |

## Funcionalidades

### Tienda
- Catálogo dinámico con búsqueda y filtro por categoría.
- Carrito lateral persistente con cantidades y subtotal.
- Checkout con:
  - nombre y celular del cliente;
  - delivery o recojo;
  - fecha de pedido y fecha de entrega (con días mínimos de anticipación);
  - método de pago y notas;
  - resumen con subtotal, delivery y total.
- Confirmación con código de pedido y envío del resumen por WhatsApp.
- Delivery gratis configurable a partir de un monto.
- Diseño responsive, animaciones suaves y soporte de teclado.

### Panel (`/panel/`)
- Acceso con PIN (inicial **1234**, modificable).
- Resumen con productos, pedidos, ventas y próxima entrega.
- CRUD de productos: crear, editar, eliminar, disponibilidad y etiquetas.
- Subida de imágenes con optimización automática en el navegador (máx. 900 px).
- Gestión de pedidos con estados: pendiente, en preparación, entregado y cancelado.
- Configuración de datos del negocio, Yape, Plin, delivery y anticipación.
- Respaldo completo en JSON (exportar / importar).

## Estructura

```
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── store.js        # datos compartidos + localStorage
│   └── app.js          # tienda, carrito y checkout
├── panel/
│   ├── index.html
│   ├── panel.css
│   └── panel.js
├── assets/
│   ├── favicon.svg
│   └── img/            # fotos de los productos
└── README.md
```

## Ejecutar en local

Al usar rutas relativas y `localStorage`, sirve el proyecto con un servidor HTTP:

```bash
cd la-gran-nuez
python3 -m http.server 8080
```

Luego abre `http://localhost:8080/` y `http://localhost:8080/panel/`.

## Publicar en GitHub Pages

1. En GitHub, entra en **Settings → Pages**.
2. En *Source*, elige **Deploy from a branch**.
3. Selecciona la rama `main` y la carpeta `/ (root)`.
4. Guarda y espera la publicación.

El archivo `.nojekyll` ya está incluido para que `/panel/` funcione sin problemas.

## Almacenamiento y seguridad

- Los productos, pedidos, carrito y configuración se guardan en **localStorage**,
  es decir, en el navegador del dispositivo que administra la tienda.
- Un pedido creado por un cliente en su propio dispositivo **no aparece** en el panel
  de otro dispositivo. Para sincronizar entre dispositivos hace falta un backend real
  (Firebase, Supabase, API propia, etc.).
- El PIN del panel se guarda como hash SHA-256 y la sesión dura 8 horas, pero al ser
  una web estática la validación ocurre en el cliente. No la uses para datos sensibles.
- Para producción, conecta autenticación y base de datos en el servidor.

## Imágenes de los productos

Las fotos de los seis postres fueron extraídas del flyer original de La Gran Nuez y se
encuentran en `assets/img/`. Puedes reemplazarlas desde el panel subiendo nuevas imágenes.

## Créditos

- Negocio: **La Gran Nuez — Postres caseros**
- WhatsApp de pedidos: **922 678 663**
- Diseño y desarrollo: proyecto web estático.
