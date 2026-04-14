// api/prices.js — fetches current & historical prices from ITAD
export default async function handler(req, res) {
  const { plain } = req.query;
  if (!plain) return res.status(400).json({ error: 'Missing plain' });

  const key = process.env.ITAD_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  try {
    // Current prices
    const pricesUrl = `https://api.isthereanydeal.com/games/prices/v2?key=${key}&country=US`;
    const pricesRes = await fetch(pricesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([plain])
    });
    if (!pricesRes.ok) throw new Error(`ITAD prices error: ${pricesRes.status}`);
    const pricesData = await pricesRes.json();

    // Historical low
    const histUrl = `https://api.isthereanydeal.com/games/historylow/v1?key=${key}&country=US`;
    const histRes = await fetch(histUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([plain])
    });
    if (!histRes.ok) throw new Error(`ITAD history error: ${histRes.status}`);
    const histData = await histRes.json();

    // Parse current prices
    const gameData = pricesData?.[0];
    const deals = gameData?.deals || [];

    const STEAM = 'steam';
    const EPIC  = 'epic';

    function findStore(slug) {
      return deals.find(d => d.shop?.id?.toLowerCase().includes(slug));
    }

    const steamDeal = findStore(STEAM);
    const epicDeal  = findStore(EPIC);

    function parseDeal(d) {
      if (!d) return { price: null, original: null, deal: false, discount: 0 };
      const price    = d.price?.amount ?? null;
      const original = d.regular?.amount ?? price;
      const discount = d.cut ?? 0;
      return { price, original, deal: discount > 0, discount };
    }

    const s = parseDeal(steamDeal);
    const e = parseDeal(epicDeal);

    // Parse historical lows
    const hist = histData?.[0];
    const steamHist = hist?.shops?.find(sh => sh.id?.toLowerCase().includes(STEAM));
    const epicHist  = hist?.shops?.find(sh => sh.id?.toLowerCase().includes(EPIC));

    res.setHeader('Cache-Control', 's-maxage=1800'); // cache 30 min on CDN
    return res.status(200).json({
      steamPrice:    s.price,
      steamOriginal: s.original,
      steamDeal:     s.deal,
      steamDiscount: s.discount,
      steamLowest:   steamHist?.low?.amount ?? null,

      epicPrice:     e.price,
      epicOriginal:  e.original,
      epicDeal:      e.deal,
      epicDiscount:  e.discount,
      epicLowest:    epicHist?.low?.amount ?? null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
