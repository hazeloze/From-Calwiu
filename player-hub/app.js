(() => {
  const cfg = window.APP_CONFIG || {};
  const configured = cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes('YOUR_') && !cfg.supabaseAnonKey.includes('YOUR_');
  const client = configured && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const state = { players: [], session: null, editing: null, busy: false };
  const grid = $('#player-grid'), count = $('#player-count'), notice = $('#notice');
  $('#year').textContent = new Date().getFullYear();

  function esc(value = '') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function imageUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const { data } = client.storage.from(cfg.storageBucket || 'player-images').getPublicUrl(path);
    return data.publicUrl;
  }
  function setNotice(message, error = false) { notice.textContent = message; notice.classList.toggle('hidden', !message); notice.style.borderColor = error ? '#a64a60' : ''; }
  function fmtDate(date) { try { return new Date(date).toLocaleDateString(undefined, {month:'short',day:'numeric',year:'numeric'}); } catch { return ''; } }
  function cardMarkup(p) {
    const src = imageUrl(p.card_image_path || p.photo_path);
    return `<article class="player-card" data-player-id="${esc(p.id)}" tabindex="0" role="button" aria-label="View ${esc(p.name)}"><div class="card-image">${src ? `<img loading="lazy" src="${esc(src)}" alt="${esc(p.name)} card" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">` : ''}<div class="image-placeholder" ${src ? 'style="display:none"' : ''}>EF</div><span class="rating">${p.rating == null ? '—' : esc(p.rating)}</span><span class="position-tag">${esc(p.position || 'N/A')}</span></div><div class="card-info"><div class="card-name">${esc(p.name)}</div><div class="card-club">${esc(p.club || p.nationality || 'eFootball player')}</div><div class="card-footer"><span>${esc(p.card_type || 'PLAYER CARD')}</span><b>VIEW PROFILE ↗</b></div></div></article>`;
  }
  function renderPlayers() {
    const term = $('#search').value.trim().toLowerCase(), pos = $('#position-filter').value, sort = $('#sort').value;
    let rows = state.players.filter(p => (!term || [p.name,p.club,p.nationality,p.position,p.card_type].some(v => String(v || '').toLowerCase().includes(term))) && (!pos || p.position === pos));
    rows.sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'newest' ? new Date(b.created_at)-new Date(a.created_at) : (Number(b.rating)||0)-(Number(a.rating)||0));
    count.textContent = `${rows.length} PLAYER${rows.length === 1 ? '' : 'S'}`;
    grid.innerHTML = rows.length ? rows.map(cardMarkup).join('') : `<div class="empty-state">${state.players.length ? 'No players match your search. Try another name or position.' : 'No players published yet. The admin can add the first player after setup.'}</div>`;
  }
  async function loadPlayers() {
    if (!client) { count.textContent = 'SETUP REQUIRED'; grid.innerHTML = '<div class="empty-state">Connect your Supabase project first: edit <b>config.js</b>, run <b>supabase-setup.sql</b> in Supabase SQL Editor, then create your admin user as shown in README.md.</div>'; return; }
    grid.innerHTML = '<div class="empty-state">Loading player library…</div>';
    const { data, error } = await client.from('players').select('*').eq('is_published', true).order('rating', { ascending: false });
    if (error) { grid.innerHTML = '<div class="empty-state">Could not load players. Check the Supabase setup and table policies in README.md.</div>'; setNotice(`Database: ${error.message}`, true); return; }
    state.players = data || []; setNotice(''); renderPlayers();
  }
  function openDialog(id) { const d = document.getElementById(id); if (d && !d.open) d.showModal(); }
  function closeDialog(id) { const d = document.getElementById(id); if (d?.open) d.close(); }
  document.addEventListener('click', e => { const close = e.target.closest('[data-close]'); if (close) closeDialog(close.dataset.close); });
  [$('#search'), $('#position-filter'), $('#sort')].forEach(el => el.addEventListener(el === $('#search') ? 'input' : 'change', renderPlayers));
  grid.addEventListener('click', e => { const card = e.target.closest('[data-player-id]'); if (card) showPlayer(card.dataset.playerId); });
  grid.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const card = e.target.closest('[data-player-id]'); if (card) { e.preventDefault(); showPlayer(card.dataset.playerId); } } });

  function showPlayer(id) {
    const p = state.players.find(x => String(x.id) === String(id)); if (!p) return;
    const photo = imageUrl(p.photo_path), card = imageUrl(p.card_image_path);
    $('#player-detail').innerHTML = `<div class="detail-layout"><div>${(card || photo) ? `<img class="detail-photo" src="${esc(card || photo)}" alt="${esc(p.name)}">` : '<div class="detail-photo image-placeholder">EF</div>'}${photo && card && photo !== card ? `<p class="eyebrow" style="margin-top:8px">PLAYER PHOTO</p><img class="detail-photo" style="aspect-ratio:1/1" src="${esc(photo)}" alt="${esc(p.name)} photo">` : ''}</div><div><div class="detail-rating">${p.rating == null ? '—' : esc(p.rating)}</div><div class="detail-position">${esc(p.position || 'POSITION NOT SET')}</div><h2>${esc(p.name)}</h2><div class="detail-club">${esc([p.club,p.nationality].filter(Boolean).join(' · ') || 'eFootball player')}</div><p class="detail-bio">${esc(p.description || 'No additional player details have been added yet.')}</p><div class="detail-meta">${p.card_type ? `<span>${esc(p.card_type)}</span>` : ''}${p.strong_foot ? `<span>${esc(p.strong_foot)} foot</span>` : ''}${p.age ? `<span>Age ${esc(p.age)}</span>` : ''}${p.created_at ? `<span>Added ${esc(fmtDate(p.created_at))}</span>` : ''}</div></div></div>`;
    openDialog('player-dialog');
  }

  function showLogin(message = '') {
    $('#admin-content').innerHTML = `<p class="eyebrow">RESTRICTED AREA</p><h2>Admin <span class="accent">login</span></h2><p class="modal-sub">Sign in with the admin account you created in Supabase. Public sign-up is intentionally not available on this site.</p><form id="login-form"><div class="form-grid"><div class="field full"><label for="login-email">ADMIN EMAIL</label><input class="form-control" id="login-email" type="email" autocomplete="username" required></div><div class="field full"><label for="login-password">PASSWORD</label><input class="form-control" id="login-password" type="password" autocomplete="current-password" required minlength="8"></div></div><p class="admin-status" id="login-message">${esc(message)}</p><div class="form-actions"><button class="button button-primary" type="submit">Sign in securely</button></div></form>`;
    $('#login-form').addEventListener('submit', async e => {
      e.preventDefault(); const button = $('button[type="submit"]', e.currentTarget); button.disabled = true; button.textContent = 'Signing in…';
      const { error } = await client.auth.signInWithPassword({ email: $('#login-email').value.trim(), password: $('#login-password').value });
      if (error) { $('#login-message').textContent = error.message; button.disabled = false; button.textContent = 'Sign in securely'; }
      else { const ok = await verifyAdmin(); if (ok) await showAdmin(); else { await client.auth.signOut(); showLogin('This account is not authorized as an administrator.'); } }
    });
  }
  async function verifyAdmin() {
    const { data: { user } } = await client.auth.getUser(); if (!user) return false;
    const { data, error } = await client.rpc('is_admin'); return !error && data === true;
  }
  async function refreshAdminList() {
    const { data, error } = await client.from('players').select('*').order('created_at', { ascending: false });
    if (error) throw error; state.adminPlayers = data || [];
    const list = $('#admin-list'); if (!list) return;
    list.innerHTML = state.adminPlayers.length ? state.adminPlayers.map(p => `<div class="admin-row"><img class="admin-thumb" src="${esc(imageUrl(p.card_image_path || p.photo_path) || '')}" alt="" onerror="this.style.visibility='hidden'"><div class="admin-row-info"><b>${esc(p.name)}</b><span>${esc(p.position || 'N/A')} · ${p.rating ?? '—'} OVR · ${p.is_published ? 'Published' : 'Draft'}</span></div><button class="mini-button" data-edit="${esc(p.id)}">Edit</button><button class="mini-button delete" data-delete="${esc(p.id)}">Delete</button></div>`).join('') : '<div class="empty-state">No players yet. Add your first player above.</div>';
    list.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => showPlayerForm(state.adminPlayers.find(p => String(p.id) === b.dataset.edit))));
    list.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deletePlayer(b.dataset.delete)));
  }
  async function showAdmin(message = '') {
    $('#admin-content').innerHTML = `<div class="admin-head"><div><p class="eyebrow">CONTENT MANAGEMENT</p><h2>Admin <span class="accent">studio</span></h2></div><button class="button button-ghost" id="logout">Log out</button></div><p class="admin-status">Signed in as <b>${esc(state.session?.user?.email || '')}</b>. Uploaded images are stored in your Supabase Storage bucket.</p><div class="form-actions"><button class="button button-primary" id="add-player">＋ Add player</button></div><p class="admin-status" id="admin-message">${esc(message)}</p><div class="admin-list" id="admin-list"><div class="empty-state">Loading records…</div></div>`;
    $('#logout').addEventListener('click', async () => { await client.auth.signOut(); state.session = null; showLogin('You have been signed out.'); });
    $('#add-player').addEventListener('click', () => showPlayerForm(null));
    try { await refreshAdminList(); } catch (e) { $('#admin-message').textContent = e.message; }
  }
  function showPlayerForm(p) {
    state.editing = p || null;
    $('#admin-content').innerHTML = `<div class="admin-head"><div><p class="eyebrow">PLAYER DATABASE</p><h2>${p ? 'Edit' : 'Add'} <span class="accent">player</span></h2></div><button class="mini-button" id="back-admin">← Back</button></div><p class="modal-sub">Fields marked * are required. Choose images from your device; they will upload to your private project's public player-image bucket.</p><form id="player-form"><div class="form-grid">
      <div class="field"><label for="p-name">PLAYER NAME *</label><input class="form-control" id="p-name" required maxlength="100" value="${esc(p?.name || '')}"></div>
      <div class="field"><label for="p-rating">OVERALL RATING</label><input class="form-control" id="p-rating" type="number" min="1" max="110" value="${p?.rating ?? ''}" placeholder="e.g. 102"></div>
      <div class="field"><label for="p-position">POSITION</label><select class="form-control" id="p-position"><option value="">Select position</option>${['CF','SS','LWF','RWF','AMF','CMF','DMF','LMF','RMF','LB','RB','CB','GK'].map(v => `<option ${p?.position === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label for="p-club">CLUB / TEAM</label><input class="form-control" id="p-club" maxlength="100" value="${esc(p?.club || '')}"></div>
      <div class="field"><label for="p-nationality">NATIONALITY</label><input class="form-control" id="p-nationality" maxlength="80" value="${esc(p?.nationality || '')}"></div>
      <div class="field"><label for="p-type">CARD TYPE</label><input class="form-control" id="p-type" maxlength="80" placeholder="Epic, Big Time, POTW…" value="${esc(p?.card_type || '')}"></div>
      <div class="field"><label for="p-foot">STRONG FOOT</label><select class="form-control" id="p-foot"><option value="">Not set</option><option ${p?.strong_foot === 'Right' ? 'selected' : ''}>Right</option><option ${p?.strong_foot === 'Left' ? 'selected' : ''}>Left</option></select></div>
      <div class="field"><label for="p-age">AGE (OPTIONAL)</label><input class="form-control" id="p-age" type="number" min="1" max="100" value="${p?.age ?? ''}"></div>
      <div class="field full"><label for="p-description">PLAYER DETAILS / NOTES</label><textarea class="form-control" id="p-description" maxlength="4000" placeholder="Short bio, playstyle, details…">${esc(p?.description || '')}</textarea></div>
      <div class="field"><label for="p-photo">PLAYER PHOTO ${p?.photo_path ? '(already uploaded)' : ''}</label><input class="form-control" id="p-photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><span class="admin-status">JPG, PNG, WebP or GIF · max 5 MB</span></div>
      <div class="field"><label for="p-card">CARD IMAGE ${p?.card_image_path ? '(already uploaded)' : ''}</label><input class="form-control" id="p-card" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><span class="admin-status">JPG, PNG, WebP or GIF · max 5 MB</span></div>
      <div class="field full"><label class="check-row"><input id="p-published" type="checkbox" ${p?.is_published !== false ? 'checked' : ''}> Publish on the public website</label></div>
      </div><div class="form-actions"><button class="button button-primary" id="save-player" type="submit">${p ? 'Save changes' : 'Create player'}</button><button class="button button-ghost" type="button" id="cancel-player">Cancel</button></div><p id="form-message" class="admin-status" role="status"></p></form>`;
    $('#back-admin').addEventListener('click', () => showAdmin()); $('#cancel-player').addEventListener('click', () => showAdmin());
    $('#player-form').addEventListener('submit', savePlayer);
  }
  async function uploadImage(file, oldPath, kind, playerId) {
    if (!file || !file.size) return oldPath || null;
    if (file.size > 5 * 1024 * 1024) throw new Error(`${kind} must be 5 MB or smaller.`);
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw new Error(`${kind} must be JPG, PNG, WebP, or GIF.`);
    const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
    const path = `${playerId}/${kind}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await client.storage.from(cfg.storageBucket || 'player-images').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' });
    if (error) throw error;
    if (oldPath && !/^https?:\/\//i.test(oldPath)) await client.storage.from(cfg.storageBucket || 'player-images').remove([oldPath]);
    return path;
  }
  async function savePlayer(e) {
    e.preventDefault(); const button = $('#save-player'), msg = $('#form-message'); if (state.busy) return; state.busy = true; button.disabled = true; button.textContent = 'Saving…';
    let p = state.editing;
    try {
      const name = $('#p-name').value.trim(); if (!name) throw new Error('Player name is required.');
      const row = { name, rating: $('#p-rating').value ? Number($('#p-rating').value) : null, position: $('#p-position').value || null, club: $('#p-club').value.trim() || null, nationality: $('#p-nationality').value.trim() || null, card_type: $('#p-type').value.trim() || null, strong_foot: $('#p-foot').value || null, age: $('#p-age').value ? Number($('#p-age').value) : null, description: $('#p-description').value.trim() || null, is_published: $('#p-published').checked };
      if (!p) { const { data, error } = await client.from('players').insert(row).select('*').single(); if (error) throw error; p = data; }
      else { const { data, error } = await client.from('players').update(row).eq('id', p.id).select('*').single(); if (error) throw error; p = data; }
      const photo = $('#p-photo').files[0], card = $('#p-card').files[0];
      const photoPath = await uploadImage(photo, p.photo_path, 'photo', p.id);
      const cardPath = await uploadImage(card, p.card_image_path, 'card', p.id);
      if (photoPath !== p.photo_path || cardPath !== p.card_image_path) {
        const { error } = await client.from('players').update({ photo_path: photoPath, card_image_path: cardPath }).eq('id', p.id); if (error) throw error;
      }
      await refreshAdminList(); await loadPlayers(); await showAdmin('Player saved successfully.');
    } catch (err) { msg.textContent = err.message || 'Could not save player.'; msg.style.color = '#ff9cac'; button.disabled = false; button.textContent = p ? 'Save changes' : 'Create player'; }
    finally { state.busy = false; }
  }
  async function deletePlayer(id) {
    const p = state.adminPlayers.find(x => String(x.id) === String(id)); if (!p || !confirm(`Delete ${p.name}? This cannot be undone.`)) return;
    const paths = [p.photo_path,p.card_image_path].filter(x => x && !/^https?:\/\//i.test(x));
    try {
      const { error } = await client.from('players').delete().eq('id', id); if (error) throw error;
      if (paths.length) { const { error: storageError } = await client.storage.from(cfg.storageBucket || 'player-images').remove(paths); if (storageError) console.warn('Image cleanup failed:', storageError.message); }
      await refreshAdminList(); await loadPlayers();
    } catch (e) { const el = $('#admin-message'); if (el) el.textContent = `Delete failed: ${e.message}`; }
  }

  $('#admin-open').addEventListener('click', async () => {
    if (!client) { openDialog('admin-dialog'); showLogin('Setup is not complete yet. Fill config.js and run the SQL setup first.'); $('#login-form')?.querySelectorAll('input,button').forEach(el => el.disabled = true); return; }
    const { data } = await client.auth.getSession(); state.session = data.session;
    openDialog('admin-dialog');
    if (state.session && await verifyAdmin()) await showAdmin(); else { if (state.session) await client.auth.signOut(); state.session = null; showLogin(); }
  });
  if (client) {
    client.auth.onAuthStateChange((_event, session) => { state.session = session; });
    client.auth.getSession().then(({data}) => { state.session = data.session; });
  }
  loadPlayers();
})();
