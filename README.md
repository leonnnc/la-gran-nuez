# La Gran Nuez — Tienda de postres caseros

Sitio web de venta de postres caseros hecho con **HTML5, CSS3 y JavaScript (ES Modules)**, conectado a **Firebase** (Firestore + Authentication).

Incluye tienda pública, carrito de compras, checkout con fecha de pedido y de entrega, métodos de pago peruanos (Yape, Plin, efectivo y transferencia) y un panel de administración en `/panel/`.

## Rutas

| Página | Ruta |
| --- | --- |
| Tienda | `/` |
| Panel | `/panel/` |

## Funcionalidades

### Tienda
- Catálogo dinámico en tiempo real (Firestore) con búsqueda y filtro por categoría.
- Carrito lateral con cantidades y subtotal (en memoria durante la sesión).
- Checkout con:
  - nombre y celular del cliente;
  - delivery o recojo;
  - **fecha de pedido** y **fecha de entrega** (con días mínimos de anticipación);
  - método de pago y notas;
  - resumen con subtotal, delivery y total.
- Confirmación con código de pedido y envío del resumen por WhatsApp.
- Delivery gratis configurable a partir de un monto.
- Diseño responsive y soporte de teclado.

### Panel (`/panel/`)
- Acceso con **Firebase Authentication** (correo y contraseña).
- Resumen con productos, pedidos, ventas y próxima entrega.
- CRUD de productos: crear, editar, eliminar, disponibilidad y etiquetas.
- Subida de imágenes con optimización automática en el navegador (máx. 900 px).
- Gestión de pedidos en tiempo real con estados: pendiente, en preparación, entregado y cancelado.
- Configuración de datos del negocio, Yape, Plin, delivery y anticipación.
- Respaldo JSON: exportar e importar.

## Firebase (proyecto configurado)

Este repositorio ya está conectado al proyecto Firebase:

- **Project ID:** `la-gran-nuez`
- **App Web:** `la-gran-nuez-web` (`1:714593703258:web:dea2ee3d6828f7f836cf63`)
- **Firestore:** base de datos `(default)` en `southamerica-west1`
- **Reglas:** `firestore.rules` (desplegadas)
- **Datos iniciales:** configuración y 6 productos del flyer ya cargados en Firestore

La configuración pública del cliente está en `js/firebase-config.js`.

### Pasos que debes completar en la consola de Firebase

Para poder entrar al panel y administrar la tienda, realiza estos pasos una sola vez:

1. Abre [Firebase Console → Authentication](https://console.firebase.google.com/project/la-gran-nuez/authentication/providers).
2. En **Sign-in method**, habilita **Correo electrónico/contraseña** (Email/Password).
3. En **Authentication → Users**, crea el usuario administrador:
   - **Correo:** `leonnnc@gmail.com`
   - **Contraseña:** la que prefieras.
4. Si publicas la tienda en otro dominio (por ejemplo GitHub Pages), agrégalo en **Authentication → Settings → Authorized domains**.

> Solo el correo autorizado en `js/firebase-config.js` (`ADMIN_EMAILS`) y permitido por `firestore.rules` puede leer/gestionar pedidos y modificar productos/configuración. Los clientes pueden ver el catálogo y crear pedidos sin iniciar sesión.

### Reglas de Firestore

Las reglas están en `firestore.rules`:

- `config/*` y `products/*`: lectura pública, escritura solo administrador.
- `orders/*`: creación pública (para registrar pedidos), lectura/actualización/eliminación solo administrador.

Para volver a desplegarlas:

```bash
firebase deploy --only firestore:rules --project la-gran-nuez
```

## Estructura

```
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── firebase-config.js   # configuración pública + correo admin
│   ├── firebase.js          # inicialización de Firebase
│   ├── store.js             # datos/utilidades (Firestore + Auth)
│   └── app.js               # tienda, carrito y checkout
├── panel/
│   ├── index.html
│   ├── panel.css
│   └── panel.js
├── assets/
│   ├── favicon.svg
│   └── img/                 # fotos de los productos
├── firebase.json
├── .firebaserc
├── firestore.rules
├── .nojekyll
└── README.md
```

## Ejecutar en local

Como el proyecto usa ES Modules, sírvelo con un servidor HTTP:

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
5. Agrega el dominio de GitHub Pages en los dominios autorizados de Firebase Authentication.

## Notas importantes

- **Sin localStorage para datos:** productos, pedidos y configuración se guardan en **Cloud Firestore** y se sincronizan entre dispositivos.
- **Carrito:** se mantiene en memoria durante la sesión del navegador (no se guarda en localStorage).
- **Imágenes:** las fotos iniciales están en `assets/img/`. Las imágenes subidas desde el panel se optimizan y se guardan como data URL en Firestore; para catálogos grandes conviene migrarlas a Firebase Storage.
- **Seguridad:** las claves web de Firebase son públicas por diseño; la protección real depende de Authentication y de las reglas de Firestore. Revisa las reglas antes de usar en producción.
- **Pedidos:** cualquier visitante puede registrar un pedido (creación), pero solo el administrador autenticado puede verlos y gestionarlos.

## Imágenes de los productos

Las fotos de los seis postres fueron extraídas del flyer original de La Gran Nuez y se encuentran en `assets/img/`. Puedes reemplazarlas desde el panel.

## Créditos

- Negocio: **La Gran Nuez — Postres caseros**
- WhatsApp de pedidos: **922 678 663**
- Desarrollo: sitio web estático con integración Firebase.
