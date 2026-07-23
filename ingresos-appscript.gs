/**
 * Pueblo Vivo · Webhook para registrar ingresos en la hoja "Ingresos".
 *
 * Instalación (una sola vez):
 * 1. Abrí la planilla de venta/alquiler (1ljsG...) → Extensiones → Apps Script.
 * 2. Pegá este código y guardá.
 * 3. Implementar (Deploy) → Nueva implementación → tipo "Aplicación web".
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier persona (Anyone)
 * 4. Autorizá con tu cuenta y copiá la URL que termina en /exec.
 * 5. Pasale esa URL a Claude para engancharla en la app.
 */
function doPost(e){
  try{
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Ingresos') || ss.insertSheet('Ingresos');
    if(sh.getLastRow() === 0) sh.appendRow(['Fecha','Nombre','WhatsApp','Mail','Tipo']);
    var d = JSON.parse(e.postData.contents);
    // Fecha/hora SIEMPRE en hora de Argentina (no depende de la zona horaria de la planilla)
    var fecha = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss');
    sh.appendRow([fecha, d.nombre || '', d.whatsapp || '', d.mail || '', d.tipo || 'registro']);
    return ContentService.createTextOutput(JSON.stringify({ok:true}))
      .setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
