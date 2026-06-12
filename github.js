const GCS = "https://raw.githubusercontent.com/" + CFG.gh.user + "/" + CFG.gh.repo + "/" + CFG.gh.branch + "/";

const GH = {
  base: `https://api.github.com/repos/${CFG.gh.user}/${CFG.gh.repo}/contents`,
  headers() {
    return {
      "Authorization": `token ${CFG.gh.token}`,
      "Content-Type": "application/json",
      "Accept": "application/vnd.github.v3+json"
    };
  },
  async readJSON(path) {
    const r = await fetch(`${this.base}/${path}`, { headers: this.headers() });
    if (!r.ok) return { data: [], sha: null };
    const f = await r.json();
    const data = JSON.parse(atob(f.content.replace(/\n/g, "")));
    return { data, sha: f.sha };
  },
  async writeJSON(path, data, sha) {
    const body = {
      message: `lumios: update ${path}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
      branch: CFG.gh.branch
    };
    if (sha) body.sha = sha;
    const r = await fetch(`${this.base}/${path}`, {
      method: "PUT", headers: this.headers(), body: JSON.stringify(body)
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
    const r = await fetch(`${this.base}/${path}`, {
      method: "PUT", headers: this.headers(), body: JSON.stringify(body)
    });
    if (!r.ok) return null;
    const res = await r.json();
    return res.content.download_url;
  },
  async getSHA(path) {
    const r = await fetch(`${this.base}/${path}`, { headers: this.headers() });
    if (!r.ok) return null;
    return (await r.json()).sha;
  },
  async deleteFile(path, sha) {
    const r = await fetch(`${this.base}/${path}`, {
      method: "DELETE", headers: this.headers(),
      body: JSON.stringify({ message: `lumios: delete ${path}`, sha, branch: CFG.gh.branch })
    });
    return r.ok;
  }
};

const DB = {
  async getManga()     { return GH.readJSON("manga.json"); },
  async getAnime()     { return GH.readJSON("anime.json"); },
  async getPeliculas() { return GH.readJSON("peliculas.json"); },
  async saveManga(d,s)     { return GH.writeJSON("manga.json", d, s); },
  async saveAnime(d,s)     { return GH.writeJSON("anime.json", d, s); },
  async savePeliculas(d,s) { return GH.writeJSON("peliculas.json", d, s); },
  genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
};

function coverUrl(c) { return c ? GCS + c : ""; }

function showToast(msg, type) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = `toast ${type === "error" ? "error" : ""} show`;
  setTimeout(() => t.classList.remove("show"), 3200);
}
