const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors()); 
app.use(express.json());

// Konfigurasi koneksi ke MySQL XAMPP
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',      
  password: '',      
  database: 'db_rekomendasi'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Berhasil terhubung ke database MySQL!');
});

// Endpoint untuk mengambil gabungan data Film dan Musik
app.get('/api/data', (req, res) => {
  // Ambil 50 film dan 50 musik agar website tidak lag saat proses development
  const queryMovies = 'SELECT id, original_title as title, genres FROM tmdb_5000_movies LIMIT 50';
  const queryMusic = 'SELECT track_id as id, track_name as title, track_genre as genres FROM dataset_spotify LIMIT 50';

  db.query(queryMovies, (errMovies, resultsMovies) => {
    if (errMovies) return res.status(500).send(errMovies);

    db.query(queryMusic, (errMusic, resultsMusic) => {
      if (errMusic) return res.status(500).send(errMusic);

      // 1. Format Data Film
      const formattedMovies = resultsMovies.map(movie => {
        let parsedGenres = [];
        try {
          const genreArray = JSON.parse(movie.genres);
          parsedGenres = genreArray.map(g => g.name); // Ekstrak nama genre dari JSON
        } catch (e) {
          parsedGenres = [];
        }
        
        return {
          id: movie.id.toString(), // Jadikan string agar seragam dengan ID lagu Spotify
          type: 'Movie',
          title: movie.title,
          genres: parsedGenres,
          image: 'https://images.unsplash.com/photo-1618519764620-7403abdbdf9c?w=500&q=80' 
        };
      });

      // 2. Format Data Musik (Spotify)
      const formattedMusic = resultsMusic.map(music => {
        return {
          id: music.id,
          type: 'Music',
          title: music.title,
          genres: [music.genres], // Masukkan ke dalam array agar seragam dengan format genre film
          image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80'
        };
      });

      // 3. Gabungkan film dan musik lalu kirim ke React
      const combinedData = [...formattedMovies, ...formattedMusic];
      res.json(combinedData);
    });
  });
});

app.listen(5000, () => {
  console.log('Server Backend berjalan di http://localhost:5000');
});