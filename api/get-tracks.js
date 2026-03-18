import axios from 'axios';

export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    const authResponse = await axios.post('https://accounts.spotify.com/api/token', 
      'grant_type=client_credentials', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
      }
    });

    const token = authResponse.data.access_token;
    const randomChar = 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26));
    const randomOffset = Math.floor(Math.random() * 500);

    const searchResponse = await axios.get(`https://api.spotify.com/v1/search?q=${randomChar}&type=track&limit=50&offset=${randomOffset}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const tracks = searchResponse.data.tracks.items;
    const indieTracks = tracks.filter(t => t.popularity < 30);

    const selectedTrack = indieTracks.length > 0 
      ? indieTracks[Math.floor(Math.random() * indieTracks.length)]
      : tracks.sort((a, b) => a.popularity - b.popularity)[0];

    return res.status(200).json(selectedTrack);
  } catch (error) {
    return res.status(500).json({ error: 'Signal lost. Check API keys.' });
  }
}
