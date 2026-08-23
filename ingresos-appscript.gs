/**
 * Pueblo Vivo · Apps Script de la planilla.
 *  - doPost: registra los ingresos en la hoja "Ingresos" (webhook de la app).
 *  - EMPLINK: fórmula para armar el link de emprendedor de Comunidad. Uso en el Sheet: =EMPLINK(B2)
 *
 * Instalación / actualización:
 * 1. Planilla → Extensiones → Apps Script.
 * 2. Seleccioná TODO y reemplazalo por este código. Guardá (💾).
 * 3. Implementar → Administrar implementaciones → editar la existente → Nueva versión → Implementar.
 */

/* ========================= INGRESOS ========================= */
function doPost(e){
  try{
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Ingresos') || ss.insertSheet('Ingresos');

    // Encabezado fijo (columnas A-E). No toca F/G (Origen, Umepay), que las manejás vos.
    sh.getRange(1, 1, 1, 5).setValues([['Fecha','Nombre','WhatsApp','Tipo','Mail']]);

    var d = JSON.parse(e.postData.contents);
    var fecha = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss');

    // Busco la última fila que tenga FECHA (columna A) — que la escribe SOLO la app.
    // Así, lo que haya en F/G (fórmulas, marcas) NO desplaza el ingreso nuevo: se acabó el "hueco".
    var n = sh.getLastRow();
    var lastA = 1;
    if (n > 0){
      var colA = sh.getRange(1, 1, n, 1).getValues();
      for (var i = 0; i < colA.length; i++){ if (String(colA[i][0]).trim() !== '') lastA = i + 1; }
    }
    sh.getRange(lastA + 1, 1, 1, 5).setValues([[fecha, d.nombre || '', d.whatsapp || '', d.tipo || 'registro', d.mail || '']]);

    return ContentService.createTextOutput(JSON.stringify({ok:true}))
      .setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* ================= LINK DE EMPRENDEDOR (Comunidad) ================= */
// El secreto queda escondido acá (quien mira el Sheet no lo ve). Tiene que ser EL MISMO que en Supabase.
var PV_SECRET = 'pv9k3m7q2x8w4t6r1n5b0z';
var PV_BASE   = 'https://pueblo-vivo.github.io/Pueblo-Vivo/';

function pvSlug(n){
  if(n == null) return '';
  return String(n).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function pvMd5(s){
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i=0; i<raw.length; i++){ var b=(raw[i]+256)%256; hex += (b<16?'0':'') + b.toString(16); }
  return hex;
}
/** Link de emprendedor. Uso en el Sheet: =EMPLINK(B2) */
function EMPLINK(id){
  var slug = pvSlug(id);
  if(!slug) return '';
  var clave = pvMd5(slug + PV_SECRET).substring(0,10);
  return PV_BASE + '?emp=' + slug + '&clave=' + clave;
}
