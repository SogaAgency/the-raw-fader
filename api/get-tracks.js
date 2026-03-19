export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    // 1. Hämta Access Token
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
    const token = tokenData.access_token;

    // 2. Sökning - Vi använder en stenhård, enkel URL
    // Vi söker efter bokstaven 'a' i genren 'indie' för att garantera träffar
    const searchUrl = 'https://api.spotify.com/v1/search?q=genre:indie&type=track&limit=50&offset=0';
    
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      // Om det fortfarande dör här, skickar vi med Spotifys eget felmeddelande
      return res.status(searchRes.status).json({ 
        error: "SEARCH_FAILED", 
        spotify_msg: searchData.error?.message || "Unknown Spotify error" 
      });
    }

    // 3. Filtrera (Popularitet under 40 för att få bra bredd)
    const tracks = searchData.tracks.items
      .filter(t => t.popularity < 40)
      .map(t => ({
        name: t.name,
        artist: t.artists[0].name,
        link: t.external_urls.spotify
      }));

    // Returnera resultatet
    return res.status(200).json(tracks);

  } catch (err) {
    return res.status(500).json({ error: "SERVER_CRASH", message: err.message });
  }
}
