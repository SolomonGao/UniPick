import { createClient } from '@supabase/supabase-js';
// 引入生成的类型文件
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// 泛型注入 <Database>，从此 supabase.from('items').select() 
// 会自动知道 items 表里有 price 字段，而且是 number 类型！
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);