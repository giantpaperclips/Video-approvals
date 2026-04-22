import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mzrnfgpaualhsgkfxecl.supabase.co";
const supabaseAnonKey = "sb_publishable_OMZhZeDG5FEES9xpXkbSSA_99mt_ctz";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);