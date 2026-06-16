// ========================================================
// MILITIA INC. — firebase-config.js (Compat UMD Version)
// Configuración híbrida (Firebase real + fallback de pruebas local)
// ========================================================

// Configura aquí tus credenciales de Firebase en producción
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// Determinar si Firebase está configurado correctamente
const isConfigured = firebaseConfig.projectId && firebaseConfig.projectId !== "TU_PROJECT_ID";

let db, auth;
let isMock = true;

// Solo inicializar Firebase si el objeto 'firebase' global está disponible
if (isConfigured && typeof firebase !== 'undefined') {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    isMock = false;
    console.log("🔥 Firebase inicializado correctamente en producción.");
  } catch (error) {
    console.error("⚠️ Error inicializando Firebase. Cargando modo demostración local.", error);
    isMock = true;
  }
} else {
  console.log("ℹ️ Firebase no configurado (o cargado localmente). Modo demostración local (LocalStorage).");
  isMock = true;
}

// ========================================================
// BASE DE DATOS DE SIMULACIÓN (LOCALSTORAGE MOCK)
// ========================================================

const DEFAULT_EVENTS = {
  "la-curandera-junio-2026": {
    id: "la-curandera-junio-2026",
    name: "La Curandera",
    date: "2026-06-20",
    location: "Pachuca, Hidalgo",
    flyerUrl: "../images/galeria1.jpg",
    songs: [
      { id: "song1", title: "Persiana Americana", artist: "Soda Stereo", votes: 42 },
      { id: "song2", title: "Entre Dos Tierras", artist: "Héroes del Silencio", votes: 35 },
      { id: "song3", title: "Fade To Black", artist: "Metallica", votes: 58 },
      { id: "song4", title: "Bed Of Roses", artist: "Bon Jovi", votes: 21 },
      { id: "song5", title: "Have You Ever Seen The Rain", artist: "Creedence", votes: 19 }
    ],
    active: true,
    isCurrent: true,
    closed: false,
    winnerSongId: "",
    totalVotes: 175
  },
  "bar-la-catrina-mayo-2026": {
    id: "bar-la-catrina-mayo-2026",
    name: "Bar La Catrina",
    date: "2026-05-15",
    location: "Mineral del Monte, Hidalgo",
    flyerUrl: "../images/galeria2.jpg",
    songs: [
      { id: "song1", title: "Entre Dos Tierras", artist: "Héroes del Silencio", votes: 60 },
      { id: "song2", title: "Bed Of Roses", artist: "Bon Jovi", votes: 42 },
      { id: "song3", title: "Lamento Boliviano", artist: "Enanitos Verdes", votes: 55 },
      { id: "song4", title: "Creep", artist: "Radiohead", votes: 30 }
    ],
    active: false,
    isCurrent: false,
    closed: true,
    winnerSongId: "song1",
    totalVotes: 187
  }
};

function getLocalData(key, defaultVal) {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(data);
  } catch (e) {
    console.warn("LocalStorage corrupto detectado para la clave '" + key + "'. Reestableciendo valores por defecto.", e);
    try {
      localStorage.setItem(key, JSON.stringify(defaultVal));
    } catch (err) {
      console.error("No se pudo escribir en LocalStorage:", err);
    }
    return defaultVal;
  }
}

function saveLocalData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Inicializar Mock en LocalStorage si no existe
if (isMock) {
  getLocalData("militia_events", DEFAULT_EVENTS);
  getLocalData("militia_participants", []);
  getLocalData("militia_admin_logged", "false");
}

// ========================================================
// FUNCIONES DE INTERFAZ DE BASE DE DATOS (DB WRAPPER)
// ========================================================

// 1. Obtener Evento Activo / Vigente
async function getActiveEvent() {
  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    const active = Object.values(events).find(e => e.isCurrent && e.active);
    if (active) return active;
    return Object.values(events).find(e => e.active) || Object.values(events)[0] || null;
  } else {
    try {
      const querySnapshot = await db.collection("events").where("isCurrent", "==", true).limit(1).get();
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      }
      const snapActive = await db.collection("events").where("active", "==", true).limit(1).get();
      if (!snapActive.empty) {
        return { id: snapActive.docs[0].id, ...snapActive.docs[0].data() };
      }
      return null;
    } catch (e) {
      console.error("Error obteniendo evento activo:", e);
      return null;
    }
  }
}

// 2. Obtener Evento por ID/Slug
async function getEventBySlug(slug) {
  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    return events[slug] || null;
  } else {
    try {
      const docSnap = await db.collection("events").doc(slug).get();
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (e) {
      console.error("Error obteniendo evento por slug:", e);
      return null;
    }
  }
}

// 3. Emitir Voto
async function voteForSong(eventSlug, songId, leadData = null) {
  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    const event = events[eventSlug];
    if (!event) throw new Error("El evento no existe.");
    if (event.closed || !event.active) throw new Error("La votación está cerrada.");

    const songIndex = event.songs.findIndex(s => s.id === songId);
    if (songIndex === -1) throw new Error("Canción no encontrada.");

    event.songs[songIndex].votes = (event.songs[songIndex].votes || 0) + 1;
    event.totalVotes = (event.totalVotes || 0) + 1;
    events[eventSlug] = event;
    saveLocalData("militia_events", events);

    if (leadData && (leadData.name || leadData.email || leadData.whatsapp)) {
      const participants = getLocalData("militia_participants", []);
      participants.push({
        id: "p_" + Date.now(),
        eventId: eventSlug,
        songId: songId,
        songTitle: event.songs[songIndex].title,
        timestamp: new Date().toISOString(),
        ...leadData
      });
      saveLocalData("militia_participants", participants);
    }
    
    localStorage.setItem(`voted_${eventSlug}`, "true");
    window.dispatchEvent(new CustomEvent("mockDbUpdate", { detail: { slug: eventSlug } }));
    return true;
  } else {
    try {
      const eventRef = db.collection("events").doc(eventSlug);
      
      // Transacción de Firebase Compat
      return db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(eventRef);
        if (!docSnap.exists) throw new Error("El evento no existe.");
        const event = docSnap.data();
        if (event.closed || !event.active) throw new Error("La votación está cerrada.");

        const songs = event.songs.map(song => {
          if (song.id === songId) {
            return { ...song, votes: (song.votes || 0) + 1 };
          }
          return song;
        });

        transaction.update(eventRef, {
          songs: songs,
          totalVotes: (event.totalVotes || 0) + 1
        });

        const voteRef = db.collection("votes").doc();
        transaction.set(voteRef, {
          eventId: eventSlug,
          songId: songId,
          timestamp: new Date().toISOString(),
          voterName: leadData?.name || "",
          voterEmail: leadData?.email || "",
          voterPhone: leadData?.whatsapp || ""
        });

        localStorage.setItem(`voted_${eventSlug}`, "true");
      });
    } catch (e) {
      console.error("Error al registrar voto:", e);
      throw e;
    }
  }
}

// 4. Suscribirse a los resultados de un Evento en Tiempo Real
function subscribeToResults(eventSlug, callback) {
  if (isMock) {
    const handler = (e) => {
      if (e.detail && e.detail.slug === eventSlug) {
        const events = getLocalData("militia_events", DEFAULT_EVENTS);
        callback(events[eventSlug]);
      }
    };
    window.addEventListener("mockDbUpdate", handler);
    
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    callback(events[eventSlug]);
    
    return () => window.removeEventListener("mockDbUpdate", handler);
  } else {
    const docRef = db.collection("events").doc(eventSlug);
    return docRef.onSnapshot((docSnap) => {
      if (docSnap.exists) {
        callback({ id: docSnap.id, ...docSnap.data() });
      }
    });
  }
}

// 5. Obtener todos los eventos (Públicos e Históricos)
async function getAllEvents() {
  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    return Object.values(events).sort((a, b) => new Date(b.date) - new Date(a.date));
  } else {
    try {
      const querySnapshot = await db.collection("events").orderBy("date", "desc").get();
      const events = [];
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      return events;
    } catch (e) {
      console.error("Error obteniendo eventos:", e);
      return [];
    }
  }
}

// 6. Suscribirse a todos los eventos (Admin)
function subscribeToAllEvents(callback) {
  if (isMock) {
    const handler = () => {
      const events = getLocalData("militia_events", DEFAULT_EVENTS);
      callback(Object.values(events).sort((a, b) => new Date(b.date) - new Date(a.date)));
    };
    window.addEventListener("mockDbUpdate", handler);
    
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    callback(Object.values(events).sort((a, b) => new Date(b.date) - new Date(a.date)));
    
    return () => window.removeEventListener("mockDbUpdate", handler);
  } else {
    const q = db.collection("events").orderBy("date", "desc");
    return q.onSnapshot((querySnapshot) => {
      const events = [];
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      callback(events);
    });
  }
}

// 7. Crear o Editar Evento (Admin)
async function saveEvent(eventData) {
  const slug = eventData.id || eventData.name.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-');

  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    
    if (eventData.isCurrent) {
      Object.keys(events).forEach(key => {
        events[key].isCurrent = false;
      });
    }

    const existing = events[slug] || { songs: [], totalVotes: 0, closed: false, winnerSongId: "" };
    
    const updatedSongs = eventData.songs.map((song, i) => {
      const match = existing.songs.find(s => s.title.toLowerCase() === song.title.toLowerCase());
      return {
        id: song.id || "song" + (i + 1),
        title: song.title,
        artist: song.artist,
        votes: match ? match.votes : 0
      };
    });

    const totalVotes = updatedSongs.reduce((sum, s) => sum + (s.votes || 0), 0);

    events[slug] = {
      ...existing,
      ...eventData,
      id: slug,
      songs: updatedSongs,
      totalVotes: totalVotes
    };

    saveLocalData("militia_events", events);
    window.dispatchEvent(new CustomEvent("mockDbUpdate", { detail: { slug: slug } }));
    return slug;
  } else {
    try {
      const eventRef = db.collection("events").doc(slug);
      
      if (eventData.isCurrent) {
        const currentSnaps = await db.collection("events").where("isCurrent", "==", true).get();
        for (const d of currentSnaps.docs) {
          if (d.id !== slug) {
            await db.collection("events").doc(d.id).update({ isCurrent: false });
          }
        }
      }

      const docSnap = await eventRef.get();
      let existing = { songs: [], totalVotes: 0, closed: false, winnerSongId: "" };
      if (docSnap.exists) {
        existing = docSnap.data();
      }

      const updatedSongs = eventData.songs.map((song, i) => {
        const match = existing.songs.find(s => s.title.toLowerCase() === song.title.toLowerCase());
        return {
          id: song.id || "song" + (i + 1),
          title: song.title,
          artist: song.artist,
          votes: match ? match.votes : 0
        };
      });

      const totalVotes = updatedSongs.reduce((sum, s) => sum + (s.votes || 0), 0);

      const toSave = {
        name: eventData.name,
        date: eventData.date,
        location: eventData.location,
        flyerUrl: eventData.flyerUrl || "",
        songs: updatedSongs,
        active: eventData.active ?? true,
        isCurrent: eventData.isCurrent ?? false,
        closed: eventData.closed ?? existing.closed,
        winnerSongId: eventData.winnerSongId ?? existing.winnerSongId,
        totalVotes: totalVotes
      };

      await eventRef.set(toSave, { merge: true });
      return slug;
    } catch (e) {
      console.error("Error guardando evento:", e);
      throw e;
    }
  }
}

// 8. Cerrar votación y declarar ganadora (Admin)
async function closeVoting(eventSlug, winnerSongId) {
  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    const event = events[eventSlug];
    if (!event) throw new Error("El evento no existe.");

    event.closed = true;
    event.active = false;
    event.winnerSongId = winnerSongId;
    events[eventSlug] = event;

    saveLocalData("militia_events", events);
    window.dispatchEvent(new CustomEvent("mockDbUpdate", { detail: { slug: eventSlug } }));
    return true;
  } else {
    try {
      const eventRef = db.collection("events").doc(eventSlug);
      await eventRef.update({
        closed: true,
        active: false,
        winnerSongId: winnerSongId
      });
      return true;
    } catch (e) {
      console.error("Error cerrando votación:", e);
      throw e;
    }
  }
}

// 9. Eliminar Evento (Admin)
async function deleteEvent(eventSlug) {
  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    delete events[eventSlug];
    saveLocalData("militia_events", events);
    window.dispatchEvent(new CustomEvent("mockDbUpdate", { detail: { slug: eventSlug } }));
    return true;
  } else {
    console.warn("Borrado directo en Firebase no implementado.");
    return false;
  }
}

// 10. Obtener lista de participantes registrados (Admin)
async function getParticipantsForEvent(eventSlug) {
  if (isMock) {
    const participants = getLocalData("militia_participants", []);
    return participants.filter(p => p.eventId === eventSlug);
  } else {
    try {
      const querySnapshot = await db.collection("votes").where("eventId", "==", eventSlug).get();
      const list = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.voterName || data.voterEmail || data.voterPhone) {
          list.push({
            id: doc.id,
            name: data.voterName,
            email: data.voterEmail,
            whatsapp: data.voterPhone,
            timestamp: data.timestamp,
            songId: data.songId
          });
        }
      });
      return list;
    } catch (e) {
      console.error("Error obteniendo participantes:", e);
      return [];
    }
  }
}

// ========================================================
// SERVICIO DE AUTENTICACIÓN ADMIN (MOCK + FIREBASE AUTH)
// ========================================================

async function loginAdmin(email, password) {
  if (isMock) {
    if (password === "militia123" && email === "admin@militiainc.com.mx") {
      sessionStorage.setItem("militia_admin_logged", "true");
      return { email: email, uid: "mock_admin" };
    } else {
      throw new Error("Contraseña incorrecta. Pista del demo: usa admin@militiainc.com.mx y contraseña militia123");
    }
  } else {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      return userCredential.user;
    } catch (e) {
      console.error("Error en login:", e);
      throw e;
    }
  }
}

async function logoutAdmin() {
  if (isMock) {
    sessionStorage.removeItem("militia_admin_logged");
    return true;
  } else {
    try {
      await auth.signOut();
      return true;
    } catch (e) {
      console.error("Error en logout:", e);
      throw e;
    }
  }
}

function checkAuthState(callback) {
  if (isMock) {
    const isLogged = sessionStorage.getItem("militia_admin_logged") === "true";
    callback(isLogged ? { email: "admin@militiainc.com.mx", uid: "mock_admin" } : null);
    return () => {};
  } else {
    return auth.onAuthStateChanged(callback);
  }
}

// Exponer la interfaz globalmente
window.MilitiaDb = {
  isMock: isMock,
  getActiveEvent: getActiveEvent,
  getEventBySlug: getEventBySlug,
  voteForSong: voteForSong,
  subscribeToResults: subscribeToResults,
  getAllEvents: getAllEvents,
  subscribeToAllEvents: subscribeToAllEvents,
  saveEvent: saveEvent,
  closeVoting: closeVoting,
  deleteEvent: deleteEvent,
  getParticipantsForEvent: getParticipantsForEvent,
  loginAdmin: loginAdmin,
  logoutAdmin: logoutAdmin,
  checkAuthState: checkAuthState
};
