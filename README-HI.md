# Personal Digital Card — मोबाइल से सेटअप

यह एक शुरुआती working project है: Vanilla HTML/CSS/JavaScript + Supabase + Vercel.
किसी AI builder या paid coding membership की जरूरत नहीं है। Supabase/Vercel के free plans की सीमाएँ लागू होंगी।

## इस ZIP में क्या है?
- `index.html` — वेबसाइट और Admin UI
- `styles.css` — मोबाइल-फ्रेंडली डार्क/गोल्ड डिजाइन
- `app.js` — Supabase से डेटा लोड/सेव करने का कोड
- `config.js` — Supabase URL और anon key
- `supabase-schema.sql` — Database tables और Row Level Security policies
- `assets/avatar-placeholder.svg` — शुरुआती प्रोफाइल placeholder

## Step 1 — GitHub पर अपलोड
1. मोबाइल Chrome में https://github.com खोलें और लॉगिन करें।
2. `+` दबाएँ → New repository.
3. Repository का नाम `personal-digital-card` रखें।
4. Public या Private चुनें (आप चाहें तो Private रखें) और Create repository करें।
5. Add file → Upload files चुनें।
6. ZIP को पहले फोन में Extract करें। ZIP को सीधे upload न करें; उसके अंदर की फाइलें और `assets` folder अपलोड करें।
7. Commit changes करें।

## Step 2 — Supabase Backend बनाना
1. https://supabase.com पर अकाउंट बनाकर New project चुनें।
2. Project name और मजबूत database password सेट करें। Password सुरक्षित रखें।
3. Project बनने के बाद SQL Editor खोलें → New query.
4. इस प्रोजेक्ट की `supabase-schema.sql` फाइल का पूरा SQL कॉपी करके Run करें।
5. Authentication → URL Configuration में अपनी बाद में मिलने वाली Vercel website URL को Site URL और Redirect URLs में जोड़ें। शुरुआत में localhost/preview URL बाद में बदल सकते हैं।
6. Authentication → Providers → Email में Email OTP/Magic Link चालू रखें।
7. Authentication → Users में अपना ईमेल यूजर बनाकर/पहली बार लॉगिन करके User UUID कॉपी करें।
8. SQL Editor में यह चलाएँ, UUID बदलकर:
   `insert into public.app_admins (user_id) values ('YOUR_AUTH_USER_UUID');`
   यह बहुत जरूरी है: इससे सिर्फ आपका अकाउंट Admin बनेगा।

## Step 3 — Supabase keys जोड़ना
1. Supabase Project Settings → API (या Connect) खोलें।
2. Project URL और `anon` / `publishable` public key कॉपी करें।
3. GitHub में `config.js` खोलकर Edit करें:
   - `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE` की जगह Project URL
   - `PASTE_YOUR_SUPABASE_ANON_KEY_HERE` की जगह anon/public key
4. Save/Commit करें।

**कभी भी `service_role` या Secret key `config.js` या GitHub में न डालें।** Frontend में सिर्फ anon/publishable key इस्तेमाल होती है; असली सुरक्षा RLS policies देती हैं।

## Step 4 — Vercel पर Frontend deploy
1. https://vercel.com पर GitHub से Sign up/Login करें।
2. Add New → Project → अपना `personal-digital-card` repository Import करें।
3. Framework Preset: Other चुनें। Build command और Output directory खाली रखें (या Static files के रूप में deploy करें)।
4. Deploy दबाएँ।
5. Vercel URL कॉपी करें, जैसे `your-card.vercel.app`.
6. Supabase → Authentication → URL Configuration में Site URL और Redirect URLs में:
   `https://your-card.vercel.app/**`
   जोड़ें। Exact root URL को Site URL रखें।
7. `config.js` सही हो तो वेबसाइट खुल जाएगी।

## Step 5 — अपना प्रोफाइल भरना
1. वेबसाइट में Admin पर जाएँ।
2. वही ईमेल डालें जिसे आपने `app_admins` में Admin बनाया है।
3. Email में आया secure link उसी वेबसाइट पर खोलें।
4. Admin panel में नाम, title, bio, about, photo URL और public email भरकर Save करें।
5. Social link जोड़ने के लिए Platform और पूरा https URL डालें।
6. Private details अलग सेक्शन में भरें। वे public profile query में नहीं आतीं।

## जरूरी सुरक्षा और वर्तमान सीमाएँ
- Private details table पर RLS है; public/unauthenticated users उसे पढ़ नहीं सकते।
- Private details सिर्फ admin या approved signed-in user पढ़ सकता है।
- User को email magic link से sign-in करना होगा, फिर request form दोबारा submit करके request दर्ज होगी।
- Admin approval के बाद उसी user session से private details पढ़ी जा सकती हैं।
- यह शुरुआती Version 1 है। इसमें social link delete/edit UI, image upload UI, request email notifications, CAPTCHA/rate limiting और audit logs अभी शामिल नहीं हैं।
- Public profile fields public हैं; उनमें फोन नंबर या कोई निजी जानकारी न डालें।
- Free plans की quotas, inactivity pause और provider policies बदल सकती हैं। Production में launch से पहले test करें।
- किसी भी तरह की 100% hack-proof guarantee नहीं होती। RLS और सही key handling सुरक्षा की बुनियाद हैं।

## मोबाइल पर ZIP extract
Android में Files app → ZIP पर tap → Extract. फिर GitHub mobile website पर extracted files upload करें। अगर browser folder upload न दे, GitHub की web UI से एक-एक file/folder जोड़ें या GitHub मोबाइल ऐप/किसी भरोसेमंद ZIP extractor का उपयोग करें।
