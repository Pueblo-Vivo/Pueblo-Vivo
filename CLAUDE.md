# Pueblo Vivo · guía del proyecto (para Claude)

App web mobile-first de la ecoaldea **Umepay**: mapa de parcelas (lotes en venta / casas en alquiler / directorio de Comunidad). Es un **PWA de un solo archivo** servido por **GitHub Pages**, con **Supabase** para los datos compartidos y **Google Sheets** como fuente de datos editable.

- **Repo:** github.com/Pueblo-Vivo/Pueblo-Vivo (rama `main`)
- **Producción:** https://pueblo-vivo.github.io/Pueblo-Vivo/
- **Usuario (Santiago):** NO es programador. Español rioplatense ("vos"). Cuando le pidas reemplazar un archivo (ej. el Apps Script) pasáselo **completo** para copiar y pegar, no parches parciales. Explicá simple.

## Cómo hablar con el usuario
- Una cosa por vez; cambio chico → que pruebe → seguir.
- Es iPhone (Safari). Tener presente sus límites (ver Offline abajo).

## Estructura
Todo el front vive en pocos archivos en la raíz:
- `index.html` — TODA la app (HTML + CSS + JS inline). Es grande.
- `sw.js` — service worker (cache/offline). **Tiene una versión que hay que subir en CADA deploy** (ver abajo).
- `parcelas-data.js` (`window.PARCELAS`, GeoJSON de parcelas), `lotes-reales.js` (`window.LOTES_REALES` + `LOTES_REALES_V`), `poi-data.js` — datos horneados.
- `lib/leaflet.js`, `lib/leaflet.css`, `lib/supabase.js` — librerías **locales** (para que la app abra offline; NO usar CDN).
- `fotos/` — fotos horneadas (casas `c<lote>-0-<n>.jpg` y `casa-<slug>-<n>.jpg`; comunidad `comu-<slug>-<n>.jpg`).
- `manifest.json`, `icon-512.png`.
- `ingresos-appscript.gs` — copia de referencia del Google Apps Script (ver abajo). NO se ejecuta desde el repo; se pega a mano en la planilla.

## Deploy (CRÍTICO)
1. Editás los archivos.
2. **Subí la versión del cache en `sw.js`**: `const CACHE='pueblovivo-vNNN'` → `vNNN+1`. Si no la subís, los usuarios no reciben los cambios (el SW sirve la versión vieja).
3. `git add -A && git commit && git push` a `main`. GitHub Pages publica solo (tarda 1–3 min).
4. **Verificar que salió** (Pages cachea): pollear el sw.js hasta ver la versión nueva:
   ```bash
   for i in 1 2 3; do curl -k -sL "https://pueblo-vivo.github.io/Pueblo-Vivo/sw.js?z=$RANDOM$i" | grep -oE "v[0-9]+" | head -1; sleep 12; done
   ```
5. Si tocaste `parcelas-data.js`/`lotes-reales.js`, además subí `LOTES_REALES_V` cuando corresponda (invalida el cache de inventario en el dispositivo).

## Verificación en preview
- `preview_start {name:"pueblovivo"}` sirve la carpeta en la RAÍZ → la app está en `/index.html`.
- **Los screenshots CUELGAN** por los mapas Leaflet; verificá con `javascript_tool` (DOM), no con screenshot.
- Antes de recargar, desregistrá el SW y limpiá caches, esperá ~8-10s.

## Supabase
- URL: `https://doabiulzatcfpjrpeznc.supabase.co`
- **Publishable key** (anon, es pública, está en index.html): `sb_publishable_vMBsxuou5pbbxAGT9SfwOA_VcxTEaXq`
- La **service key** y la contraseña de la DB las tiene el usuario (privadas, NO en el repo).
- Tablas: `overrides` (fotos/estado de lotes publicados por admin), `visitantes` (registros de ingreso), `disp` (disponibilidad de alquiler), `casa_override` (dueño edita su casa), `comu_override` (emprendedor edita su ficha), `comu_claves` (claves de emprendedor).
- RPCs (SECURITY DEFINER, validan clave server-side): `set_disp`, `set_casa`, `set_comu`.
- Storage: bucket `fotos` (público). Fotos de comunidad subidas por emprendedores en `comu/<slug>/...`.

## Links de emprendedor de Comunidad (auto)
- Link: `?emp=<slug>&clave=<clave>` → abre el editor de esa ficha.
- El **slug** sale del NOMBRE del emprendimiento (`comuSlug(nombre)`), por eso renombrar cambia el link (y hay que reenganchar fotos guardadas por slug viejo).
- La **clave** es determinística: `substr(md5(slug + SECRET), 1, 10)`.
- El **SECRET** está en el Apps Script (`PV_SECRET`) y en el RPC `set_comu` de Supabase — TIENEN que ser el mismo. El usuario te lo pasa; no lo publiques de más.
- En el Sheet de Comunidad, la columna "link de emprendedor" usa la fórmula `=EMPLINK(B2)` (función custom del Apps Script) para armar el link solo en cada fila nueva.

## Google Sheets (fuente de datos)
- Planilla maestra: `17yWE-8ZddG2gUA3L8kWKvGNHoFQikSiHMoCarb_MmUo`. Gids: En venta `67607999`, Alquiler `765860150`, Comunidad `1221939102`, Ingresos `4668214`.
- La app lee por CSV (`export?format=csv&gid=...`). Las hojas son PÚBLICAS (no poner claves sensibles ahí).
- **Ingresos**: la app postea a un webhook de Apps Script (`INGRESOS_URL` en index.html) que escribe en la hoja "Ingresos". El `.gs` escribe SOLO columnas A–E y ancla en la última Fecha (col A) para que las columnas extra (Origen/Umepay del usuario) no generen huecos. Al editar el `.gs`: pegarlo completo en Extensiones→Apps Script y re-deployar la implementación existente (Nueva versión), NO crear una nueva (cambia la URL).

## Offline (importante en iPhone)
- La app es autocontenida (libs locales, fuentes no-bloqueantes). El SW cachea el shell.
- Safari en iPhone **borra el cache** de webs NO instaladas → falla offline. Solución: **Agregar a inicio** (PWA instalada) y abrir 1 vez con wifi.
- El fondo de mapa (tiles satélite/calle) es cache-first: offline solo se ven zonas ya visitadas. Parcelas, ubicación y marcas del usuario sí funcionan offline.

## Marcas y KML (privado por dispositivo)
- Puntos/líneas/rutas y KML importado se guardan en `localStorage` (`pv_marcas_v1`) — **solo en el teléfono de cada uno**, no compartido.

## Notas de seguridad
- Las claves de emprendedor están, hoy, visibles en la planilla pública (limitación aceptada). Real security = sacarlas del Sheet (proyecto aparte).
- No commitear la service key ni contraseñas.
