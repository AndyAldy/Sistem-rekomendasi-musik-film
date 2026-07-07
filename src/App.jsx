import { useState, useEffect, useMemo } from 'react';
import './App.css';

// Komponen Pemuat Poster Film Asli (Dari TMDB)
const MovieCover = ({ movieId, title }) => {
  const fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=0D8ABC&color=fff&size=512`;
  const [imgSrc, setImgSrc] = useState(fallbackImg);

  useEffect(() => {
    // Ekstrak ID angka dari string "movie_19995"
    const id = movieId.split('_')[1]; 
    const API_KEY = import.meta.env.VITE_TMDB_API_KEY; // Pastikan ini ada di .env frontend
    
    fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}`)
      .then(res => res.json())
      .then(data => {
        if (data.poster_path) {
          setImgSrc(`https://image.tmdb.org/t/p/w500${data.poster_path}`);
        }
      })
      .catch(() => {}); 
  }, [movieId, title]);

  return <img src={imgSrc} alt={title} />;
};

// Komponen Pemuat Cover Musik Asli (Dari iTunes)
const MusicCover = ({ title }) => {
  const fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=FF007F&color=fff&size=512`;
  const [imgSrc, setImgSrc] = useState(fallbackImg);

  useEffect(() => {
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=song&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          const hqImage = data.results[0].artworkUrl100.replace('100x100bb', '500x500bb');
          setImgSrc(hqImage);
        }
      })
      .catch(() => {});
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
  const itemsPerPage = 10; 

  // --- LOGIKA MENGAMBIL DATA DARI BACKEND SERVER.JS ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Menembak ke backend lokal milikmu
        const response = await fetch('http://localhost:5000/api/data');
        
        if (!response.ok) {
          throw new Error('Gagal terhubung ke backend Express');
        }

        const data = await response.json();
        
        // Karena backend sudah melakukan formatting & pengurutan, 
        // kita tinggal memasukkannya ke state
        setDatabase(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Gagal mengambil data dari backend:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- ALGORITMA CONTENT-BASED FILTERING ---
  const getRecommendations = (item) => {
    return database
      .filter((dbItem) => dbItem.id !== item.id)
      .map((dbItem) => {
        const intersection = dbItem.genres.filter(g => item.genres.includes(g));
        const union = new Set([...item.genres, ...dbItem.genres]);
        const score = intersection.length / union.size; 
        
        return { ...dbItem, score };
      })
      .filter((dbItem) => dbItem.score > 0)
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

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
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
          <div className="no-results">Memuat data dari server backend...</div>
        ) : currentItems.length > 0 ? (
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