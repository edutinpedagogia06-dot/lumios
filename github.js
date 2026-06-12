// /api/github.js
// Vercel Serverless Function — proxy seguro hacia la API de GitHub.
// El token vive SOLO en las variables de entorno de Vercel, nunca en el navegador.
//
// Configura en Vercel → Settings → Environment Variables:
//   GITHUB_TOKEN = ghp_xxxxxxxxxxxxxxxxxxxx
//   GITHUB_USER  = edutinpedagogia06-dot
//   GITHUB_REPO  = lumios
//   GITHUB_BRANCH = main
//
// El frontend llama a /api/github en vez de api.github.com directamente.

export default async function handler(req, res) {
  // CORS básico (mismo sitio, pero por si acaso)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const TOKEN = process.env.GITHUB_TOKEN;
  const USER  = process.env.GITHUB_USER;
  const REPO  = process.env.GITHUB_REPO;

  if (!TOKEN || !USER || !REPO) {
    return res.status(500).json({ error: "Faltan variables de entorno en Vercel (GITHUB_TOKEN, GITHUB_USER, GITHUB_REPO)" });
  }

  // El path del archivo viene como query param: /api/github?path=manga.json
  const path = req.query.path;
  if (!path) return res.status(400).json({ error: "Falta el parámetro 'path'" });

  const url = `https://api.github.com/repos/${USER}/${REPO}/contents/${path}`;

  try {
    if (req.method === "GET") {
      const r = await fetch(url, {
        headers: {
          "Authorization": `token ${TOKEN}`,
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (!r.ok) return res.status(r.status).json({ error: "GitHub GET error", status: r.status });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (req.method === "PUT") {
      const body = req.body;
      const r = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `token ${TOKEN}`,
          "Content-Type": "application/json",
          "Accept": "application/vnd.github.v3+json"
        },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: "GitHub PUT error", details: data });
      return res.status(200).json(data);
    }

    if (req.method === "DELETE") {
      const body = req.body;
      const r = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `token ${TOKEN}`,
          "Content-Type": "application/json",
          "Accept": "application/vnd.github.v3+json"
        },
        body: JSON.stringify(body)
      });
      if (!r.ok) return res.status(r.status).json({ error: "GitHub DELETE error" });
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    return res.status(500).json({ error: "Error interno", message: err.message });
  }
}
