# Despliegue en Vercel · zeus.cognilab.dev

Todo el código ya está listo para el dominio `https://zeus.cognilab.dev`. Esta guía son los pasos que se hacen fuera del código.

## 1. Antes del primer despliegue

### Base de datos (ya separada)
El proyecto de Neon `zeus` tiene tres ramas, cada una con su propia contraseña:

| Rama | Uso |
|---|---|
| `main` | desarrollo local (`.env.local`) |
| `production` | producción en Vercel |
| `preview` | despliegues de preview en Vercel |

Las migraciones se aplican solas en cada despliegue **de producción** (`vercel.ts` → `prisma migrate deploy`). Los previews no las aplican.

### Secretos
Rota estos valores antes de publicar (se compartieron en conversaciones de trabajo): contraseña de la base de Neon, `BETTER_AUTH_SECRET`, credenciales del almacenamiento de imágenes y la contraseña del administrador inicial.

## 2. Variables de entorno (Vercel → Settings → Environment Variables, entorno *Production*)

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL **pooled** de Neon (producción) |
| `DIRECT_URL` | URL **directa** de Neon (producción); la usan las migraciones |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` (nuevo, distinto al de desarrollo) |
| `BETTER_AUTH_URL` | `https://zeus.cognilab.dev` |
| `NEXT_PUBLIC_SITE_URL` | `https://zeus.cognilab.dev` |
| `CRON_SECRET` | cadena aleatoria larga (Vercel la envía al cron de sincronización) |
| `RATE_LIMIT_SALT` | cadena aleatoria larga |
| `STORAGE_ENDPOINT`, `STORAGE_PUBLIC_URL`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | almacenamiento de imágenes (bucket de lectura pública) |
| `RESEND_API_KEY`, `MAIL_FROM` | correo para «olvidé mi contraseña» ([Resend](https://resend.com), remitente de un dominio verificado, p. ej. `Zeus <no-reply@cognilab.dev>`). Sin ellas la página explica que un administrador debe restablecerla |
| `EXTRACT_DAILY_CAP` | opcional; tope diario de lecturas de facturas con IA (300 por defecto) |

No definas `NEXT_PUBLIC_SITE_INDEXABLE`: en producción de Vercel ya se indexa y en previews no.

> Si `NEXT_PUBLIC_SITE_URL` falta, la app usa `https://zeus.cognilab.dev` en producción de Vercel. Se deja explícita para que el dominio se cambie sin tocar código.

## 3. Dominio `zeus.cognilab.dev`

El dominio ya está agregado al proyecto en Vercel. Falta solo el registro DNS en el proveedor de `cognilab.dev`:

| Tipo | Nombre | Valor |
|---|---|---|
| `CNAME` | `zeus` | `5948b6a5ab87af25.vercel-dns-017.com.` |

(El valor genérico `cname.vercel-dns.com` también sirve; el de arriba es el que Vercel asignó a este proyecto.)

Cuando el DNS propague, Vercel emite el certificado HTTPS solo. Comprueba con `vercel domains verify zeus.cognilab.dev`.
La app ya envía HSTS, `canonical` y `hreflang` con ese dominio.

## Roles

| | Administrador | Gestión | Equipo |
|---|---|---|---|
| Usuarios | ✔ | | |
| Productos, fabricantes, comisión, sincronización | ✔ | | |
| Equipos (ver y editar) | ✔ | ✔ | |
| Eliminar equipos | ✔ | | |
| Solicitudes (contactar, ajustar kit, aprobar) | ✔ | ✔ | |
| Proyectos (etapa, cronograma, enlace de monitoreo) | ✔ | ✔ | |
| Avance de hitos, materiales, alertas | ✔ | ✔ | solo los de su equipo |

- **Equipo** ve únicamente los proyectos del equipo al que pertenece (se asigna en Equipos → Integrantes). No ve solicitudes, precios del cliente ni lo que cobra el equipo.
- Los permisos se aplican en el servidor (API y páginas); ocultar un botón no es lo que protege. La definición está en `src/lib/roles.ts`.
- Cualquier rol desconocido (incluido el antiguo `user`) se trata como **Equipo**, el de menos permisos.

## 4. Primer administrador
La plataforma no tiene registro público. Con las variables de producción cargadas en tu terminal:

```bash
ADMIN_EMAIL=tu@correo.com ADMIN_PASSWORD='una-contraseña-larga' ADMIN_NAME='Tu nombre' pnpm db:create-admin
```

Luego entra a `https://zeus.cognilab.dev/es/login` y crea los demás usuarios desde **Usuarios**.

### Contraseñas
- Toda cuenta que crea un administrador (también la del script de arriba) nace con **contraseña temporal**: al ingresar solo se ve la pantalla para elegir una propia (mínimo 10 caracteres) y las APIs responden 403 hasta entonces.
- Un administrador puede **restablecer** la contraseña de otra cuenta desde **Usuarios**: define una temporal, cierra las sesiones de esa persona y esta debe cambiarla al ingresar.
- «¿Olvidaste tu contraseña?» envía un enlace de 30 minutos y un solo uso (requiere `RESEND_API_KEY` y `MAIL_FROM`). Cualquiera puede cambiar la suya desde el ícono de llave del panel.

## 5. Datos iniciales
- **Catálogo:** el cron `/api/cron/sync` corre cada día a las 12:00 a. m. (Colombia; 05:00 UTC, dentro de esa hora en el plan Hobby) y se encadena hasta completar el catálogo. Para llenarlo antes, ejecútalo desde Productos → **Sincronizar con Autosolar**.
- **Comisión:** en Productos define la comisión global.
- **Equipos:** crea al menos un equipo en **Equipos** (con base en el mapa y radio de acción). Sin equipos, a todos los clientes se les ofrece solo la venta del kit.

## 6. IA para leer facturas
El simulador usa el AI Gateway de Vercel (`anthropic/claude-sonnet-5.5`). En Vercel autentica solo, pero la cuenta necesita **método de pago** cargado. Sin eso el simulador sigue funcionando con ingreso manual de datos.

## 7. Después de publicar
- Revisa `https://zeus.cognilab.dev/robots.txt` y `/sitemap.xml`.
- **Google Search Console:** agrega la propiedad del dominio y envía `https://zeus.cognilab.dev/sitemap.xml`.
- Comprueba la vista previa al compartir el enlace en WhatsApp (imagen y título). Si WhatsApp guardó una versión vieja, comparte la URL con `?v=2`.

## Qué cambia entre entornos

| | Local | Preview (Vercel) | Producción |
|---|---|---|---|
| Indexable (`robots`) | no | no | **sí** |
| Migraciones al desplegar | — | no | **sí** |
| URL base | `localhost:3000` | URL del despliegue | `https://zeus.cognilab.dev` |
