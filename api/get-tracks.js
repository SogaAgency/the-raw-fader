api/get-tracks.js:
import { Buffer } from 'buffer';
import axios from 'axios';

export default async function handler(req, res) {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return res.status(500).json({ error: 'API-nycklar saknas i Vercel.' });
  }

  try {
    // 1. Hämta Access Token
    const authHeader = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const authResponse = await axios.post('https://accounts.spotify.com/api/token', 
      'grant_type=client_credentials', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      }
    });

    const token = authResponse.data.access_token;
    
    // Slumpa sökning för att hitta oberoende musik
    const randomChar = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    const randomOffset = Math.floor(Math.random() * 200);

    // 2. Gör två anrop för att få en stor pool (50 + 50)
    const [res1, res2] = await Promise.all([
      axios.get(`https://api.spotify.com/v1/search?q=${randomChar}&type=track&limit=50&offset=${randomOffset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      axios.get(`https://api.spotify.com/v1/search?q=${randomChar}&type=track&limit=50&offset=${randomOffset + 50}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    const combinedTracks = [...res1.data.tracks.items, ...res2.data.tracks.items];

    // 3. Filtrera bort "mainstream" (Popularitet < 35) och formatera
    const rawIndiePool = combinedTracks
      .filter(t => t.popularity < 35)
      .map(t => ({
        id: t.id,
        name: t.name,
        artist: t.artists[0].name,
        link: t.external_urls.spotify
      }));

    // Slumpa ordningen på poolen innan vi skickar
    const shuffled = rawIndiePool.sort(() => 0.5 - Math.random());

    return res.status(200).json(shuffled.slice(0, 100));

  } catch (error) {
    console.error('Spotify API Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Frekvensfel vid scanning.' });
  }
}
