/* ============================================
   LUMIOS — github.js
   Carga datos desde GitHub y resuelve imágenes
   de Google Drive (IDs de carpeta o de archivo)
   ============================================ */

const REPO_BASE = "https://raw.githubusercontent.com/edutinpedagogia06-dot/lumios/main/";
const GDRIVE_API_KEY = "AIzaSyDn3H2IY8dqvQjPJG-IaMTNQL7J8lFUHZM";

// Cache en memoria para no re-pedir JSON varias veces
const _cache = {};

async function fetchJSON(file) {
  if (_cache[file]) return _cache[file];
  const r = await fetch(REPO_BASE + file);
  if (!r.ok) throw new Error("No se pudo cargar " + file);
  const data = await r.json();
  _cache[file] = data;
  return data;
}

/* --------- URLs de imagen --------- */

/**
 * Dado un ID (de archivo o carpeta de Drive), devuelve una URL de imagen directa.
 * Si es un archivo: usa el proxy de Drive.
 * Si es una carpeta: lista los archivos de la carpeta (API Drive) y devuelve la URL del primero.
 * Para coverUrl solo necesitamos la primera imagen, así que resolvemos como cover.
 */
function coverUrl(id) {
  if (!id) return "";
  // Siempre usamos el proxy de Drive — funciona para IDs de archivo
  return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
}

/**
 * Obtiene las páginas de un capítulo.
 * - Si cap.paginas es un array de IDs de archivo → los usa directamente
 * - Si cap.carpeta es un ID de carpeta → lista archivos de Drive ordenados
 */
async function resolvePages(cap) {
  // Caso 1: ya tiene array de IDs de imagen
  if (cap.paginas && Array.isArray(cap.paginas) && cap.paginas.length > 0) {
    return cap.paginas.map(id => ({
      id,
      url: `https://drive.google.com/uc?export=view&id=${id}`
    }));
  }

  // Caso 2: tiene ID de carpeta
  const folderId = cap.carpeta || cap.folder;
  if (!folderId) return [];

  try {
    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&orderBy=name&fields=files(id,name)&key=${GDRIVE_API_KEY}&pageSize=200`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("Drive API error " + r.status);
    const data = await r.json();
    const files = (data.files || []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return files.map(f => ({
      id: f.id,
      name: f.name,
      url: `https://drive.google.com/uc?export=view&id=${f.id}`
    }));
  } catch (e) {
    console.error("Error listando carpeta Drive:", e);
    return [];
  }
}

/* --------- DB: acceso a los JSON --------- */
const DB = {
  async getManga()     { return { data: await fetchJSON("manga.json") }; },
  async getAnime()     { return { data: await fetchJSON("anime.json") }; },
  async getPeliculas() { return { data: await fetchJSON("peliculas.json") }; },
  async getSite()      { return { data: await fetchJSON("site.json") }; },
};

/* --------- Tema del sitio --------- */
async function applyTheme() {
  try {
    const { data: site } = await DB.getSite();
    if (!site) return null;
    const root = document.documentElement;
    if (site.colorPrimary)  root.style.setProperty("--indigo",        site.colorPrimary);
    if (site.colorBright)   root.style.setProperty("--indigo-bright",  site.colorBright);
    if (site.colorDark)     root.style.setProperty("--indigo-dark",    site.colorDark);
    return site;
  } catch { return null; }
}

/* --------- Universo / crossover --------- */
async function getUniverseItems(universoId) {
  try {
    const [{ data: manga }, { data: anime }, { data: pelis }] = await Promise.all([
      DB.getManga(), DB.getAnime(), DB.getPeliculas()
    ]);
    return [...manga, ...anime, ...pelis].filter(
      item => item.universo === universoId
    );
  } catch { return []; }
}

function renderUniverseSection(items, currentId) {
  if (!items || items.length < 2) return "";
  return `
  <div class="universe-section">
    <div class="universe-title">✦ Mismo universo</div>
    <div class="universe-grid">
      ${items.map(item => {
        const isCurrent = item.id === currentId;
        const img = coverUrl(item.cover);
        const href = item.tipo === "anime"    ? `ver-anime.html?id=${item.id}`
                   : item.tipo === "pelicula" ? `ver-pelicula.html?id=${item.id}`
                   :                            `leer.html?id=${item.id}`;
        return `<div class="universe-item ${isCurrent ? "current" : ""}" onclick="location.href='${href}'">
          <div class="universe-item-img">${img ? `<img src="${img}" alt="${item.titulo}" loading="lazy">` : "📖"}</div>
          <div class="universe-item-name">${item.titulo}</div>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

/* --------- Toast --------- */
function showToast(msg, ms = 2500) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
}

/* --------- GCS helper (por si hay imágenes en otro storage) --------- */
const GCS = "";
