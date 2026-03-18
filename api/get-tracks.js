// api/get-tracks.js
const axios = require('axios');

export default async function handler(req, res) {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

  // 1. Hämta Access Token från Spotify
  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')) },
    form: { grant_type: 'client_credentials' },
    json: true
  };

  try {
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
      }
    });

    const token = tokenResponse.data.access_token;

    // 2. Sök efter musik med LÅG popularitet (vårt filter)
    // Vi slumpar en bokstav för att få varierat resultat
    const randomChar = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    
    const searchResponse = await axios.get(`https://api.spotify.com/v1/search?q=${randomChar}&type=track&limit=50&offset=${Math.floor(Math.random() * 100)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // 3. Filtrera bort "bruset" (Popularitet < 30 av 100)
    const indieTracks = searchResponse.data.tracks.items.filter(track => track.popularity < 30);
    
    // Slumpa fram EN vinnare till användaren
    const selectedTrack = indieTracks[Math.floor(Math.random() * indieTracks.length)];

    res.status(200).json(selectedTrack);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch the raw sound.' });
  }
}
