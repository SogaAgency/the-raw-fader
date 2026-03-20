export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    // 1. Hämta Access Token
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
    if (!tokenRes.ok) return res.status(401).json({ error: "AUTH_FAILED" });

    // 2. Sökning - Vi använder URL-objektet för att GARANTERA korrekt format
    const spotifyApiUrl = new URL('https://api.spotify.com/v1/search?q=$7');
    spotifyApiUrl.searchParams.append('q', 'genre:indie');
    spotifyApiUrl.searchParams.append('type', 'track');
    spotifyApiUrl.searchParams.append('limit', '50');
    spotifyApiUrl.searchParams.append('offset', Math.floor(Math.random() * 50).toString());

    const searchRes = await fetch(spotifyApiUrl.toString(), {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      return res.status(searchRes.status).json({ 
        error: "SEARCH_FAILED", 
        spotify_msg: searchData.error?.message,
        tried_url: spotifyApiUrl.toString() // För att vi ska se att ? finns där nu
      });
    }

    // 3. Filtrera (Popularitet under 40)
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
