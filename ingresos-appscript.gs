/**
 * Pueblo Vivo · Webhook para registrar ingresos en la hoja "Ingresos".
 *
 * Instalación (una sola vez):
 * 1. Abrí la planilla de venta/alquiler → Extensiones → Apps Script.
 * 2. Pegá este código y guardá.
 * 3. Implementar (Deploy) → Administrar implementaciones → editá la existente → Nueva versión → Implementar.
 *    (Si creás una implementación NUEVA cambia la URL y habría que reengancharla en la app.)
 */
function doPost(e){
  try{
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Ingresos') || ss.insertSheet('Ingresos');

    // Encabezado FIJO en orden fijo. Lo (re)escribo en cada envío: así nadie lo puede desalinear.
    // El orden coincide con los datos que ya estaban cargados (Tipo en D, Mail en E).
    sh.getRange(1, 1, 1, 5).setValues([['Fecha','Nombre','WhatsApp','Tipo','Mail']]);

    var d = JSON.parse(e.postData.contents);
    // Fecha/hora SIEMPRE en hora de Argentina (no depende de la zona horaria de la planilla)
    var fecha = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss');
    sh.appendRow([fecha, d.nombre || '', d.whatsapp || '', d.tipo || 'registro', d.mail || '']);

    return ContentService.createTextOutput(JSON.stringify({ok:true}))
      .setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
