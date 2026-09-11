require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from("messages").delete().eq("account_id", "123e4567-e89b-12d3-a456-426614174000").then(res => console.log("Messages DB Delete Error:", res.error));
