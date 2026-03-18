// api/get-tracks.js
const axios = require('axios');

export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    // 1. Hämta Access Token
    const authResponse = await axios.post('https://accounts.spotify.com/api/token', 
      'grant_type=client_credentials', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
      }
    });

    const token = authResponse.data.access_token;

    // 2. Slumpa en sökning för att hitta "raw" musik
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    const randomChar = characters.charAt(Math.floor(Math.random() * characters.length));
    const randomOffset = Math.floor(Math.random() * 500); // Gräv djupt i arkivet

    const searchResponse = await axios.get(`https://api.spotify.com/v1/search?q=${randomChar}&type=track&limit=50&offset=${randomOffset}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // 3. Filtrera bort bruset (Popularitet under 30 = Äkta Indie)
    const tracks = searchResponse.data.tracks.items;
    const indieTracks = tracks.filter(t => t.popularity < 30);

    // Om vi inte hittar någon super-indie, ta den minst populära i listan
    const selectedTrack = indieTracks.length > 0 
      ? indieTracks[Math.floor(Math.random() * indieTracks.length)]
      : tracks.sort((a, b) => a.popularity - b.popularity)[0];

    return res.status(200).json(selectedTrack);
  } catch (error) {
    console.error('Spotify Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Signal lost. Check API keys.' });
  }
}
