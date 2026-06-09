import { useState, useEffect, useMemo } from 'react';
import './App.css';

function App() {
  const [database, setDatabase] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [targetItem, setTargetItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE UNTUK PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Menampilkan 10 konten per halaman

  useEffect(() => {
    fetch('http://localhost:5000/api/data')
      .then(response => response.json())
      .then(data => {
        setDatabase(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Gagal mengambil data:', error);
        setIsLoading(false);
      });
  }, []);

  const getRecommendations = (item) => {
    return database
      .filter((dbItem) => dbItem.id !== item.id)
      .map((dbItem) => {
        const intersection = dbItem.genres.filter(g => item.genres.includes(g));
        const score = intersection.length; 
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
          <div className="no-results">Memuat data dari MySQL XAMPP...</div>
        ) : currentItems.length > 0 ? (
          /* Menggunakan currentItems (10 data) bukan displayedItems (Semua data) */
          currentItems.map((item) => (
            <div className="card" key={item.id}>
              <div className="card-image">
                <img src={item.image} alt={item.title} />
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