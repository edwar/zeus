# Política de seguridad

## Cómo reportar una vulnerabilidad

Si encuentras una falla de seguridad en Zeus (https://zeus.cognilab.dev), **no abras un issue público**. Repórtala en privado:

- Por GitHub: pestaña **Security → Report a vulnerability** de este repositorio (reporte privado), o
- Por correo, a la dirección publicada en https://zeus.cognilab.dev/.well-known/security.txt y en la [página de seguridad](https://zeus.cognilab.dev/es/security).

Incluye una descripción del problema y su impacto, los pasos para reproducirlo y cómo contactarte. Acusamos recibo en el plazo indicado en la página de seguridad.

## Reglas de buena fe

- No accedas, modifiques ni borres datos de otras personas; si encuentras datos personales, detén las pruebas y avísanos.
- No hagas pruebas que degraden el servicio (denegación de servicio, envío masivo de solicitudes) ni ingeniería social contra el personal.
- Danos un plazo razonable para corregir antes de divulgar públicamente.
- Las fallas de servicios de terceros (Vercel, Neon, OpenStreetMap…) quedan fuera de alcance: repórtalas a sus responsables.

Si actúas así, no emprenderemos acciones legales contra ti por la investigación.

## Secretos

Este repositorio es público. Las claves y credenciales viven en variables de entorno (`.env`, ignorado por Git, y la configuración de Vercel); `.env.example` solo contiene marcadores de posición. Si ves un secreto real en el historial, repórtalo por el canal privado.

## Qué es público y qué no

El código es público a propósito. Los datos de clientes y del equipo nunca están en el repositorio: viven en la base de datos del proveedor y se rigen por la [política de privacidad](https://zeus.cognilab.dev/es/privacy).
