/* Construye sol-data.js a partir de tiles SRTM (.hgt.gz skadi, 1 arc-seg ~30m).
   - horizonte de sierras por parcela (para saber sol/sombra real)
   - un DEM recortado y reducido del valle (para dibujar las sombras de los cerros)
   Uso: node sol-build.js  (los .hgt.gz deben estar en TILES_DIR) */
const fs=require('fs'), zlib=require('zlib'), path=require('path');
const TILES_DIR=process.argv[2]||'.';
const OUT=path.join(__dirname,'sol-data.js');
const N=3601; // muestras por lado (SRTM1)
const VOID=-32768;

// ---- cargar tiles ----
const tiles={}; // key "lat,lon" (esquina SO) -> Int16Array
function tileName(latSW,lonSW){ const la=(latSW<0?'S':'N')+String(Math.abs(latSW)).padStart(2,'0'); const lo=(lonSW<0?'W':'E')+String(Math.abs(lonSW)).padStart(3,'0'); return la+lo; }
function loadTile(latSW,lonSW){
  const key=latSW+','+lonSW; if(key in tiles)return tiles[key];
  const f=path.join(TILES_DIR,tileName(latSW,lonSW)+'.hgt.gz');
  if(!fs.existsSync(f)){ tiles[key]=null; return null; }
  const buf=zlib.gunzipSync(fs.readFileSync(f));
  const a=new Int16Array(N*N);
  for(let i=0;i<N*N;i++){ a[i]=buf.readInt16BE(i*2); }
  tiles[key]=a; return a;
}
// elevación bilineal en (lat,lon); devuelve metros o null
function elev(lat,lon){
  const latSW=Math.floor(lat), lonSW=Math.floor(lon);
  const a=loadTile(latSW,lonSW); if(!a)return null;
  // fila 0 = borde norte (lat=latSW+1); col 0 = borde oeste (lon=lonSW)
  const y=( (latSW+1)-lat )*(N-1); // 0..N-1
  const x=( lon-lonSW )*(N-1);
  const x0=Math.floor(x), y0=Math.floor(y), x1=Math.min(x0+1,N-1), y1=Math.min(y0+1,N-1);
  const fx=x-x0, fy=y-y0;
  const g=(r,c)=>{ let v=a[r*N+c]; if(v===VOID)v=0; return v; };
  const v00=g(y0,x0),v10=g(y0,x1),v01=g(y1,x0),v11=g(y1,x1);
  return (v00*(1-fx)+v10*fx)*(1-fy)+(v01*(1-fx)+v11*fx)*fy;
}

// ---- parcelas: centroide por id ----
const src=fs.readFileSync(path.join(__dirname,'parcelas-data.js'),'utf8').replace(/^\s*window\.PARCELAS\s*=\s*/,'').replace(/;\s*$/,'');
const fc=JSON.parse(src);
function centroid(f){ let sLat=0,sLon=0,n=0; const walk=a=>{ if(typeof a[0]==='number'){sLon+=a[0];sLat+=a[1];n++;} else a.forEach(walk); }; walk(f.geometry.coordinates); return [sLat/n,sLon/n]; }

// ---- horizonte por parcela ----
const AZ_STEP=2;                 // grados
const NAZ=360/AZ_STEP;
const R=6371000, K=0.13;         // radio terrestre y refracción
const DMAX=35000;                // hasta 35 km
function horizonAt(lat0,lon0){
  const e0=(elev(lat0,lon0)||0)+1.5;
  const mLat=111320, mLon=111320*Math.cos(lat0*Math.PI/180);
  const hor=new Array(NAZ).fill(0);
  for(let ai=0;ai<NAZ;ai++){
    const az=ai*AZ_STEP*Math.PI/180, cs=Math.cos(az), sn=Math.sin(az);
    let maxA=0, d=60;
    while(d<=DMAX){
      const lat=lat0+(d*cs)/mLat, lon=lon0+(d*sn)/mLon;
      const e=elev(lat,lon);
      if(e!=null){ const drop=d*d/(2*R)*(1-K); const ang=Math.atan2(e-e0-drop, d); if(ang>maxA)maxA=ang; }
      d+= Math.max(30, d*0.015); // paso creciente
    }
    hor[ai]=maxA; // radianes
  }
  return hor;
}

console.log('Calculando horizonte de',fc.features.length,'parcelas…');
const horizon={};
let done=0;
for(const f of fc.features){
  const id=f.properties.id;
  const [la,lo]=centroid(f);
  horizon[id]=horizonAt(la,lo).map(a=>Math.round(a*1800/Math.PI)); // décimas de grado (int)
  if(++done%40===0)console.log('  ',done);
}

// ---- DEM recortado del valle para las sombras ----
let minLat=90,maxLat=-90,minLon=180,maxLon=-180;
for(const f of fc.features){ const walk=a=>{ if(typeof a[0]==='number'){minLon=Math.min(minLon,a[0]);maxLon=Math.max(maxLon,a[0]);minLat=Math.min(minLat,a[1]);maxLat=Math.max(maxLat,a[1]);} else a.forEach(walk);}; walk(f.geometry.coordinates); }
const MARGIN=0.055; // ~6 km
const b={ n:maxLat+MARGIN, s:minLat-MARGIN, w:minLon-MARGIN, e:maxLon+MARGIN };
const STEP=0.0006;  // ~65 m
const cols=Math.round((b.e-b.w)/STEP), rows=Math.round((b.n-b.s)/STEP);
const dem=new Int16Array(rows*cols);
for(let r=0;r<rows;r++){ const lat=b.n-r*STEP; for(let c=0;c<cols;c++){ const lon=b.w+c*STEP; dem[r*cols+c]=Math.round(elev(lat,lon)||0); } }

// ---- emitir ----
const b64=Buffer.from(new Uint8Array(dem.buffer)).toString('base64');
const out='window.SOLAR='+JSON.stringify({
  azStep:AZ_STEP, naz:NAZ,
  horizon,                      // id -> [décimas de grado] por azimut (0=N, horario)
  dem:{ n:b.n, s:b.s, w:b.w, e:b.e, rows, cols, step:STEP, data:b64 }  // Int16 metros, base64
})+';\n';
fs.writeFileSync(OUT,out);
const stats=fs.statSync(OUT);
console.log('OK -> sol-data.js', (stats.size/1024).toFixed(0),'KB | DEM',rows+'x'+cols);
// pequeño chequeo: horizonte O/E promedio del centro
const cLat=-32.199,cLon=-64.7446; const h=horizonAt(cLat,cLon).map(a=>a*180/Math.PI);
const oeste=h[Math.round(270/AZ_STEP)], este=h[Math.round(90/AZ_STEP)], sur=h[Math.round(180/AZ_STEP)];
console.log('Horizonte centro (grados) -> Este:',este.toFixed(1),' Oeste:',oeste.toFixed(1),' Sur:',sur.toFixed(1),' maxTerreno~',Math.max(...h).toFixed(1));
