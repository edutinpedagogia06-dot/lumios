export default async function handler(req, res) {
  const { GITHUB_TOKEN, GITHUB_USER, GITHUB_REPO, GITHUB_BRANCH } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_USER || !GITHUB_REPO) {
    return res.status(500).json({
      error: "Faltan variables de entorno en Vercel: GITHUB_TOKEN, GITHUB_USER y/o GITHUB_REPO"
    });
  }

  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: "Falta el parámetro path" });
  }

  const branch = GITHUB_BRANCH || "main";
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    "User-Agent": "lumios-proxy",
    Accept: "application/vnd.github+json"
  };

  try {
    if (req.method === "GET") {
      const r = await fetch(`${url}?ref=${branch}`, { headers });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (req.method === "PUT") {
      const r = await fetch(url, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (req.method === "DELETE") {
      const r = await fetch(url, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
