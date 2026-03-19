export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    // 1. Hämta Token
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

    // 2. Sökning - Fixad URL-struktur
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const randomChar = alphabet[Math.floor(Math.random() * alphabet.length)];
    const offset = Math.floor(Math.random() * 100);

    // Här använder vi en renare sträng för att undvika "Invalid limit"
    const apiUrl = `https://api.spotify.com/v1/search?q=${randomChar}&type=track&limit=50&offset=${offset}`;
    
    const searchRes = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      return res.status(searchRes.status).json({ error: "Spotify Search Failed", details: searchData });
    }

    // 3. Filtrera (Indie-fokus: Popularitet under 35)
    const tracks = searchData.tracks.items
      .filter(t => t.popularity < 35)
      .map(t => ({
        name: t.name,
        artist: t.artists[0].name,
        link: t.external_urls.spotify
      }));

    return res.status(200).json(tracks);

  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
}
