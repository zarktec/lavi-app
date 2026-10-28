# Lavi — app móvil de adherencia NFC

App iOS/Android (Expo + TypeScript estricto) del programa de adherencia NFC. La clienta activa su
frasco, recibe recordatorios, registra cada aplicación leyendo el tag NFC del frasco, consulta y canjea
puntos, y recompra en la tienda. **La app no contiene reglas de negocio**: envía las lecturas al backend
([`lavi-admin`](https://github.com/zarktec/lavi-admin)) y muestra lo que este responde.

Referencia: *Especificación técnica: app móvil de adherencia NFC* (28-oct-2026).

## Puesta en marcha

```bash
npm install
npm run mock                 # servidor simulado en http://localhost:4010 (MOCK_SEED=1 para empezar con tratamiento)
cp .env.example .env.local   # LAVI_API_URL apuntando al mock o al backend de pruebas
npx expo run:android         # o: npx expo run:ios  — build de desarrollo propio (no Expo Go: el NFC es nativo)
npm start                    # Metro con dev client
```

| Comando | Qué hace |
|---|---|
| `npm run typecheck` / `npm run lint` / `npm test` | TypeScript estricto, ESLint, Jest + RNTL |
| `npm run api:generate` | Regenera `src/api/schema.d.ts` desde `api/openapi.yaml` |
| `npm run mock` | Servidor simulado (`mocks/`) con todos los `result` del escaneo |
| `node scripts/inject-tag.mjs android "https://<dominio>/t?d=sim_recorded&c=x"` | Inyecta una lectura en `handleTagUrl` sin tags reales (solo builds de desarrollo) |
| `maestro test e2e/` | Flujos de extremo a extremo |

En el mock, el parámetro `d` del tag fuerza el resultado: `sim_activation`, `sim_recorded`, `sim_too_early`,
`sim_late`, `sim_no_pending`, `sim_finished`, `sim_invalid_signature`, `sim_replayed`, `sim_owned_by_other`,
`sim_blocked`, `sim_offline_expired`, `sim_unknown`. En el menú Perfil (solo desarrollo) hay un campo para pegar una URL.

## Estructura

```
app/            Rutas de Expo Router: (onboarding), (tabs), scan, activate, schedule, redeem, t.tsx
src/api/        Cliente openapi-fetch + tipos generados, hooks de TanStack Query, caché persistente en SQLite
src/nfc/        Lectura NFC, handleTagUrl (único punto de entrada), mapeo result → pantalla
src/notifications/  syncReminders (ventana móvil ≤ 50), canal Android, tarea en segundo plano
src/offline/    Cola SQLite de lecturas, sincronización con espera creciente, estado de red
src/auth/       Login Shopify (OAuth 2.0 + PKCE), tokens en expo-secure-store, sesión
src/shopify/    Storefront API y Checkout Kit
src/config/     Entornos y configuración remota (versión mínima, textos)
src/i18n/       Textos es-CO (i18next); los textos remotos de /v1/config/app los sustituyen por clave
src/ui/         Componentes y tema
mocks/          Servidor simulado (núcleo + http + MSW)
e2e/            Flujos Maestro
```

## Cómo cumple la especificación

- **Toda lectura** (segundo plano por App/Universal Link en la ruta `/t`, o botón de escanear) termina en
  `handleTagUrl(url)`: valida solo dominio + parámetros `d` y `c`, ignora duplicados < 5 s, vibra antes de la
  respuesta, envía a `POST /v1/scans` o a la cola SQLite (`offline: true`) y abre el modal de resultado.
  Sin sesión guarda la URL, va al login y la procesa al terminar.
- **Resultados**: una variante por `result` (incluido `rejected` + razón); `replayed` se muestra igual que firma
  inválida; un `result` desconocido muestra un mensaje genérico y refresca datos (`src/nfc/outcome.ts`).
- **Recordatorios**: `syncReminders()` borra y reprograma (idempotente) las dosis pendientes de los próximos días,
  con las insistencias `reminder_nudges`, máximo 50 notificaciones; se ejecuta al abrir, tras escanear, activar o
  cambiar horarios, al cambiar de zona horaria y en la tarea de segundo plano. Sin permisos de alarma exacta.
- **Sin conexión**: la cola sobrevive al cierre de sesión y reinicios; caché persistente de TanStack Query con
  «última actualización»; canjes, cambios de horario y activaciones requieren conexión.
- **Sesión**: login con `expo-auth-session` (PKCE) → `POST /v1/auth/session`; tokens en `expo-secure-store`;
  ante 401 se renueva una sola vez y, si falla, se cierra sesión conservando la cola.
- **Configuración remota**: `min_app_version` bloquea con «Actualiza la app»; textos editables con respaldo local.
- **Privacidad**: Sentry sin datos personales (solo id interno); analítica detrás del consentimiento
  (`src/analytics`, proveedor pendiente de definir).

## Contrato de API (importante)

`lavi-admin` aún no publica su OpenAPI `/v1`, así que `api/openapi.yaml` es un **borrador derivado de la
especificación de la app**. Cuando el backend publique el suyo, reemplazar el archivo y ejecutar
`npm run api:generate`; ante cualquier diferencia manda la especificación del backend. Supuestos a confirmar
con el backend:

1. Forma de `GET /v1/treatments/:id` (`doses` con `window_opens_at/closes_at`, `reminder_nudges[].offset_minutes`,
   `schedule_changes_left`, `ending_soon`) y de `GET /v1/config/app` (`min_app_version`, `texts`,
   `repurchase_reminder_days`, `support_email`, `privacy_policy_url`, `terms_url`, `store_urls`).
2. Cuerpo de `POST /v1/auth/session` (`shopify_access_token`, `shopify_id_token`, `privacy_policy_accepted`, `timezone`).
3. Código de error cuando vence el token de activación (la app trata 410 o un `code` con «expired/activation»).
4. Paginación del libro de puntos (`cursor` / `next_cursor`).

## Verificar en teléfono físico (no se puede probar en simuladores ni en este entorno)

- NFC en segundo plano y por botón en iOS (XS o posterior) y Android; vibración; ventana de 30 s.
- Universal Links / App Links: requiere que el backend sirva `apple-app-site-association` (con el Team ID) y
  `assetlinks.json` (con la huella SHA-256) en `LAVI_LINK_DOMAIN`.
- Login real de Shopify: registrar `lavi://auth/callback` como URI de redirección del cliente público; la
  autenticación del carrito (`buyerIdentity.customerAccessToken`) y el descubrimiento OAuth
  (`/.well-known/openid-configuration`) deben confirmarse contra la tienda de desarrollo.
- Notificaciones locales y push de respaldo, tarea en segundo plano, Checkout Kit con código de canje.

## Decisiones de negocio pendientes

Nombre/ícono/identidad visual definitivos (hoy «Lavi» provisional), dominio de enlaces, cuentas de Apple y
Google, herramienta de analítica, textos legales y correo de soporte (llegan por `GET /v1/config/app`).
Los dominios `*.lavi.example` y los identificadores `com.lavi.app*` en `app.config.ts`/`eas.json` son marcadores.

## Actualizaciones

EAS Update para cambios de JavaScript y textos (canales `development`, `preview`, `production`). Todo cambio
nativo (permisos, librerías nativas, enlaces) exige una nueva versión en las tiendas.
