export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    // 1. Logga in hos Spotify (Official Auth URL)
    const authString = Buffer.from(client_id + ':' + client_secret).toString('base64');
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + authString,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return res.status(401).json({ error: "AUTH_FAILED", details: tokenData });

    // 2. Sökning (Official Search URL)
    // Vi använder URL-byggaren för att garantera att limit=50 blir rätt formaterat
    const params = new URLSearchParams({
      q: 'genre:indie',
      type: 'track',
      limit: '50',
      offset: Math.floor(Math.random() * 50).toString()
    });

    const searchUrl = `https://api.spotify.com/v1/search?${params.toString()}`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      return res.status(searchRes.status).json({ 
        error: "SEARCH_FAILED", 
        spotify_msg: searchData.error?.message,
        tried_url: searchUrl 
      });
    }

    // 3. Filtrera (Popularitet under 40 för den rätta "Raw"-känslan)
    const tracks = searchData.tracks.items
      .filter(t => t.popularity < 40)
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
