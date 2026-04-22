# CompartoViaje

Plataforma de movilidad colaborativa para Argentina. Conecta conductores con asientos disponibles y pasajeros que viajan entre ciudades, con pago anticipado, verificación de identidad y reputación — al estilo BlaBlaCar — pero pensada para rutas nacionales/provinciales y con **Mercado Pago** como medio de pago nativo.

## Stack

- **Backend**: Node.js + Express. Arquitectura modular **Controller → Service → Repository**.
- **Base de datos**: CouchDB (con índices Mango). Un documento por tipo (`user`, `trip`, `booking`, `review`, `payment`, `message`, `notification`).
- **Autenticación**: JWT (access + refresh).
- **Pagos**: Mercado Pago Checkout Pro con captura manual (escrow) + `marketplace_fee`.
- **Tiempo real**: WebSocket nativo (`ws`) para chat y notificaciones.
- **Frontend**: PWA mobile-first, vanilla JS (sin bundler), cache offline-first vía Service Worker + IndexedDB.
- **Apps móviles**: el mismo backend sirve a apps Android/iOS (Kotlin/Swift o React Native) a través de la API REST + WS.

## Estructura

```
CompartoViaje/
├── backend/
│   ├── src/
│   │   ├── config/            # Variables de entorno centralizadas
│   │   ├── db/couch.js        # Inicialización de CouchDB e índices
│   │   ├── middleware/        # auth JWT, validación Zod, errores
│   │   ├── repositories/      # BaseRepository (CRUD genérico CouchDB)
│   │   ├── modules/
│   │   │   ├── users/         # registro, login, verificaciones
│   │   │   ├── trips/         # publicar, buscar, operar viajes
│   │   │   ├── bookings/      # reservas + política de cancelación
│   │   │   ├── payments/      # Mercado Pago + escrow
│   │   │   ├── reviews/       # reputación y estrellas
│   │   │   ├── messages/      # chat persistente
│   │   │   ├── notifications/ # hub WS + cola persistente
│   │   │   ├── matching/      # IA liviana de sugerencias
│   │   │   └── admin/         # métricas, moderación, heatmap
│   │   ├── ws/wsServer.js     # WebSocket /ws?token=...
│   │   ├── routes.js          # Montaje de controladores
│   │   ├── app.js             # Express app (+ estático PWA)
│   │   └── server.js          # HTTP + WS entrypoint
│   ├── scripts/
│   │   ├── init-db.js         # Crea DBs e índices
│   │   └── seed.js            # Demo: admin, conductor, pasajero y un viaje
│   └── test/smoke.test.js     # Tests de humo (`node --test`)
├── frontend/
│   └── pwa/                   # PWA instalable (HTML + CSS + JS modules)
│       ├── index.html
│       ├── manifest.webmanifest
│       ├── sw.js              # Service Worker (cache shell + SWR para búsquedas)
│       ├── styles.css
│       ├── icons/
│       └── js/
│           ├── app.js router.js api.js store.js ws.js ui.js
│           └── views/         # home, search, trip, publish, bookings, me, auth, chat, admin, review
└── package.json
```

## Puesta en marcha

### 1. Requisitos

- Node.js 18+
- CouchDB 3.x corriendo (por ejemplo, `docker run -d -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=admin --name couch couchdb:3`)
- (Opcional) Credenciales de Mercado Pago Argentina (modo test funciona)

### 2. Configurar

```bash
cp .env.example .env
# editá JWT_SECRET, COUCHDB_URL, MP_ACCESS_TOKEN si ya lo tenés
npm install
```

### 3. Inicializar base y cargar demo

```bash
npm run init-db
npm run seed
```

Usuarios de prueba:

| Rol        | Email                         | Contraseña      |
| ---------- | ----------------------------- | --------------- |
| Admin      | admin@compartoviaje.ar        | admin1234       |
| Conductor  | conductor@compartoviaje.ar    | conductor1234   |
| Pasajero   | pasajero@compartoviaje.ar     | pasajero1234    |

### 4. Iniciar

```bash
npm start
```

Abrí <http://localhost:3000>. La PWA se sirve desde el mismo proceso y se puede instalar en mobile.

### 5. Tests de humo

```bash
npm test
```

## API REST (resumen)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Login (email + password) |
| POST | `/api/auth/refresh` | Renovar access token |
| GET  | `/api/users/me` | Perfil propio |
| PATCH | `/api/users/me` | Editar perfil |
| PUT  | `/api/users/me/vehicle` | Cargar/actualizar vehículo |
| POST | `/api/users/me/verify/{identity\|license\|insurance}` | Enviar documentación |
| POST | `/api/trips` | Publicar viaje (conductor verificado) |
| GET  | `/api/trips/search?originCity=&destinationCity=&date=&maxPrice=&minSeats=&minDriverRating=` | Buscar |
| GET  | `/api/trips/:id` | Detalle con datos del conductor |
| POST | `/api/trips/:id/start` / `complete` / `cancel` | Operar |
| POST | `/api/bookings` | Reservar. Devuelve `payment.initPoint` → Mercado Pago |
| GET  | `/api/bookings/mine` · `/received` · `/trip/:tripId` | Listar |
| POST | `/api/bookings/:id/approve` / `reject` / `cancel` / `complete` | Flujo de estado |
| POST | `/api/payments/webhook` | Webhook de MP (captura + escrow) |
| POST | `/api/reviews` | Dejar reseña (viaje completado) |
| GET  | `/api/reviews/user/:id` | Reputación pública |
| POST | `/api/messages` + `GET /api/messages/thread?tripId=&otherUserId=` | Chat |
| GET  | `/api/notifications` | Bandeja |
| GET  | `/api/matching/suggest?originCity=&destinationCity=` | Sugerencias para el usuario |
| GET  | `/api/admin/metrics` · `/verifications/pending` · `/heatmap/routes` | Panel admin |

WebSocket: `ws://host/ws?token=<accessToken>` → recibe `{ event: "notification" }`, `{ event: "chat.message" }`; enviá `{ event: "chat.send", data: { tripId, toUserId, body } }`.

## Flujo de pago con Mercado Pago (escrow)

1. El pasajero **reserva** → la API crea una `Preference` en Mercado Pago con `marketplace_fee` = 10% (configurable) y `external_reference = bookingId`.
2. El pasajero paga en `init_point`.
3. MP llama al **webhook** `/api/payments/webhook`. Marcamos el pago como `held` y la reserva como pagada (`paymentStatus: approved`).
4. El conductor **aprueba** la reserva. Cuando el viaje se completa, `completeBooking` invoca `paymentService.release(...)` → `POST /v1/payments/:id/capture` → el dinero se libera al conductor descontando la comisión de la plataforma.
5. **Cancelación con penalización**: `cancelBooking` calcula la penalización según `trip.cancellationPolicy` (`flexible`/`moderate`/`strict`) y emite `refundPayment` (total o parcial).

En modo sin credenciales (`MP_ACCESS_TOKEN` vacío), el cliente MP devuelve respuestas simuladas — útil para desarrollo offline y para demos.

## Modelo de datos CouchDB

Cada documento incluye `_id`, `_rev`, `type`, `createdAt`, `updatedAt`. Los tipos:

- **user**: roles (`passenger`/`driver`/`admin`), `verification.{email,phone,identity,license,insurance}`, `vehicle`, `rating.{average,count}`.
- **trip**: `origin`, `destination`, `stops`, `departureAt`, `seatsTotal`, `seatsAvailable`, `pricePerSeat`, `currency: "ARS"`, `vehicleSnapshot`, `preferences`, `status`, `cancellationPolicy`.
- **booking**: `tripId`, `passengerId`, `driverId`, `seats`, `totalAmount`, `status`, `paymentId`, `paymentStatus`.
- **review**: `bookingId`, `authorId`, `targetUserId`, `stars`, `comment`.
- **payment**: `bookingId`, `amount`, `platformFee`, `driverPayout`, `status` (`pending`/`held`/`released`/`refunded`/...), `mpPreferenceId`, `mpPaymentId`.
- **message**: `threadId`, `fromUserId`, `toUserId`, `body`, `read`.
- **notification**: `userId`, `kind`, `title`, `body`, `data`, `read`.

### Replicación offline-first

CouchDB soporta replicación bidireccional con PouchDB. Para una app mobile offline-first, el cliente puede replicar una vista filtrada de `trips` y su propia subcolección de `bookings`/`messages`. El stub de IndexedDB en `frontend/pwa/js/store.js` es un primer paso — reemplazable por PouchDB directo sin tocar la capa de UI.

## Enfoque argentino

- Precios en **ARS**, con `Intl.NumberFormat('es-AR', {currency: 'ARS'})`.
- Mercado Pago como medio de pago primario (acepta tarjeta, saldo MP y transferencias locales como Pago Fácil / Rapipago en cheque-out).
- Copy en español rioplatense, UX mobile-first simple.
- PWA liviana: HTML + CSS + ES modules sin bundler → bajo consumo de datos, útil en zonas del interior.
- La API está lista para servir a apps nativas o React Native sin cambios.

## Seguridad

- Passwords hasheados con bcrypt (`10` rounds).
- JWT firmados con secreto de 64+ caracteres (rotar el valor de ejemplo antes de producción).
- Validación estricta con Zod en todos los endpoints.
- Webhook MP validable con `MP_WEBHOOK_SECRET` (verificación de firma recomendada antes de producción).
- Conductores no pueden publicar hasta tener identidad, licencia y seguro aprobados por admin.

## Roadmap

- [ ] Integración real con RENAPER / AFIP para verificación cruzada de DNI/CUIT.
- [ ] Pago dividido entre múltiples pasajeros en un viaje.
- [ ] Push notifications (Web Push + FCM + APNs).
- [ ] Google/Apple login (stubs en `config.oauth`).
- [ ] Mapas con OpenStreetMap / Mapbox para paradas intermedias.
- [ ] Clusters de CouchDB + cola de mensajes (Redis) para escalabilidad horizontal.
- [ ] Seguro de viaje opcional contratable en el checkout.

## Licencia

MIT
