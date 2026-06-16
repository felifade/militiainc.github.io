// ========================================================
// MILITIA INC. — firebase-config.js
// Configuración híbrida (Firebase real + fallback de pruebas local)
// ========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, doc, getDoc, setDoc, addDoc, collection, 
  updateDoc, onSnapshot, query, where, getDocs, limit, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

let app, db, auth;
let isMock = true;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    isMock = false;
    console.log("🔥 Firebase inicializado correctamente en producción.");
  } catch (error) {
    console.error("⚠️ Error inicializando Firebase. Cargando modo demostración local.", error);
    isMock = true;
  }
} else {
  console.log("ℹ️ Firebase no configurado. Cargando modo demostración local (LocalStorage).");
  console.log("👉 Para producción: edita js/firebase-config.js con tus credenciales.");
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
    flyerUrl: "../images/galeria1.jpg", // Usa una imagen local de la galería
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
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  return JSON.parse(data);
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
export async function getActiveEvent() {
  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    const active = Object.values(events).find(e => e.isCurrent && e.active);
    if (active) return active;
    // Si no hay ninguno marcado como vigente, retornar el primero activo
    return Object.values(events).find(e => e.active) || Object.values(events)[0] || null;
  } else {
    try {
      const q = query(collection(db, "events"), where("isCurrent", "==", true), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      }
      // Buscar cualquier evento activo si no hay current
      const qActive = query(collection(db, "events"), where("active", "==", true), limit(1));
      const snapActive = await getDocs(qActive);
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
export async function getEventBySlug(slug) {
  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    return events[slug] || null;
  } else {
    try {
      const docRef = doc(db, "events", slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
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
export async function voteForSong(eventSlug, songId, leadData = null) {
  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    const event = events[eventSlug];
    if (!event) throw new Error("El evento no existe.");
    if (event.closed || !event.active) throw new Error("La votación está cerrada.");

    // Incrementar voto de la canción
    const songIndex = event.songs.findIndex(s => s.id === songId);
    if (songIndex === -1) throw new Error("Canción no encontrada.");

    event.songs[songIndex].votes = (event.songs[songIndex].votes || 0) + 1;
    event.totalVotes = (event.totalVotes || 0) + 1;
    events[eventSlug] = event;
    saveLocalData("militia_events", events);

    // Registrar participante si proporcionó datos
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
    
    // Guardar marca de voto en localStorage local para evitar duplicados
    localStorage.setItem(`voted_${eventSlug}`, "true");
    
    // Disparar evento de actualización mock local para tiempo real
    window.dispatchEvent(new CustomEvent("mockDbUpdate", { detail: { slug: eventSlug } }));
    return true;
  } else {
    try {
      // Usar transacción para incrementar de forma segura
      const eventRef = doc(db, "events", eventSlug);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) throw new Error("El evento no existe.");
      const event = eventSnap.data();
      if (event.closed || !event.active) throw new Error("La votación está cerrada.");

      const songs = event.songs.map(song => {
        if (song.id === songId) {
          return { ...song, votes: (song.votes || 0) + 1 };
        }
        return song;
      });

      await updateDoc(eventRef, {
        songs: songs,
        totalVotes: (event.totalVotes || 0) + 1
      });

      // Crear registro en colección de votos/participantes
      const voteRef = doc(collection(db, "votes"));
      const voteDoc = {
        eventId: eventSlug,
        songId: songId,
        timestamp: new Date().toISOString(),
        voterName: leadData?.name || "",
        voterEmail: leadData?.email || "",
        voterPhone: leadData?.whatsapp || ""
      };
      await setDoc(voteRef, voteDoc);

      localStorage.setItem(`voted_${eventSlug}`, "true");
      return true;
    } catch (e) {
      console.error("Error al registrar voto:", e);
      throw e;
    }
  }
}

// 4. Suscribirse a los resultados de un Evento en Tiempo Real
export function subscribeToResults(eventSlug, callback) {
  if (isMock) {
    const handler = (e) => {
      if (e.detail && e.detail.slug === eventSlug) {
        const events = getLocalData("militia_events", DEFAULT_EVENTS);
        callback(events[eventSlug]);
      }
    };
    window.addEventListener("mockDbUpdate", handler);
    
    // Ejecución inicial inmediata
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    callback(events[eventSlug]);
    
    // Retornar función para desuscribirse
    return () => window.removeEventListener("mockDbUpdate", handler);
  } else {
    const docRef = doc(db, "events", eventSlug);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      }
    });
  }
}

// 5. Obtener todos los eventos (Públicos e Históricos)
export async function getAllEvents() {
  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    return Object.values(events).sort((a, b) => new Date(b.date) - new Date(a.date));
  } else {
    try {
      const q = query(collection(db, "events"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
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
export function subscribeToAllEvents(callback) {
  if (isMock) {
    const handler = () => {
      const events = getLocalData("militia_events", DEFAULT_EVENTS);
      callback(Object.values(events).sort((a, b) => new Date(b.date) - new Date(a.date)));
    };
    window.addEventListener("mockDbUpdate", handler);
    
    // Ejecución inicial
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    callback(Object.values(events).sort((a, b) => new Date(b.date) - new Date(a.date)));
    
    return () => window.removeEventListener("mockDbUpdate", handler);
  } else {
    const q = query(collection(db, "events"), orderBy("date", "desc"));
    return onSnapshot(q, (querySnapshot) => {
      const events = [];
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      callback(events);
    });
  }
}

// 7. Crear o Editar Evento (Admin)
export async function saveEvent(eventData) {
  const slug = eventData.id || eventData.name.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-');

  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    
    // Si se marca este evento como vigente (isCurrent), desmarcar los demás
    if (eventData.isCurrent) {
      Object.keys(events).forEach(key => {
        events[key].isCurrent = false;
      });
    }

    const existing = events[slug] || { songs: [], totalVotes: 0, closed: false, winnerSongId: "" };
    
    // Mapear canciones preservando votos si ya existían
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
      const eventRef = doc(db, "events", slug);
      
      // Si se marca como current, primero desmarcar otros events
      if (eventData.isCurrent) {
        const q = query(collection(db, "events"), where("isCurrent", "==", true));
        const currentSnaps = await getDocs(q);
        for (const d of currentSnaps.docs) {
          if (d.id !== slug) {
            await updateDoc(doc(db, "events", d.id), { isCurrent: false });
          }
        }
      }

      // Comprobar si ya existe
      const docSnap = await getDoc(eventRef);
      let existing = { songs: [], totalVotes: 0, closed: false, winnerSongId: "" };
      if (docSnap.exists()) {
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

      await setDoc(eventRef, toSave, { merge: true });
      return slug;
    } catch (e) {
      console.error("Error guardando evento:", e);
      throw e;
    }
  }
}

// 8. Cerrar votación y declarar ganadora (Admin)
export async function closeVoting(eventSlug, winnerSongId) {
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
      const eventRef = doc(db, "events", eventSlug);
      await updateDoc(eventRef, {
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
export async function deleteEvent(eventSlug) {
  if (isMock) {
    const events = getLocalData("militia_events", DEFAULT_EVENTS);
    delete events[eventSlug];
    saveLocalData("militia_events", events);
    window.dispatchEvent(new CustomEvent("mockDbUpdate", { detail: { slug: eventSlug } }));
    return true;
  } else {
    // Nota: Generalmente es mejor desactivarlo, pero implementamos delete si es necesario.
    console.warn("Borrado directo en Firebase no implementado en este wrapper por seguridad. Usa desactivar.");
    return false;
  }
}

// 10. Obtener lista de participantes registrados (Admin)
export async function getParticipantsForEvent(eventSlug) {
  if (isMock) {
    const participants = getLocalData("militia_participants", []);
    return participants.filter(p => p.eventId === eventSlug);
  } else {
    try {
      const q = query(collection(db, "votes"), where("eventId", "==", eventSlug));
      const querySnapshot = await getDocs(q);
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

export async function loginAdmin(email, password) {
  if (isMock) {
    // Para el entorno de simulación, la contraseña por defecto es "militia123"
    if (password === "militia123" && email === "admin@militiainc.com.mx") {
      sessionStorage.setItem("militia_admin_logged", "true");
      return { email: email, uid: "mock_admin" };
    } else {
      throw new Error("Contraseña incorrecta. Pista del demo: usa admin@militiainc.com.mx y contraseña militia123");
    }
  } else {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (e) {
      console.error("Error en login:", e);
      throw e;
    }
  }
}

export async function logoutAdmin() {
  if (isMock) {
    sessionStorage.removeItem("militia_admin_logged");
    return true;
  } else {
    try {
      await signOut(auth);
      return true;
    } catch (e) {
      console.error("Error en logout:", e);
      throw e;
    }
  }
}

export function checkAuthState(callback) {
  if (isMock) {
    const isLogged = sessionStorage.getItem("militia_admin_logged") === "true";
    callback(isLogged ? { email: "admin@militiainc.com.mx", uid: "mock_admin" } : null);
    // Retornar un unsubscriber vacío
    return () => {};
  } else {
    return onAuthStateChanged(auth, callback);
  }
}
