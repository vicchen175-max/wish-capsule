(() => {
  'use strict';
  const fresh = () => ({revision:0, notes:[], pending:null});
  const designs = window.WishCards.designs;
  const validIds = new Set(designs.map(design => design.id));
  const assignDesign = () => designs[randomIndex(designs.length)].id;
  function fillMissingDesigns(state) {
    for (const note of state.notes) {
      if (!validIds.has(note.designId)) note.designId = assignDesign();
    }
  }
  let memory = fresh();
  const connection = new Promise(resolve => {
    try {
      const request = indexedDB.open('wish-post-for-two', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('letters');
      request.onsuccess = () => resolve(request.result);
      request.onerror = request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  async function access(action) {
    const db = await connection;
    if (!db) {
      if (action) { fillMissingDesigns(memory); action(memory); memory.revision++; }
      return structuredClone(memory);
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction('letters', action ? 'readwrite' : 'readonly');
      const store = tx.objectStore('letters');
      const request = store.get('cabinet');
      let state;
      request.onsuccess = () => {
        state = request.result || fresh();
        if (action) { fillMissingDesigns(state); action(state); state.revision++; store.put(state, 'cabinet'); }
      };
      tx.oncomplete = () => resolve(state);
      tx.onabort = () => reject(tx.error || new Error('Storage unavailable'));
    });
  }
  function randomIndex(length) {
    const sample = new Uint32Array(1);
    const ceiling = Math.floor(0x100000000 / length) * length;
    do { crypto.getRandomValues(sample); } while (sample[0] >= ceiling);
    return sample[0] % length;
  }
  window.WishStore = {
    persistent: connection.then(Boolean),
    async read() {
      const state = await access();
      if (state.notes.some(note => !validIds.has(note.designId))) return access(() => {});
      return state;
    },
    add(text, author) {
      return access(state => state.notes.push({id:'w-'+(state.revision+1), text, author, created:Date.now(), opened:0, done:false, designId:assignDesign()}));
    },
    select() {
      return access(state => {
        if (state.pending) return;
        const pool = state.notes.filter(note => !note.opened);
        if (pool.length) state.pending = pool[randomIndex(pool.length)].id;
      });
    },
    open(id) {
      return access(state => {
        if (state.pending !== id) return;
        const note = state.notes.find(note => note.id === id);
        if (note) note.opened = Date.now();
        state.pending = null;
      });
    },
    finish(id, done) {
      return access(state => {
        const note = state.notes.find(note => note.opened && note.id === id);
        if (note) note.done = done;
      });
    }
  };
})();
