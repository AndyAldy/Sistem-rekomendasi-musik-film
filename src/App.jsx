import { useState, useEffect, useMemo } from 'react';
import './App.css';
import { createClient } from '@supabase/supabase-js';

// Hubungkan React langsung ke Supabase (Ganti ANON_KEY dengan key dari dashboardmu)
const supabaseUrl = 'https://sgxmypxkeekeollpaowa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneG15cHhrZWVrZW9sbHBhb3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDgxNzAsImV4cCI6MjA5NjU4NDE3MH0.ngTzXSF_ngVSlWaoTnVf9yyvv3Ct5JBst3tQ0r2ynEE'; 
const supabase = createClient(supabaseUrl, supabaseKey);


// Komponen Pemuat Poster Film Asli
const MovieCover = ({ movieId, title }) => {
  // Gambar default inisial sebelum gambar asli termuat
  const fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=0D8ABC&color=fff&size=512`;
  const [imgSrc, setImgSrc] = useState(fallbackImg);

  useEffect(() => {
    // Ekstrak ID angka dari string "movie_19995"
    const id = movieId.split('_')[1]; 
    const API_KEY = 'ca4f3828b6e8b4764680b2e3b503be8d'; // <-- GANTI DENGAN KEY TMDB KAMU
    
    fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}`)
      .then(res => res.json())
      .then(data => {
        if (data.poster_path) {
          // TMDB menyediakan gambar dalam berbagai ukuran, w500 adalah kualitas menengah
          setImgSrc(`https://image.tmdb.org/t/p/w500${data.poster_path}`);
        }
      })
      .catch(() => {}); // Jika error (misal offline), tetap pakai gambar default
  }, [movieId, title]);

  return <img src={imgSrc} alt={title} />;
};

// Komponen Pemuat Cover Musik Asli (Tanpa API Key!)
const MusicCover = ({ title }) => {
  // Gambar default/loading berupa inisial warna pink
  const fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=FF007F&color=fff&size=512`;
  const [imgSrc, setImgSrc] = useState(fallbackImg);

  useEffect(() => {
    // Mencari lagu di database publik iTunes berdasarkan judulnya
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=song&limit=1`)
      .then(res => res.json())
      .then(data => {
        // Jika lagunya ditemukan di iTunes
        if (data.results && data.results.length > 0) {
          // iTunes memberikan gambar 100x100px. Kita ubah URL-nya agar memuat ukuran HD 500x500px
          const hqImage = data.results[0].artworkUrl100.replace('100x100bb', '500x500bb');
          setImgSrc(hqImage);
        }
      })
      .catch(() => {
        // Jika gagal (misal tidak ada internet), biarkan tetap pakai gambar inisial pink
      });
  }, [title]);

  return <img src={imgSrc} alt={title} />;
};

function App() {
  const [database, setDatabase] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [targetItem, setTargetItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE UNTUK PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Menampilkan 10 konten per halaman

  // --- LOGIKA MENGAMBIL DATA LANGSUNG DARI SUPABASE ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Ambil Film
        const { data: movies, error: errMovies } = await supabase
          .from('tmdb_5000_movies')
          .select('id, original_title, genres')
          .limit(50);
        if (errMovies) throw errMovies;

        // 2. Ambil Musik
        const { data: music, error: errMusic } = await supabase
          .from('dataset_musik') 
          .select('track_id, track_name, track_genre')
          .limit(50);
        if (errMusic) throw errMusic;

        // 3. Format Data Film
        const formattedMovies = movies.map(movie => {
          const getGenres = (g) => {
            try { return (typeof g === 'string' ? JSON.parse(g) : g).map(x => x.name); } 
            catch { return ['Film']; }
          };
          const title = movie.original_title || 'Tanpa Judul';
          return {
            id: `movie_${movie.id}`, type: 'Movie', title, genres: getGenres(movie.genres),
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=0D8ABC&color=fff`
          };
        });

        // 4. Format Data Musik
        const formattedMusic = music.map(item => {
          const title = item.track_name || 'Tanpa Judul';
          return {
            id: `music_${item.track_id}`, type: 'Music', title, genres: item.track_genre ? [item.track_genre] : ['Musik'],
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=FF007F&color=fff`
          };
        });

        // Gabungkan dan urutkan
        const combinedData = [...formattedMovies, ...formattedMusic].sort((a, b) => a.title.localeCompare(b.title));
        
        setDatabase(combinedData);
        setIsLoading(false);
      } catch (error) {
        console.error('Gagal mengambil data dari Supabase:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

// --- ALGORITMA CONTENT-BASED FILTERING ---
  // Menggunakan Jaccard Similarity untuk mencocokkan genre item
  const getRecommendations = (item) => {
    return database
      .filter((dbItem) => dbItem.id !== item.id)
      .map((dbItem) => {
        // 1. Hitung Irisan (Intersection): Genre yang sama antara item target dan item di database
        const intersection = dbItem.genres.filter(g => item.genres.includes(g));
        
        // 2. Hitung Gabungan (Union): Total genre unik dari kedua item
        const union = new Set([...item.genres, ...dbItem.genres]);
        
        // 3. Hitung Skor Kemiripan Jaccard (Jaccard Index)
        const score = intersection.length / union.size; 
        
        return { ...dbItem, score };
      })
      // Hanya tampilkan item yang memiliki skor kemiripan lebih dari 0
      .filter((dbItem) => dbItem.score > 0)
      // Urutkan dari skor kemiripan yang paling tinggi ke rendah
      .sort((a, b) => b.score - a.score);
  };

  const displayedItems = useMemo(() => {
    if (targetItem) {
      return getRecommendations(targetItem);
    }

    return database.filter((item) => {
      const matchSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFilter = activeFilter === 'All' || item.type === activeFilter;
      return matchSearch && matchFilter;
    });
  }, [searchTerm, activeFilter, targetItem, database]);

  // --- LOGIKA PEMOTONGAN DATA UNTUK PAGINATION ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = displayedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(displayedItems.length / itemsPerPage);

  // Fungsi untuk mengganti halaman
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Gulirkan layar ke atas dengan mulus saat pindah halaman
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Rekomendasi <span>Pintar</span></h1>
        <p>Jelajahi Film dan Musik berdasarkan selera kontenmu</p>
      </header>

      <div className="controls">
        <input
          type="text"
          className="search-bar"
          placeholder="Cari judul film atau musik..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setTargetItem(null);
            setCurrentPage(1);
          }}
        />

        <div className="filter-buttons">
          {['All', 'Movie', 'Music'].map((filter) => (
            <button
              key={filter}
              className={`btn-filter ${activeFilter === filter && !targetItem ? 'active' : ''}`}
              onClick={() => { 
                setActiveFilter(filter); 
                setTargetItem(null);
                setCurrentPage(1); 
              }}
            >
              {filter === 'All' ? 'Semua Kategori' : filter === 'Movie' ? '🎬 Film' : '🎵 Musik'}
            </button>
          ))}
        </div>
      </div>

      {targetItem && (
        <div className="recommendation-header">
          <h2>Rekomendasi mirip dengan: <span>{targetItem.title}</span></h2>
          <button className="btn-clear" onClick={() => {
            setTargetItem(null);
            setCurrentPage(1);
          }}>Tutup Rekomendasi ✕</button>
        </div>
      )}

      <main className="grid-container">
        {isLoading ? (
          <div className="no-results">Memuat data dari database Cloud...</div>
        ) : currentItems.length > 0 ? (
          /* Menggunakan currentItems (10 data) bukan displayedItems (Semua data) */
          currentItems.map((item) => (
            <div className="card" key={item.id}>
              <div className="card-image">
                {item.type === 'Movie' ? (
                  <MovieCover movieId={item.id} title={item.title} />
                ) : (
                  <MusicCover title={item.title} />
                )}
                <div className="badge">{item.type}</div>
              </div>
              <div className="card-content">
                <h3>{item.title}</h3>
                <div className="tags">
                  {item.genres.map((genre, index) => (
                    <span key={`${item.id}-${genre}-${index}`} className="tag">{genre}</span>
                  ))}
                </div>
                {!targetItem && (
                  <button 
                    className="btn-recommend"
                    onClick={() => {
                      setTargetItem(item);
                      setCurrentPage(1);
                    }}
                  >
                    Temukan yang Mirip ✨
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">Tidak ada data yang ditemukan.</div>
        )}
      </main>

      {/* --- UI KONTROL PAGINATION --- */}
      {!isLoading && displayedItems.length > itemsPerPage && (
        <div className="pagination">
          <button 
            onClick={() => paginate(currentPage - 1)} 
            disabled={currentPage === 1}
            className="btn-page"
          >
            &laquo; Prev
          </button>
          
          {/* Membuat tombol nomor halaman */}
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              onClick={() => paginate(index + 1)}
              className={`btn-page ${currentPage === index + 1 ? 'active-page' : ''}`}
            >
              {index + 1}
            </button>
          ))}

          <button 
            onClick={() => paginate(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="btn-page"
          >
            Next &raquo;
          </button>
        </div>
      )}
    </div>
  );
}

export default App;