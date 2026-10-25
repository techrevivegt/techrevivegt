# Publicar AulaOS 0.1 desde TechRevive con Cloudflare R2

Esta integración publica una página informativa en `/aulaos.html` y sirve la ISO desde un bucket R2 privado, mediante una ruta de solo lectura del Worker. **La ISO no se añade a GitHub ni al paquete de assets del Worker.**

## Cambios de código incluidos

- `wrangler.jsonc`: binding R2 `AULAOS_RELEASES` al bucket `techrevive-aulaos` y enrutamiento `/descargas/*` al Worker.
- `worker/index.js`: endpoint `GET`/`HEAD` en `/descargas/aulaos-0.1-amd64-amd64.hybrid.iso`, con soporte de solicitudes `Range` para descargas reanudables.
- `build.py` y `generador/`: página AulaOS, enlace en inicio/menú y exclusión de la descarga grande del service worker.
- No se crea ninguna ruta pública para subir archivos; la carga se hace autenticada con Wrangler.

## 1. Crear el bucket

En una terminal con Wrangler instalado y con sesión en la cuenta de Cloudflare:

```bash
npx wrangler login
npx wrangler r2 bucket create techrevive-aulaos
```

Crea el bucket **antes** de desplegar el cambio que agrega el binding R2.

## 2. Verificar y cargar la ISO

La captura que compartiste mostraba `ERR_FILE_NOT_FOUND` en `C:\\Users\\elias\\Downloads\\...`; eso significa que la ISO no está guardada en esa carpeta todavía. **Primero debe existir un archivo local completo**; si no, el comando de carga fallará. La imagen esperada tiene 2,103,746,560 bytes y este SHA-256:

```text
9b9ae6f056f5c929eb9090f470c1f1ee9fbce98fda5fad8053458c8a3e0e95e6
```

En PowerShell, verifica el archivo local:

```powershell
Get-FileHash -Algorithm SHA256 "C:\Users\elias\Downloads\aulaos-0.1-amd64-amd64.hybrid.iso"
```

Si coincide, cárgalo al bucket (ajusta la ruta local si lo guardaste en otra carpeta):

```powershell
npx wrangler r2 object put techrevive-aulaos/aulaos/aulaos-0.1-amd64-amd64.hybrid.iso `
  --file "C:\Users\elias\Downloads\aulaos-0.1-amd64-amd64.hybrid.iso" `
  --remote `
  --content-type "application/octet-stream" `
  --content-disposition 'attachment; filename="AulaOS-0.1-Live-AMD64.iso"' `
  --cache-control "public, max-age=3600"
```

Wrangler gestiona las credenciales de la cuenta; **no pegues tokens de Cloudflare en el repositorio ni en el chat**.

## 3. Publicar los cambios de este proyecto

1. Aplica los archivos modificados de este paquete al repositorio `techrevivegt/techrevivegt`.
2. Confirma y publica los cambios en `main`. Si el despliegue automático de Cloudflare está conectado, espera a que termine.
3. Si publicas manualmente desde el proyecto, ejecuta desde la raíz:

```bash
python build.py
npx wrangler deploy
```

## 4. Comprobar

- Página informativa: `https://techrevive.techrevive-gt.workers.dev/aulaos.html`
- Descarga directa: `https://techrevive.techrevive-gt.workers.dev/descargas/aulaos-0.1-amd64-amd64.hybrid.iso`

Si el Worker responde `503`, falta desplegar el binding R2. Si responde `404`, el objeto todavía no se ha cargado con la clave exacta indicada arriba.

## Aviso del prototipo

AulaOS 0.1 es una ISO Live experimental para PC amd64, no un instalador estable. Esta reconstrucción aún no se ha vuelto a probar en QEMU ni en equipos físicos. Escribirla en una memoria USB borra su contenido; no instalarla ni modificar el disco interno de un equipo escolar.

## Revisión de seguridad al dejar público el repositorio

Antes de mantenerlo público, confirma en Cloudflare que el secreto `AULA_SECRET` está configurado con un valor aleatorio fuerte y revisa/desactiva las cuentas de demostración. El código del Worker usa una clave generada que está en el repositorio como último recurso si no encuentra `AULA_SECRET` ni `PANEL_PASSWORD`; al ser público el repo, no conviene depender de ese fallback.

## Documentación oficial

- [Cloudflare R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [Wrangler: comandos de R2 y carga de objetos](https://developers.cloudflare.com/workers/wrangler/commands/r2/)
