# Reglas del proyecto (agentes)

## Estabilidad de claves y actualizaciones

- **NUNCA** cambiar claves, tokens ni la configuración de actualizaciones sin necesidad.
- Si MLAHUB gestiona este proyecto, respetar sus reglas de versiones y despliegue.
- No introducir secretos ni claves en el repositorio (usar `.env`, gitignored).

## Precios en la Web

- **REGLA ESTRICTA: NO SE PONE PRECIO EN LA WEB.**
- La web pública de Fica Tostadores funciona exclusivamente como **catálogo interactivo de cotización**.
- **NUNCA** mostrar precios (en CLP, USD ni ninguna moneda) en la web pública: ni en el catálogo, ni en fichas de producto, ni en selectores de versiones/variaciones, ni en agregados, ni en el panel lateral de cotización (drawer), ni en la página de cotización (`/cotizar`).
- Los precios únicamente se administran y visualizan de manera interna en el Panel Administrativo (`/admin/*`) y en la aplicación de escritorio (`APPv2`) para sincronización y generación interna de cotizaciones formales.
