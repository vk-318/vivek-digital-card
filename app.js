(() => {
  const cfg = window.APP_CONFIG || {};
  const ready = cfg.SUPABASE_URL?.startsWith("https://") &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.startsWith("PASTE_");
  const $ = (id) => document.getElementById(id);
  $("year").textContent = new Date().getFullYear();
  if (!ready || !window.supabase) {
    $("request-status").textContent = "Setup needed: add your Supabase URL and anon key in config.js, then reload.";
    $("login-status").textContent = "Setup needed: configure Supabase in config.js.";
    return;
  }
  const db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  let currentUser = null;
  let isAdmin = false;

  const safeText = (v) => (v ?? "").toString();
  const setStatus = (id, message, error=false) => {
    $(id).textContent = message;
    $(id).style.color = error ? "#e5aaaa" : "#a8dbb4";
  };

  async function loadPublic() {
    const { data: profile, error } = await db.from("profiles").select("full_name,role,bio,about,avatar_url,public_email").eq("id", 1).maybeSingle();
    if (error) console.warn("Profile:", error.message);
    if (profile) {
      $("full-name").textContent = profile.full_name || "Your Name";
      $("role").textContent = profile.role || "MUSICIAN · ARTIST";
      $("bio").textContent = profile.bio || "";
      $("about-text").textContent = profile.about || "";
      $("footer-name").textContent = (profile.full_name || "YOUR NAME").toUpperCase();
      if (profile.avatar_url) $("avatar").src = profile.avatar_url;
      if (profile.public_email) $("email-link").href = "mailto:" + profile.public_email;
    }
    const { data: links, error: linksError } = await db.from("social_links").select("id,platform,url").eq("is_public", true).order("sort_order");
    if (linksError) console.warn("Social links:", linksError.message);
    $("social-list").replaceChildren();
    if (!links?.length) {
      const p = document.createElement("p"); p.className="muted"; p.textContent="Social links will appear here."; $("social-list").append(p); return;
    }
    links.forEach(link => {
      try {
        const url = new URL(link.url);
        if (!["https:", "http:"].includes(url.protocol)) return;
        const a = document.createElement("a");
        a.className = "social-card"; a.href = url.href; a.target = "_blank"; a.rel = "noopener noreferrer";
        const name = document.createElement("span"); name.textContent = link.platform;
        const arrow = document.createElement("span"); arrow.textContent = "↗";
        a.append(name, arrow); $("social-list").append(a);
      } catch {}
    });
  }

  async function refreshSession() {
    const { data } = await db.auth.getSession();
    currentUser = data.session?.user || null;
    if (!currentUser) { showLoggedOut(); return; }
    const { data: adminRow } = await db.from("app_admins").select("user_id").eq("user_id", currentUser.id).maybeSingle();
    isAdmin = !!adminRow;
    if (isAdmin) await showAdmin();
    else {
      $("login-status").textContent = "Signed in as " + currentUser.email + ". You can submit or check your access request above.";
      $("login-form").querySelector("button").textContent = "Signed in";
    }
    await showPrivateDetailsIfApproved();
  }

  function showLoggedOut() {
    isAdmin = false;
    $("admin-dashboard").hidden = true;
    $("login-form").hidden = false;
    $("login-status").textContent = "Only the account added as an admin in Supabase can manage this site.";
  }

  async function showAdmin() {
    $("login-form").hidden = true;
    $("admin-dashboard").hidden = false;
    $("admin-welcome").textContent = "Signed in as " + currentUser.email;
    const { data: profile } = await db.from("profiles").select("*").eq("id", 1).maybeSingle();
    if (profile) {
      const f = $("profile-form");
      Object.entries(profile).forEach(([k,v]) => { if (f.elements[k]) f.elements[k].value = v ?? ""; });
    }
    const { data: details } = await db.from("private_details").select("phone,email,other").eq("id", 1).maybeSingle();
    if (details) Object.entries(details).forEach(([k,v]) => { if ($("private-form").elements[k]) $("private-form").elements[k].value = v ?? ""; });
    await loadRequests();
  }

  async function showPrivateDetailsIfApproved() {
    if (!currentUser || isAdmin) return;
    const { data: req } = await db.from("access_requests").select("status").eq("user_id", currentUser.id).eq("status", "approved").maybeSingle();
    if (!req) return;
    const { data, error } = await db.from("private_details").select("phone,email,other").eq("id", 1).maybeSingle();
    if (error || !data) return;
    const area = $("private-area"); area.hidden = false; area.replaceChildren();
    const title = document.createElement("strong"); title.textContent = "Approved private details";
    const content = document.createElement("p"); content.textContent = [data.phone && "Phone: "+data.phone, data.email && "Email: "+data.email, data.other].filter(Boolean).join("\n");
    area.append(title, content);
  }

  $("request-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("request-email").value.trim();
    const message = $("request-message").value.trim();
    if (!currentUser) {
      setStatus("request-status", "Sending secure sign-in link…");
      const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
      if (error) return setStatus("request-status", error.message, true);
      setStatus("request-status", "Check your email and open the secure sign-in link. After signing in, return here and submit your request again.");
      return;
    }
    if (email.toLowerCase() !== (currentUser.email || "").toLowerCase()) {
      return setStatus("request-status", "Please use the same email address you used to sign in.", true);
    }
    const { error } = await db.from("access_requests").upsert({ user_id: currentUser.id, email: currentUser.email, message, status: "pending" }, { onConflict: "user_id" });
    if (error) setStatus("request-status", error.message, true);
    else setStatus("request-status", "Your access request has been submitted. The owner will review it.");
  });

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("admin-email").value.trim();
    const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: false } });
    setStatus("login-status", error ? error.message : "Secure login link sent. Check your email.");
  });

  $("logout-button").addEventListener("click", async () => { await db.auth.signOut(); currentUser=null; showLoggedOut(); });
  $("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault(); if (!isAdmin) return;
    const f = new FormData(e.currentTarget); const row = Object.fromEntries(f.entries());
    const { error } = await db.from("profiles").upsert({ id:1, ...row });
    setStatus("profile-status", error ? error.message : "Profile saved.", !!error);
    if (!error) loadPublic();
  });
  $("social-form").addEventListener("submit", async (e) => {
    e.preventDefault(); if (!isAdmin) return;
    const f = new FormData(e.currentTarget);
    const { error } = await db.from("social_links").insert({ platform:f.get("platform"), url:f.get("url"), is_public:true });
    setStatus("social-status", error ? error.message : "Social link added.", !!error);
    if (!error) { e.currentTarget.reset(); loadPublic(); }
  });
  $("private-form").addEventListener("submit", async (e) => {
    e.preventDefault(); if (!isAdmin) return;
    const f = new FormData(e.currentTarget);
    const { error } = await db.from("private_details").upsert({ id:1, phone:f.get("phone"), email:f.get("email"), other:f.get("other") });
    setStatus("private-status", error ? error.message : "Private details saved.", !!error);
  });

  async function loadRequests() {
    const { data, error } = await db.from("access_requests").select("user_id,email,message,status,created_at").order("created_at", {ascending:false});
    const root = $("requests-list"); root.replaceChildren();
    if (error) { root.textContent = error.message; return; }
    if (!data?.length) { root.textContent = "No requests yet."; return; }
    data.forEach(r => {
      const item=document.createElement("div"); item.className="request-item";
      const info=document.createElement("div"); info.textContent=`${r.email} · ${r.status} · ${new Date(r.created_at).toLocaleDateString()}`;
      const msg=document.createElement("div"); msg.className="muted"; msg.textContent=r.message || "No message";
      item.append(info,msg);
      if (r.status !== "approved") {
        const actions=document.createElement("div"); actions.className="request-actions";
        [["Approve","approved","approve"],["Reject","rejected","reject"]].forEach(([label,status,cls])=>{
          const b=document.createElement("button"); b.type="button"; b.className=cls; b.textContent=label;
          b.addEventListener("click", async ()=>{
            const {error}=await db.from("access_requests").update({status}).eq("user_id",r.user_id);
            if(error) alert(error.message); else loadRequests();
          }); actions.append(b);
        }); item.append(actions);
      }
      root.append(item);
    });
  }

  db.auth.onAuthStateChange(() => { setTimeout(refreshSession, 0); });
  loadPublic();
  refreshSession();
})();