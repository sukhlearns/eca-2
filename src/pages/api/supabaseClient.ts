// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aitpqnzvomzfzyjdqcob.supabase.co'; // replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpdHBxbnp2b216Znp5amRxY29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk3MDI3MTUsImV4cCI6MjA0NTI3ODcxNX0.4PrqMuxU8HcLjA4m_2DtsKnPjL-Ka9rsQ_KGhznjkZc'; // replace with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
