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
| `npm run api:generate` | Regenera `src/api/schema.d.ts` desde `api/openapi.json` (copia del OpenAPI del backend) |
| `npm run mock` | Servidor simulado (`mocks/`) con todos los `result` del escaneo |
| `node scripts/inject-tag.mjs android "https://<dominio>/t?d=sim_recorded&c=x"` | Inyecta una lectura en `handleTagUrl` sin tags reales (solo builds de desarrollo) |
| `maestro test e2e/` | Flujos de extremo a extremo |

En el mock, el parámetro `d` del tag fuerza el resultado: `sim_activation`, `sim_recorded`, `sim_too_early`,
`sim_late`, `sim_no_pending`, `sim_finished`, `sim_invalid_signature`, `sim_replayed`, `sim_owned_by_other`,
`sim_blocked`, `sim_offline_expired`, `sim_unknown`. En el menú Perfil (solo desarrollo) hay un campo para pegar una URL.

## Probar sin Shopify (modo de prueba)

Perfil de EAS `development-mock`: entra sin Shopify (`LAVI_DEV_LOGIN=1`, nunca en producción) y usa el servidor
simulado. Edita `LAVI_API_URL` en `eas.json` con la IP de tu computadora, inicia el mock
(`MOCK_SEED=1 npm run mock`) y compila con `eas build --profile development-mock --platform android`.
Teléfono y computadora deben estar en la misma red Wi-Fi; permite el puerto 4010 en el firewall de Windows.

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

## Contrato de API

El contrato oficial lo publica el backend: `lavi-admin/docs/openapi.json` (también en `GET /v1/openapi.json`).
`api/openapi.json` es una **copia** de ese archivo y de ella se genera `src/api/schema.d.ts`
(`npm run api:generate`). Para actualizar: copiar el archivo nuevo y regenerar; el compilador señala lo que cambió.

Puntos del backend que la app respeta tal cual:

- Dosis `window_start`/`window_end` con estados `scheduled | on_time | late | missed`; `config.reminder_nudges` son
  minutos desde la apertura de la ventana; `repurchase_suggested` y `schedule_changes_left` los calcula el backend.
- Escaneo: `next_dose`, `opens_at`, `bonus_points`, `treatment_completed`, `suggested_times`, `variant`;
  `treatment_finished` no trae resumen (se lee del tratamiento por `treatment_id`).
- Sesión: `data_consent` al crear sesión, `X-Refresh-Token` para cerrarla; dispositivos con `push_token`.
- Activación vencida → `400 activation_token_invalid`; cambios de horario agotados → `409 schedule_change_limit`.
- Textos remotos: `notification_texts` (`reminder_*`, `nudge_body`, `backup_*`, `repurchase_*`, con `{product}`).

Brechas del backend frente a la especificación de la app (la app las resuelve así por ahora):

1. `GET /v1/points` no trae la **racha**; solo llega en el resultado de la lectura. Inicio muestra saldo y progreso.
2. `GET /v1/config/app` no trae **correo de soporte, política de datos ni términos**: van por variables de entorno
   (`LAVI_SUPPORT_EMAIL`, `LAVI_PRIVACY_URL`, `LAVI_TERMS_URL`).
3. `GET /v1/config/app` no trae `repurchase_reminder_days`: se usa `repurchase_suggested` de cada tratamiento.
4. No hay resumen de cumplimiento en `treatment_finished`: se usa `progress` del tratamiento.
5. El cambio de horario no devuelve «desde cuándo rige»: se calcula con `schedule_change_min_notice_hours`.
6. El repositorio `lavi-admin` incluye una carpeta `mobile/` duplicada; la app oficial es este repositorio.

## Verificar en teléfono físico (no se puede probar en simuladores ni en este entorno)

- NFC en segundo plano y por botón en iOS (XS o posterior) y Android; vibración; ventana de 30 s.
- Universal Links / App Links: requiere que el backend sirva `apple-app-site-association` (con el Team ID) y
  `assetlinks.json` (con la huella SHA-256) en `LAVI_LINK_DOMAIN`.
- Login real de Shopify: registrar `lavi://auth/callback` (el backend documenta `tumarca://auth/callback`: unificar el esquema) como URI de redirección del cliente público; la
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
