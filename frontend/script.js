const API = "http://localhost:5000/api";
let token = localStorage.getItem("token");
let currentUser = null;
let currentPage = 1;
let currentCat = "";
let currentNewsCat = "";
let currentPostId = null;
let confirmCallback = null;

function toast(msg, type="success") {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = `show ${type}`;
  setTimeout(() => t.className = "", 2800);
}

function timeAgo(isoStr) {
  const diff = (Date.now() - new Date(isoStr)) / 1000;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;

  return `${Math.floor(diff/86400)}d ago`;
}

function authHeaders() {
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function apiFetch(url, opts={}) {
  const resp = await fetch(API + url, { ...opts, headers: { ...authHeaders(), ...opts.headers } });
  const data = await resp.json();

  if (!resp.ok) throw new Error(data.error || "Request failed");

  return data;
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");

  if (name === "forum") {
    document.querySelector(".nav-tab:nth-child(1)").classList.add("active"); loadPosts();
  }

  if (name === "popular") {
    document.querySelector(".nav-tab:nth-child(2)").classList.add("active"); loadPopular();
  }

  if (name === "news") {
    document.querySelector(".nav-tab:nth-child(3)").classList.add("active"); loadNews();
  }
}


// AUTHENTICATION
async function initUser() {
  if (!token) return;

  try {
    currentUser = await apiFetch("/auth/me");
    renderNav();

    document.getElementById("newPostBtn").style.display = "inline-flex";
    renderUserCard();
  } catch {
    token = null; localStorage.removeItem("token");
  }
}

function renderNav() {
  const nr = document.getElementById("navRight");

  if (currentUser) {
    nr.innerHTML =
        `<div class="avatar" style="background:${currentUser.avatar_color}" title="${currentUser.username}">
            ${currentUser.username[0].toUpperCase()}
        </div>
        <span style="font-size:14px;color:var(--text-muted)">${currentUser.username}</span>
        <button class="btn btn-ghost" onclick="doLogout()">Log out</button>`;
  } else {
    nr.innerHTML =
        `<button class="btn btn-outline" onclick="showPage('login')">Log In</button>
        <button class="btn btn-primary" onclick="showPage('register')">Sign Up</button>`;

    document.getElementById("newPostBtn").style.display = "none";
  }
}

function renderUserCard() {
  const c = document.getElementById("userCard");
  c.style.display = "block";

  c.innerHTML =
    `<h3>Your Profile</h3>

    <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
      <div class="avatar" style="width:44px;height:44px;background:${currentUser.avatar_color};font-size:18px">
        ${currentUser.username[0].toUpperCase()}
      </div>

      <div><div style="font-weight:700">${currentUser.username}</div>
      <div style="font-size:12px;color:var(--text-muted)">${currentUser.email}</div></div>
    </div>

    <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="openNewPost()">+ New Post</button>`;
}

async function doLogin() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const err = document.getElementById("loginError");
  err.classList.remove("show");

  try {
    const data = await apiFetch("/auth/login", { method:"POST", body: JSON.stringify({email,password}) });
    token = data.token;
    localStorage.setItem("token", token);

    currentUser = data.user;
    renderNav();
    renderUserCard();

    document.getElementById("newPostBtn").style.display = "inline-flex";
    toast("Welcome back, " + currentUser.username + "!");
    showPage("forum");
  } catch(e) {
    err.textContent = e.message; err.classList.add("show");
  }
}

async function doRegister() {
  const username = document.getElementById("regUsername").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  const err = document.getElementById("registerError");
  err.classList.remove("show");

  try {
    const data = await apiFetch("/auth/register", { method:"POST", body: JSON.stringify({username,email,password}) });
    token = data.token;
    localStorage.setItem("token", token);

    currentUser = data.user;
    renderNav();
    renderUserCard();

    document.getElementById("newPostBtn").style.display = "inline-flex";
    toast("Account created! Welcome, " + currentUser.username + "!");
    showPage("forum");
  } catch(e) {
    err.textContent = e.message; err.classList.add("show");
  }
}

function doLogout() {
  token = null; currentUser = null;
  localStorage.removeItem("token");
  renderNav();

  document.getElementById("userCard").style.display = "none";
  toast("Logged out", "error");
  showPage("forum");
}


// FORUM
async function loadPosts() {
  const list = document.getElementById("postsList");
  list.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  try {
    const data = await apiFetch(`/posts/?category=${currentCat}&page=${currentPage}`);
    renderPosts(data.posts);
    renderPagination(data.pages);
    renderCatStats(data.posts);
  } catch(e) {
    list.innerHTML = `<div class="empty-state"><div class="big-icon">⚠️</div><h3>Could not load posts</h3><p>${e.message}</p></div>`;
  }
}

function renderPosts(posts) {
  const list = document.getElementById("postsList");

  if (!posts.length) {
    list.innerHTML =
        `<div class="empty-state"><div class="big-icon">💬</div>
            <h3>No posts yet</h3><p>Be the first to start a discussion!</p>
        </div>`;
    return;
  }

  list.innerHTML = posts.map(p =>
    `<div class="post-card" onclick="openPost(${p.id})">
      <div class="post-meta">
        <span class="post-cat-badge">${p.category}</span>
        <span style="font-size:12px;color:var(--text-dim)">${timeAgo(p.created_at)}</span>
      </div>

      <div class="post-title">${escHtml(p.title)}</div>
      <div class="post-body-preview">${escHtml(p.body)}</div>

      <div class="post-footer">
        <div class="post-author">
          <div class="avatar" style="background:${p.author_color};width:24px;height:24px;font-size:11px">${p.author[0].toUpperCase()}</div>
          ${escHtml(p.author)}
        </div>

        <div class="comment-count">💬 ${p.comment_count}</div>

        <div class="vote-btns" onclick="event.stopPropagation()">
          <button class="vote-btn up ${p.user_vote===1?'active':''}" onclick="vote(${p.id},1,this)">▲</button>
          <span class="vote-count" id="vc-${p.id}">${p.vote_count}</span>
          <button class="vote-btn down ${p.user_vote===-1?'active':''}" onclick="vote(${p.id},-1,this)">▼</button>
        </div>
      </div>
    </div>`).join("");
}

function renderPagination(pages) {
  const pg = document.getElementById("pagination");

  if (pages <= 1) {
    pg.innerHTML = "";
    return;
  }

  let html = "";

  for (let i=1; i<=pages; i++) {
    html += `<div class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</div>`;
  }

  pg.innerHTML = html;
}

function renderCatStats(posts) {
  const cats = ["technology","science","gaming","general","ask"];
  const s = document.getElementById("catStats");
  s.innerHTML = cats.map(c => `<div class="cat-chip" onclick="filterCat('${c}',null)">${c}</div>`).join("");
}

function filterCat(cat, el) {
  currentCat = cat; currentPage = 1;
  document.querySelectorAll("#catFilters .cat-chip").forEach(c => c.classList.remove("active"));

  if (el) {
    el.classList.add("active");
  }

  loadPosts();
}

function goPage(p) {
    currentPage = p;
    loadPosts();
    window.scrollTo(0,0);
}

async function vote(postId, val, btn) {
  if (!currentUser) {
    toast("Log in to vote","error");
    return;
  }

  try {
    const data = await apiFetch(`/posts/${postId}/vote`, { method:"POST", body: JSON.stringify({value:val}) });
    document.getElementById("vc-"+postId).textContent = data.vote_count;

    const card = btn.closest(".post-card");
    card.querySelectorAll(".vote-btn").forEach(b => b.classList.remove("active"));
  } catch(e) {
    toast(e.message,"error");
  }
}


// NEW POST
function openNewPost() {
  if (!currentUser) {
    showPage("login");
    return;
  }

  document.getElementById("newPostModal").classList.add("open");
}

function closeNewPost() {
    document.getElementById("newPostModal").classList.remove("open");
}

async function submitPost() {
  const title = document.getElementById("postTitle").value.trim();
  const body = document.getElementById("postBody").value.trim();
  const category = document.getElementById("postCategory").value;
  const err = document.getElementById("postError");
  err.classList.remove("show");

  if (!title || !body) {
    err.textContent="Title and body are required";
    err.classList.add("show");
    return;
  }

  try {
    await apiFetch("/posts/", { method:"POST", body: JSON.stringify({title,body,category}) });
    closeNewPost();

    document.getElementById("postTitle").value = "";
    document.getElementById("postBody").value = "";

    toast("Post published!");
    loadPosts();
  } catch(e) {
    err.textContent = e.message; err.classList.add("show");
  }
}


// POST DETAIL
async function openPost(id) {
  currentPostId = id;
  showPage("detail");
  const c = document.getElementById("postDetailContent");
  c.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  try {
    const [post, comments] = await Promise.all([
      apiFetch(`/posts/${id}`),
      apiFetch(`/comments/post/${id}`)
    ]);

    c.innerHTML = renderPostDetail(post, comments);
  } catch(e) {
    c.innerHTML = `<div class="empty-state"><h3>Could not load post</h3></div>`;
  }
}

function renderPostDetail(p, comments) {
  const uid = currentUser?.id;

  return `<div class="post-detail-card">
    <div class="post-meta">
        <span class="post-cat-badge">${p.category}</span>
        <span style="font-size:12px;color:var(--text-dim)">${timeAgo(p.created_at)}</span>
        ${p.user_id===uid?`<button class="btn btn-danger" style="margin-left:auto" onclick="deletePost(${p.id})">Delete</button>`:""}
    </div>

    <div class="post-detail-title">${escHtml(p.title)}</div>

    <div class="post-author" style="margin-bottom:16px">
        <div class="avatar" style="background:${p.author_color};width:28px;height:28px;font-size:13px">${p.author[0].toUpperCase()}</div>
        <span style="font-size:14px">${escHtml(p.author)}</span>
    </div>

    <div class="post-detail-body">${escHtml(p.body)}</div>

    <div class="vote-btns" style="margin-top:20px">
        <button class="vote-btn up ${p.user_vote===1?'active':''}" onclick="voteDetail(${p.id},1)">▲</button>
        <span class="vote-count" id="vc-detail-${p.id}">${p.vote_count}</span>

        <button class="vote-btn down ${p.user_vote===-1?'active':''}" onclick="voteDetail(${p.id},-1)">▼</button>
        <span style="margin-left:12px;font-size:13px;color:var(--text-muted)">💬 ${p.comment_count} comments</span>
    </div>
  </div>

  <div class="comments-section">
    <h3>Comments (${comments.length})</h3>
    ${comments.map(renderComment).join("") || `<div class="empty-state" style="padding:30px"><p>No comments yet. Be the first!</p></div>`}

    ${currentUser ?
    `<div class="comment-form" id="mainCommentForm">
        <h4>Add a comment</h4>
        <textarea class="form-textarea" id="commentBody" placeholder="Share your thoughts…" style="min-height:80px"></textarea>

        <div style="display:flex;justify-content:flex-end;margin-top:10px">
        <button class="btn btn-primary" onclick="submitComment(null)">Post Comment</button>
        </div>
    </div>` : `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:14px">
        <span onclick="showPage('login')" style="color:var(--accent2);cursor:pointer">Log in</span> to comment</div>`}
  </div>`;
}

function renderComment(c) {
  return `<div class="comment-card ${c.parent_id?'reply':''}" id="comment-${c.id}">
    <div class="comment-header">
      <div class="avatar" style="background:${c.author_color};width:24px;height:24px;font-size:11px">${c.author[0].toUpperCase()}</div>
      <span class="comment-author">${escHtml(c.author)}</span>
      <span class="comment-time">${timeAgo(c.created_at)}</span>
      ${c.user_id===currentUser?.id?`<button class="btn btn-danger" onclick="deleteComment(${c.id})">Delete</button>`:""}
    </div>

    <div class="comment-body">${escHtml(c.body)}</div>

    ${currentUser ? `<span class="reply-btn" onclick="showReplyForm(${c.id})">↩ Reply</span>` : ""}

    <div id="replyForm-${c.id}"></div>

    ${c.replies && c.replies.length ?
      `<div style="margin-left:24px;margin-top:8px">
        ${c.replies.map(r => renderComment(r)).join("")}
      </div>` : ""}
  </div>`;
}

function showReplyForm(parentId) {
  const el = document.getElementById("replyForm-" + parentId);

  el.innerHTML = `<div style="margin-top:10px">
    <textarea class="form-textarea" id="replyBody-${parentId}" placeholder="Write a reply…" style="min-height:60px"></textarea>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
      <button class="btn btn-ghost" onclick="document.getElementById('replyForm-${parentId}').innerHTML=''">Cancel</button>
      <button class="btn btn-primary" onclick="submitComment(${parentId})">Reply</button>
    </div>
  </div>`;
}

async function submitComment(parentId) {
  const bodyEl = document.getElementById(parentId ? `replyBody-${parentId}` : "commentBody");
  const body = bodyEl?.value.trim();

  if (!body) {
    toast("Comment can't be empty","error");
    return;
  }

  try {
    await apiFetch("/comments/", { method:"POST", body: JSON.stringify({body, post_id: currentPostId, parent_id: parentId||null}) });
    toast("Comment posted!");
    openPost(currentPostId);
  } catch(e) {
    toast(e.message,"error");
  }
}

function openConfirmModal(title, text, callback) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmText").textContent = text;

  confirmCallback = callback;

  document.getElementById("confirmModal").classList.add("open");
}

function closeConfirmModal() {
  document.getElementById("confirmModal").classList.remove("open");
  confirmCallback = null;
}

document.getElementById("confirmBtn").addEventListener("click", async () => {
  if (confirmCallback) {
    await confirmCallback();
  }

  closeConfirmModal();
});

async function deletePost(id) {
  openConfirmModal(
    "Delete Post",
    "Are you sure you want to delete this post?",
    async () => {
      try {
        await apiFetch(`/posts/${id}`, { method:"DELETE" });

        toast("Post deleted");
        showPage("forum");
      } catch(e) {
        toast(e.message,"error");
      }
    }
  );
}

async function deleteComment(id) {
  openConfirmModal(
    "Delete Comment",
    "Are you sure you want to delete this comment?",
    async () => {
      try {
        await apiFetch(`/comments/${id}`, { method:"DELETE" });

        toast("Comment deleted");
        openPost(currentPostId);
      } catch(e) {
        toast(e.message,"error");
      }
    }
  );
}

async function voteDetail(postId, val) {
  if (!currentUser) {
    toast("Log in to vote","error");
    return;
  }

  try {
    const data = await apiFetch(`/posts/${postId}/vote`, { method:"POST", body: JSON.stringify({value:val}) });
    document.getElementById(`vc-detail-${postId}`).textContent = data.vote_count;
  } catch(e) {
    toast(e.message,"error");
  }
}


// POPULAR
async function loadPopular() {
  const list = document.getElementById("popularList");
  list.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  try {
    let allPosts = [];
    let page = 1;
    let totalPages = 1;

    do {
      const data = await apiFetch(`/posts/?category=all&page=${page}`);
      allPosts = allPosts.concat(data.posts);

      totalPages = data.pages;
      page++;
    } while (page <= totalPages)

    const range = document.getElementById("popularRange")?.value || "week";
    const now = Date.now();

    const cutoff = {
      today: now - 86400000,           // - 24 hours
      week:  now - 7  * 86400000,      // - 7 days
      month: now - 30 * 86400000,      // - 30 days
      all:   0                         // - no cutoff
    }[range] ?? 0;

    const filtered = cutoff === 0
      ? allPosts
      : allPosts.filter(p => new Date(p.created_at).getTime() >= cutoff);

    const sorted = filtered.sort((a, b) => b.vote_count - a.vote_count);

    if (!sorted.length) {
      list.innerHTML = `<div class="empty-state"><h3>No popular posts yet</h3><p>Be the first to post something!</p></div>`;
      return;
    }

    list.innerHTML = sorted.map((p, i) =>
      `<div class="post-card" onclick="openPost(${p.id})">
        <div class="post-meta">
          <span style="font-size:22px">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
          <span class="post-cat-badge">${p.category}</span>
          <span style="font-size:12px;color:var(--text-dim)">${timeAgo(p.created_at)}</span>
        </div>

        <div class="post-title">${escHtml(p.title)}</div>
        <div class="post-body-preview">${escHtml(p.body)}</div>

        <div class="post-footer">
          <div class="post-author">
            <div class="avatar" style="background:${p.author_color};width:24px;height:24px;font-size:11px">${p.author[0].toUpperCase()}</div>
            ${escHtml(p.author)}
          </div>

          <div class="comment-count">💬 ${p.comment_count}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
            <span style="color:var(--accent);font-weight:700;font-size:14px">▲ ${p.vote_count}</span>
          </div>
        </div>
      </div>`).join("");

    renderTrendingTopics(sorted);

  } catch(e) {
    list.innerHTML = `<div class="empty-state"><div class="big-icon">⚠️</div><h3>Could not load popular posts</h3><p>${e.message}</p></div>`;
  }
}

function renderTrendingTopics(posts) {
  const el = document.getElementById("trendingTopics");

  if (!el) return;

  const words = {};
  const skip = new Set(['the','a','an','is','in','of','to','and','for','on','with','how','why','what','are','my','i','it','this','that','be','was','has']);

  posts.forEach(p => {
    p.title.toLowerCase().split(/\W+/).forEach(w => {
      if (w.length > 3 && !skip.has(w)) {
        words[w] = (words[w]||0) + 1;
      }
    });
  });

  const top = Object.entries(words).sort((a,b)=>b[1]-a[1]).slice(0,10);

  el.innerHTML = top.length
    ? top.map(([w]) => `<div class="cat-chip" onclick="filterCat('all',null);document.querySelector('.nav-tab').click()">#${w}</div>`).join("")
    : `<p style="color:var(--text-muted);font-size:13px">No trends yet</p>`;
}


// NEWS
let currentNewsPage = 1;
let availableSources = [];

async function loadNews() {
  const grid = document.getElementById("newsGrid");
  grid.innerHTML = `<div class="loading-center" style="grid-column:1/-1"><div class="spinner"></div></div>`;

  const q = document.getElementById("newsQuery")?.value.trim() || "";
  const source = document.getElementById("newsSourceFilter")?.value || "";

  try {
    const params = new URLSearchParams({
      category: currentNewsCat,
      q,
      source,
      page: currentNewsPage,
      per_page: 12
    });

    const data = await apiFetch(`/news/?${params}`);

    if (data.sources && data.sources.length) {
      availableSources = data.sources;
      renderSourceFilter(data.sources);
    }

    renderNews(data.articles);
    renderNewsPagination(data.pages, data.total);
  } catch(e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Could not load news</h3><p>${e.message}</p></div>`;
  }
}

function renderSourceFilter(sources) {
  const sel = document.getElementById("newsSourceFilter");

  if (!sel) return;

  const current = sel.value;

  sel.innerHTML = `<option value="">All Sources</option>` +
    sources.map(s => `<option value="${escHtml(s)}" ${s===current?'selected':''}>${escHtml(s)}</option>`).join("");
}

function renderNews(articles) {
  const grid = document.getElementById("newsGrid");

  if (!articles.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="big-icon">📰</div><h3>No articles found</h3><p>Try a different search or filter</p></div>`;
    return;
  }

  grid.innerHTML = articles.map(a =>
    `<div class="news-card" onclick="window.open('${escHtml(a.url||'#')}','_blank')" style="cursor:pointer">
      <div class="news-img">
        ${a.urlToImage
          ? `<img src="${escHtml(a.urlToImage)}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=news-img-placeholder>📰</span>'"/>`
          : `<span class="news-img-placeholder">📰</span>`}
      </div>

      <div class="news-content">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">
          <div class="news-source">${escHtml(a.source||"")}</div>
          ${a.category ? `<span style="font-size:10px;padding:2px 7px;border-radius:4px;background:var(--surface2);color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${escHtml(a.category)}</span>` : ""}
        </div>

        <div class="news-title">${escHtml(a.title||"")}</div>
        <div class="news-desc">${escHtml(a.description||"")}</div>

        <div class="news-footer">
          <span class="news-date">${a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ""}</span>
          <span class="news-link">Read more →</span>
        </div>
      </div>
    </div>`).join("");
}

function renderNewsPagination(pages, total) {
  const pg = document.getElementById("newsPagination");

  if (!pg) return;

  if (pages <= 1) {
    pg.innerHTML = "";
    return;
  }

  let html = '';
  const start = Math.max(1, currentNewsPage - 2);
  const end   = Math.min(pages, currentNewsPage + 2);

  if (start > 1) {
    html = `<div class="page-btn" onclick="goNewsPage(1)">1</div><span style="color:var(--text-dim)">…</span>`;
  }

  for (let i = start; i <= end; i++) {
    html += `<div class="page-btn ${i===currentNewsPage?'active':''}" onclick="goNewsPage(${i})">${i}</div>`;
  }

  if (end < pages) {
    html += `<span style="color:var(--text-dim)">…</span><div class="page-btn" onclick="goNewsPage(${pages})">${pages}</div>`;
  }

  pg.innerHTML = html;
}

function goNewsPage(p) {
  currentNewsPage = p;
  loadNews();
  document.getElementById("page-news").scrollIntoView();
}

function filterNewsCat(cat, el) {
  currentNewsCat = cat;
  currentNewsPage = 1;
  document.querySelectorAll("#newsCatFilters .cat-chip").forEach(c => c.classList.remove("active"));

  if (el) {
    el.classList.add("active");
  }

  loadNews();
}

function searchNews() {
  currentNewsPage = 1;
  loadNews();
}

// XSS PROTECTION
function escHtml(str) {
  return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// INIT
document.getElementById("newsQuery")?.addEventListener("keydown", e => { if(e.key==="Enter") searchNews(); });
initUser().then(() => loadPosts());