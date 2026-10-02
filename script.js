const TMDB_BEARER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxNzIxNjAyZmZjZDIyN2ViMDA2NGZhMGEzMGJjMGViMCIsIm5iZiI6MTc4ODUxNDU3NC4wMjEsInN1YiI6IjZhOWE5MTBlMjUxY2JmNjQ3MTZlNmJmYiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.JD5iL_s_QMLnKfU4VBIaj88hbFg9AXRu8s-lsM6ln5c";

    let cachedMovies = [];
    let currentPage = 1;
    let searchTimeout = null;
    let isSearchActive = false;
    
    let ytPlayer = null;
    let inactivityTimer = null;
    let isPaused = false;

    function closeIntroModal() {
      document.getElementById('introModal').classList.add('hidden');
    }

    async function tmdbFetch(url) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${TMDB_BEARER_TOKEN}`
          }
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        console.error("Network error connecting to TMDB:", err);
      }
      return null;
    }

    async function fetchPopularMovies(page = 1, append = false) {
      const grid = document.getElementById('movieGrid');
      if (!append) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 50px; color: var(--text-muted);">Fetching movies from TMDB servers...</div>`;
      }

      try {
        const data = await tmdbFetch(`https://api.themoviedb.org/3/movie/popular?language=en-US&page=${page}`);

        if (data && data.results && data.results.length > 0) {
          const newMovies = data.results.map(m => ({
            id: m.id,
            title: m.title,
            tag: `Rating: ${m.vote_average ? m.vote_average.toFixed(1) : 'N/A'} ⭐`,
            poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
            backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : ''
          }));

          if (append) {
            cachedMovies = cachedMovies.concat(newMovies);
          } else {
            cachedMovies = newMovies;
          }

          document.getElementById('gridSectionTitle').innerHTML = `<i class="fa-solid fa-clapperboard" style="color: var(--accent-red);"></i> Popular Movies Hub (${cachedMovies.length} Loaded)`;
          renderGrid(cachedMovies);
          
          if (!append && cachedMovies.length > 0) {
            setHeroMovie(cachedMovies[0]);
          }
          
          document.getElementById('loadMoreContainer').style.display = isSearchActive ? 'none' : 'flex';
        } else if (!append) {
          grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 50px; color: var(--accent-red);">No movies found from TMDB API.</div>`;
        }
      } catch (err) {
        console.error("TMDB Fetch Error:", err);
      }
    }

    function loadMoreMovies() {
      if (isSearchActive) return;
      currentPage++;
      fetchPopularMovies(currentPage, true);
    }

    function handleGlobalSearch(e) {
      const query = e.target.value.trim();
      clearTimeout(searchTimeout);

      if (query.length === 0) {
        isSearchActive = false;
        document.getElementById('gridSectionTitle').innerHTML = `<i class="fa-solid fa-clapperboard" style="color: var(--accent-red);"></i> Popular Movies Hub (${cachedMovies.length} Loaded)`;
        renderGrid(cachedMovies);
        document.getElementById('loadMoreContainer').style.display = 'flex';
        return;
      }

      isSearchActive = true;
      document.getElementById('loadMoreContainer').style.display = 'none';

      searchTimeout = setTimeout(async () => {
        const grid = document.getElementById('movieGrid');
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 50px; color: var(--text-muted);">Searching TMDB...</div>`;

        try {
          const data = await tmdbFetch(`https://api.themoviedb.org/3/search/movie?language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`);

          if (data && data.results && data.results.length > 0) {
            const searchResults = data.results.map(m => ({
              id: m.id,
              title: m.title,
              tag: `Rating: ${m.vote_average ? m.vote_average.toFixed(1) : 'N/A'} ⭐`,
              poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
              backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : ''
            }));

            document.getElementById('gridSectionTitle').innerHTML = `<i class="fa-solid fa-magnifying-glass" style="color: var(--accent-red);"></i> Search Results (${searchResults.length})`;
            renderGrid(searchResults);
          } else {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 50px; color: var(--text-muted);">No matching movies found.</div>`;
          }
        } catch (err) {
          console.error("Search error:", err);
        }
      }, 400);
    }

    function setHeroMovie(movie) {
      document.getElementById('heroTitle').innerText = movie.title.toUpperCase();
      if (movie.backdrop) {
        document.getElementById('heroBanner').style.backgroundImage = `linear-gradient(180deg, rgba(6,7,9,0.4) 0%, var(--bg-main) 100%), url('${movie.backdrop}')`;
      }
      document.getElementById('heroPlayBtn').onclick = () => fetchAndPlayTrailer(movie.id, movie.title);
    }

    async function fetchAndPlayTrailer(movieId, title) {
      let youtubeKey = "TcMBFSGVi1c"; 
      try {
        const data = await tmdbFetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?language=en-US`);
        if (data && data.results) {
          const trailer = data.results.find(v => v.type === "Trailer" && v.site === "YouTube");
          if (trailer) {
            youtubeKey = trailer.key;
          }
        }
      } catch (e) {
        console.error("Trailer fetch error", e);
      }
      playTrailer(youtubeKey, title);
    }

    function renderGrid(data) {
      const grid = document.getElementById('movieGrid');
      grid.innerHTML = '';

      data.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'media-card';
        card.onclick = () => {
          if (item.backdrop) setHeroMovie(item);
          fetchAndPlayTrailer(item.id, item.title);
        };

        card.innerHTML = `
          <img src="${item.poster}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80'">
          <div class="play-icon-overlay"><i class="fa-solid fa-play"></i></div>
          <div class="card-overlay">
            <span class="card-badge">${item.tag}</span>
            <h3 class="card-title">${item.title}</h3>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    function playTrailer(videoId, title) {
      document.getElementById('cinemaPlayer').classList.add('active');
      isPaused = false;
      updatePauseIcon();

      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        window.onYouTubeIframeAPIReady = function() {
          initYTPlayer(videoId);
        };
      } else {
        if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
          ytPlayer.loadVideoById(videoId);
        } else {
          initYTPlayer(videoId);
        }
      }

      startInactivityCountdown();
    }

    function initYTPlayer(videoId) {
      ytPlayer = new YT.Player('ytPlayerContainer', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          'autoplay': 1,
          'controls': 0,
          'disablekb': 1,
          'fs': 0,
          'iv_load_policy': 3,
          'modestbranding': 1,
          'rel': 0,
          'showinfo': 0
        },
        events: {
          'onStateChange': onPlayerStateChange
        }
      });
    }

    function onPlayerStateChange(event) {
      if (event.data === YT.PlayerState.PAUSED) {
        isPaused = true;
        updatePauseIcon();
      } else if (event.data === YT.PlayerState.PLAYING) {
        isPaused = false;
        updatePauseIcon();
      }
    }

    function togglePlayPause() {
      if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
      const state = ytPlayer.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
        isPaused = true;
      } else {
        ytPlayer.playVideo();
        isPaused = false;
      }
      updatePauseIcon();
    }

    function updatePauseIcon() {
      const icon = document.getElementById('pausePlayIcon');
      if (isPaused) {
        icon.className = "fa-solid fa-play";
      } else {
        icon.className = "fa-solid fa-pause";
      }
    }

    function skipTime(seconds) {
      if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
      const currentTime = ytPlayer.getCurrentTime();
      const targetTime = Math.max(0, currentTime + seconds);
      ytPlayer.seekTo(targetTime, true);
    }

    function handlePlayerInteraction() {
      const overlay = document.getElementById('playerControlsOverlay');
      overlay.classList.remove('hidden-cursor');
      startInactivityCountdown();
    }

    function startInactivityCountdown() {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        const playerModal = document.getElementById('cinemaPlayer');
        if (playerModal.classList.contains('active')) {
          document.getElementById('playerControlsOverlay').classList.add('hidden-cursor');
        }
      }, 3000);
    }

    function closeTrailer(e) {
      if (e) e.stopPropagation();
      clearTimeout(inactivityTimer);
      document.getElementById('cinemaPlayer').classList.remove('active');
      document.getElementById('playerControlsOverlay').classList.remove('hidden-cursor');
      if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
        ytPlayer.stopVideo();
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      fetchPopularMovies(1, false);
    });