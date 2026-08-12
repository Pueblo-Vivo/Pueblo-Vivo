/**
 * Pueblo Vivo · Apps Script de la planilla.
 *  - doPost: registra los ingresos en la hoja "Ingresos" (webhook de la app).
 *  - EMPLINK: fórmula para armar el link de emprendedor de Comunidad. Uso en el Sheet: =EMPLINK(H2)
 *
 * Instalación (una sola vez):
 * 1. Planilla de venta/alquiler → Extensiones → Apps Script.
 * 2. Seleccioná TODO lo que haya y reemplazalo por este código. Guardá (💾).
 * 3. Para el webhook de ingresos: Implementar → Administrar implementaciones → editar la existente → Nueva versión → Implementar.
 */

/* ========================= INGRESOS ========================= */
function doPost(e){
  try{
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Ingresos') || ss.insertSheet('Ingresos');

    // Encabezado FIJO en orden fijo. Lo (re)escribo en cada envío: así nadie lo puede desalinear.
    sh.getRange(1, 1, 1, 6).setValues([['Fecha','Nombre','WhatsApp','Tipo','Mail','Origen']]);

    var d = JSON.parse(e.postData.contents);
    var fecha = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss');
    sh.appendRow([fecha, d.nombre || '', d.whatsapp || '', d.tipo || 'registro', d.mail || '', d.origen || '']);

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
/** Devuelve el link de emprendedor para un ID/nombre. Uso en el Sheet: =EMPLINK(H2) */
function EMPLINK(id){
  var slug = pvSlug(id);
  if(!slug) return '';
  var clave = pvMd5(slug + PV_SECRET).substring(0,10);
  return PV_BASE + '?emp=' + slug + '&clave=' + clave;
}
