// api/prices.js — fetches current & historical prices from ITAD using game uuid
export default async function handler(req, res) {
  const { plain } = req.query;
  if (!plain) return res.status(400).json({ error: 'Missing plain' });

  const key = process.env.ITAD_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  try {
    // plain is now the ITAD uuid directly — no lookup needed
    const gameId = plain;

    // Current prices
    const pricesRes = await fetch(`https://api.isthereanydeal.com/games/prices/v2?key=${key}&country=US`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([gameId])
    });
    const pricesData = await pricesRes.json();

    // Historical low
    const histRes = await fetch(`https://api.isthereanydeal.com/games/historylow/v1?key=${key}&country=US`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([gameId])
    });
    const histData = await histRes.json();

    // Parse current prices
    const deals = pricesData?.[0]?.deals || [];
    const histShops = histData?.[0]?.shops || [];

    const steamDeal = deals.find(d => d.shop?.id?.toLowerCase().includes('steam'));
    const epicDeal  = deals.find(d => d.shop?.id?.toLowerCase().includes('epic'));

    function parseDeal(d) {
      if (!d) return { price: null, original: null, deal: false, discount: 0 };
      const price    = d.price?.amount ?? null;
      const original = d.regular?.amount ?? price;
      const discount = d.cut ?? 0;
      return { price, original, deal: discount > 0, discount };
    }

    const s = parseDeal(steamDeal);
    const e = parseDeal(epicDeal);

    const steamHist = histShops.find(sh => sh.id?.toLowerCase().includes('steam'));
    const epicHist  = histShops.find(sh => sh.id?.toLowerCase().includes('epic'));

    res.setHeader('Cache-Control', 's-maxage=1800');
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
