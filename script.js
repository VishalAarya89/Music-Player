const canvas = document.getElementById("visualizer");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const spectrumCanvas = document.getElementById("spectrum");
    const spectrumCtx = spectrumCanvas.getContext("2d");

    let now_playing = document.querySelector(".now-playing");
    let track_name = document.querySelector(".track-name");
    let playpause_btn = document.querySelector(".playpause-track");
    let seek_slider = document.querySelector(".seek_slider");
    let volume_slider = document.querySelector(".volume_slider");
    let curr_time = document.querySelector(".current-time");
    let total_duration = document.querySelector(".total-duration");

    let context, analyser, source, dataArray;
    let bassEQ, midEQ, trebleEQ;
    let isPlaying = false;
    let isRepeating = false;
    let updateTimer;
    let curr_track = new Audio();
    let playlist = [];
    let currentIndex = 0;
    let visualizerPreset = "bars";

    document.getElementById("fileUpload").addEventListener("change", function(event) {
      const files = Array.from(event.target.files);
      playlist = files.filter(file => file.type.startsWith("audio/"));
      if (playlist.length > 0) {
        currentIndex = 0;
        loadTrack(currentIndex);
      } else {
        alert("No audio files found.");
      }
    });

    function loadTrack(index) {
      clearInterval(updateTimer);
      resetValues();
      curr_track.pause();
      const file = playlist[index];
      if (!file) return;

      curr_track.src = URL.createObjectURL(file);
      track_name.textContent = file.name;
      now_playing.textContent = `Playing ${index + 1} of ${playlist.length}`;
      curr_track.load();
      curr_track.loop = isRepeating;
      curr_track.addEventListener("ended", () => {
        if (!isRepeating) nextTrack();
      });

      updateTimer = setInterval(seekUpdate, 1000);
      setupVisualizer(curr_track);
      if (isPlaying) playTrack();
    }

    function playpauseTrack() {
      if (!isPlaying) playTrack();
      else pauseTrack();
    }

    function playTrack() {
      curr_track.play();
      isPlaying = true;
      playpause_btn.innerHTML = '<i class="fa fa-pause-circle fa-5x"></i>';
    }

    function pauseTrack() {
      curr_track.pause();
      isPlaying = false;
      playpause_btn.innerHTML = '<i class="fa fa-play-circle fa-5x"></i>';
    }

    function nextTrack() {
      currentIndex = (currentIndex + 1) % playlist.length;
      loadTrack(currentIndex);
    }

    function prevTrack() {
      currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      loadTrack(currentIndex);
    }

    function rewind10() {
      curr_track.currentTime = Math.max(0, curr_track.currentTime - 10);
    }

    function forward10() {
      curr_track.currentTime = Math.min(curr_track.duration, curr_track.currentTime + 10);
    }

    function seekTo() {
      let seekto = curr_track.duration * (seek_slider.value / 100);
      curr_track.currentTime = seekto;
    }

    function setVolume() {
      curr_track.volume = volume_slider.value / 100;
    }

    function resetValues() {
      curr_time.textContent = "00:00";
      total_duration.textContent = "00:00";
      seek_slider.value = 0;
    }

    function seekUpdate() {
      if (!isNaN(curr_track.duration)) {
        let seekPosition = curr_track.currentTime * (100 / curr_track.duration);
        seek_slider.value = seekPosition;
        let currentMinutes = Math.floor(curr_track.currentTime / 60);
        let currentSeconds = Math.floor(curr_track.currentTime % 60);
        let durationMinutes = Math.floor(curr_track.duration / 60);
        let durationSeconds = Math.floor(curr_track.duration % 60);
        curr_time.textContent = `${String(currentMinutes).padStart(2, '0')}:${String(currentSeconds).padStart(2, '0')}`;
        total_duration.textContent = `${String(durationMinutes).padStart(2, '0')}:${String(durationSeconds).padStart(2, '0')}`;
      }
    }

    function changePreset() {
      visualizerPreset = document.getElementById("preset").value;
    }

    function setEQ() {
      if (bassEQ && midEQ && trebleEQ) {
        bassEQ.gain.value = parseFloat(document.getElementById("bass").value);
        midEQ.gain.value = parseFloat(document.getElementById("mid").value);
        trebleEQ.gain.value = parseFloat(document.getElementById("treble").value);
      }
    }

    function setupVisualizer(audioElement) {
      if (!context) {
        context = new AudioContext();
        analyser = context.createAnalyser();
        analyser.fftSize = 128;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        bassEQ = context.createBiquadFilter();
        bassEQ.type = "lowshelf";
        bassEQ.frequency.value = 200;

        midEQ = context.createBiquadFilter();
        midEQ.type = "peaking";
        midEQ.frequency.value = 1000;
        midEQ.Q.value = 1;

        trebleEQ = context.createBiquadFilter();
        trebleEQ.type = "highshelf";
        trebleEQ.frequency.value = 3000;

        source = context.createMediaElementSource(audioElement);
        source.connect(bassEQ);
        bassEQ.connect(midEQ);
        midEQ.connect(trebleEQ);
        trebleEQ.connect(analyser);
        analyser.connect(context.destination);

        function draw() {
          requestAnimationFrame(draw);
          analyser.getByteFrequencyData(dataArray);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          spectrumCtx.clearRect(0, 0, 250, 250);
          const now = Date.now();
          const bufferLength = dataArray.length;

          if (visualizerPreset === "bars") {
            let barWidth = (canvas.width / bufferLength) * 1.5;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
              let height = dataArray[i];
              let hue = (i * 360 / bufferLength + now / 30) % 360;
              ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
              ctx.fillRect(x, canvas.height - height, barWidth, height);
              x += barWidth + 1;
            }
          } else if (visualizerPreset === "radial") {
            let cx = 125, cy = 125, radius = 100;
            for (let i = 0; i < bufferLength; i++) {
              let angle = (i * 2 * Math.PI) / bufferLength;
              let len = dataArray[i] / 2;
              let x1 = cx + Math.cos(angle) * radius;
              let y1 = cy + Math.sin(angle) * radius;
              let x2 = cx + Math.cos(angle) * (radius + len);
              let y2 = cy + Math.sin(angle) * (radius + len);
              spectrumCtx.strokeStyle = `hsl(${i * 360 / bufferLength + now / 30}, 100%, 60%)`;
              spectrumCtx.beginPath();
              spectrumCtx.moveTo(x1, y1);
              spectrumCtx.lineTo(x2, y2);
              spectrumCtx.stroke();
            }
          } else if (visualizerPreset === "wave") {
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            for (let i = 0; i < bufferLength; i++) {
              let x = i * (canvas.width / bufferLength);
              let y = canvas.height / 2 + (dataArray[i] - 128);
              ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `hsl(${now % 360}, 100%, 50%)`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        draw();
      }
    }

    document.addEventListener("keydown", function(e) {
      if (e.code === "Space") { e.preventDefault(); playpauseTrack(); }
      else if (e.code === "ArrowRight") nextTrack();
      else if (e.code === "ArrowLeft") prevTrack();
      else if (e.code === "ArrowUp") { volume_slider.value = Math.min(100, parseInt(volume_slider.value) + 5); setVolume(); }
      else if (e.code === "ArrowDown") { volume_slider.value = Math.max(0, parseInt(volume_slider.value) - 5); setVolume(); }
      else if (e.key.toLowerCase() === "r") { isRepeating = !isRepeating; curr_track.loop = isRepeating; alert("Repeat " + (isRepeating ? "On 🔁" : "Off ⏹")); }
      else if (e.key.toLowerCase() === "f") toggleFullScreen();
      else if (e.key === "Escape") { pauseTrack(); document.exitFullscreen(); }
      else if (e.key === "[") rewind10();
      else if (e.key === "]") forward10();
    });

    function toggleFullScreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          alert(`Fullscreen error: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }