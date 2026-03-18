import axios from 'axios';
import jsrsasign from 'jsrsasign'; // Krävs för Apple Music JWT

// Hjälpfunktion för att generera Apple Music Developer Token
function getAppleMusicToken() {
  const { APPLE_MUSIC_KEY_ID, APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_PRIVATE_KEY } = process.env;
  if (!APPLE_MUSIC_PRIVATE_KEY) return null;

  const header = { alg: 'ES256', kid: APPLE_MUSIC_KEY_ID };
  const payload = {
    iss: APPLE_MUSIC_TEAM_ID,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 timme
    iat: Math.floor(Date.now() / 1000)
  };

  return jsrsasign.jws.JWS.sign(null, header, payload, APPLE_MUSIC_PRIVATE_KEY);
}

export default async function handler(req, res) {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
  
  // 1. Förbered datakällor
  let spotifyTracks = [];
  let appleTracks = [];

  const randomChar = 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26));
  const randomOffset = Math.floor(Math.random() * 200);

  // --- HÄMTA FRÅN SPOTIFY ---
  try {
    const spotifyAuth = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      }
    });

    const spotifySearch = await axios.get(`https://api.spotify.com/v1/search?q=${randomChar}&type=track&limit=50&offset=${randomOffset}`, {
      headers: { 'Authorization': `Bearer ${spotifyAuth.data.access_token}` }
    });

    // Filtrera bort mainstream (Popularitet < 35) och formatera
    spotifyTracks = spotifySearch.data.tracks.items
      .filter(t => t.popularity < 35)
      .map(t => ({
        id: `spotify_${t.id}`,
        source: 'spotify',
        title: t.name,
        artist: t.artists[0].name,
        link: t.external_urls.spotify
      }));

  } catch (err) { console.error('Spotify Error:', err.message); }

  // --- HÄMTA FRÅN APPLE MUSIC ---
  try {
    const appleToken = getAppleMusicToken();
    if (appleToken) {
      // Vi söker efter oberoende artister (ex. "record union" som distribuerar indie)
      const appleSearch = await axios.get(`https://api.music.apple.com/v1/catalog/se/search?term=indie&types=songs&limit=50&offset=${randomOffset}`, {
        headers: { 'Authorization': `Bearer ${appleToken}` }
      });

      // Apple har inget popularitets-filter, så vi tar de nischade träffarna
      appleTracks = appleSearch.data.results.songs.data
        .map(s => ({
          id: `apple_${s.id}`,
          source: 'apple',
          title: s.attributes.name,
          artist: s.attributes.artistName,
          link: s.attributes.url
        }));
    }
  } catch (err) { console.error('Apple Music Error:', err.message); }

  // 2. Kombinera och slumpa poolen
  let combinedPool = [...spotifyTracks, ...appleTracks];
  combinedPool = combinedPool.sort(() => 0.5 - Math.random()).slice(0, 100); // Max 100

  return res.status(200).json(combinedPool);
}
