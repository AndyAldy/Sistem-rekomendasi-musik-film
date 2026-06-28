import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors()); 
app.use(express.json());

// Konfigurasi resmi Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/api/data', async (req, res) => {
  try {
    // 1. Ambil data Film dari tabel Supabase
    const { data: movies, error: errMovies } = await supabase
      .from('tmdb_5000_movies')
      .select('id, original_title, genres')
      .limit(50);

    if (errMovies) throw errMovies;

    // 2. Ambil data Musik dari tabel Supabase
    // Pastikan nama tabelmu di Supabase benar-benar 'dataset_musik'
    const { data: music, error: errMusic } = await supabase
      .from('dataset_musik') 
      .select('id,  track_id, track_name, track_genre')
      .limit(50);

    if (errMusic) throw errMusic;

    // 3. Format Data Film
    const formattedMovies = movies.map(movie => {
      const getGenres = (genreString) => {
        try {
          // Supabase kadang mengembalikan teks JSON, kadang langsung objek. Ini solusinya:
          const parsed = typeof genreString === 'string' ? JSON.parse(genreString) : genreString;
          return parsed.map(g => g.name);
        } catch {
          return ['Film']; 
        }
      };
      
      const safeTitle = movie.original_title || 'Tanpa Judul';
      
      return {
        id: `movie_${movie.id}`, 
        type: 'Movie',
        title: safeTitle,
        genres: getGenres(movie.genres),
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(safeTitle)}&background=0D8ABC&color=fff&size=512&bold=true`
      };
    });

    // 4. Format Data Musik
    const formattedMusic = music.map(item => {
      const safeTitle = item.track_name || 'Tanpa Judul';
      
      return {
        id: `music_${item.track_id}`,
        type: 'Music',
        title: safeTitle,
        genres: item.track_genre ? [item.track_genre] : ['Musik'],
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(safeTitle)}&background=FF007F&color=fff&size=512&bold=true`
      };
    });

    // 5. Gabungkan dan urutkan A-Z
    const combinedData = [...formattedMovies, ...formattedMusic];
    combinedData.sort((a, b) => a.title.localeCompare(b.title));

    res.json(combinedData);

  } catch (error) {
    console.error("Terjadi kesalahan saat menarik data:", error);
    res.status(500).json({ error: "Gagal menarik data dari Cloud Database" });
  }
});

app.listen(5000, () => {
  console.log('Server Backend Supabase berjalan di http://localhost:5000');
});