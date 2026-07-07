/* eslint-disable no-undef */
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';
import 'dotenv/config'; // Tambahkan baris ini untuk membaca file .env

const app = express();
app.use(cors()); 
app.use(express.json());

// --- 1. Konfigurasi Supabase (Cloud) ---
// Ubah import.meta.env menjadi process.env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 2. Konfigurasi MySQL XAMPP (Local Fallback) ---
const localDb = mysql.createPool({
  host: 'localhost',
  user: 'root',      // Default user XAMPP
  password: '',      // Default password XAMPP (kosong)
  database: 'db_rekomendasi' // Ganti dengan nama database kamu di phpMyAdmin
});

app.get('/api/data', async (req, res) => {
  try {
    let movies = [];
    let music = [];

    // ==========================================
    // DATA FILM (Coba Supabase -> Fallback XAMPP)
    // ==========================================
    const { data: supaMovies, error: errMovies } = await supabase
      .from('tmdb_5000_movies')
      .select('id, original_title, genres')
      .limit(500);

    if (errMovies || !supaMovies || supaMovies.length === 0) {
      console.warn("⚠️ Data film Supabase kosong/error. Mengambil dari MySQL XAMPP...");
      const [localRows] = await localDb.query('SELECT id, original_title, genres FROM tmdb_5000_movies LIMIT 50');
      movies = localRows;
    } else {
      movies = supaMovies;
    }

    // ==========================================
    // DATA MUSIK (Coba Supabase -> Fallback XAMPP)
    // ==========================================
    const { data: supaMusic, error: errMusic } = await supabase
      .from('dataset_musik') 
      .select('id, track_id, track_name, track_genre')
      .limit(500);

    if (errMusic || !supaMusic || supaMusic.length === 0) {
      console.warn("⚠️ Data musik Supabase kosong/error. Mengambil dari MySQL XAMPP...");
      const [localRows] = await localDb.query('SELECT id, track_id, track_name, track_genre FROM dataset_musik LIMIT 50');
      music = localRows;
    } else {
      music = supaMusic;
    }

    // ==========================================
    // FORMATTING & PENGGABUNGAN DATA
    // ==========================================
    const formattedMovies = movies.map(movie => {
      const getGenres = (genreString) => {
        try {
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

    const combinedData = [...formattedMovies, ...formattedMusic];
    combinedData.sort((a, b) => a.title.localeCompare(b.title));

    res.json(combinedData);

  } catch (error) {
    console.error("Terjadi kesalahan:", error);
    res.status(500).json({ error: "Gagal menarik data dari Supabase maupun MySQL XAMPP" });
  }
});

app.listen(5000, () => {
  console.log('Server berjalan di http://localhost:5000');
});