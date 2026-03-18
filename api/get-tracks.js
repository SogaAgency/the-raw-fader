export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  // 1. Kolla om variablerna ens finns
  if (!client_id || !client_secret) {
    return res.status(500).json({ error: "MISSING_KEYS", message: "Environment variables are not set in Vercel." });
  }

  try {
    // 2. Autentisering
    const authString = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json({ error: "AUTH_FAILED", spotify_msg: tokenData });
    }

    const token = tokenData.access_token;
    const randomChar = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    const offset = Math.floor(Math.random() * 100);

    // 3. Sökning
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${randomChar}&type=track&limit=50&offset=${offset}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      return res.status(searchRes.status).json({ error: "SEARCH_FAILED", spotify_msg: searchData });
    }

    // 4. Filtrera (Popularitet < 35)
    const tracks = searchData.tracks.items
      .filter(t => t.popularity < 35)
      .map(t => ({
        name: t.name,
        artist: t.artists[0].name,
        link: t.external_urls.spotify
      }));

    return res.status(200).json(tracks);

  } catch (err) {
    return res.status(500).json({ error: "SERVER_CRASH", message: err.message });
  }
}
