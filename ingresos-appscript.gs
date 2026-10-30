/**
 * Pueblo Vivo · Apps Script de la planilla.
 *  - doPost: registra los ingresos en la hoja "Ingresos" (webhook de la app).
 *            Si la persona tildó "quiero recibir novedades", la suma a la hoja
 *            "Novedades" y le manda un mail de bienvenida (una sola vez).
 *            BAJAS: si en la columna H de "Ingresos" dice BAJA en alguna de sus
 *            filas, no se le manda nada más, ni aunque vuelva a tildar la casilla.
 *  - EMPLINK: fórmula para armar el link de emprendedor de Comunidad. Uso en el Sheet: =EMPLINK(B2)
 *
 * Instalación / actualización:
 * 1. Planilla → Extensiones → Apps Script.
 * 2. Seleccioná TODO y reemplazalo por este código. Guardá (💾).
 * 3. Implementar → Administrar implementaciones → editar la existente (el lápiz) →
 *    Nueva versión → Implementar.   NO crear una implementación nueva: cambia la URL.
 * 4. La primera vez que corra te va a pedir permiso para enviar mails en tu nombre: aceptá.
 */

/* ===== Texto del mail de bienvenida. Editalo libremente. ===== */
var PV_ASUNTO = 'Gracias por pasar por Umepay 🌿';
function pvCuerpo(nombre){
  var hola = nombre ? ('Hola ' + nombre + '!') : '¡Hola!';
  return hola + '\n\n' +
  'Gracias por entrar a la app de Pueblo Vivo y por querer recibir nuestras novedades.\n\n' +
  'Cada tanto te vamos a escribir para contarte lo que va pasando en Umepay: los lotes y casas ' +
  'que salen a la venta, los cambios de precio, y las casas disponibles para alojarte. ' +
  'Nada más que eso, y sin llenarte la casilla.\n\n' +
  'Mientras tanto podés seguir mirando el mapa acá:\n' + PV_BASE + '\n\n' +
  'Si en algún momento no querés recibir más, respondé este mail con la palabra BAJA y te sacamos ' +
  'de la lista enseguida.\n\n' +
  '¡Nos vemos!\n' +
  'Fran y Cande · Pueblo Vivo · Umepay';
}

/* ========================= INGRESOS ========================= */
function doPost(e){
  try{
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Ingresos') || ss.insertSheet('Ingresos');

    // Encabezado fijo (columnas A-E). No toca F/G (Origen, Umepay), que las manejás vos.
    sh.getRange(1, 1, 1, 5).setValues([['Fecha','Nombre','WhatsApp','Tipo','Mail']]);
    sh.getRange(1, 8).setValue('Novedades');   // columna H: dejo F y G libres para vos

    var d = JSON.parse(e.postData.contents);
    var fecha = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss');
    var quiere = (d.novedades == 1 || d.novedades === true || d.novedades === '1');
    // ¿Alguna vez pidió la baja? Se mira ANTES de escribir la fila nueva.
    var baja = pvEstaDeBaja(ss, d.mail);

    // Busco la última fila que tenga FECHA (columna A) — que la escribe SOLO la app.
    // Así, lo que haya en F/G (fórmulas, marcas) NO desplaza el ingreso nuevo: se acabó el "hueco".
    var n = sh.getLastRow();
    var lastA = 1;
    if (n > 0){
      var colA = sh.getRange(1, 1, n, 1).getValues();
      for (var i = 0; i < colA.length; i++){ if (String(colA[i][0]).trim() !== '') lastA = i + 1; }
    }
    var fila = lastA + 1;
    sh.getRange(fila, 1, 1, 5).setValues([[fecha, d.nombre || '', d.whatsapp || '', d.tipo || 'registro', d.mail || '']]);
    // La BAJA se re-escribe en la fila nueva: queda a la vista y no se pierde nunca.
    sh.getRange(fila, 8).setValue(baja ? 'BAJA' : (quiere ? 'SI' : ''));

    // Si pidió novedades, lo sumo a la lista y le mando la bienvenida (una sola vez por mail).
    // Si alguna vez pidió la baja, no: la baja manda, aunque vuelva a tildar la casilla.
    if (quiere && d.mail && !baja) pvSumarANovedades(ss, d.nombre || '', d.mail, d.whatsapp || '', fecha);

    return ContentService.createTextOutput(JSON.stringify({ok:true}))
      .setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* ===== Lista de novedades + mail de bienvenida ===== */
function pvSumarANovedades(ss, nombre, mail, whatsapp, fecha){
  var sh = ss.getSheetByName('Novedades');
  if (!sh){
    sh = ss.insertSheet('Novedades');
    sh.getRange(1, 1, 1, 6).setValues([['Fecha','Nombre','Mail','WhatsApp','Bienvenida','Baja']]);
    sh.setFrozenRows(1);
  }
  mail = String(mail).trim().toLowerCase();

  // ¿Ya está en la lista? Entonces no lo duplico ni le mando otra bienvenida.
  var n = sh.getLastRow();
  if (n > 1){
    var mails = sh.getRange(2, 3, n - 1, 1).getValues();
    for (var i = 0; i < mails.length; i++){
      if (String(mails[i][0]).trim().toLowerCase() === mail) return;
    }
  }

  var fila = (n < 1 ? 1 : n) + 1;
  sh.getRange(fila, 1, 1, 6).setValues([[fecha, nombre, mail, whatsapp, '', '']]);

  // El mail va DESPUÉS de guardar: si el envío falla, igual no perdemos el contacto.
  try{
    MailApp.sendEmail({ to: mail, subject: PV_ASUNTO, body: pvCuerpo(pvPrimerNombre(nombre)) });
    sh.getRange(fila, 5).setValue('enviada ' + fecha);
  }catch(err){
    sh.getRange(fila, 5).setValue('ERROR: ' + String(err));
  }
}
function pvPrimerNombre(n){
  n = String(n || '').trim();
  if (!n) return '';
  var p = n.split(/\s+/)[0];
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

/* ===== BAJAS =====
 * Para dar de baja a alguien: escribí la palabra BAJA en la columna H (Novedades)
 * de la hoja Ingresos, en CUALQUIERA de sus filas. Con una sola alcanza.
 * La baja le gana siempre al SI, y no se puede perder: no hay que borrar ninguna fila.
 */

/** Todos los mails que pidieron la baja, en un diccionario para buscar rápido. */
function pvMailsDeBaja(ss){
  var out = {};
  var sh = ss.getSheetByName('Ingresos');
  if (!sh || sh.getLastRow() < 2) return out;
  var v = sh.getRange(2, 5, sh.getLastRow() - 1, 4).getValues();   // E=Mail … H=Novedades
  for (var i = 0; i < v.length; i++){
    var mail = String(v[i][0]).trim().toLowerCase();
    if (mail && /baja/i.test(String(v[i][3]))) out[mail] = 1;
  }
  return out;
}
function pvEstaDeBaja(ss, mail){
  mail = String(mail || '').trim().toLowerCase();
  if (!mail) return false;
  return !!pvMailsDeBaja(ss)[mail];
}

/** Devuelve los mails de la lista, sin los que pidieron la baja ni repetidos.
 *  Uso en el Sheet (en una celda vacía):  =PVLISTA()                    */
function PVLISTA(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Novedades');
  if (!sh || sh.getLastRow() < 2) return '';
  var bajas = pvMailsDeBaja(ss);       // las BAJA escritas en la hoja Ingresos
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  var out = [], vistos = {};
  for (var i = 0; i < v.length; i++){
    var mail = String(v[i][2]).trim().toLowerCase();
    if (!mail) continue;
    if (String(v[i][5]).trim()) continue;   // columna Baja de esta misma hoja
    if (bajas[mail] || vistos[mail]) continue;
    vistos[mail] = 1;
    out.push(mail);
  }
  return out.join(', ');
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
