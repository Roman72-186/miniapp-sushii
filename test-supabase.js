const { supabase } = require('/root/miniapp-sushii/api/_lib/supabase');

async function test() {
  console.log('Testing Supabase connection...');
  
  const { data, error } = await supabase
    .from('users')
    .select('count');
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('✅ Supabase connected successfully!');
    console.log('Tables exist and accessible');
  }
}

test();
