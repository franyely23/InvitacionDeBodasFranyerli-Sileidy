/* =====================================================
   1) MÚSICA
   - Se repite mientras el usuario está en la página.
   - Si estaba sonando y el usuario sale (cambia de pestaña, minimiza,
     bloquea el teléfono, cambia de app), se pausa; al volver, se reanuda sola.
   - Si el usuario la había pausado él mismo, no se reanuda.
   ===================================================== */
(function () {
  "use strict";

  const audio = document.getElementById("weddingMusic");
  const musicToggle = document.getElementById("musicToggle");
  const progressBar = document.getElementById("progressBar");
  const progressContainer = document.getElementById("progressContainer");
  const currentTimeEl = document.getElementById("currentTime");
  const durationTimeEl = document.getElementById("durationTime");

  if (!audio || !musicToggle || !progressBar || !progressContainer || !currentTimeEl || !durationTimeEl) return;

  const playIcon = musicToggle.querySelector(".play-icon");
  const pauseIcon = musicToggle.querySelector(".pause-icon");
  let reanudar = false; // true si la música se pausó solo porque el usuario salió

  audio.loop = true;

  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  }

  function mostrarEstado(reproduciendo) {
    playIcon.classList.toggle("hidden", reproduciendo);
    pauseIcon.classList.toggle("hidden", !reproduciendo);
    musicToggle.setAttribute("aria-label", reproduciendo ? "Pausar música" : "Reproducir música");
  }

  musicToggle.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch(() => mostrarEstado(false));
    } else {
      audio.pause();
    }
  });

  audio.addEventListener("play", () => mostrarEstado(true));
  audio.addEventListener("pause", () => mostrarEstado(false));

  // Salir de la página: pausar y recordar que estaba sonando
  function alSalir() {
    if (!audio.paused) {
      reanudar = true;
      audio.pause();
    }
  }

  // Volver a la página: reanudar solo si estaba sonando antes
  function alVolver() {
    if (!reanudar) return;
    reanudar = false;
    audio.play().catch(() => mostrarEstado(false));
  }

  document.addEventListener("visibilitychange", () => (document.hidden ? alSalir() : alVolver()));
  window.addEventListener("pagehide", alSalir);
  window.addEventListener("pageshow", (e) => { if (e.persisted) alVolver(); });

  function mostrarDuracion() {
    if (audio.duration) durationTimeEl.textContent = formatTime(audio.duration);
  }
  audio.addEventListener("loadedmetadata", mostrarDuracion);
  if (audio.readyState >= 1) mostrarDuracion();

  audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
      progressBar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
      currentTimeEl.textContent = formatTime(audio.currentTime);
    }
  });

  progressContainer.addEventListener("click", (e) => {
    if (!audio.duration) return;
    const rect = progressContainer.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * audio.duration;
  });
})();


/* =====================================================
   2) FORMULARIO DE CONFIRMACIÓN
   - El botón muestra el formulario dentro de la página.
   - Al enviarlo, se apaga como una tele antigua y queda el texto
     "Edita elección de asistencia", que vuelve a mostrar el formulario.
   - Cómo sabemos que se envió: el iframe carga primero el formulario vacío
     y, al enviar, Google carga la página de confirmación (2ª carga).
   ===================================================== */
(function () {
  "use strict";

  const button = document.getElementById("rsvpButtonBottom");
  const panel = document.getElementById("rsvpForm");
  const stage = document.getElementById("rsvpStage");
  const card = document.getElementById("rsvpCard");
  const done = document.getElementById("rsvpDone");
  const edit = document.getElementById("rsvpEdit");

  if (!button || !panel || !stage || !card || !done || !edit) return;

  const urlFormulario = panel.dataset.formUrl;
  const DURACION_TV = 800;          // igual que tvOff / tvOn en style.css
  const PAUSA_CONFIRMACION = 1400;  // tiempo para ver la confirmación de Google antes de apagar
  let frame = null;
  let cargas = 0;
  let enviado = false;

  const sinMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function irAlFormulario() {
    panel.scrollIntoView({ behavior: sinMovimiento() ? "auto" : "smooth", block: "start" });
  }

  // Crea un formulario nuevo (vacío) dentro de la tarjeta
  function cargarFormulario() {
    if (frame) frame.remove();
    cargas = 0;
    enviado = false;
    frame = document.createElement("iframe");
    frame.title = "Formulario para confirmar asistencia";
    frame.addEventListener("load", alCargar);
    frame.src = urlFormulario;
    card.appendChild(frame);
  }

  function alCargar() {
    cargas++;
    if (cargas < 2 || enviado) return;
    enviado = true;
    setTimeout(apagarFormulario, PAUSA_CONFIRMACION);
  }

  function apagarFormulario() {
    if (sinMovimiento()) return cerrarFormulario();
    card.classList.remove("tv-on");
    card.classList.add("tv-off");
    setTimeout(cerrarFormulario, DURACION_TV);
  }

  function cerrarFormulario() {
    stage.classList.add("is-closed");
    done.hidden = false;
  }

  button.setAttribute("aria-controls", "rsvpForm");
  button.setAttribute("aria-expanded", "false");

 document.addEventListener("click", function (e) {
    if (!e.target.closest("#rsvpButtonBottom")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (panel.hidden) {
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
      cargarFormulario();
    }
    irAlFormulario();
  }, true);

  edit.addEventListener("click", function () {
    done.hidden = true;
    cargarFormulario();
    card.classList.remove("tv-off");
    stage.classList.remove("is-closed");
    if (!sinMovimiento()) card.classList.add("tv-on");
    irAlFormulario();
  });
})();


/* =====================================================
   3) CUENTA REGRESIVA
   Utiliza la fecha y hora que la invitación ya muestra
   en #detailDate y #detailTime.
   ===================================================== */
(function () {
  "use strict";

  const daysEl = document.getElementById("countDays");
  const hoursEl = document.getElementById("countHours");
  const minutesEl = document.getElementById("countMinutes");
  const secondsEl = document.getElementById("countSeconds");
  const dateEl = document.getElementById("detailDate");
  const timeEl = document.getElementById("detailTime");

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl || !dateEl || !timeEl) return;

  // Hora de República Dominicana (UTC-4, sin horario de verano): la cuenta es igual para todos
  const OFFSET_RD = 4;

  const meses = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  };

  function convertirFecha(textoFecha, textoHora) {
    const fecha = textoFecha.trim().toLowerCase()
      .replace(/^(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)[,\s]+/, "");
    const m = fecha.match(/(\d{1,2})\s*(?:de\s*)?([a-záéíóúñ]+)\s*(?:de\s*)?(\d{4})/i);
    if (!m) return null;

    const mes = meses[m[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
    if (mes === undefined) return null;

    const horaTexto = textoHora.trim().toLowerCase();
    const hm = horaTexto.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?/i);
    if (!hm) return null;

    let hora = Number(hm[1]);
    const minuto = Number(hm[2] || 0);
    const periodo = (hm[3] || "").replace(/[\s.]/g, "");

    if (periodo === "pm" && hora < 12) hora += 12;
    if (periodo === "am" && hora === 12) hora = 0;
    if (hora > 23 || minuto > 59) return null;

    return new Date(Date.UTC(Number(m[3]), mes, Number(m[1]), hora + OFFSET_RD, minuto, 0));
  }

  function obtenerEvento() {
    return convertirFecha(dateEl.textContent, timeEl.textContent);
  }

  function actualizar() {
    const evento = obtenerEvento();
    if (!evento || Number.isNaN(evento.getTime())) return;

    const diferencia = evento.getTime() - Date.now();

    if (diferencia <= 0) {
      daysEl.textContent = "0";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      return;
    }

    const segundos = Math.floor(diferencia / 1000);
    const dias = Math.floor(segundos / 86400);
    const horas = Math.floor((segundos % 86400) / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segundosRestantes = segundos % 60;

    daysEl.textContent = dias;
    hoursEl.textContent = String(horas).padStart(2, "0");
    minutesEl.textContent = String(minutos).padStart(2, "0");
    secondsEl.textContent = String(segundosRestantes).padStart(2, "0");
  }

  // main.js puede tardar en colocar la fecha/hora; esperamos a que aparezcan.
  let intentos = 0;
  const iniciar = setInterval(function () {
    const evento = obtenerEvento();
    if (evento || intentos++ > 20) {
      clearInterval(iniciar);
      actualizar();
      setInterval(actualizar, 1000);
    }
  }, 250);
})();
