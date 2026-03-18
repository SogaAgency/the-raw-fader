import axios from 'axios';
import { Buffer } from 'buffer';

export default async function handler(req, res) {
  // Hämta nycklar från Vercel Environment Variables
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  // 1. Säkerhetskoll: Finns nycklarna?
  if (!client_id || !client_secret) {
    console.error("FEL: SPOTIFY_CLIENT_ID eller SECRET saknas i Vercel Settings.");
    return res.status(500).json({ error: 'API-nycklar saknas i serverkonfigurationen.' });
  }

  try {
    // 2. Skapa Auth-header (Base64-kodning)
    const authHeader = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

    // 3. Hämta Access Token från Spotify
    const authResponse = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: { grant_type: 'client_credentials' },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      }
    });

    const token = authResponse.data.access_token;

    // 4. Slumpa sökparametrar för att hitta "rå" musik
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const randomChar = alphabet[Math.floor(Math.random() * alphabet.length)];
    const randomOffset = Math.floor(Math.random() * 200); // Gräv djupt i arkivet

    // 5. Gör två parallella sökningar för att få en stor pool (max 50 per anrop)
    const [search1, search2] = await Promise.all([
      axios.get(`https://api.spotify.com/v1/search?q=${randomChar}&type=track&limit=50&offset=${randomOffset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      axios.get(`https://api.spotify.com/v1/search?q=${randomChar}&type=track&limit=50&offset=${randomOffset + 50}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    const allTracks = [...search1.data.tracks.items, ...search2.data.tracks.items];

    // 6. FILTRERING: Ta bara bort "mainstream" (Popularitet under 35)
    const indieTracks = allTracks
      .filter(track => track.popularity < 35)
      .map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        link: track.external_urls.spotify,
        popularity: track.popularity
      }));

    // 7. Slumpa ordningen (Shuffling)
    const shuffledTracks = indieTracks.sort(() => 0.5 - Math.random());

    // Skicka tillbaka max 100 resultat
    return res.status(200).json(shuffledTracks.slice(0, 100));

  } catch (error) {
    // Logga detaljerat fel i Vercel Logs för felsökning
    console.error('SPOTIFY API ERROR:', error.response?.data || error.message);
    
    return res.status(500).json({ 
      error: 'Kunde inte hämta frekvensen.',
      details: error.response?.data?.error_description || error.message 
    });
  }
}
