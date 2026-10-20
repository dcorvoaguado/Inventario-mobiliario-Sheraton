# Dominio solicitado: inventario-mobiliario-sheraton.es

Estado: solicitado por el usuario; registro, titularidad y DNS aún no comprobados. No hay acceso configurado a un registrador ni a su DNS. No se ha activado este dominio, añadido CNAME ni alterado la dirección pública existente.

## Configuración preparada

La compilación de GitHub Actions usa `base_path` de `actions/configure-pages`. Con el alojamiento actual conserva la ruta del repositorio; cuando se configure y verifique un dominio propio, usará la raíz automáticamente.

## Pasos de activación

1. Registrar el dominio con el proveedor elegido o confirmar su titularidad. El registro tiene coste; el usuario lo tramita en su cuenta del proveedor. Nunca introducir contraseñas en el chat.
2. Exportar el inventario activo y la copia de eliminados antes de cambiar de origen web. Los datos están en localStorage y no aparecen automáticamente en otro dominio. Preparar y verificar la recuperación en el nuevo origen antes de dejar de usar la dirección antigua.
3. Configurar en GitHub Pages el dominio `inventario-mobiliario-sheraton.es`, verificar su propiedad por TXT siguiendo el valor que indique GitHub y activar la comprobación de DNS.
4. Para el dominio raíz, GitHub Pages documenta estos registros A: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. Confirmar los valores vigentes en GitHub antes de aplicarlos. No reemplazar registros de correo ni otros servicios. Para `www`, usar CNAME a `dcorvoaguado.github.io`, si se desea ese alias.
5. Volver a desplegar con la base que determine configure-pages; comprobar imágenes, fuentes y exportaciones desde la nueva dirección. Esperar el certificado y activar HTTPS obligatorio cuando GitHub lo permita.
6. Validar resolución DNS, certificado, acceso público y recuperación de datos antes de comunicar el dominio como activo.

Referencias para activación: documentación de GitHub Pages «Managing a custom domain for your GitHub Pages site» y «Verifying your custom domain for GitHub Pages». Las instrucciones DNS de este archivo no representan una comprobación de que el dominio esté libre, comprado o conectado.
