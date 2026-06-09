import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';

const app = express();
app.use(cors()); 
app.use(express.json());

// Konfigurasi koneksi ke MySQL XAMPP
const db = mysql.createConnection({
  host: 'https://sgxmypxkeekeollpaowa.supabase.co',
  user: 'AndyAldy',      
  password: 'musikfilm0913',      
  database: 'db_rekomendasi',
  port: 5432
});

db.connect((err) => {
  if (err); 
  console.log('Berhasil terhubung ke database MySQL!');
});

app.get('/api/data', (req, res) => {
  const queryMovies = 'SELECT id, original_title as title, genres FROM tmdb_5000_movies LIMIT 50';
  const queryMusic = 'SELECT track_id as id, track_name as title, track_genre as genres FROM dataset_musik LIMIT 50';

  db.query(queryMovies, (errMovies, resultsMovies) => {
    if (errMovies) return res.status(500).send(errMovies);

    db.query(queryMusic, (errMusic, resultsMusic) => {
      if (errMusic) return res.status(500).send(errMusic);

      // 1. Format Data Film
      const formattedMovies = resultsMovies.map(movie => {
        const getGenres = (genreString) => {
          try {
            return JSON.parse(genreString).map(g => g.name);
          } catch {
            return ['Film']; 
          }
        };
        
        // Mencegah error 'undefined' jika judul kosong dari database
        const safeTitle = movie.title || 'Tanpa Judul';
        
        return {
          id: `movie_${movie.id}`, 
          type: 'Movie',
          title: safeTitle,
          genres: getGenres(movie.genres),
          // Bikin gambar inisial otomatis warna Biru
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(safeTitle)}&background=0D8ABC&color=fff&size=512&bold=true`
        };
      });

      // 2. Format Data Musik (Spotify)
      const formattedMusic = resultsMusic.map(music => {
        // Mencegah error 'undefined'
        const safeTitle = music.title || 'Tanpa Judul';
        
        return {
          id: `music_${music.id}`,
          type: 'Music',
          title: safeTitle,
          genres: music.genres ? [music.genres] : ['Musik'],
          // Bikin gambar inisial otomatis warna Pink
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(safeTitle)}&background=FF007F&color=fff&size=512&bold=true`
        };
      });

// 3. Gabungkan film dan musik lalu urutkan dari A-Z berdasarkan judul
      const combinedData = [...formattedMovies, ...formattedMusic];
      
      // localeCompare digunakan agar pengurutan abjadnya rapi, 
      // tidak peduli huruf besar atau kecil
      combinedData.sort((a, b) => a.title.localeCompare(b.title));

      res.json(combinedData);
    });
  });
});

app.listen(5000, () => {
  console.log('Server Backend berjalan di http://localhost:5000');
});