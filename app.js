// ============================================
// EMM MONDIAL — LOGIQUE PRINCIPALE v7
// ============================================

var currentUser = null;
var photoCandidatTemp = null;
var signatureCanvas = null, signatureCtx = null, signatureVide = true;
var seanceActive = null;
var tempOffrandes = { init: [], sorei: [], kannon: [], photo: [], shinrei: [], gosh: [], mita: [] };

var CATEGORIES_OFFRANDES = {
  init: 'Initiation', sorei: 'Sorei Saichi', kannon: 'Kannon',
  photo: 'Photo sacrée', shinrei: 'Shinrei Saichi',
  gosh: 'Goshintai familiale', mita: 'Mitamaya'
};

// ========== SPLASH ==========
function showSplash() {
  showScreen('splashScreen');
  setTimeout(function() {
    var sess = DB.get('session');
    if (sess) { currentUser = sess; appliquerSession(); showScreen('mainScreen'); }
    else { showScreen('loginScreen'); var inp = document.getElementById('loginUsername'); if (inp) inp.focus(); }
  }, 2500);
}

// ========== NAVIGATION ==========
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); s.style.display = 'none'; });
  var el = document.getElementById(id);
  el.classList.add('active');
  el.style.display = (id === 'splashScreen' || id === 'loginScreen') ? 'flex' : 'block';
  window.scrollTo(0, 0);
}

function switchMainTab(name, btn) {
  document.querySelectorAll('.main-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.main-tab-content').forEach(function(c) { c.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'general') afficherDashboard();
  if (name === 'finance') {
    setTimeout(initSignature, 100);
    setTimeout(initSignature, 400);
    setTimeout(initSignature, 800);
  }
}

// ========== LOGIN / LOGOUT ==========
function login() {
  var nom = document.getElementById('loginUsername').value.trim().toLowerCase();
  var pass = document.getElementById('loginPassword').value.trim();
  var errBox = document.getElementById('loginError');
  if (!nom || !pass) { errBox.textContent = '❌ Entrez le nom et le mot de passe'; return; }
  var users = DB.get('users', []);
  var user = users.find(function(u) { return u.nom.toLowerCase() === nom && u.pass === pass; });
  if (!user) { errBox.textContent = '❌ Nom ou mot de passe incorrect'; return; }
  currentUser = user;
  DB.set('session', user);
  errBox.textContent = '';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  appliquerSession();
  showScreen('mainScreen');
}

function logout() {
  if (!confirm('Voulez-vous vraiment vous déconnecter ?')) return;
  currentUser = null;
  DB.set('session', null);
  showScreen('loginScreen');
  setTimeout(function() { var inp = document.getElementById('loginUsername'); if (inp) inp.focus(); }, 200);
}

function appliquerSession() {
  if (!currentUser) return;
  var label = document.getElementById('userRoleLabel');
  if (label) label.textContent = (currentUser.role === 'admin' ? '👑 Admin' : '👤 ' + currentUser.nom);
  var wb = document.getElementById('welcomeBox');
  if (wb) wb.innerHTML = '<p style="font-size:14px">Connecté : <strong>' + echapper(currentUser.nom) + '</strong></p>' +
    '<p style="font-size:12px;color:#666;margin-top:4px">Rôle : ' + (currentUser.role === 'admin' ? '👑 Administrateur' : '👤 Utilisateur') + '</p>';
  refreshAll();
  afficherDashboard();
  afficherAnnonces();
}

// ========== UTILITAIRES ==========
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function fmtDate(d) { if (!d) return ''; return new Date(d).toLocaleDateString('fr-FR'); }
function echapper(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function isAdmin() { return currentUser && currentUser.role === 'admin'; }

// Filtre une liste selon archived + filtre
function filtrerListe(list, filtre) {
  if (filtre === 'archive') return list.filter(function(x) { return x.archived === true; });
  if (filtre === 'tous') return list;
  // 'actif' par défaut
  return list.filter(function(x) { return !x.archived; });
}

// ========== ANNONCES ==========
function afficherAnnonces() {
  var list = DB.get('annonces', []);
  var box = document.getElementById('announcementsBox');
  if (!box) return;
  if (!list.length) { box.innerHTML = '<p>Aucune annonce.</p>'; return; }
  var html = '';
  list.slice().reverse().forEach(function(a) {
    html += '<div class="item-list"><strong>📢 ' + a.date + '</strong><br>' + echapper(a.texte);
    if (isAdmin()) {
      html += '<div style="margin-top:6px">';
      html += '<button class="btn-mini orange" onclick="modifierAnnonce(\'' + a.id + '\')">✏️</button>';
      html += '<button class="btn-mini ' + (a.archived ? 'blue' : 'gray') + '" onclick="archiverAnnonce(\'' + a.id + '\')">' + (a.archived ? '↩️' : '📦') + '</button>';
      html += '<button class="btn-mini danger" onclick="supprimerAnnonce(\'' + a.id + '\')">🗑️</button>';
      html += '</div>';
    }
    html += '</div>';
  });
  box.innerHTML = html;
}

function publierAnnonce() {
  if (!isAdmin()) return alert('Réservé admin');
  var texte = document.getElementById('annonceText').value.trim();
  if (!texte) return alert('Écrivez une annonce');
  var list = DB.get('annonces', []);
  list.push({ id: uid(), texte: texte, date: new Date().toLocaleDateString('fr-FR'), auteur: currentUser.nom, archived: false });
  DB.set('annonces', list);
  reinitialiserFormAnnonce();
  afficherAnnonces();
  alert('✅ Annonce publiée');
}

function reinitialiserFormAnnonce() {
  var el = document.getElementById('annonceText');
  if (el) el.value = '';
}

function modifierAnnonce(id) {
  if (!isAdmin()) return alert('Réservé admin');
  var list = DB.get('annonces', []);
  var a = list.find(function(x) { return x.id === id; });
  if (!a) return;
  var txt = prompt('Modifier l\'annonce :', a.texte);
  if (txt === null) return;
  a.texte = txt.trim();
  DB.set('annonces', list);
  afficherAnnonces();
  alert('✅ Modifiée');
}

function archiverAnnonce(id) {
  if (!isAdmin()) return alert('Réservé admin');
  var list = DB.get('annonces', []);
  var a = list.find(function(x) { return x.id === id; });
  if (!a) return;
  a.archived = !a.archived;
  DB.set('annonces', list);
  afficherAnnonces();
  alert(a.archived ? '📦 Archivée' : '↩️ Restaurée');
}

function supprimerAnnonce(id) {
  if (!isAdmin()) return alert('Réservé admin');
  if (!confirm('⚠️ Supprimer cette annonce ?')) return;
  DB.set('annonces', DB.get('annonces', []).filter(function(a) { return a.id !== id; }));
  afficherAnnonces();
}

// ========== MODULE I — ENTITÉS ==========
function ajouterEntite() {
  var type = document.getElementById('jTypeEntite').value;
  var nom = document.getElementById('jNomEntite').value.trim().toUpperCase();
  var resp = document.getElementById('jResponsable').value.trim();
  if (!nom || !resp) return alert('Remplissez tous les champs');
  var entites = DB.get('entites', []);
  if (entites.find(function(e) { return e.nom === nom && !e.archived; })) return alert('Cette entité existe déjà');
  entites.push({ id: uid(), type: type, nom: nom, responsable: resp, archived: false });
  DB.set('entites', entites);
  reinitialiserFormEntite();
  refreshAll();
  alert('✅ Entité ajoutée : ' + nom);
}

function reinitialiserFormEntite() {
  var a = document.getElementById('jNomEntite'); if (a) a.value = '';
  var b = document.getElementById('jResponsable'); if (b) b.value = '';
  var c = document.getElementById('jTypeEntite'); if (c) c.selectedIndex = 0;
}

function rafraichirEntites() {
  var entites = DB.get('entites', []).filter(function(e) { return !e.archived; });
  ['jEntiteSelect', 'mEntite'].forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var val = sel.value;
    var opts = '';
    entites.forEach(function(e) { opts += '<option value="' + e.id + '">' + e.type + ' - ' + e.nom + '</option>'; });
    sel.innerHTML = opts;
    if (val) sel.value = val;
  });
}

function getEntiteNom(id) {
  var e = DB.get('entites', []).find(function(x) { return x.id === id; });
  return e ? e.type + ' - ' + e.nom : 'Inconnu';
}

function afficherListeEntites() {
  var filtre = document.getElementById('filtreEntites') ? document.getElementById('filtreEntites').value : 'actif';
  var search = (document.getElementById('searchEntiteListe') ? document.getElementById('searchEntiteListe').value : '').toUpperCase();
  var entites = DB.get('entites', []);
  entites = filtrerListe(entites, filtre);
  if (search) entites = entites.filter(function(e) { return e.nom.indexOf(search) !== -1; });
  var box = document.getElementById('listeEntites');
  if (!box) return;
  if (!entites.length) { box.innerHTML = '<p>Aucune entité.</p>'; return; }
  var html = '';
  entites.forEach(function(e) {
    html += '<div class="item-list" style="padding:12px' + (e.archived ? ';opacity:0.7;background:#f0f0f0' : '') + '">';
    html += '<div style="font-size:14px;color:#0a6e2c;font-weight:600;margin-bottom:4px">🏛️ ' + echapper(e.type) + ' - ' + echapper(e.nom) + (e.archived ? ' <span class="badge badge-archive">📦 Archivée</span>' : '') + '</div>';
    html += '<div style="font-size:12px;color:#666;margin-bottom:8px">👤 ' + echapper(e.responsable) + '</div>';
    html += '<button class="btn-mini orange" onclick="modifierEntite(\'' + e.id + '\')">✏️ Modifier</button> ';
    html += '<button class="btn-mini ' + (e.archived ? 'blue' : 'gray') + '" onclick="archiverEntite(\'' + e.id + '\')">' + (e.archived ? '↩️ Désarchiver' : '📦 Archiver') + '</button> ';
    html += '<button class="btn-mini danger" onclick="supprimerEntite(\'' + e.id + '\')">🗑️ Supprimer</button>';
    html += '</div>';
  });
  box.innerHTML = html;
}

function modifierEntite(id) {
  var list = DB.get('entites', []);
  var e = list.find(function(x) { return x.id === id; });
  if (!e) return;
  var type = prompt('Type :', e.type); if (type === null) return;
  var nom = prompt('Nom :', e.nom); if (nom === null) return;
  var resp = prompt('Responsable :', e.responsable); if (resp === null) return;
  var nouveauNom = nom.trim().toUpperCase();
  if (!nouveauNom) return alert('Nom vide');
  var doublon = list.find(function(x) { return x.id !== id && x.nom === nouveauNom && !x.archived; });
  if (doublon) return alert('⚠️ Nom déjà utilisé');
  e.type = type.trim() || e.type;
  e.nom = nouveauNom;
  e.responsable = resp.trim();
  DB.set('entites', list);
  refreshAll();
  alert('✅ Modifiée');
}

function archiverEntite(id) {
  var list = DB.get('entites', []);
  var e = list.find(function(x) { return x.id === id; });
  if (!e) return;
  if (!e.archived) {
    if (!confirm('📦 Archiver "' + e.nom + '" ?\n\nElle n\'apparaîtra plus dans les listes actives.')) return;
    e.archived = true;
  } else {
    e.archived = false;
  }
  DB.set('entites', list);
  refreshAll();
  alert(e.archived ? '📦 Archivée' : '↩️ Restaurée');
}

function supprimerEntite(id) {
  var e = DB.get('entites', []).find(function(x) { return x.id === id; });
  if (!e) return;
  var parts = DB.get('participations', []).filter(function(p) { return p.entiteId === id; });
  var msg = '⚠️ Supprimer "' + e.nom + '" ?';
  if (parts.length) msg += '\n\n' + parts.length + ' participation(s) liée(s) supprimée(s).';
  if (!confirm(msg)) return;
  DB.set('entites', DB.get('entites', []).filter(function(x) { return x.id !== id; }));
  DB.set('participations', DB.get('participations', []).filter(function(p) { return p.entiteId !== id; }));
  refreshAll();
  alert('✅ Supprimée');
}

// ========== MODULE I — JOURNALIÈRE ==========
function enregistrerParticipation() {
  var entiteId = document.getElementById('jEntiteSelect').value;
  var date = document.getElementById('jDate').value;
  var m = parseInt(document.getElementById('jMembres').value) || 0;
  var s = parseInt(document.getElementById('jSympathisants').value) || 0;
  var n = parseInt(document.getElementById('jNouveaux').value) || 0;
  if (!entiteId) return alert('⚠️ Enregistrez d\'abord une entité');
  if (!date) return alert('Choisissez une date');
  var list = DB.get('participations', []);
  list.push({ id: uid(), entiteId: entiteId, date: date, m: m, s: s, n: n, createdAt: new Date().toISOString(), auteur: currentUser ? currentUser.nom : '', archived: false });
  DB.set('participations', list);
  reinitialiserFormParticipation();
  afficherJournaliere();
  alert('✅ Enregistrée');
}

function reinitialiserFormParticipation() {
  var a = document.getElementById('jDate'); if (a) a.value = '';
  var b = document.getElementById('jMembres'); if (b) b.value = 0;
  var c = document.getElementById('jSympathisants'); if (c) c.value = 0;
  var d = document.getElementById('jNouveaux'); if (d) d.value = 0;
}

function afficherJournaliere() {
  var filtre = document.getElementById('filtreParticipations') ? document.getElementById('filtreParticipations').value : 'actif';
  var allParts = DB.get('participations', []);
  var parts = filtrerListe(allParts, filtre);
  var box = document.getElementById('listeJournaliere');
  if (!box) return;
  if (!parts.length) { box.innerHTML = '<p>Aucune donnée.</p>'; return; }
  var parEntite = {};
  parts.forEach(function(p) { if (!parEntite[p.entiteId]) parEntite[p.entiteId] = []; parEntite[p.entiteId].push(p); });
  var html = '';
  Object.keys(parEntite).forEach(function(eid) {
    var lignes = parEntite[eid].slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    var tm = 0, ts = 0, tn = 0;
    lignes.forEach(function(p) { tm += p.m; ts += p.s; tn += p.n; });
    html += '<div class="entity-block">';
    html += '<h4>📍 ' + echapper(getEntiteNom(eid)) + '</h4>';
    html += '<div class="table-wrapper"><table class="data-table">';
    html += '<thead><tr><th>Date</th><th>M</th><th>S</th><th>NV</th><th>Actions</th></tr></thead><tbody>';
    lignes.forEach(function(p) {
      html += '<tr' + (p.archived ? ' style="opacity:0.6"' : '') + '><td>' + fmtDate(p.date) + '</td><td class="num">' + p.m + '</td><td class="num">' + p.s + '</td><td class="num">' + p.n + '</td>';
      html += '<td><button class="btn-mini orange" onclick="modifierParticipation(\'' + p.id + '\')">✏️</button>';
      html += '<button class="btn-mini ' + (p.archived ? 'blue' : 'gray') + '" onclick="archiverParticipation(\'' + p.id + '\')">' + (p.archived ? '↩️' : '📦') + '</button>';
      html += '<button class="btn-mini danger" onclick="supprimerParticipation(\'' + p.id + '\')">🗑️</button></td></tr>';
    });
    html += '</tbody><tfoot><tr><td>TOTAL</td><td class="num">' + tm + '</td><td class="num">' + ts + '</td><td class="num">' + tn + '</td><td></td></tr></tfoot>';
    html += '</table></div></div>';
  });
  box.innerHTML = html;
}

function modifierParticipation(id) {
  var list = DB.get('participations', []);
  var p = list.find(function(x) { return x.id === id; });
  if (!p) return;
  var date = prompt('Date (AAAA-MM-JJ) :', p.date); if (date === null) return;
  var m = prompt('Membres :', p.m); if (m === null) return;
  var s = prompt('Sympathisants :', p.s); if (s === null) return;
  var n = prompt('Nouveaux venus :', p.n); if (n === null) return;
  p.date = date.trim();
  p.m = parseInt(m) || 0; p.s = parseInt(s) || 0; p.n = parseInt(n) || 0;
  DB.set('participations', list);
  afficherJournaliere();
  alert('✅ Modifiée');
}

function archiverParticipation(id) {
  var list = DB.get('participations', []);
  var p = list.find(function(x) { return x.id === id; });
  if (!p) return;
  p.archived = !p.archived;
  DB.set('participations', list);
  afficherJournaliere();
  alert(p.archived ? '📦 Archivée' : '↩️ Restaurée');
}

function supprimerParticipation(id) {
  if (!confirm('⚠️ Supprimer cette participation ?')) return;
  DB.set('participations', DB.get('participations', []).filter(function(x) { return x.id !== id; }));
  afficherJournaliere();
}

// ========== MODULE I — FICHE MENSUELLE ==========
function enregistrerFicheMensuelle() {
  var numericIds = ['mEncadreurs','mMembresActifs','mSympathisants','mFMembres','mFSympathisants','mFNouveaux','mFoyersLumiere','mAvecGoshintai','mSansGoshintai','mFoyersSymp','mFleurs','mPotagers','mTotalPotagers','mMaisonsOuvertes','mTemoignages','mCandGoshintai','mConfInit','mConfReinit','mConfShoku','mConfKannon','mConfMitamaya','mAssistMembres','mAssistSymp','mConcessions','mTerrains','mCampagnes','mCoursEns','mCoursFleurs'];
  var f = {
    id: uid(),
    entiteId: document.getElementById('mEntite').value,
    mois: document.getElementById('mMois').value,
    annee: document.getElementById('mAnnee').value,
    responsable: document.getElementById('mResponsable').value,
    jourReunion: document.getElementById('mJourReunion').value,
    themes: document.getElementById('mThemes').value,
    graces: document.getElementById('mGraces').value,
    points: document.getElementById('mPoints').value,
    solutions: document.getElementById('mSolutions').value,
    objectifs: document.getElementById('mObjectifs').value,
    actions: document.getElementById('mActions').value,
    archived: false,
    dateCreation: new Date().toISOString()
  };
  numericIds.forEach(function(id) { var el = document.getElementById(id); f[id] = el ? (parseInt(el.value) || 0) : 0; });
  if (!f.entiteId) return alert('⚠️ Enregistrez d\'abord une entité');
  var list = DB.get('fichesMensuelles', []);
  list.push(f);
  DB.set('fichesMensuelles', list);
  alert('✅ Fiche enregistrée');
}

function reinitialiserFormFiche() {
  var ids = ['mResponsable','mThemes','mGraces','mPoints','mSolutions','mObjectifs','mActions'];
  ids.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
  var nums = ['mEncadreurs','mMembresActifs','mSympathisants','mFMembres','mFSympathisants','mFNouveaux','mFoyersLumiere','mAvecGoshintai','mSansGoshintai','mFoyersSymp','mFleurs','mPotagers','mTotalPotagers','mMaisonsOuvertes','mTemoignages','mCandGoshintai','mConfInit','mConfReinit','mConfShoku','mConfKannon','mConfMitamaya','mAssistMembres','mAssistSymp','mConcessions','mTerrains','mCampagnes','mCoursEns','mCoursFleurs'];
  nums.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = 0; });
}

function tableFicheMensuelle(f) {
  var h = '<div class="entity-block"' + (f.archived ? ' style="opacity:0.7;background:#f0f0f0"' : '') + '>';
  h += '<h4>📍 ' + echapper(getEntiteNom(f.entiteId)) + ' — ' + echapper(f.mois) + ' ' + echapper(f.annee);
  if (f.archived) h += ' <span class="badge badge-archive">📦 Archivée</span>';
  h += '</h4>';
  h += '<div style="margin-bottom:8px;display:flex;gap:4px;flex-wrap:wrap">';
  h += '<button class="btn-mini orange" onclick="modifierFiche(\'' + f.id + '\')">✏️ Modifier</button>';
  h += '<button class="btn-mini ' + (f.archived ? 'blue' : 'gray') + '" onclick="archiverFiche(\'' + f.id + '\')">' + (f.archived ? '↩️ Désarchiver' : '📦 Archiver') + '</button>';
  h += '<button class="btn-mini danger" onclick="supprimerFiche(\'' + f.id + '\')">🗑️ Supprimer</button>';
  h += '</div>';
  h += '<div class="table-wrapper"><table class="data-table"><tbody>';
  h += '<tr><td>Responsable</td><td>' + echapper(f.responsable) + '</td></tr>';
  h += '<tr><td>Encadreurs</td><td class="num">' + (f.mEncadreurs || 0) + '</td></tr>';
  h += '<tr><td>Membres actifs</td><td class="num">' + (f.mMembresActifs || 0) + '</td></tr>';
  h += '<tr><td>Sympathisants</td><td class="num">' + (f.mSympathisants || 0) + '</td></tr>';
  h += '<tr><td>Membres (culte)</td><td class="num">' + (f.mFMembres || 0) + '</td></tr>';
  h += '<tr><td>Symp. (culte)</td><td class="num">' + (f.mFSympathisants || 0) + '</td></tr>';
  h += '<tr><td>Nouv. venus</td><td class="num">' + (f.mFNouveaux || 0) + '</td></tr>';
  h += '<tr><td>Thèmes</td><td>' + echapper(f.themes) + '</td></tr>';
  h += '<tr><td>Grâces</td><td>' + echapper(f.graces) + '</td></tr>';
  h += '<tr><td>Points à améliorer</td><td>' + echapper(f.points) + '</td></tr>';
  h += '<tr><td>Solutions</td><td>' + echapper(f.solutions) + '</td></tr>';
  h += '<tr><td>Objectifs</td><td>' + echapper(f.objectifs) + '</td></tr>';
  h += '<tr><td>Actions</td><td>' + echapper(f.actions) + '</td></tr>';
  h += '</tbody></table></div></div>';
  return h;
}

function modifierFiche(id) {
  var list = DB.get('fichesMensuelles', []);
  var f = list.find(function(x) { return x.id === id; });
  if (!f) return;
  var resp = prompt('Responsable :', f.responsable); if (resp === null) return;
  f.responsable = resp.trim();
  var themes = prompt('Thèmes :', f.themes); if (themes === null) return;
  f.themes = themes;
  var graces = prompt('Grâces :', f.graces); if (graces === null) return;
  f.graces = graces;
  var points = prompt('Points :', f.points); if (points === null) return;
  f.points = points;
  var sol = prompt('Solutions :', f.solutions); if (sol === null) return;
  f.solutions = sol;
  var obj = prompt('Objectifs :', f.objectifs); if (obj === null) return;
  f.objectifs = obj;
  var act = prompt('Actions :', f.actions); if (act === null) return;
  f.actions = act;
  DB.set('fichesMensuelles', list);
  alert('✅ Modifiée');
  rechercherFreqAvance();
}

function archiverFiche(id) {
  var list = DB.get('fichesMensuelles', []);
  var f = list.find(function(x) { return x.id === id; });
  if (!f) return;
  f.archived = !f.archived;
  DB.set('fichesMensuelles', list);
  alert(f.archived ? '📦 Archivée' : '↩️ Restaurée');
  rechercherFreqAvance();
}

function supprimerFiche(id) {
  if (!confirm('⚠️ Supprimer cette fiche ?')) return;
  DB.set('fichesMensuelles', DB.get('fichesMensuelles', []).filter(function(x) { return x.id !== id; }));
  alert('✅ Supprimée');
  rapportFreqDetaille();
}

function rechercherFreqAvance() {
  var q = (document.getElementById('searchFreq').value || '').toUpperCase().trim();
  var annee = (document.getElementById('searchFreqAnnee').value || '').trim();
  var mois = document.getElementById('searchFreqMois').value;
  var statut = document.getElementById('searchFreqStatut').value;
  var fiches = DB.get('fichesMensuelles', []);
  fiches = filtrerListe(fiches, statut);
  fiches = fiches.filter(function(f) {
    var nom = getEntiteNom(f.entiteId).toUpperCase();
    var okQ = !q || nom.indexOf(q) !== -1;
    var okA = !annee || String(f.annee) === annee;
    var okM = !mois || f.mois === mois;
    return okQ && okA && okM;
  });
  var html = '<h3>Résultats (' + fiches.length + ')</h3>';
  if (!fiches.length) html += '<p>Aucun résultat.</p>';
  else fiches.forEach(function(f) { html += tableFicheMensuelle(f); });
  document.getElementById('rapportFreqBox').innerHTML = html;
}

function reinitialiserRechercheFreq() {
  var a = document.getElementById('searchFreq'); if (a) a.value = '';
  var b = document.getElementById('searchFreqAnnee'); if (b) b.value = '';
  var c = document.getElementById('searchFreqMois'); if (c) c.selectedIndex = 0;
  var d = document.getElementById('searchFreqStatut'); if (d) d.selectedIndex = 0;
  document.getElementById('rapportFreqBox').innerHTML = '';
}

// ========== RAPPORTS MODULE I ==========
function rapportFreqGlobal() {
  var fiches = DB.get('fichesMensuelles', []).filter(function(f) { return !f.archived; });
  var parts = DB.get('participations', []).filter(function(p) { return !p.archived; });
  var tm = 0, ts = 0, tn = 0;
  parts.forEach(function(p) { tm += p.m; ts += p.s; tn += p.n; });
  var html = '<div class="rapport-header"><h3>📊 RAPPORT GLOBAL — FRÉQUENCES</h3></div>';
  html += '<div class="table-wrapper"><table class="data-table"><tbody>';
  html += '<tr><td>Fiches mensuelles</td><td class="num">' + fiches.length + '</td></tr>';
  html += '<tr><td>Participations</td><td class="num">' + parts.length + '</td></tr>';
  html += '<tr><td>Total Membres</td><td class="num">' + tm + '</td></tr>';
  html += '<tr><td>Total Sympathisants</td><td class="num">' + ts + '</td></tr>';
  html += '<tr><td>Total Nouveaux</td><td class="num">' + tn + '</td></tr>';
  html += '</tbody></table></div>';
  document.getElementById('rapportFreqBox').innerHTML = html;
}

function rapportFreqDetaille() {
  var fiches = DB.get('fichesMensuelles', []).filter(function(f) { return !f.archived; });
  if (!fiches.length) { document.getElementById('rapportFreqBox').innerHTML = '<p>Aucune fiche active.</p>'; return; }
  var html = '<div class="rapport-header"><h3>📋 RAPPORT DÉTAILLÉ — FRÉQUENCES</h3></div>';
  fiches.forEach(function(f) { html += tableFicheMensuelle(f); });
  document.getElementById('rapportFreqBox').innerHTML = html;
}

// ========== MODULE II — PHOTO ==========
function previewPhotoCandidat(ev) {
  var file = ev.target.files[0];
  if (!file) { photoCandidatTemp = null; var p = document.getElementById('cPhotoPreview'); if (p) p.innerHTML = ''; return; }
  if (file.size > 5 * 1024 * 1024) return alert('⚠️ Image trop lourde (max 5 Mo)');
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = 300; canvas.height = 300;
      var ctx = canvas.getContext('2d');
      var min = Math.min(img.width, img.height);
      var sx = (img.width - min) / 2, sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, 300, 300);
      photoCandidatTemp = canvas.toDataURL('image/jpeg', 0.8);
      document.getElementById('cPhotoPreview').innerHTML = '<img src="' + photoCandidatTemp + '" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid #0a6e2c;box-shadow:0 2px 8px rgba(0,0,0,0.2)">';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ========== MODULE II — SIGNATURE ==========
function initSignature() {
  var canvas = document.getElementById('vSignatureCanvas');
  if (!canvas) return;
  var ratio = window.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) { setTimeout(initSignature, 200); return; }
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  signatureCanvas = canvas;
  signatureCtx = canvas.getContext('2d');
  signatureCtx.setTransform(1, 0, 0, 1, 0, 0);
  signatureCtx.scale(ratio, ratio);
  signatureCtx.lineWidth = 3;
  signatureCtx.lineCap = 'round';
  signatureCtx.lineJoin = 'round';
  signatureCtx.strokeStyle = '#111';
  if (canvas.dataset.listeners === '1') return;
  canvas.dataset.listeners = '1';
  var drawing = false, lastX = 0, lastY = 0;
  function getPos(e) {
    var r = canvas.getBoundingClientRect();
    var p = (e.touches && e.touches.length) ? e.touches[0] : (e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : e);
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  function start(e) {
    e.preventDefault(); drawing = true;
    var p = getPos(e); lastX = p.x; lastY = p.y;
    signatureCtx.beginPath(); signatureCtx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); signatureCtx.fill();
    signatureVide = false;
    var st = document.getElementById('vSignatureStatus');
    if (st) { st.textContent = '✅ Signature enregistrée'; st.style.color = '#0a6e2c'; }
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    var p = getPos(e);
    signatureCtx.beginPath(); signatureCtx.moveTo(lastX, lastY); signatureCtx.lineTo(p.x, p.y); signatureCtx.stroke();
    lastX = p.x; lastY = p.y;
    signatureVide = false;
  }
  function stop() { drawing = false; }
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', stop);
  canvas.addEventListener('mouseleave', stop);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', stop);
  canvas.addEventListener('touchcancel', stop);
}

function effacerSignature() {
  if (!signatureCtx || !signatureCanvas) return;
  signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  signatureVide = true;
  var st = document.getElementById('vSignatureStatus');
  if (st) { st.textContent = 'Aucune signature'; st.style.color = '#888'; }
}

// ========== MODULE II — CANDIDATS ==========
function ajouterCandidat() {
  var nom = document.getElementById('cNom').value.trim();
  var typeEntite = document.getElementById('cTypeEntite').value;
  var nomEntite = document.getElementById('cNomEntite').value.trim().toUpperCase();
  var responsable = document.getElementById('cResponsable').value.trim();
  var motif = document.getElementById('cMotif').value;
  var montant = parseFloat(document.getElementById('cMontant').value) || 0;
  var taux = parseFloat(document.getElementById('cTaux').value) || 2300;
  if (!nom) return alert('Entrez le nom');
  if (!nomEntite) return alert('Entrez l\'entité');
  var list = DB.get('candidats', []);
  var existe = list.find(function(c) { return c.nom.toLowerCase() === nom.toLowerCase() && c.motif === motif && c.statut === 'en_cours' && !c.archived; });
  if (existe) return alert('⚠️ Candidat déjà en cours pour ce motif');
  list.push({
    id: uid(), nom: nom, typeEntite: typeEntite, nomEntite: nomEntite,
    responsable: responsable, motif: motif, montantPrevu: montant, taux: taux,
    totalVerse: 0, statut: 'en_cours', dateInscription: new Date().toISOString(),
    photo: photoCandidatTemp || null, archived: false
  });
  DB.set('candidats', list);
  reinitialiserFormCandidat();
  refreshAll();
  alert('✅ Candidat ajouté : ' + nom);
}

function reinitialiserFormCandidat() {
  var ids = ['cNom','cNomEntite','cResponsable'];
  ids.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
  var m = document.getElementById('cMontant'); if (m) m.value = 200;
  var t = document.getElementById('cTaux'); if (t) t.value = 2300;
  var p = document.getElementById('cPhotoPreview'); if (p) p.innerHTML = '';
  var c1 = document.getElementById('cPhotoCamera'); if (c1) c1.value = '';
  var c2 = document.getElementById('cPhotoGallery'); if (c2) c2.value = '';
  photoCandidatTemp = null;
}

function afficherCandidats() {
  var search = (document.getElementById('searchCand') ? document.getElementById('searchCand').value : '').toLowerCase();
  var filtre = document.getElementById('filtreCandidats') ? document.getElementById('filtreCandidats').value : 'actif';
  var allCands = DB.get('candidats', []);
  var list = allCands.slice();
  // Filtre statut
  if (filtre === 'en_cours') list = list.filter(function(c) { return c.statut === 'en_cours' && !c.archived; });
  else if (filtre === 'termine') list = list.filter(function(c) { return c.statut === 'termine' && !c.archived; });
  else if (filtre === 'archive') list = list.filter(function(c) { return c.archived === true; });
  else if (filtre === 'actif') list = list.filter(function(c) { return !c.archived && c.statut !== 'archive'; });
  // Sinon 'tous' : tout
  if (search) list = list.filter(function(c) { return c.nom.toLowerCase().indexOf(search) !== -1; });
  list.sort(function(a, b) { return a.nom.localeCompare(b.nom); });
  var box = document.getElementById('listeCandidats');
  if (!box) return;
  if (!list.length) { box.innerHTML = '<p>Aucun candidat.</p>'; }
  else {
    var html = '<div class="table-wrapper"><table class="data-table">';
    html += '<thead><tr><th>Photo</th><th>Nom</th><th>Entité</th><th>Motif</th><th>Statut</th><th>Versé</th><th>Actions</th></tr></thead><tbody>';
    list.forEach(function(c) {
      var badge = c.archived ? '<span class="badge badge-archive">📦</span>' : (c.statut === 'termine' ? '<span class="badge badge-ok">✅</span>' : '<span class="badge badge-progress">⏳</span>');
      html += '<tr' + (c.archived ? ' style="opacity:0.6"' : '') + '><td style="text-align:center">';
      if (c.photo) html += '<img src="' + c.photo + '" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid #0a6e2c;cursor:pointer" onclick="voirPhoto(\'' + c.id + '\')">';
      else html += '<div style="width:42px;height:42px;border-radius:50%;background:#e0e0e0;color:#888;display:inline-flex;align-items:center;justify-content:center;font-size:16px">👤</div>';
      html += '</td>';
      html += '<td>' + echapper(c.nom) + '</td>';
      html += '<td>' + echapper(c.typeEntite) + ' - ' + echapper(c.nomEntite) + '</td>';
      html += '<td>' + echapper(c.motif) + '</td>';
      html += '<td>' + badge + '</td>';
      html += '<td class="num">' + c.totalVerse.toFixed(2) + '$</td>';
      html += '<td>';
      html += '<button class="btn-mini" onclick="verserRapide(\'' + c.id + '\')">💵</button>';
      html += '<button class="btn-mini blue" onclick="changerPhoto(\'' + c.id + '\')">📷</button>';
      html += '<button class="btn-mini orange" onclick="modifierCandidat(\'' + c.id + '\')">✏️</button>';
      html += '<button class="btn-mini ' + (c.archived ? 'blue' : 'gray') + '" onclick="archiverCandidat(\'' + c.id + '\')">' + (c.archived ? '↩️' : '📦') + '</button>';
      html += '<button class="btn-mini danger" onclick="supprimerCandidat(\'' + c.id + '\')">🗑️</button>';
      html += '</td></tr>';
    });
    html += '</tbody></table></div>';
    box.innerHTML = html;
  }
}

function voirPhoto(cid) {
  var c = DB.get('candidats', []).find(function(x) { return x.id === cid; });
  if (!c || !c.photo) return;
  var w = window.open('', '_blank');
  w.document.write('<html><head><meta charset="UTF-8"><title>Photo</title><style>body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column}img{max-width:90vw;max-height:80vh;border:4px solid white;border-radius:8px}p{color:white;font-family:Arial;margin-top:20px;font-size:18px}</style></head><body>');
  w.document.write('<img src="' + c.photo + '"><p>' + echapper(c.nom) + '</p>');
  w.document.write('</body></html>');
}

function changerPhoto(cid) {
  var choix = confirm('📸 OK = Prendre une photo (caméra)\n❌ Annuler = Choisir dans la galerie');
  var input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  if (choix) input.capture = 'user';
  input.onchange = function(ev) {
    var file = ev.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert('⚠️ Image trop lourde (max 5 Mo)');
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = 300; canvas.height = 300;
        var ctx = canvas.getContext('2d');
        var min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width-min)/2, (img.height-min)/2, min, min, 0, 0, 300, 300);
        var data = canvas.toDataURL('image/jpeg', 0.8);
        var list = DB.get('candidats', []);
        var c = list.find(function(x) { return x.id === cid; });
        if (c) { c.photo = data; DB.set('candidats', list); refreshAll(); alert('✅ Photo mise à jour'); }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function modifierCandidat(cid) {
  var list = DB.get('candidats', []);
  var c = list.find(function(x) { return x.id === cid; });
  if (!c) return;
  var nom = prompt('Nom :', c.nom); if (nom === null) return;
  var type = prompt('Type :', c.typeEntite); if (type === null) return;
  var entite = prompt('Entité :', c.nomEntite); if (entite === null) return;
  var resp = prompt('Responsable :', c.responsable); if (resp === null) return;
  var montant = prompt('Montant prévu :', c.montantPrevu); if (montant === null) return;
  c.nom = nom.trim();
  c.typeEntite = type.trim();
  c.nomEntite = entite.trim().toUpperCase();
  c.responsable = resp.trim();
  c.montantPrevu = parseFloat(montant) || c.montantPrevu;
  if (c.totalVerse >= c.montantPrevu - 0.01) c.statut = 'termine';
  else c.statut = 'en_cours';
  DB.set('candidats', list);
  refreshAll();
  alert('✅ Modifié');
}

function archiverCandidat(cid) {
  var list = DB.get('candidats', []);
  var c = list.find(function(x) { return x.id === cid; });
  if (!c) return;
  if (!c.archived) {
    if (!confirm('📦 Archiver "' + c.nom + '" ?')) return;
    c.archived = true;
  } else {
    c.archived = false;
  }
  DB.set('candidats', list);
  refreshAll();
  alert(c.archived ? '📦 Archivé' : '↩️ Restauré');
}

function supprimerCandidat(cid) {
  if (!confirm('⚠️ Supprimer ce candidat et TOUS ses versements ?')) return;
  DB.set('candidats', DB.get('candidats', []).filter(function(c) { return c.id !== cid; }));
  DB.set('versements', DB.get('versements', []).filter(function(v) { return v.candId !== cid; }));
  refreshAll();
  alert('✅ Supprimé');
}

function reinitialiserRechercheCand() {
  var el = document.getElementById('searchCand'); if (el) el.value = '';
  var f = document.getElementById('filtreCandidats'); if (f) f.selectedIndex = 0;
  afficherCandidats();
}

function reinitialiserRechercheEntite() {
  var a = document.getElementById('searchEntiteFinance'); if (a) a.value = '';
  var b = document.getElementById('searchEntiteType'); if (b) b.selectedIndex = 0;
  var box = document.getElementById('resultatRechercheEntite');
  if (box) box.innerHTML = '';
}

function rafraichirCandidatsSelect() {
  var sel = document.getElementById('vCandidat');
  if (!sel) return;
  var list = DB.get('candidats', []).filter(function(c) { return c.statut === 'en_cours' && !c.archived; });
  list.sort(function(a, b) { return a.nom.localeCompare(b.nom); });
  var val = sel.value;
  var opts = '';
  list.forEach(function(c) { opts += '<option value="' + c.id + '">' + c.nom + ' - ' + c.motif + ' (' + c.nomEntite + ')</option>'; });
  if (!opts) opts = '<option value="">-- Aucun candidat en cours --</option>';
  sel.innerHTML = opts;
  if (val) sel.value = val;
}

function verserRapide(cid) {
  rafraichirCandidatsSelect();
  document.getElementById('vCandidat').value = cid;
  document.getElementById('vDate').value = new Date().toISOString().slice(0, 10);
  switchMainTab('finance', document.querySelectorAll('.main-tab')[2]);
  setTimeout(function() {
    initSignature();
    var v = document.getElementById('vMontant');
    if (v) v.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 500);
}

function enregistrerVersement() {
  var candId = document.getElementById('vCandidat').value;
  var monnaie = document.getElementById('vMonnaie').value;
  var montant = parseFloat(document.getElementById('vMontant').value) || 0;
  var taux = parseFloat(document.getElementById('vTaux').value) || 2300;
  var date = document.getElementById('vDate').value || new Date().toISOString().slice(0, 10);
  if (!candId) return alert('⚠️ Choisissez un candidat');
  if (montant <= 0) return alert('Entrez un montant valide');
  if (signatureVide || !signatureCanvas) return alert('✍️ Le candidat doit signer');
  var montantUSD = monnaie === 'FC' ? (montant / taux) : montant;
  var signatureData = signatureCanvas.toDataURL('image/png');
  var vers = DB.get('versements', []);
  vers.push({ id: uid(), candId: candId, monnaie: monnaie, montantOrigine: montant, montantUSD: montantUSD, taux: taux, date: date, dateCreation: new Date().toISOString(), signature: signatureData, archived: false });
  DB.set('versements', vers);
  var cands = DB.get('candidats', []);
  var c = cands.find(function(x) { return x.id === candId; });
  if (c) {
    c.totalVerse = (c.totalVerse || 0) + montantUSD;
    if (c.totalVerse >= c.montantPrevu - 0.01) c.statut = 'termine';
  }
  DB.set('candidats', cands);
  reinitialiserFormVersement();
  refreshAll();
  alert('✅ Versement enregistré : ' + montantUSD.toFixed(2) + '$');
}

function reinitialiserFormVersement() {
  var m = document.getElementById('vMontant'); if (m) m.value = 0;
  var d = document.getElementById('vDate'); if (d) d.value = new Date().toISOString().slice(0, 10);
  effacerSignature();
}

function afficherVersements() {
  var filtre = document.getElementById('filtreVersements') ? document.getElementById('filtreVersements').value : 'actif';
  var allVers = DB.get('versements', []);
  var vers = filtrerListe(allVers, filtre);
  var box = document.getElementById('historiqueVersements');
  if (!box) return;
  if (!vers.length) { box.innerHTML = '<p>Aucun versement.</p>'; return; }
  var parCandidat = {};
  vers.forEach(function(v) { if (!parCandidat[v.candId]) parCandidat[v.candId] = []; parCandidat[v.candId].push(v); });
  var html = '';
  var ids = Object.keys(parCandidat).sort(function(a, b) {
    var ca = DB.get('candidats', []).find(function(x) { return x.id === a; });
    var cb = DB.get('candidats', []).find(function(x) { return x.id === b; });
    return (ca ? ca.nom : '').localeCompare(cb ? cb.nom : '');
  });
  ids.forEach(function(cid) {
    var c = DB.get('candidats', []).find(function(x) { return x.id === cid; });
    if (!c) return;
    var lignes = parCandidat[cid].slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    var totalFC = 0, totalUSD = 0;
    lignes.forEach(function(v) { totalUSD += v.montantUSD; if (v.monnaie === 'FC') totalFC += v.montantOrigine; });
    html += '<div class="entity-block">';
    html += '<h4 style="display:flex;align-items:center;gap:8px">';
    if (c.photo) html += '<img src="' + c.photo + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid #0a6e2c">';
    html += '👤 ' + echapper(c.nom) + '</h4>';
    html += '<div style="font-size:12px;color:#666;margin-bottom:8px">' + echapper(c.typeEntite) + ' - <strong>' + echapper(c.nomEntite) + '</strong> | ' + echapper(c.motif) + '</div>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>FC</th><th>USD</th><th>Signé</th><th>Actions</th></tr></thead><tbody>';
    lignes.forEach(function(v) {
      html += '<tr' + (v.archived ? ' style="opacity:0.6"' : '') + '>';
      html += '<td>' + fmtDate(v.date) + '</td>';
      html += '<td class="num">' + (v.monnaie === 'FC' ? v.montantOrigine.toLocaleString() : '-') + '</td>';
      html += '<td class="num">' + v.montantUSD.toFixed(2) + '$</td>';
      html += '<td style="text-align:center">' + (v.signature ? '<img src="' + v.signature + '" style="height:26px;cursor:pointer;border:1px solid #ddd;background:white" onclick="voirSignature(\'' + v.id + '\')">' : '—') + '</td>';
      html += '<td>';
      html += '<button class="btn-mini orange" onclick="modifierVersement(\'' + v.id + '\')">✏️</button>';
      html += '<button class="btn-mini ' + (v.archived ? 'blue' : 'gray') + '" onclick="archiverVersement(\'' + v.id + '\')">' + (v.archived ? '↩️' : '📦') + '</button>';
      html += '<button class="btn-mini danger" onclick="supprimerVersement(\'' + v.id + '\')">🗑️</button>';
      html += '<button class="btn-mini blue" onclick="imprimerRecu(\'' + v.id + '\')">🖨️</button>';
      html += '</td></tr>';
    });
    html += '</tbody><tfoot>';
    html += '<tr><td>TOTAL</td><td class="num">' + totalFC.toLocaleString() + ' FC</td><td class="num">' + totalUSD.toFixed(2) + '$</td><td></td><td></td></tr>';
    html += '</tfoot></table></div></div>';
  });
  box.innerHTML = html;
}

function voirSignature(vid) {
  var v = DB.get('versements', []).find(function(x) { return x.id === vid; });
  if (!v || !v.signature) return;
  var c = DB.get('candidats', []).find(function(x) { return x.id === v.candId; });
  var w = window.open('', '_blank');
  w.document.write('<html><head><meta charset="UTF-8"><title>Signature</title><style>body{margin:0;background:#f5f5f5;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;font-family:Arial}img{max-width:90vw;background:white;border:2px solid #0a6e2c;border-radius:8px;padding:20px}p{color:#333;margin-top:20px;font-size:16px;text-align:center}</style></head><body>');
  w.document.write('<img src="' + v.signature + '"><p><strong>' + (c ? echapper(c.nom) : '') + '</strong><br>' + fmtDate(v.date) + ' — ' + v.montantUSD.toFixed(2) + ' $</p>');
  w.document.write('</body></html>');
}

function modifierVersement(vid) {
  var list = DB.get('versements', []);
  var v = list.find(function(x) { return x.id === vid; });
  if (!v) return;
  var montant = prompt('Montant :', v.montantOrigine);
  if (montant === null) return;
  var ancienUSD = v.montantUSD;
  v.montantOrigine = parseFloat(montant) || 0;
  v.montantUSD = v.monnaie === 'FC' ? (v.montantOrigine / v.taux) : v.montantOrigine;
  var cands = DB.get('candidats', []);
  var c = cands.find(function(x) { return x.id === v.candId; });
  if (c) {
    c.totalVerse = c.totalVerse - ancienUSD + v.montantUSD;
    if (c.totalVerse >= c.montantPrevu - 0.01 && c.statut === 'en_cours') c.statut = 'termine';
    if (c.totalVerse < c.montantPrevu - 0.01 && c.statut === 'termine') c.statut = 'en_cours';
  }
  DB.set('candidats', cands);
  DB.set('versements', list);
  refreshAll();
  alert('✅ Modifié');
}

function archiverVersement(vid) {
  var list = DB.get('versements', []);
  var v = list.find(function(x) { return x.id === vid; });
  if (!v) return;
  v.archived = !v.archived;
  DB.set('versements', list);
  afficherVersements();
  alert(v.archived ? '📦 Archivé' : '↩️ Restauré');
}

function supprimerVersement(vid) {
  if (!confirm('⚠️ Supprimer ce versement ?')) return;
  var list = DB.get('versements', []);
  var v = list.find(function(x) { return x.id === vid; });
  if (!v) return;
  var cands = DB.get('candidats', []);
  var c = cands.find(function(x) { return x.id === v.candId; });
  if (c) c.totalVerse = c.totalVerse - v.montantUSD;
  DB.set('candidats', cands);
  DB.set('versements', list.filter(function(x) { return x.id !== vid; }));
  refreshAll();
  alert('✅ Supprimé');
}

// ========== REÇU ==========
function imprimerRecu(vid) {
  var v = DB.get('versements', []).find(function(x) { return x.id === vid; });
  if (!v) return;
  var c = DB.get('candidats', []).find(function(x) { return x.id === v.candId; });
  if (!c) return;
  var w = window.open('', '_blank');
  w.document.write('<html><head><meta charset="UTF-8"><title>Reçu</title><style>');
  w.document.write('body{font-family:Arial;padding:30px;max-width:600px;margin:auto}');
  w.document.write('.header{text-align:center;border-bottom:3px double #0a6e2c;padding-bottom:15px;margin-bottom:20px}');
  w.document.write('h1{color:#0a6e2c;font-size:18px}');
  w.document.write('.logo{width:80px;height:80px;background:#0a6e2c;color:white;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;margin-bottom:10px}');
  w.document.write('.photo-box{text-align:center;margin:15px 0}');
  w.document.write('.photo-box img{width:110px;height:110px;border-radius:50%;object-fit:cover;border:3px solid #0a6e2c}');
  w.document.write('table{width:100%;border-collapse:collapse;margin:20px 0}');
  w.document.write('td{padding:8px;border-bottom:1px solid #ddd}');
  w.document.write('td.label{font-weight:bold;color:#0a6e2c}');
  w.document.write('.montant{font-size:22px;color:#0a6e2c;font-weight:bold;text-align:center;padding:20px;background:#e8f5e9;border-radius:8px}');
  w.document.write('.signature{margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end}');
  w.document.write('.sig-line{border-top:1px solid #333;width:45%;padding-top:5px;font-size:12px;text-align:center}');
  w.document.write('.sig-img{width:45%;text-align:center;padding-bottom:5px}');
  w.document.write('.sig-img img{max-height:70px;max-width:100%;border-bottom:1px solid #333}');
  w.document.write('</style></head><body>');
  w.document.write('<div class="header"><div class="logo">EMM</div><h1>ÉGLISE MESSIANIQUE MONDIALE</h1><p style="color:#666">EMM MONDIAL - Finance</p><h2 style="color:#0a6e2c">REÇU DE VERSEMENT</h2></div>');
  if (c.photo) w.document.write('<div class="photo-box"><img src="' + c.photo + '"><p style="font-size:14px;font-weight:bold;margin-top:6px">' + echapper(c.nom) + '</p></div>');
  w.document.write('<table><tr><td class="label">Nom</td><td>' + echapper(c.nom) + '</td></tr>');
  w.document.write('<tr><td class="label">Entité</td><td>' + echapper(c.typeEntite) + ' - ' + echapper(c.nomEntite) + '</td></tr>');
  w.document.write('<tr><td class="label">Motif</td><td>' + echapper(c.motif) + '</td></tr>');
  w.document.write('<tr><td class="label">Date</td><td>' + fmtDate(v.date) + '</td></tr>');
  w.document.write('<tr><td class="label">Taux</td><td>1$ = ' + v.taux + ' FC</td></tr></table>');
  w.document.write('<div class="montant">' + v.montantOrigine + ' ' + v.monnaie + '<br><small>= ' + v.montantUSD.toFixed(2) + ' USD</small></div>');
  w.document.write('<div class="signature">');
  if (v.signature) w.document.write('<div class="sig-img"><img src="' + v.signature + '"><br><small>Le candidat</small></div>');
  else w.document.write('<div class="sig-line">Le candidat</div>');
  w.document.write('<div class="sig-line">Le responsable</div>');
  w.document.write('</div>');
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 500);
}

// ========== RECHERCHE PAR ENTITÉ ==========
function rechercherParEntite() {
  var q = (document.getElementById('searchEntiteFinance').value || '').trim().toUpperCase();
  var type = document.getElementById('searchEntiteType').value;
  var box = document.getElementById('resultatRechercheEntite');
  if (!box) return;
  if (!q && !type) { box.innerHTML = '<p style="color:#888;font-size:13px">Entrez un nom pour voir les candidats.</p>'; return; }
  var cands = DB.get('candidats', []).filter(function(c) { return !c.archived; }).filter(function(c) {
    var okQ = !q || (c.nomEntite && c.nomEntite.toUpperCase().indexOf(q) !== -1);
    var okT = !type || c.typeEntite === type;
    return okQ && okT;
  });
  if (!cands.length) { box.innerHTML = '<p style="color:#888;font-size:13px">Aucun candidat trouvé.</p>'; return; }
  var parEntite = {};
  cands.forEach(function(c) { var key = c.typeEntite + ' - ' + c.nomEntite; if (!parEntite[key]) parEntite[key] = []; parEntite[key].push(c); });
  var html = '';
  Object.keys(parEntite).forEach(function(key) {
    var liste = parEntite[key];
    var totalPrevu = 0, totalVerse = 0;
    liste.forEach(function(c) { totalPrevu += c.montantPrevu; totalVerse += (c.totalVerse || 0); });
    html += '<div class="entity-block">';
    html += '<h4>🏛️ ' + echapper(key) + '</h4>';
    html += '<div style="font-size:12px;color:#666;margin-bottom:8px">' + liste.length + ' candidat(s) | Prévu : <strong>' + totalPrevu.toFixed(2) + '$</strong> | Versé : <strong>' + totalVerse.toFixed(2) + '$</strong> | Solde : <strong style="color:#c62828">' + (totalPrevu - totalVerse).toFixed(2) + '$</strong></div>';
    html += '<div class="table-wrapper"><table class="data-table">';
    html += '<thead><tr><th>Photo</th><th>Nom</th><th>Motif</th><th>Statut</th><th>Prévu</th><th>Versé</th><th>Solde</th><th>Relevé</th></tr></thead><tbody>';
    liste.sort(function(a, b) { return a.nom.localeCompare(b.nom); });
    liste.forEach(function(c) {
      var solde = c.montantPrevu - (c.totalVerse || 0);
      var badge = c.statut === 'termine' ? '<span class="badge badge-ok">✅ Terminé</span>' : '<span class="badge badge-progress">⏳ En cours</span>';
      html += '<tr><td style="text-align:center">';
      if (c.photo) html += '<img src="' + c.photo + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #0a6e2c;cursor:pointer" onclick="voirPhoto(\'' + c.id + '\')">';
      else html += '<div style="width:36px;height:36px;border-radius:50%;background:#e0e0e0;color:#888;display:inline-flex;align-items:center;justify-content:center;font-size:14px">👤</div>';
      html += '</td>';
      html += '<td>' + echapper(c.nom) + '</td><td>' + echapper(c.motif) + '</td><td>' + badge + '</td>';
      html += '<td class="num">' + c.montantPrevu + '$</td><td class="num">' + (c.totalVerse || 0).toFixed(2) + '$</td>';
      html += '<td class="num">' + solde.toFixed(2) + '$</td>';
      html += '<td><button class="btn-mini blue" onclick="afficherReleveVersement(\'' + c.id + '\')">📋</button></td></tr>';
    });
    html += '</tbody></table></div></div>';
  });
  box.innerHTML = html;
}

function afficherReleveVersement(candId) {
  var c = DB.get('candidats', []).find(function(x) { return x.id === candId; });
  if (!c) return alert('Candidat introuvable');
  var vers = DB.get('versements', []).filter(function(v) { return v.candId === candId && !v.archived; });
  vers.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
  var totalUSD = 0, totalFC = 0;
  vers.forEach(function(v) { totalUSD += v.montantUSD; if (v.monnaie === 'FC') totalFC += v.montantOrigine; });
  var w = window.open('', '_blank');
  w.document.write('<html><head><meta charset="UTF-8"><title>Relevé</title><style>');
  w.document.write('body{font-family:Arial;padding:24px;max-width:800px;margin:auto;color:#222}');
  w.document.write('.header{text-align:center;border-bottom:3px double #0a6e2c;padding-bottom:15px;margin-bottom:20px}');
  w.document.write('.logo{width:70px;height:70px;background:#0a6e2c;color:white;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;margin-bottom:10px}');
  w.document.write('h1{color:#0a6e2c;font-size:18px}h2{color:#333;font-size:14px;margin:15px 0 10px;border-left:4px solid #0a6e2c;padding-left:8px}');
  w.document.write('table{width:100%;border-collapse:collapse;margin:15px 0;font-size:13px}');
  w.document.write('th{background:#0a6e2c;color:white;padding:8px;text-align:left}');
  w.document.write('td{padding:8px;border-bottom:1px solid #ddd}td.num{text-align:right}');
  w.document.write('tfoot td{font-weight:bold;background:#e8f5e9;color:#0a6e2c;border-top:2px solid #0a6e2c}');
  w.document.write('.info{background:#f9f9f9;padding:12px;border-radius:8px;margin:15px 0;border-left:4px solid #0a6e2c}.info p{margin:4px 0;font-size:13px}');
  w.document.write('.solde{font-size:15px;color:#0a6e2c;font-weight:bold;text-align:center;padding:15px;background:#e8f5e9;border-radius:8px;margin-top:15px}');
  w.document.write('.signature{margin-top:60px;display:flex;justify-content:space-between}.sig-line{border-top:1px solid #333;width:45%;padding-top:5px;font-size:12px;text-align:center}');
  w.document.write('.photo-top{text-align:center;margin:15px 0}.photo-top img{width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid #0a6e2c}');
  w.document.write('</style></head><body>');
  w.document.write('<div class="header"><div class="logo">EMM</div><h1>ÉGLISE MESSIANIQUE MONDIALE</h1><p style="color:#666;font-size:12px">EMM MONDIAL — Finance</p><h2 style="border:none;text-align:center">RELEVÉ DE VERSEMENT INDIVIDUEL</h2></div>');
  if (c.photo) w.document.write('<div class="photo-top"><img src="' + c.photo + '"></div>');
  w.document.write('<div class="info">');
  w.document.write('<p><strong>Nom :</strong> ' + echapper(c.nom) + '</p>');
  w.document.write('<p><strong>Entité :</strong> ' + echapper(c.typeEntite) + ' - ' + echapper(c.nomEntite) + '</p>');
  w.document.write('<p><strong>Responsable :</strong> ' + echapper(c.responsable || '-') + '</p>');
  w.document.write('<p><strong>Motif :</strong> ' + echapper(c.motif) + '</p>');
  w.document.write('<p><strong>Statut :</strong> ' + (c.statut === 'termine' ? 'Terminé' : 'En cours') + '</p>');
  w.document.write('<p><strong>Date d\'inscription :</strong> ' + fmtDate(c.dateInscription) + '</p></div>');
  w.document.write('<h2>Détail des versements (' + vers.length + ')</h2>');
  if (vers.length) {
    w.document.write('<table><thead><tr><th>#</th><th>Date</th><th>Monnaie</th><th>Montant</th><th>Taux</th><th>USD</th><th>Signature</th></tr></thead><tbody>');
    vers.forEach(function(v, i) {
      w.document.write('<tr><td>' + (i + 1) + '</td><td>' + fmtDate(v.date) + '</td><td>' + v.monnaie + '</td><td class="num">' + v.montantOrigine.toLocaleString() + '</td><td class="num">' + v.taux + '</td><td class="num">' + v.montantUSD.toFixed(2) + ' $</td>');
      w.document.write('<td style="text-align:center">' + (v.signature ? '<img src="' + v.signature + '" style="max-height:40px;border:1px solid #ddd;background:white">' : '—') + '</td></tr>');
    });
    w.document.write('</tbody></table>');
  }
  w.document.write('<div class="solde">Montant prévu : ' + c.montantPrevu + ' $<br>Total versé : ' + totalUSD.toFixed(2) + ' $');
  if (totalFC > 0) w.document.write(' (dont ' + totalFC.toLocaleString() + ' FC)');
  w.document.write('<br>Solde restant : ' + (c.montantPrevu - totalUSD).toFixed(2) + ' $</div>');
  w.document.write('<div class="signature"><div class="sig-line">Le candidat</div><div class="sig-line">Le responsable</div></div>');
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 500);
}

function relevéCompletEntite() {
  var q = (document.getElementById('searchEntiteFinance').value || '').trim().toUpperCase();
  var type = document.getElementById('searchEntiteType').value;
  if (!q && !type) return alert('Entrez d\'abord un nom');
  var cands = DB.get('candidats', []).filter(function(c) { return !c.archived; }).filter(function(c) {
    var okQ = !q || (c.nomEntite && c.nomEntite.toUpperCase().indexOf(q) !== -1);
    var okT = !type || c.typeEntite === type;
    return okQ && okT;
  });
  if (!cands.length) return alert('Aucun candidat');
  var vers = DB.get('versements', []).filter(function(v) { return !v.archived; });
  var parEntite = {};
  cands.forEach(function(c) { var key = c.typeEntite + ' - ' + c.nomEntite; if (!parEntite[key]) parEntite[key] = []; parEntite[key].push(c); });
  var w = window.open('', '_blank');
  w.document.write('<html><head><meta charset="UTF-8"><title>Relevé entité</title><style>');
  w.document.write('body{font-family:Arial;padding:24px;max-width:900px;margin:auto;color:#222}');
  w.document.write('.header{text-align:center;border-bottom:3px double #0a6e2c;padding-bottom:15px;margin-bottom:20px}h1{color:#0a6e2c;font-size:20px;text-align:center}');
  w.document.write('h2{color:#0a6e2c;font-size:14px;margin:20px 0 8px;border-left:4px solid #0a6e2c;padding-left:8px}');
  w.document.write('table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}');
  w.document.write('th{background:#0a6e2c;color:white;padding:6px;text-align:left}');
  w.document.write('td{padding:6px;border-bottom:1px solid #ddd}td.num{text-align:right}');
  w.document.write('tfoot td{font-weight:bold;background:#e8f5e9;color:#0a6e2c;border-top:2px solid #0a6e2c}');
  w.document.write('</style></head><body>');
  w.document.write('<div class="header"><h1>EMM MONDIAL</h1><p style="text-align:center;color:#666;font-size:12px">Relevé global par entité</p></div>');
  Object.keys(parEntite).forEach(function(key) {
    var liste = parEntite[key];
    var totalPrevu = 0, totalVerse = 0;
    liste.forEach(function(c) { totalPrevu += c.montantPrevu; totalVerse += (c.totalVerse || 0); });
    w.document.write('<h2>🏛️ ' + echapper(key) + '</h2>');
    w.document.write('<table><thead><tr><th>Nom</th><th>Motif</th><th>Statut</th><th>Prévu</th><th>Versé</th><th>Solde</th><th>Nb vers.</th></tr></thead><tbody>');
    liste.forEach(function(c) {
      var nb = vers.filter(function(v) { return v.candId === c.id; }).length;
      var solde = c.montantPrevu - (c.totalVerse || 0);
      w.document.write('<tr><td>' + echapper(c.nom) + '</td><td>' + echapper(c.motif) + '</td><td>' + (c.statut === 'termine' ? 'Terminé' : 'En cours') + '</td><td class="num">' + c.montantPrevu + '$</td><td class="num">' + (c.totalVerse || 0).toFixed(2) + '$</td><td class="num">' + solde.toFixed(2) + '$</td><td class="num">' + nb + '</td></tr>');
    });
    w.document.write('</tbody><tfoot><tr><td colspan="3">TOTAL</td><td class="num">' + totalPrevu.toFixed(2) + '$</td><td class="num">' + totalVerse.toFixed(2) + '$</td><td class="num">' + (totalPrevu - totalVerse).toFixed(2) + '$</td><td></td></tr></tfoot></table>');
  });
  w.document.write('<p style="text-align:center;font-size:11px;color:#888;margin-top:30px">Généré le ' + new Date().toLocaleString('fr-FR') + ' par ' + (currentUser ? currentUser.nom : '') + '</p>');
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 600);
}

// ========== RAPPORTS MODULE II ==========
function rapportFinGlobal() {
  var cands = DB.get('candidats', []).filter(function(c) { return !c.archived; });
  var vers = DB.get('versements', []).filter(function(v) { return !v.archived; });
  var totalVerse = 0, totalPrevu = 0;
  cands.forEach(function(c) { totalVerse += (c.totalVerse || 0); totalPrevu += c.montantPrevu; });
  var html = '<div class="rapport-header"><h3>📊 RAPPORT GLOBAL — FINANCE</h3></div>';
  html += '<div class="table-wrapper"><table class="data-table"><tbody>';
  html += '<tr><td>Candidats actifs</td><td class="num">' + cands.length + '</td></tr>';
  html += '<tr><td>Terminés</td><td class="num">' + cands.filter(function(c) { return c.statut === 'termine'; }).length + '</td></tr>';
  html += '<tr><td>Total prévu</td><td class="num">' + totalPrevu.toFixed(2) + '$</td></tr>';
  html += '<tr><td>Total versé</td><td class="num">' + totalVerse.toFixed(2) + '$</td></tr>';
  html += '<tr><td>Solde</td><td class="num">' + (totalPrevu - totalVerse).toFixed(2) + '$</td></tr>';
  html += '<tr><td>Versements</td><td class="num">' + vers.length + '</td></tr>';
  html += '</tbody></table></div>';
  document.getElementById('rapportFinBox').innerHTML = html;
}

function rapportFinDetaille() {
  var cands = DB.get('candidats', []).filter(function(c) { return !c.archived; }).slice().sort(function(a, b) { return a.nom.localeCompare(b.nom); });
  var html = '<div class="rapport-header"><h3>📋 RAPPORT DÉTAILLÉ — FINANCE</h3></div>';
  if (!cands.length) html += '<p>Aucun candidat.</p>';
  else {
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Photo</th><th>Nom</th><th>Entité</th><th>Motif</th><th>Statut</th><th>Prévu</th><th>Versé</th><th>Solde</th></tr></thead><tbody>';
    cands.forEach(function(c) {
      html += '<tr><td style="text-align:center">';
      if (c.photo) html += '<img src="' + c.photo + '" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid #0a6e2c;cursor:pointer" onclick="voirPhoto(\'' + c.id + '\')">';
      else html += '<div style="width:34px;height:34px;border-radius:50%;background:#e0e0e0;color:#888;display:inline-flex;align-items:center;justify-content:center;font-size:14px">👤</div>';
      html += '</td><td>' + echapper(c.nom) + '</td><td>' + echapper(c.typeEntite) + ' - ' + echapper(c.nomEntite) + '</td><td>' + echapper(c.motif) + '</td>';
      html += '<td>' + (c.statut === 'termine' ? '✅' : '⏳') + '</td>';
      html += '<td class="num">' + c.montantPrevu + '$</td><td class="num">' + c.totalVerse.toFixed(2) + '$</td><td class="num">' + (c.montantPrevu - c.totalVerse).toFixed(2) + '$</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  document.getElementById('rapportFinBox').innerHTML = html;
}

// ========== MODULE III — SÉANCE ==========
function demarrerSeance() {
  var annee = document.getElementById('dAnnee').value;
  var mois = document.getElementById('dMois').value;
  var phase = document.getElementById('dPhase').value;
  var date = document.getElementById('dDate').value;
  if (!annee || !mois || !date) return alert('⚠️ Remplissez tous les champs');
  seanceActive = { id: uid(), annee: annee, mois: mois, phase: phase, date: date, entites: [], depensesGenerales: [], archived: false, dateCreation: new Date().toISOString() };
  document.getElementById('seanceStatus').innerHTML = '<p style="color:#0a6e2c;font-weight:600">✅ Séance ' + mois + ' ' + annee + ' — Phase ' + phase + ' démarrée</p>';
  document.getElementById('cardEntiteActive').style.display = 'block';
  document.getElementById('cardEntitesSeance').style.display = 'block';
  document.getElementById('cardDepensesSeance').style.display = 'none';
  afficherEntitesSeance();
  alert('✅ Séance démarrée');
}

function reinitialiserSeance() {
  if (seanceActive) {
    if (!confirm('⚠️ Réinitialiser la séance en cours ?')) return;
  }
  seanceActive = null;
  document.getElementById('seanceStatus').innerHTML = '';
  document.getElementById('cardEntiteActive').style.display = 'none';
  document.getElementById('cardEntitesSeance').style.display = 'none';
  document.getElementById('cardDepensesSeance').style.display = 'none';
  reinitialiserFormEntiteSeance();
  reinitialiserFormDepenseSeance();
  tempOffrandes = { init: [], sorei: [], kannon: [], photo: [], shinrei: [], gosh: [], mita: [] };
  afficherOffrandes();
  document.getElementById('depResultatSeance').innerHTML = '';
  alert('✅ Séance réinitialisée');
}

function ajouterOffrandeUnifiee() {
  var cat = document.getElementById('dOffrandeCategorie').value;
  var nom = document.getElementById('dOffrandeNom').value.trim();
  var fc = parseFloat(document.getElementById('dOffrandeFC').value) || 0;
  var usd = parseFloat(document.getElementById('dOffrandeUSD').value) || 0;
  if (!nom) return alert('Entrez le nom de la personne');
  if (fc === 0 && usd === 0) return alert('Entrez au moins un montant');
  tempOffrandes[cat].push({ nom: nom, fc: fc, usd: usd });
  document.getElementById('dOffrandeNom').value = '';
  document.getElementById('dOffrandeFC').value = 0;
  document.getElementById('dOffrandeUSD').value = 0;
  afficherOffrandes();
}

function afficherOffrandes() {
  var box = document.getElementById('affichageOffrandes');
  if (!box) return;
  var html = '';
  var totalGeneralFC = 0, totalGeneralUSD = 0;
  Object.keys(CATEGORIES_OFFRANDES).forEach(function(cat) {
    var arr = tempOffrandes[cat] || [];
    if (!arr.length) return;
    var totFC = arr.reduce(function(a, o) { return a + o.fc; }, 0);
    var totUSD = arr.reduce(function(a, o) { return a + o.usd; }, 0);
    totalGeneralFC += totFC;
    totalGeneralUSD += totUSD;
    html += '<div style="background:#f9f9f9;border-radius:8px;padding:8px;margin-bottom:8px;border-left:3px solid #0a6e2c">';
    html += '<div style="font-weight:600;color:#0a6e2c;font-size:13px;margin-bottom:4px">' + CATEGORIES_OFFRANDES[cat] + '</div>';
    html += '<table class="data-table" style="font-size:12px"><tbody>';
    arr.forEach(function(o, i) {
      html += '<tr><td>' + echapper(o.nom) + '</td><td class="num">' + o.fc.toLocaleString() + ' FC</td><td class="num">' + o.usd.toLocaleString() + ' $</td>';
      html += '<td><button class="btn-mini danger" onclick="retirerOffrande(\'' + cat + '\',' + i + ')">✖</button></td></tr>';
    });
    html += '</tbody><tfoot><tr><td>TOTAL</td><td class="num">' + totFC.toLocaleString() + ' FC</td><td class="num">' + totUSD.toLocaleString() + ' $</td><td></td></tr></tfoot></table>';
    html += '</div>';
  });
  if (totalGeneralFC > 0 || totalGeneralUSD > 0) {
    html += '<div style="background:#e8f5e9;padding:10px;border-radius:8px;border:2px solid #0a6e2c">';
    html += '<div style="font-weight:700;color:#0a6e2c;font-size:13px">TOTAL GÉNÉRAL OFFRANDES SPÉCIALES</div>';
    html += '<div style="font-size:14px;color:#0a6e2c;font-weight:700;margin-top:4px">' + totalGeneralFC.toLocaleString() + ' FC / ' + totalGeneralUSD.toLocaleString() + ' $</div>';
    html += '</div>';
  }
  box.innerHTML = html;
}

function retirerOffrande(cat, idx) {
  tempOffrandes[cat].splice(idx, 1);
  afficherOffrandes();
}

function enregistrerEntiteSeance() {
  if (!seanceActive) return alert('⚠️ Démarrez d\'abord une séance');
  var nom = document.getElementById('dNomEntite').value.trim().toUpperCase();
  if (!nom) return alert('Entrez le nom de l\'entité');
  var entite = {
    typeEntite: document.getElementById('dTypeEntite').value,
    nomEntite: nom,
    responsable: document.getElementById('dResponsable').value.trim(),
    enveloppes: parseInt(document.getElementById('dEnveloppes').value) || 0,
    constrFC: parseFloat(document.getElementById('dConstrFC').value) || 0,
    constrUSD: parseFloat(document.getElementById('dConstrUSD').value) || 0,
    normFC: parseFloat(document.getElementById('dNormFC').value) || 0,
    normUSD: parseFloat(document.getElementById('dNormUSD').value) || 0,
    init: JSON.parse(JSON.stringify(tempOffrandes.init)),
    sorei: JSON.parse(JSON.stringify(tempOffrandes.sorei)),
    kannon: JSON.parse(JSON.stringify(tempOffrandes.kannon)),
    photo: JSON.parse(JSON.stringify(tempOffrandes.photo)),
    shinrei: JSON.parse(JSON.stringify(tempOffrandes.shinrei)),
    gosh: JSON.parse(JSON.stringify(tempOffrandes.gosh)),
    mita: JSON.parse(JSON.stringify(tempOffrandes.mita)),
    transFC: parseFloat(document.getElementById('dTransFC').value) || 0,
    transUSD: parseFloat(document.getElementById('dTransUSD').value) || 0
  };
  seanceActive.entites.push(entite);
  tempOffrandes = { init: [], sorei: [], kannon: [], photo: [], shinrei: [], gosh: [], mita: [] };
  afficherOffrandes();
  reinitialiserFormEntiteSeance();
  afficherEntitesSeance();
  alert('✅ Entité enregistrée : ' + nom);
}

function reinitialiserFormEntiteSeance() {
  var ids = ['dNomEntite','dResponsable','dOffrandeNom'];
  ids.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
  var nums = ['dEnveloppes','dConstrFC','dConstrUSD','dNormFC','dNormUSD','dTransFC','dTransUSD','dOffrandeFC','dOffrandeUSD'];
  nums.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = 0; });
  var sel = document.getElementById('dOffrandeCategorie'); if (sel) sel.selectedIndex = 0;
  afficherOffrandes();
}

function afficherEntitesSeance() {
  var box = document.getElementById('listeEntitesSeance');
  if (!box || !seanceActive) return;
  if (!seanceActive.entites.length) { box.innerHTML = '<p style="color:#888">Aucune entité enregistrée.</p>'; return; }
  var html = '<div class="table-wrapper"><table class="data-table"><thead><tr><th>#</th><th>Entité</th><th>Responsable</th><th>Actions</th></tr></thead><tbody>';
  seanceActive.entites.forEach(function(e, i) {
    html += '<tr><td>' + (i + 1) + '</td><td>' + echapper(e.typeEntite) + ' - ' + echapper(e.nomEntite) + '</td><td>' + echapper(e.responsable) + '</td>';
    html += '<td><button class="btn-mini danger" onclick="retirerEntiteSeance(' + i + ')">🗑️</button></td></tr>';
  });
  html += '</tbody></table></div>';
  box.innerHTML = html;
}

function retirerEntiteSeance(i) {
  if (!confirm('⚠️ Retirer cette entité ?')) return;
  seanceActive.entites.splice(i, 1);
  afficherEntitesSeance();
}

function passerAuxDepenses() {
  if (!seanceActive || !seanceActive.entites.length) return alert('⚠️ Enregistrez au moins une entité');
  document.getElementById('cardDepensesSeance').style.display = 'block';
  document.getElementById('cardDepensesSeance').scrollIntoView({ behavior: 'smooth' });
}

function ajouterDepenseSeance() {
  if (!seanceActive) return alert('⚠️ Démarrez une séance');
  var fc = parseFloat(document.getElementById('dgFC').value) || 0;
  var usd = parseFloat(document.getElementById('dgUSD').value) || 0;
  var motif = document.getElementById('dgMotif').value.trim();
  if (!motif) return alert('Motif obligatoire');
  if (fc === 0 && usd === 0) return alert('Entrez au moins un montant');
  seanceActive.depensesGenerales.push({ fc: fc, usd: usd, motif: motif });
  reinitialiserFormDepenseSeance();
  afficherDepensesSeance();
  alert('✅ Dépense ajoutée');
}

function reinitialiserFormDepenseSeance() {
  var a = document.getElementById('dgFC'); if (a) a.value = 0;
  var b = document.getElementById('dgUSD'); if (b) b.value = 0;
  var c = document.getElementById('dgMotif'); if (c) c.value = '';
}

function afficherDepensesSeance() {
  var box = document.getElementById('listeDepensesSeance');
  if (!box || !seanceActive) return;
  if (!seanceActive.depensesGenerales.length) { box.innerHTML = ''; return; }
  var html = '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Motif</th><th>FC</th><th>USD</th><th></th></tr></thead><tbody>';
  seanceActive.depensesGenerales.forEach(function(d, i) {
    html += '<tr><td>' + echapper(d.motif) + '</td><td class="num">' + d.fc.toLocaleString() + '</td><td class="num">' + d.usd.toLocaleString() + '</td>';
    html += '<td><button class="btn-mini danger" onclick="retirerDepenseSeance(' + i + ')">🗑️</button></td></tr>';
  });
  html += '</tbody></table></div>';
  box.innerHTML = html;
}

function retirerDepenseSeance(i) {
  if (!confirm('⚠️ Retirer cette dépense ?')) return;
  seanceActive.depensesGenerales.splice(i, 1);
  afficherDepensesSeance();
}

function calculerTotauxSeance() {
  if (!seanceActive) return alert('⚠️ Séance non démarrée');
  var totalFC = 0, totalUSD = 0, soldeFC = 0, soldeUSD = 0;
  var html = '<h4>📊 Totaux par entité</h4>';
  html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Entité</th><th>Total FC</th><th>Total USD</th><th>Solde FC</th><th>Solde USD</th></tr></thead><tbody>';
  seanceActive.entites.forEach(function(e) {
    var s = sumEntiteDep(e);
    totalFC += s.totFC; totalUSD += s.totUSD; soldeFC += s.soldeFC; soldeUSD += s.soldeUSD;
    html += '<tr><td>' + echapper(e.typeEntite) + ' - ' + echapper(e.nomEntite) + '</td>';
    html += '<td class="num">' + s.totFC.toLocaleString() + '</td><td class="num">' + s.totUSD.toLocaleString() + '</td>';
    html += '<td class="num">' + s.soldeFC.toLocaleString() + '</td><td class="num">' + s.soldeUSD.toLocaleString() + '</td></tr>';
  });
  html += '</tbody><tfoot><tr><td>TOTAL ENTITÉS</td><td class="num">' + totalFC.toLocaleString() + '</td><td class="num">' + totalUSD.toLocaleString() + '</td><td class="num">' + soldeFC.toLocaleString() + '</td><td class="num">' + soldeUSD.toLocaleString() + '</td></tr></tfoot></table></div>';
  var genFC = seanceActive.depensesGenerales.reduce(function(a, x) { return a + x.fc; }, 0);
  var genUSD = seanceActive.depensesGenerales.reduce(function(a, x) { return a + x.usd; }, 0);
  html += '<h4>💸 Dépenses générales</h4>';
  html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Motif</th><th>FC</th><th>USD</th></tr></thead><tbody>';
  seanceActive.depensesGenerales.forEach(function(x) {
    html += '<tr><td>' + echapper(x.motif) + '</td><td class="num">' + x.fc.toLocaleString() + '</td><td class="num">' + x.usd.toLocaleString() + '</td></tr>';
  });
  html += '</tbody><tfoot>';
  html += '<tr><td>TOTAL DÉPENSES</td><td class="num">- ' + genFC.toLocaleString() + ' FC</td><td class="num">- ' + genUSD.toLocaleString() + ' $</td></tr>';
  html += '<tr style="background:#fff3e0"><td>À TRANSFÉRER</td><td class="num">' + (soldeFC - genFC).toLocaleString() + ' FC</td><td class="num">' + (soldeUSD - genUSD).toLocaleString() + ' $</td></tr>';
  html += '</tfoot></table></div>';
  document.getElementById('depResultatSeance').innerHTML = html;
}

function sumEntiteDep(e) {
  var sum = function(arr) { return (arr || []).reduce(function(a, o) { return { fc: a.fc + o.fc, usd: a.usd + o.usd }; }, { fc: 0, usd: 0 }); };
  var i = sum(e.init), s = sum(e.sorei), k = sum(e.kannon), p = sum(e.photo), sr = sum(e.shinrei), g = sum(e.gosh), m = sum(e.mita);
  var totFC = (e.constrFC || 0) + (e.normFC || 0) + i.fc + s.fc + k.fc + p.fc + sr.fc + g.fc + m.fc;
  var totUSD = (e.constrUSD || 0) + (e.normUSD || 0) + i.usd + s.usd + k.usd + p.usd + sr.usd + g.usd + m.usd;
  return { totFC: totFC, totUSD: totUSD, soldeFC: totFC - (e.transFC || 0), soldeUSD: totUSD - (e.transUSD || 0), i: i, s: s, k: k, p: p, sr: sr, g: g, m: m };
}

function enregistrerDepouillementSeance() {
  if (!seanceActive) return alert('⚠️ Séance non démarrée');
  if (!seanceActive.entites.length) return alert('⚠️ Enregistrez au moins une entité');
  var deps = DB.get('depouillements', []);
  deps.push(JSON.parse(JSON.stringify(seanceActive)));
  DB.set('depouillements', deps);
  seanceActive = null;
  document.getElementById('seanceStatus').innerHTML = '';
  document.getElementById('cardEntiteActive').style.display = 'none';
  document.getElementById('cardEntitesSeance').style.display = 'none';
  document.getElementById('cardDepensesSeance').style.display = 'none';
  document.getElementById('depResultatSeance').innerHTML = '';
  alert('✅ Dépouillement enregistré avec succès');
}

// ========== RECHERCHE DÉPOUILLEMENT ==========
function rechercherDepouillement() {
  var annee = (document.getElementById('searchDepAnnee').value || '').trim();
  var mois = document.getElementById('searchDepMois').value;
  var phase = document.getElementById('searchDepPhase').value;
  var statut = document.getElementById('searchDepStatut').value;
  var entite = (document.getElementById('searchDepEntite').value || '').trim().toUpperCase();
  var deps = DB.get('depouillements', []);
  deps = filtrerListe(deps, statut);
  deps = deps.filter(function(d) {
    var okA = !annee || String(d.annee) === annee;
    var okM = !mois || d.mois === mois;
    var okP = !phase || String(d.phase) === phase;
    var okE = !entite || d.entites.some(function(e) { return e.nomEntite.indexOf(entite) !== -1; });
    return okA && okM && okP && okE;
  });
  var box = document.getElementById('resultatRechercheDep');
  if (!deps.length) { box.innerHTML = '<p style="color:#888">Aucun résultat.</p>'; return; }
  var html = '<h4>Résultats (' + deps.length + ')</h4>';
  deps.forEach(function(d) {
    html += '<div class="entity-block"' + (d.archived ? ' style="opacity:0.7;background:#f0f0f0"' : '') + '>';
    html += '<h4>📅 ' + d.mois + ' ' + d.annee + ' — Phase ' + d.phase + ' (' + fmtDate(d.date) + ')';
    if (d.archived) html += ' <span class="badge badge-archive">📦 Archivé</span>';
    html += '</h4>';
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">';
    html += '<button class="btn-mini orange" onclick="modifierDepouillement(\'' + d.id + '\')">✏️ Modifier</button>';
    html += '<button class="btn-mini ' + (d.archived ? 'blue' : 'gray') + '" onclick="archiverDepouillement(\'' + d.id + '\')">' + (d.archived ? '↩️ Désarchiver' : '📦 Archiver') + '</button>';
    html += '<button class="btn-mini danger" onclick="supprimerDepouillement(\'' + d.id + '\')">🗑️ Supprimer</button>';
    html += '</div>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Entité</th><th>Total FC</th><th>Total USD</th><th>Solde FC</th><th>Solde USD</th></tr></thead><tbody>';
    d.entites.forEach(function(e) {
      var s = sumEntiteDep(e);
      html += '<tr><td>' + echapper(e.typeEntite) + ' - ' + echapper(e.nomEntite) + '</td>';
      html += '<td class="num">' + s.totFC.toLocaleString() + '</td><td class="num">' + s.totUSD.toLocaleString() + '</td>';
      html += '<td class="num">' + s.soldeFC.toLocaleString() + '</td><td class="num">' + s.soldeUSD.toLocaleString() + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
  });
  box.innerHTML = html;
}

function reinitialiserRechercheDep() {
  var a = document.getElementById('searchDepAnnee'); if (a) a.value = '';
  var b = document.getElementById('searchDepMois'); if (b) b.selectedIndex = 0;
  var c = document.getElementById('searchDepPhase'); if (c) c.selectedIndex = 0;
  var d = document.getElementById('searchDepEntite'); if (d) d.value = '';
  var e = document.getElementById('searchDepStatut'); if (e) e.selectedIndex = 0;
  document.getElementById('resultatRechercheDep').innerHTML = '';
}

function rechercherDepGeneral() {
  var annee = (document.getElementById('gSearchAnnee').value || '').trim();
  var mois = document.getElementById('gSearchMois').value;
  var deps = DB.get('depouillements', []).filter(function(d) { return !d.archived; }).filter(function(d) {
    var okA = !annee || String(d.annee) === annee;
    var okM = !mois || d.mois === mois;
    return okA && okM;
  });
  var box = document.getElementById('resultatRechercheGeneral');
  if (!deps.length) { box.innerHTML = '<p style="color:#888">Aucun résultat.</p>'; return; }
  var html = '<h4>Résultats (' + deps.length + ')</h4>';
  deps.forEach(function(d) {
    var totalFC = 0, totalUSD = 0;
    d.entites.forEach(function(e) { var s = sumEntiteDep(e); totalFC += s.totFC; totalUSD += s.totUSD; });
    html += '<div class="entity-block"><h4>📅 ' + d.mois + ' ' + d.annee + ' — Phase ' + d.phase + '</h4>';
    html += '<div style="font-size:12px;color:#666">Date : ' + fmtDate(d.date) + ' | Entités : ' + d.entites.length + '</div>';
    html += '<div style="font-size:13px;margin-top:6px">Total : <strong>' + totalFC.toLocaleString() + ' FC</strong> / <strong>' + totalUSD.toLocaleString() + ' $</strong></div></div>';
  });
  box.innerHTML = html;
}

function reinitialiserRechercheGeneral() {
  var a = document.getElementById('gSearchAnnee'); if (a) a.value = '';
  var b = document.getElementById('gSearchMois'); if (b) b.selectedIndex = 0;
  document.getElementById('resultatRechercheGeneral').innerHTML = '';
}

function modifierDepouillement(id) {
  var list = DB.get('depouillements', []);
  var d = list.find(function(x) { return x.id === id; });
  if (!d) return;
  var mois = prompt('Mois :', d.mois); if (mois === null) return;
  var annee = prompt('Année :', d.annee); if (annee === null) return;
  var phase = prompt('Phase (1-4) :', d.phase); if (phase === null) return;
  var date = prompt('Date (AAAA-MM-JJ) :', d.date); if (date === null) return;
  d.mois = mois.trim();
  d.annee = annee.trim();
  d.phase = phase.trim();
  d.date = date.trim();
  DB.set('depouillements', list);
  rechercherDepouillement();
  alert('✅ Modifié');
}

function archiverDepouillement(id) {
  var list = DB.get('depouillements', []);
  var d = list.find(function(x) { return x.id === id; });
  if (!d) return;
  d.archived = !d.archived;
  DB.set('depouillements', list);
  rechercherDepouillement();
  alert(d.archived ? '📦 Archivé' : '↩️ Restauré');
}

function supprimerDepouillement(id) {
  if (!confirm('⚠️ Supprimer ce dépouillement ?')) return;
  DB.set('depouillements', DB.get('depouillements', []).filter(function(d) { return d.id !== id; }));
  rechercherDepouillement();
  alert('✅ Supprimé');
}

// ========== RAPPORTS MODULE III ==========
function rapportDepGlobal() {
  var deps = DB.get('depouillements', []).filter(function(d) { return !d.archived; });
  var totalFC = 0, totalUSD = 0, soldeFC = 0, soldeUSD = 0, genFC = 0, genUSD = 0;
  deps.forEach(function(d) {
    d.entites.forEach(function(e) { var s = sumEntiteDep(e); totalFC += s.totFC; totalUSD += s.totUSD; soldeFC += s.soldeFC; soldeUSD += s.soldeUSD; });
    d.depensesGenerales.forEach(function(x) { genFC += x.fc; genUSD += x.usd; });
  });
  var html = '<div class="rapport-header"><h3>📊 RAPPORT GLOBAL — DÉPOUILLEMENT</h3></div>';
  html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Rubrique</th><th>FC</th><th>USD</th></tr></thead><tbody>';
  html += '<tr><td>Séances</td><td colspan="2" class="num">' + deps.length + '</td></tr>';
  html += '<tr><td>Total offrandes</td><td class="num">' + totalFC.toLocaleString() + '</td><td class="num">' + totalUSD.toLocaleString() + '</td></tr>';
  html += '<tr><td>Solde entités</td><td class="num">' + soldeFC.toLocaleString() + '</td><td class="num">' + soldeUSD.toLocaleString() + '</td></tr>';
  html += '<tr><td>Dépenses générales</td><td class="num">- ' + genFC.toLocaleString() + '</td><td class="num">- ' + genUSD.toLocaleString() + '</td></tr>';
  html += '</tbody><tfoot><tr><td>À TRANSFÉRER</td><td class="num">' + (soldeFC - genFC).toLocaleString() + ' FC</td><td class="num">' + (soldeUSD - genUSD).toLocaleString() + ' $</td></tr></tfoot></table></div>';
  document.getElementById('rapportDepBox').innerHTML = html;
}
// ========== RELEVÉ FICHE DÉPOUILLEMENT PAR ENTITÉ ==========
function releveFicheEntite(entiteNom, mois, annee) {
  var deps = DB.get('depouillements', []).filter(function(d) { return !d.archived; });
  var resultats = [];
  deps.forEach(function(d) {
    d.entites.forEach(function(e) {
      var matchNom = !entiteNom || e.nomEntite.toUpperCase().indexOf(entiteNom.toUpperCase()) !== -1;
      var matchMois = !mois || d.mois === mois;
      var matchAnnee = !annee || String(d.annee) === annee;
      if (matchNom && matchMois && matchAnnee) {
        resultats.push({ entite: e, seance: d });
      }
    });
  });
  if (!resultats.length) return alert('Aucune fiche trouvée pour cette entité');

  var w = window.open('', '_blank');
  w.document.write('<html><head><meta charset="UTF-8"><title>Relevé fiche</title><style>');
  w.document.write('body{font-family:Arial;padding:20px;max-width:900px;margin:auto;color:#222}');
  w.document.write('.header{text-align:center;border-bottom:3px double #0a6e2c;padding-bottom:15px;margin-bottom:20px}');
  w.document.write('.logo{width:70px;height:70px;background:#0a6e2c;color:white;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;margin-bottom:10px}');
  w.document.write('h1{color:#0a6e2c;font-size:18px}h2{color:#0a6e2c;font-size:14px;margin:20px 0 8px;border-left:4px solid #0a6e2c;padding-left:8px}');
  w.document.write('h3{color:#0a6e2c;font-size:13px;margin:12px 0 6px}');
  w.document.write('table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}');
  w.document.write('th{background:#0a6e2c;color:white;padding:6px;text-align:left}');
  w.document.write('td{padding:6px;border-bottom:1px solid #ddd}td.num{text-align:right}');
  w.document.write('tfoot td{font-weight:bold;background:#e8f5e9;color:#0a6e2c;border-top:2px solid #0a6e2c}');
  w.document.write('.info{background:#f9f9f9;padding:10px;border-radius:8px;margin:10px 0;border-left:4px solid #0a6e2c;font-size:12px}');
  w.document.write('.cat{background:#e8f5e9;padding:6px;border-radius:6px;margin:8px 0;font-weight:600;color:#0a6e2c;font-size:12px}');
  w.document.write('.recap{background:#fff3e0;padding:12px;border-radius:8px;margin-top:10px;border:2px solid #e65100}');
  w.document.write('</style></head><body>');

  w.document.write('<div class="header"><div class="logo">EMM</div>');
  w.document.write('<h1>ÉGLISE MESSIANIQUE MONDIALE</h1>');
  w.document.write('<p style="color:#666;font-size:12px">EMM MONDIAL — Dépouillement</p>');
  w.document.write('<h2 style="border:none;text-align:center">RELEVÉ FICHE PAR ENTITÉ</h2></div>');

  var parEntite = {};
  resultats.forEach(function(r) {
    var key = r.entite.typeEntite + ' - ' + r.entite.nomEntite;
    if (!parEntite[key]) parEntite[key] = [];
    parEntite[key].push(r);
  });

  var totalGeneralFC = 0, totalGeneralUSD = 0;

  Object.keys(parEntite).forEach(function(key) {
    var liste = parEntite[key];
    w.document.write('<h2>🏛️ ' + echapper(key) + '</h2>');
    w.document.write('<div class="info"><strong>Responsable :</strong> ' + echapper(liste[0].entite.responsable) + '</div>');

    liste.forEach(function(r) {
      var e = r.entite;
      var d = r.seance;
      var s = sumEntiteDep(e);
      totalGeneralFC += s.soldeFC;
      totalGeneralUSD += s.soldeUSD;

      w.document.write('<h3>📅 Séance : ' + d.mois + ' ' + d.annee + ' — Phase ' + d.phase + ' (' + fmtDate(d.date) + ')</h3>');

      w.document.write('<table><tbody>');
      w.document.write('<tr><td>Construction</td><td class="num">' + e.constrFC.toLocaleString() + ' FC</td><td class="num">' + e.constrUSD.toLocaleString() + ' $</td></tr>');
      w.document.write('<tr><td>Normales</td><td class="num">' + e.normFC.toLocaleString() + ' FC</td><td class="num">' + e.normUSD.toLocaleString() + ' $</td></tr>');
      w.document.write('</tbody></table>');

      var cats = [];
      Object.keys(CATEGORIES_OFFRANDES).forEach(function(cat) {
        if (e[cat] && e[cat].length) cats.push({ cat: cat, arr: e[cat] });
      });
      if (cats.length) {
        w.document.write('<div class="cat">🎁 Offrandes spéciales</div>');
        cats.forEach(function(item) {
          var totFC = item.arr.reduce(function(a, o) { return a + o.fc; }, 0);
          var totUSD = item.arr.reduce(function(a, o) { return a + o.usd; }, 0);
          w.document.write('<table><thead><tr><th colspan="3" style="background:#4caf50">' + CATEGORIES_OFFRANDES[item.cat] + '</th></tr></thead><tbody>');
          item.arr.forEach(function(o) {
            w.document.write('<tr><td>' + echapper(o.nom) + '</td><td class="num">' + o.fc.toLocaleString() + ' FC</td><td class="num">' + o.usd.toLocaleString() + ' $</td></tr>');
          });
          w.document.write('</tbody><tfoot><tr><td>TOTAL ' + CATEGORIES_OFFRANDES[item.cat] + '</td><td class="num">' + totFC.toLocaleString() + ' FC</td><td class="num">' + totUSD.toLocaleString() + ' $</td></tr></tfoot></table>');
        });
      }

      w.document.write('<table><tfoot>');
      w.document.write('<tr><td>TOTAL GÉNÉRAL</td><td class="num">' + s.totFC.toLocaleString() + ' FC</td><td class="num">' + s.totUSD.toLocaleString() + ' $</td></tr>');
      w.document.write('<tr><td>Transport</td><td class="num">- ' + e.transFC.toLocaleString() + ' FC</td><td class="num">- ' + e.transUSD.toLocaleString() + ' $</td></tr>');
      w.document.write('<tr><td>SOLDE</td><td class="num">' + s.soldeFC.toLocaleString() + ' FC</td><td class="num">' + s.soldeUSD.toLocaleString() + ' $</td></tr>');
      w.document.write('</tfoot></table>');
    });
  });

  w.document.write('<div class="recap">');
  w.document.write('<strong>🌍 TOTAL GÉNÉRAL (toutes séances) :</strong><br>');
  w.document.write('<div style="font-size:16px;font-weight:700;color:#0a6e2c;margin-top:6px">' + totalGeneralFC.toLocaleString() + ' FC / ' + totalGeneralUSD.toLocaleString() + ' $</div>');
  w.document.write('</div>');

  w.document.write('<p style="text-align:center;font-size:11px;color:#888;margin-top:30px">Généré le ' + new Date().toLocaleString('fr-FR') + ' par ' + (currentUser ? currentUser.nom : '') + '</p>');
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 600);
}

// Bouton : générer relevé à partir de la recherche en cours
function genererReleveEntiteFiltre() {
  var entite = (document.getElementById('searchDepEntite').value || '').trim();
  var annee = (document.getElementById('searchDepAnnee').value || '').trim();
  var mois = document.getElementById('searchDepMois').value;
  if (!entite && !annee && !mois) return alert('Entrez au moins un critère (entité, année ou mois)');
  releveFicheEntite(entite, mois, annee);
}

function rapportDepDetaille() {
  var deps = DB.get('depouillements', []).filter(function(d) { return !d.archived; });
  if (!deps.length) { document.getElementById('rapportDepBox').innerHTML = '<p>Aucun dépouillement actif.</p>'; return; }
  var html = '<div class="rapport-header"><h3>📋 RAPPORT DÉTAILLÉ — DÉPOUILLEMENT</h3></div>';
  deps.forEach(function(d) {
    html += '<div style="background:#e8f5e9;padding:10px;border-radius:8px;margin:16px 0 10px;border-left:5px solid #0a6e2c">';
    html += '<div style="font-size:14px;font-weight:700;color:#0a6e2c">📅 Séance : ' + d.mois + ' ' + d.annee + ' — Phase ' + d.phase + '</div>';
    html += '<div style="font-size:12px;color:#666">Date : ' + fmtDate(d.date) + ' | Entités : ' + d.entites.length + '</div>';
    html += '</div>';
    d.entites.forEach(function(e) {
      var s = sumEntiteDep(e);
      html += '<div class="entity-block">';
      html += '<h4>🏛️ ' + echapper(e.typeEntite) + ' - ' + echapper(e.nomEntite) + '</h4>';
      html += '<div style="font-size:12px;color:#666;margin-bottom:6px">👤 ' + echapper(e.responsable) + ' | 📅 ' + d.mois + ' ' + d.annee + ' | 🗓️ ' + fmtDate(d.date) + '</div>';
      html += '<div class="table-wrapper"><table class="data-table"><tbody>';
      html += '<tr><td>Construction</td><td class="num">' + e.constrFC.toLocaleString() + ' FC</td><td class="num">' + e.constrUSD.toLocaleString() + ' $</td></tr>';
      html += '<tr><td>Normales</td><td class="num">' + e.normFC.toLocaleString() + ' FC</td><td class="num">' + e.normUSD.toLocaleString() + ' $</td></tr>';
      html += '</tbody></table></div>';
      var categoriesAvecDonnees = [];
      Object.keys(CATEGORIES_OFFRANDES).forEach(function(cat) {
        var arr = e[cat] || [];
        if (arr.length) categoriesAvecDonnees.push({ cat: cat, arr: arr });
      });
      if (categoriesAvecDonnees.length) {
        html += '<h5 style="color:#0a6e2c;font-size:13px;margin:10px 0 6px">Offrandes spéciales détaillées</h5>';
        categoriesAvecDonnees.forEach(function(item) {
          var totFC = item.arr.reduce(function(a, o) { return a + o.fc; }, 0);
          var totUSD = item.arr.reduce(function(a, o) { return a + o.usd; }, 0);
          html += '<div style="background:#f9f9f9;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #0a6e2c">';
          html += '<div style="font-weight:600;color:#0a6e2c;font-size:12px;margin-bottom:4px">' + CATEGORIES_OFFRANDES[item.cat] + '</div>';
          html += '<table class="data-table" style="font-size:11px"><tbody>';
          item.arr.forEach(function(o) {
            html += '<tr><td>' + echapper(o.nom) + '</td><td class="num">' + o.fc.toLocaleString() + ' FC</td><td class="num">' + o.usd.toLocaleString() + ' $</td></tr>';
          });
          html += '</tbody><tfoot><tr><td>TOTAL</td><td class="num">' + totFC.toLocaleString() + ' FC</td><td class="num">' + totUSD.toLocaleString() + ' $</td></tr></tfoot></table>';
          html += '</div>';
        });
      }
      html += '<div class="table-wrapper"><table class="data-table"><tfoot>';
      html += '<tr><td>TOTAL</td><td class="num">' + s.totFC.toLocaleString() + ' FC</td><td class="num">' + s.totUSD.toLocaleString() + ' $</td></tr>';
      html += '<tr><td>Transport</td><td class="num">- ' + e.transFC.toLocaleString() + ' FC</td><td class="num">- ' + e.transUSD.toLocaleString() + ' $</td></tr>';
      html += '<tr style="background:#e8f5e9"><td>SOLDE</td><td class="num">' + s.soldeFC.toLocaleString() + ' FC</td><td class="num">' + s.soldeUSD.toLocaleString() + ' $</td></tr>';
      html += '</tfoot></table></div></div>';
    });
    if (d.depensesGenerales && d.depensesGenerales.length) {
      html += '<div class="entity-block" style="border-left-color:#c62828">';
      html += '<h4 style="color:#c62828">💸 Dépenses générales de la séance</h4>';
      html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Motif</th><th>FC</th><th>USD</th></tr></thead><tbody>';
      var genFC = 0, genUSD = 0;
      d.depensesGenerales.forEach(function(x) {
        genFC += x.fc; genUSD += x.usd;
        html += '<tr><td>' + echapper(x.motif) + '</td><td class="num">' + x.fc.toLocaleString() + '</td><td class="num">' + x.usd.toLocaleString() + '</td></tr>';
      });
      html += '</tbody><tfoot><tr><td>TOTAL DÉPENSES</td><td class="num">' + genFC.toLocaleString() + ' FC</td><td class="num">' + genUSD.toLocaleString() + ' $</td></tr></tfoot>';
      html += '</table></div></div>';
    }
    var totalSoldeFC = 0, totalSoldeUSD = 0;
    d.entites.forEach(function(e) { var s = sumEntiteDep(e); totalSoldeFC += s.soldeFC; totalSoldeUSD += s.soldeUSD; });
    var totalGenFC = (d.depensesGenerales || []).reduce(function(a, x) { return a + x.fc; }, 0);
    var totalGenUSD = (d.depensesGenerales || []).reduce(function(a, x) { return a + x.usd; }, 0);
    html += '<div style="background:#fff3e0;padding:12px;border-radius:8px;margin-top:10px;border:2px solid #e65100">';
    html += '<div style="font-size:13px;color:#e65100;font-weight:700;margin-bottom:6px">RÉCAPITULATIF DE LA SÉANCE</div>';
    html += '<div class="table-wrapper"><table class="data-table"><tbody>';
    html += '<tr><td>Total soldes entités</td><td class="num">' + totalSoldeFC.toLocaleString() + ' FC</td><td class="num">' + totalSoldeUSD.toLocaleString() + ' $</td></tr>';
    html += '<tr><td>Total dépenses générales</td><td class="num">- ' + totalGenFC.toLocaleString() + ' FC</td><td class="num">- ' + totalGenUSD.toLocaleString() + ' $</td></tr>';
    html += '</tbody><tfoot><tr><td>À TRANSFÉRER</td><td class="num">' + (totalSoldeFC - totalGenFC).toLocaleString() + ' FC</td><td class="num">' + (totalSoldeUSD - totalGenUSD).toLocaleString() + ' $</td></tr></tfoot></table></div>';
    html += '</div>';
  });
  document.getElementById('rapportDepBox').innerHTML = html;
}

function soldeTransferer() {
  var deps = DB.get('depouillements', []).filter(function(d) { return !d.archived; });
  if (!deps.length) { document.getElementById('rapportDepBox').innerHTML = '<p>Aucun dépouillement actif.</p>'; return; }
  var html = '<div class="rapport-header"><h3>🏦 SOLDE À TRANSFÉRER</h3><p>Détail complet par séance</p></div>';
  var totalSoldeFC = 0, totalSoldeUSD = 0, totalGenFC = 0, totalGenUSD = 0;
  deps.forEach(function(d) {
    var soldeFC = 0, soldeUSD = 0;
    d.entites.forEach(function(e) { var s = sumEntiteDep(e); soldeFC += s.soldeFC; soldeUSD += s.soldeUSD; });
    var genFC = (d.depensesGenerales || []).reduce(function(a, x) { return a + x.fc; }, 0);
    var genUSD = (d.depensesGenerales || []).reduce(function(a, x) { return a + x.usd; }, 0);
    totalSoldeFC += soldeFC; totalSoldeUSD += soldeUSD; totalGenFC += genFC; totalGenUSD += genUSD;
    html += '<div style="background:#e8f5e9;padding:10px;border-radius:8px;margin:14px 0 8px;border-left:5px solid #0a6e2c">';
    html += '<div style="font-size:14px;font-weight:700;color:#0a6e2c">📅 ' + d.mois + ' ' + d.annee + ' — Phase ' + d.phase + '</div>';
    html += '<div style="font-size:12px;color:#666">Date : ' + fmtDate(d.date) + '</div>';
    html += '</div>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Entité</th><th>Solde FC</th><th>Solde USD</th></tr></thead><tbody>';
    d.entites.forEach(function(e) {
      var s = sumEntiteDep(e);
      html += '<tr><td>' + echapper(e.typeEntite) + ' - ' + echapper(e.nomEntite) + '</td>';
      html += '<td class="num">' + s.soldeFC.toLocaleString() + '</td>';
      html += '<td class="num">' + s.soldeUSD.toLocaleString() + '</td></tr>';
    });
    html += '</tbody><tfoot><tr><td>TOTAL SOLDES ENTITÉS</td><td class="num">' + soldeFC.toLocaleString() + ' FC</td><td class="num">' + soldeUSD.toLocaleString() + ' $</td></tr></tfoot></table></div>';
    if (d.depensesGenerales && d.depensesGenerales.length) {
      html += '<div class="table-wrapper"><table class="data-table" style="margin-top:8px"><thead><tr><th>Motif de dépense</th><th>FC</th><th>USD</th></tr></thead><tbody>';
      d.depensesGenerales.forEach(function(x) {
        html += '<tr><td>' + echapper(x.motif) + '</td><td class="num">' + x.fc.toLocaleString() + '</td><td class="num">' + x.usd.toLocaleString() + '</td></tr>';
      });
      html += '</tbody><tfoot><tr><td>TOTAL DÉPENSES</td><td class="num">' + genFC.toLocaleString() + ' FC</td><td class="num">' + genUSD.toLocaleString() + ' $</td></tr></tfoot></table></div>';
    }
    html += '<div style="background:#fff3e0;padding:12px;border-radius:8px;margin:10px 0;border:2px solid #e65100">';
    html += '<div style="font-size:14px;color:#e65100;font-weight:700">SOLDE À TRANSFÉRER (cette séance)</div>';
    html += '<div style="font-size:16px;color:#0a6e2c;font-weight:700;margin-top:6px">' + (soldeFC - genFC).toLocaleString() + ' FC / ' + (soldeUSD - genUSD).toLocaleString() + ' $</div>';
    html += '</div>';
  });
  html += '<div style="background:#0a6e2c;color:white;padding:16px;border-radius:10px;margin-top:20px">';
  html += '<div style="font-size:14px;font-weight:700;margin-bottom:8px">🌍 TOTAUX GÉNÉRAUX (toutes séances actives)</div>';
  html += '<div style="font-size:12px;margin:4px 0">Total soldes entités : <strong>' + totalSoldeFC.toLocaleString() + ' FC / ' + totalSoldeUSD.toLocaleString() + ' $</strong></div>';
  html += '<div style="font-size:12px;margin:4px 0">Total dépenses générales : <strong>- ' + totalGenFC.toLocaleString() + ' FC / - ' + totalGenUSD.toLocaleString() + ' $</strong></div>';
  html += '<div style="font-size:16px;font-weight:700;margin-top:10px;border-top:1px solid rgba(255,255,255,0.3);padding-top:10px">💰 À LA BANQUE : ' + (totalSoldeFC - totalGenFC).toLocaleString() + ' FC / ' + (totalSoldeUSD - totalGenUSD).toLocaleString() + ' $</div>';
  html += '</div>';
  document.getElementById('rapportDepBox').innerHTML = html;
}

// ========== DASHBOARD ==========
function afficherDashboard() {
  var box = document.getElementById('dashboardBox');
  if (!box) return;
  var entites = DB.get('entites', []).filter(function(e) { return !e.archived; }).length;
  var parts = DB.get('participations', []).filter(function(p) { return !p.archived; });
  var totPart = parts.reduce(function(a, p) { return a + p.m + p.s + p.n; }, 0);
  var fiches = DB.get('fichesMensuelles', []).filter(function(f) { return !f.archived; }).length;
  var cands = DB.get('candidats', []).filter(function(c) { return !c.archived; });
  var totalVerse = cands.reduce(function(a, c) { return a + (c.totalVerse || 0); }, 0);
  var deps = DB.get('depouillements', []).filter(function(d) { return !d.archived; });
  var soldeDepFC = 0, soldeDepUSD = 0;
  deps.forEach(function(d) { d.entites.forEach(function(e) { var s = sumEntiteDep(e); soldeDepFC += s.soldeFC; soldeDepUSD += s.soldeUSD; }); });
  var html = '<div class="table-wrapper"><table class="data-table"><tbody>';
  html += '<tr><th colspan="2">📈 MODULE I — FRÉQUENCES</th></tr>';
  html += '<tr><td>Entités actives</td><td class="num">' + entites + '</td></tr>';
  html += '<tr><td>Total présences</td><td class="num">' + totPart + '</td></tr>';
  html += '<tr><td>Fiches mensuelles</td><td class="num">' + fiches + '</td></tr>';
  html += '<tr><th colspan="2">💰 MODULE II — FINANCE</th></tr>';
  html += '<tr><td>Candidats actifs</td><td class="num">' + cands.length + '</td></tr>';
  html += '<tr><td>Total versé</td><td class="num">' + totalVerse.toFixed(2) + ' $</td></tr>';
  html += '<tr><th colspan="2">🧾 MODULE III — DÉPOUILLEMENT</th></tr>';
  html += '<tr><td>Séances actives</td><td class="num">' + deps.length + '</td></tr>';
  html += '<tr><td>Solde total FC</td><td class="num">' + soldeDepFC.toLocaleString() + ' FC</td></tr>';
  html += '<tr><td>Solde total USD</td><td class="num">' + soldeDepUSD.toLocaleString() + ' $</td></tr>';
  html += '</tbody></table></div>';
  box.innerHTML = html;
}

function rapportGeneralConsolide() {
  var box = document.getElementById('rapportGeneralBox');
  var html = '<div class="rapport-header"><h3>🌍 RAPPORT GÉNÉRAL CONSOLIDÉ</h3><p>EMM MONDIAL — Tous Modules</p></div>';
  html += '<p style="text-align:center;font-size:12px;color:#666;margin-bottom:14px">Généré par <strong>' + echapper(currentUser ? currentUser.nom : '') + '</strong> le ' + new Date().toLocaleString('fr-FR') + '</p>';
  var entites = DB.get('entites', []).filter(function(e) { return !e.archived; }).length;
  var parts = DB.get('participations', []).filter(function(p) { return !p.archived; });
  var tm = 0, ts = 0, tn = 0;
  parts.forEach(function(p) { tm += p.m; ts += p.s; tn += p.n; });
  html += '<h4 style="color:#0a6e2c;margin:14px 0 8px">📈 MODULE I — FRÉQUENCES</h4>';
  html += '<div class="table-wrapper"><table class="data-table"><tbody>';
  html += '<tr><td>Entités</td><td class="num">' + entites + '</td></tr>';
  html += '<tr><td>Membres</td><td class="num">' + tm + '</td></tr>';
  html += '<tr><td>Sympathisants</td><td class="num">' + ts + '</td></tr>';
  html += '<tr><td>Nouveaux venus</td><td class="num">' + tn + '</td></tr>';
  html += '</tbody></table></div>';
  var cands = DB.get('candidats', []).filter(function(c) { return !c.archived; });
  var totalVerse = 0, totalPrevu = 0;
  cands.forEach(function(c) { totalVerse += c.totalVerse || 0; totalPrevu += c.montantPrevu; });
  html += '<h4 style="color:#0a6e2c;margin:20px 0 8px">💰 MODULE II — FINANCE</h4>';
  html += '<div class="table-wrapper"><table class="data-table"><tbody>';
  html += '<tr><td>Candidats actifs</td><td class="num">' + cands.length + '</td></tr>';
  html += '<tr><td>Total prévu</td><td class="num">' + totalPrevu.toFixed(2) + '$</td></tr>';
  html += '<tr><td>Total versé</td><td class="num">' + totalVerse.toFixed(2) + '$</td></tr>';
  html += '<tr><td>Solde</td><td class="num">' + (totalPrevu - totalVerse).toFixed(2) + '$</td></tr>';
  html += '</tbody></table></div>';
  var deps = DB.get('depouillements', []).filter(function(d) { return !d.archived; });
  var soldeFC = 0, soldeUSD = 0, genFC = 0, genUSD = 0;
  deps.forEach(function(d) {
    d.entites.forEach(function(e) { var s = sumEntiteDep(e); soldeFC += s.soldeFC; soldeUSD += s.soldeUSD; });
    d.depensesGenerales.forEach(function(x) { genFC += x.fc; genUSD += x.usd; });
  });
  html += '<h4 style="color:#0a6e2c;margin:20px 0 8px">🧾 MODULE III — DÉPOUILLEMENT</h4>';
  html += '<div class="table-wrapper"><table class="data-table"><tbody>';
  html += '<tr><td>Séances</td><td class="num">' + deps.length + '</td></tr>';
  html += '<tr><td>Solde FC</td><td class="num">' + soldeFC.toLocaleString() + ' FC</td></tr>';
  html += '<tr><td>Solde USD</td><td class="num">' + soldeUSD.toLocaleString() + ' $</td></tr>';
  html += '<tr><td>Dépenses FC</td><td class="num">- ' + genFC.toLocaleString() + ' FC</td></tr>';
  html += '<tr><td>Dépenses USD</td><td class="num">- ' + genUSD.toLocaleString() + ' $</td></tr>';
  html += '</tbody><tfoot><tr><td>À TRANSFÉRER</td><td class="num">' + (soldeFC - genFC).toLocaleString() + ' FC / ' + (soldeUSD - genUSD).toLocaleString() + ' $</td></tr></tfoot></table></div>';
  box.innerHTML = html;
}

// ========== IMPRESSIONS ==========
function imprimerRapportFreq() { imprimerBox('rapportFreqBox'); }
function imprimerRapportFin() { imprimerBox('rapportFinBox'); }
function imprimerRapportDep() { imprimerBox('rapportDepBox'); }
function imprimerGeneral() { imprimerBox('rapportGeneralBox'); }

function imprimerBox(boxId) {
  var c = document.getElementById(boxId).innerHTML;
  if (!c) return alert('Rapport vide');
  var w = window.open('', '_blank');
  w.document.write('<html><head><meta charset="UTF-8"><title>Rapport</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#0a6e2c;color:white;padding:8px}td{padding:7px;border-bottom:1px solid #ddd}td.num{text-align:right}</style></head><body><h1 style="text-align:center;color:#0a6e2c">EMM MONDIAL</h1><hr>'+c+'</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 600);
}

function exporterWordFreq() { exporterWordBox('rapportFreqBox','Frequence'); }
function exporterWordFin() { exporterWordBox('rapportFinBox','Finance'); }
function exporterWordDep() { exporterWordBox('rapportDepBox','Depouillement'); }
function exporterWordGeneral() { exporterWordBox('rapportGeneralBox','General'); }

function exporterWordBox(boxId, nom) {
  var contenu = document.getElementById(boxId).innerHTML;
  if (!contenu) return alert('Rapport vide');
  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="UTF-8"></head><body>';
  html += '<h1 style="text-align:center;color:#0a6e2c">EMM MONDIAL</h1><hr>' + contenu + '</body></html>';
  var blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'Rapport_' + nom + '_' + Date.now() + '.doc';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

function exporterPDFFreq() { exporterPDFBox('rapportFreqBox'); }
function exporterPDFFin() { exporterPDFBox('rapportFinBox'); }
function exporterPDFDep() { exporterPDFBox('rapportDepBox'); }
function exporterPDFGeneral() { exporterPDFBox('rapportGeneralBox'); }

function exporterPDFBox(boxId) {
  var contenu = document.getElementById(boxId).innerHTML;
  if (!contenu) return alert('Rapport vide');
  var w = window.open('', '_blank');
  w.document.write('<html><head><meta charset="UTF-8"><title>PDF</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#0a6e2c;color:white;padding:8px}td{padding:7px;border-bottom:1px solid #ddd}td.num{text-align:right}</style></head><body><h1 style="text-align:center;color:#0a6e2c">EMM MONDIAL</h1><hr>'+contenu+'</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 800);
}

function partagerRapportFreq() { partagerBox('rapportFreqBox','Fréquences'); }
function partagerRapportFin() { partagerBox('rapportFinBox','Finance'); }
function partagerRapportDep() { partagerBox('rapportDepBox','Dépouillement'); }
function partagerGeneral() { partagerBox('rapportGeneralBox','Général'); }

function partagerBox(boxId, nom) {
  var contenu = document.getElementById(boxId).innerHTML;
  if (!contenu) return alert('Rapport vide');
  var div = document.createElement('div');
  div.innerHTML = contenu;
  var texte = div.innerText.substring(0, 2000);
  var msg = 'EMM MONDIAL — Rapport ' + nom + '\n\n' + texte;
  if (navigator.share) {
    navigator.share({ title: 'Rapport EMM', text: msg }).catch(function(err) { if (err.name !== 'AbortError') partagerFallback(msg); });
  } else partagerFallback(msg);
}

function partagerFallback(msg) {
  var email = prompt('📧 Email (vide = WhatsApp) :', '');
  if (email === null) return;
  if (email.trim()) window.location.href = 'mailto:' + email.trim() + '?subject=Rapport EMM&body=' + encodeURIComponent(msg);
  else window.location.href = 'https://wa.me/?text=' + encodeURIComponent(msg);
}

// ========== UTILISATEURS ==========
function ajouterUtilisateur() {
  if (!isAdmin()) return alert('Réservé admin');
  var nom = document.getElementById('uNom').value.trim().toLowerCase();
  var pass = document.getElementById('uPass').value.trim();
  var role = document.getElementById('uRole').value;
  if (!nom || !pass) return alert('Remplissez tous les champs');
  var users = DB.get('users', []);
  if (users.find(function(u) { return u.nom === nom; })) return alert('Ce nom existe déjà');
  users.push({ id: uid(), nom: nom, pass: pass, role: role });
  DB.set('users', users);
  reinitialiserFormUtilisateur();
  afficherUtilisateurs();
  alert('✅ Utilisateur ajouté');
}

function reinitialiserFormUtilisateur() {
  var a = document.getElementById('uNom'); if (a) a.value = '';
  var b = document.getElementById('uPass'); if (b) b.value = '';
  var c = document.getElementById('uRole'); if (c) c.selectedIndex = 0;
}

function afficherUtilisateurs() {
  var users = DB.get('users', []);
  var box = document.getElementById('listeUtilisateurs');
  if (!box) return;
  var html = '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Nom</th><th>Rôle</th><th>Actions</th></tr></thead><tbody>';
  users.forEach(function(u) {
    html += '<tr><td>' + echapper(u.nom) + '</td><td>' + (u.role === 'admin' ? '👑 Admin' : '👤 Utilisateur') + '</td>';
    html += '<td>';
    if (u.nom !== 'admin') {
      html += '<button class="btn-mini danger" onclick="supprimerUtilisateur(\'' + u.id + '\')">🗑️</button>';
    }
    html += '</td></tr>';
  });
  html += '</tbody></table></div>';
  box.innerHTML = html;
}

function supprimerUtilisateur(id) {
  if (!isAdmin()) return alert('Réservé admin');
  if (!confirm('⚠️ Supprimer cet utilisateur ?')) return;
  DB.set('users', DB.get('users', []).filter(function(u) { return u.id !== id; }));
  afficherUtilisateurs();
}

// ========== EXPORT / IMPORT ==========
function exporterDonnees() {
  var data = {};
  ['users','entites','participations','fichesMensuelles','candidats','versements','depouillements','depensesGenerales','annonces'].forEach(function(k) { data[k] = DB.get(k, []); });
  var json = JSON.stringify(data, null, 2);
  try {
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'emm_mondial_' + Date.now() + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    alert('✅ Fichier téléchargé');
  } catch (e) { alert('Erreur export'); }
}

function restaurerTexte() {
  var txt = document.getElementById('importText').value.trim();
  if (!txt) return alert('Collez d\'abord un JSON');
  try {
    var data = JSON.parse(txt);
    Object.keys(data).forEach(function(k) { DB.set(k, data[k]); });
    alert('✅ Données restaurées');
    refreshAll();
    afficherDashboard();
    document.getElementById('importText').value = '';
  } catch (e) { alert('❌ JSON invalide'); }
}

function importerDonnees(ev) {
  var file = ev.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      Object.keys(data).forEach(function(k) { DB.set(k, data[k]); });
      alert('✅ Données restaurées');
      refreshAll();
      afficherDashboard();
    } catch (err) { alert('❌ Fichier invalide'); }
  };
  reader.readAsText(file);
}

function toutEffacer() {
  if (!isAdmin()) return alert('Réservé admin');
  if (!confirm('⚠️ Effacer TOUTES les données (sauf utilisateurs) ?')) return;
  var users = DB.get('users', []);
  localStorage.clear();
  DB.set('users', users);
  initDB();
  alert('✅ Effacé');
  location.reload();
}

// ========== PWA ==========
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPrompt = e;
  var btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'block';
});

function installApp() {
  if (!deferredPrompt) return alert('Menu navigateur → "Ajouter à l\'écran d\'accueil"');
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(function() {
    deferredPrompt = null;
    var btn = document.getElementById('installBtn');
    if (btn) btn.style.display = 'none';
  });
}

// ========== REFRESH ==========
function refreshAll() {
  rafraichirEntites();
  afficherListeEntites();
  afficherJournaliere();
  rafraichirCandidatsSelect();
  afficherCandidats();
  afficherVersements();
  afficherUtilisateurs();
  if (typeof rechercherParEntite === 'function') rechercherParEntite();
}

// ========== INIT ==========
window.addEventListener('load', function() {
  showSplash();
  setTimeout(initSignature, 500);
  setTimeout(initSignature, 1500);
});
