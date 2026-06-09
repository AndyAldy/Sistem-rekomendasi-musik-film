import { useState, useEffect, useMemo } from 'react';
import './App.css';

function App() {
  const [database, setDatabase] = useState([]); // Menyimpan gabungan data MySQL
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [targetItem, setTargetItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mengambil data Film & Musik dari Backend Node.js
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

  // Logika Content-Based Filtering (Jaccard Similarity pada Genre)
  const getRecommendations = (item) => {
    return database
      .filter((dbItem) => dbItem.id !== item.id) // Hindari merekomendasikan item itu sendiri
      .map((dbItem) => {
        // Mencari seberapa banyak genre yang sama antara item target dan item di database
        const intersection = dbItem.genres.filter(g => item.genres.includes(g));
        const score = intersection.length; 
        return { ...dbItem, score };
      })
      .filter((dbItem) => dbItem.score > 0) // Tampilkan hanya yang punya skor kecocokan
      .sort((a, b) => b.score - a.score); // Urutkan dari skor tertinggi ke terendah
  };

  // Mengelola data apa yang tampil di layar (Filter/Search/Rekomendasi)
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
          <button className="btn-clear" onClick={() => setTargetItem(null)}>Tutup Rekomendasi ✕</button>
        </div>
      )}

      <main className="grid-container">
        {isLoading ? (
          <div className="no-results">Memuat data dari MySQL XAMPP...</div>
        ) : displayedItems.length > 0 ? (
          displayedItems.map((item) => (
            <div className="card" key={item.id}>
              <div className="card-image">
                <img src={item.image} alt={item.title} />
                <div className="badge">{item.type}</div>
              </div>
              <div className="card-content">
                <h3>{item.title}</h3>
                <div className="tags">
                  {item.genres.map((genre, index) => (
                    // Menggunakan index sebagai key cadangan jika ada genre duplikat
                    <span key={`${item.id}-${genre}-${index}`} className="tag">{genre}</span>
                  ))}
                </div>
                {!targetItem && (
                  <button 
                    className="btn-recommend"
                    onClick={() => setTargetItem(item)}
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
    </div>
  );
}

export default App;