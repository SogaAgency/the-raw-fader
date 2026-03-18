export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    return res.status(500).json({ error: 'Environment variables missing' });
  }

  try {
    // 1. Hämta Token med inbyggd fetch (säkrare i Vercel-miljö)
    const authOptions = {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    };

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', authOptions);
    const tokenData = await tokenRes.json();
    
    if (!tokenData.access_token) {
      console.error("Spotify Auth Failed:", tokenData);
      return res.status(500).json({ error: 'Auth failed' });
    }

    const token = tokenData.access_token;
    const randomChar = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    const offset = Math.floor(Math.random() * 200);

    // 2. Sök låtar (Direkt mot Spotifys officiella API)
    const searchUrl = `https://api.spotify.com/v1/search?q=${randomChar}&type=track&limit=50&offset=${offset}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const searchData = await searchRes.json();

    if (!searchData.tracks) {
      console.error("Spotify Search Failed:", searchData);
      return res.status(500).json({ error: 'Search failed' });
    }

    // 3. Filtrera och returnera
    const tracks = searchData.tracks.items
      .filter(t => t.popularity < 35)
      .map(t => ({
        name: t.name,
        artist: t.artists[0].name,
        link: t.external_urls.spotify
      }));

    return res.status(200).json(tracks);

  } catch (error) {
    console.error('SERVER ERROR:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
