# Arquitectura

## Objetivos
- MVP escalable con coste operativo bajo para arrancar en Argentina.
- Capas claras para permitir reemplazar infraestructura (por ejemplo CouchDB → Postgres) sin reescribir la lógica de negocio.
- Backend "microservicios lógicos dentro de monolito": cada módulo (users, trips, bookings, payments, messages, reviews, notifications, matching, admin) es autocontenido y se comunica por llamadas directas hoy; mañana, por cola/events.

## Capas
1. **Controllers** (`*/xController.js`): parseo HTTP, autenticación, validación Zod. No hablan con la DB.
2. **Services** (`*/xService.js`): reglas de negocio. Validan estado, orquestan repos, coordinan efectos (pagos, notifications).
3. **Repositories** (`*/xRepository.js`): acceso a CouchDB vía `nano`. Heredan de `BaseRepository` con CRUD genérico por `type`.
4. **Utils & middleware**: errores tipados, logger, JWT, validación.

Flujo típico de una reserva:
```
POST /api/bookings
  └─ bookingController (valida body, inyecta req.user)
      └─ bookingService.createBooking
           ├─ tripService.reserveSeats        (actualiza cupo atomic)
           ├─ paymentService.createPreferenceForBooking (MP)
           └─ notificationService.enqueue     (WS + cola)
               └─ bookingRepository.create    (CouchDB)
```

## Modelo event-driven (extensible)
Hoy los efectos se disparan en línea. Para escalar:
- Sustituir llamadas directas a `notificationService.enqueue` por un bus (Redis pub/sub, NATS, RabbitMQ).
- `paymentService.handleWebhook` puede publicar `payment.captured` y que los consumers decidan (actualizar booking, notificar, auditoría).
- Los changes feeds de CouchDB (`_changes` por DB) ya habilitan pipelines reactivos sin cambios en la capa de servicios.

## Escalabilidad horizontal
- El WebSocket hub es in-memory (`notificationService.subscribers`). Para múltiples procesos → reemplazar por Redis pub/sub keyeado por `userId` (conexión del usuario anclada a una instancia, broadcast vía Redis).
- CouchDB permite múltiples nodos en cluster; los índices Mango se replican.
- La PWA usa strategies de cache SWR, por lo que un cluster detrás de un CDN absorbe picos de búsquedas.

## Seguridad
- JWT en `Authorization: Bearer`. Refresh token separado (`kind: "refresh"`).
- Los drivers no pueden publicar hasta que `verification.{identity,license,insurance}` esté `approved` (moderación admin).
- Webhook MP: firmar con `MP_WEBHOOK_SECRET` (TODO: validar X-Signature).
- CORS abierto por defecto — restringir por dominio en producción.

## Offline-first
- **Service Worker**: shell en cache + `stale-while-revalidate` sobre búsquedas de viajes.
- **IndexedDB (store.js)**: cachea trips para render inmediato sin red, y una `outbox` para POSTs pendientes (hook de Background Sync para flushear).
- **CouchDB ↔ PouchDB**: la DB objetivo habilita replicación selectiva (filtered replication) para viajes públicos y documentos propios.

## Mobile (fuera del scope del MVP web)
- Opciones:
  1. React Native consumiendo la misma API + WS + PouchDB local.
  2. Nativo (Kotlin / Swift). La API REST + WS son drop-in.
- Para ambos casos, el flujo de pago MP se resuelve abriendo `init_point` en WebView o SDK mobile oficial.
