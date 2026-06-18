# Pueblo Vivo 🌳

App de la inmobiliaria **Pueblo Vivo** para los lotes y alojamientos de la ecoaldea **Umepay**.

Pensada para que quien llega a la ecoaldea pueda recorrer los terrenos desde el celular: ver cuáles están libres, precios, tamaño, fotos, ubicarse en el mapa, marcar favoritos, dejar notas y consultar por WhatsApp.

## Características

- 🗺️ **Mapa real** de las parcelas de Umepay (sobre imagen satelital) coloreadas por estado: libre / en pausa.
- 🏠 **Dos modos**: *Comprar lote* y *Alojarte* (alquileres estilo Airbnb, con calendario de disponibilidad).
- 📋 **Inventario real** conectado a la planilla de Google Sheets, con vinculación de cada inmueble a su lote en el mapa.
- 📍 **Puntos de interés** (Despensa, Siembra Dicha, Escuela, Dique, Plaza, etc.) y distancias desde cada lote.
- ❤️ Favoritos, 👁️ lotes vistos, 📷 fotos propias, 💬 notas y comentarios (se guardan en el dispositivo).
- 🔎 Filtros (presupuesto, tamaño, orientación), ⚖️ comparador de lotes y 🧭 recorrido sugerido entre favoritos.
- 🛠️ **Panel inmobiliaria** para editar precios, estados y datos sin tocar código.
- 📤 Compartir por WhatsApp y ficha en PDF.
- 📴 **PWA**: se instala en el celular y funciona sin internet en el campo.

## Cómo correrlo

Es una app estática (HTML + JS). Para verla localmente, serví la carpeta con cualquier servidor estático, por ejemplo:

```bash
npx http-server . -p 8080
```

Y abrí http://localhost:8080

> Conviene servirla (no abrir el archivo directo) para que cargue la planilla de Google Sheets y funcione el service worker.

## Datos

- `parcelas-data.js` — geometría y numeración de las parcelas (cartografía Umepay).
- `poi-data.js` — puntos de interés.
- `lotes-reales.js` — copia del inventario de la planilla (se actualiza en vivo desde Google Sheets con el botón *Actualizar*).

## Estado

Prototipo en desarrollo. Algunos datos (fotos, ciertos precios y disponibilidad de alquileres) son de muestra hasta terminar de cargar el inventario real.
