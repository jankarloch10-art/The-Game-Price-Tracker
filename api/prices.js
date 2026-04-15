export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  const key = process.env.ITAD_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });
  try {
    const url = `https://api.isthereanydeal.com/games/search/v1?key=${key}&title=${encodeURIComponent(q)}&results=10`;
    const r = await fetch(url);
    const data = await r.json();
    const games = (data || []).map(g => ({ id: g.id, plain: g.id, title: g.title, stores: '' }));
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(200).json(games);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
