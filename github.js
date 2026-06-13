const GCS = "https://raw.githubusercontent.com/" + CFG.gh.user + "/" + CFG.gh.repo + "/" + CFG.gh.branch + "/";

// ── GitHub API a través del proxy seguro /api/github ──────────
// El token NUNCA está en este archivo. Vive en las variables de
// entorno de Vercel y lo usa /api/github.js por detrás.
const GH = {
  proxy: "/api/github",

  async readJSON(path) {
    const r = await fetch(`${this.proxy}?path=${encodeURIComponent(path)}`);
    if (!r.ok) return { data: [], sha: null };
    const f = await r.json();
    if (!f.content) return { data: [], sha: null };
    const data = JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\n/g, "")))));
    return { data, sha: f.sha };
  },

  async writeJSON(path, data, sha) {
    const body = {
      message: `lumios: update ${path}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
      branch: CFG.gh.branch
    };
    if (sha) body.sha = sha;
    const r = await fetch(`${this.proxy}?path=${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return r.ok;
  },

  async uploadImage(path, base64data, sha) {
    const body = {
      message: `lumios: upload ${path}`,
      content: base64data,
      branch: CFG.gh.branch
    };
    if (sha) body.sha = sha;
    const r = await fetch(`${this.proxy}?path=${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!r.ok) return null;
    const res = await r.json();
    return res.content ? res.content.download_url : null;
  },

  async getSHA(path) {
    const r = await fetch(`${this.proxy}?path=${encodeURIComponent(path)}`);
    if (!r.ok) return null;
    const f = await r.json();
    return f.sha || null;
  },

  async deleteFile(path, sha) {
    const r = await fetch(`${this.proxy}?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `lumios: delete ${path}`, sha, branch: CFG.gh.branch })
    });
    return r.ok;
  }
};

const DB = {
  async getManga()     { return GH.readJSON("manga.json"); },
  async getAnime()     { return GH.readJSON("anime.json"); },
  async getPeliculas() { return GH.readJSON("peliculas.json"); },
  async getSite()      { return GH.readJSON("site.json"); },
  async saveManga(d,s)     { return GH.writeJSON("manga.json", d, s); },
  async saveAnime(d,s)     { return GH.writeJSON("anime.json", d, s); },
  async savePeliculas(d,s) { return GH.writeJSON("peliculas.json", d, s); },
  async saveSite(d,s)      { return GH.writeJSON("site.json", d, s); },
  genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
};

async function applyTheme() {
  try {
    const { data } = await DB.getSite();
    if (!data || Array.isArray(data)) return data;
    const root = document.documentElement.style;
    if (data.colorRed)  root.setProperty("--red", data.colorRed);
    if (data.colorRed2) root.setProperty("--red2", data.colorRed2);
    if (data.colorBg)   root.setProperty("--bg", data.colorBg);
    if (data.colorBg2)  root.setProperty("--bg2", data.colorBg2);
    if (data.colorText) root.setProperty("--text", data.colorText);
    return data;
  } catch(e) { return null; }
}
applyTheme();

function coverUrl(c) { return c ? GCS + c : ""; }

// Busca todos los títulos (manga, anime, película) que comparten el mismo "universo"
async function getUniverseItems(universo) {
  if (!universo) return [];
  const [{data:manga},{data:anime},{data:pelis}] = await Promise.all([DB.getManga(),DB.getAnime(),DB.getPeliculas()]);
  const items = [
    ...manga.filter(m=>m.universo===universo).map(m=>({...m,_type:"manga",_link:`leer.html?id=${m.id}`})),
    ...anime.filter(a=>a.universo===universo).map(a=>({...a,_type:"anime",_link:`ver-anime.html?id=${a.id}`})),
    ...pelis.filter(p=>p.universo===universo).map(p=>({...p,_type:"pelicula",_link:`ver-pelicula.html?id=${p.id}`}))
  ];
  items.sort((a,b)=>(a.orden||999)-(b.orden||999));
  return items;
}

// Renderiza la sección "Más de este universo" con línea de tiempo
function renderUniverseSection(items, currentId) {
  if (!items || items.length < 2) return "";
  const rows = items.map(it => {
    const img = coverUrl(it.cover);
    const isCurrent = it.id === currentId;
    return `
      <div class="timeline-item ${isCurrent?'current':''}" onclick="${isCurrent?'':`location.href='${it._link}'`}">
        <div class="timeline-thumb">${img?`<img src="${img}" alt="${it.titulo}" loading="lazy">`:(it._type==="manga"?"📖":it._type==="anime"?"🎬":"🎥")}</div>
        <div class="timeline-info">
          <div class="timeline-order">${it.orden?`Parte ${it.orden}`:""}</div>
          <div class="timeline-name">${it.titulo}</div>
          <div class="timeline-type">${it._type}</div>
        </div>
        ${isCurrent?'<span class="timeline-current-badge">Viendo</span>':''}
      </div>`;
  }).join("");
  return `
    <div class="universe-section">
      <div class="universe-title"><i class="ti ti-affiliate"></i> Más de este universo</div>
      <div class="timeline">${rows}</div>
    </div>`;
}

// Transición de salida cinematográfica al navegar
function lumiosGo(url) {
  document.body.classList.add("page-exit");
  setTimeout(() => location.href = url, 220);
}

function showToast(msg, type) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = `toast ${type === "error" ? "error" : ""} show`;
  setTimeout(() => t.classList.remove("show"), 3200);
}
