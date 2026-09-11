require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from("messages").select("*").eq("media_type", "image").order("created_at", { ascending: false }).limit(1).then(res => console.log(JSON.stringify(res.data, null, 2)));
