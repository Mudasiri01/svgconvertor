const { supabase } = require('./supabaseClient');

async function enableUser() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node enable-user.js <email>');
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('users')
    .update({ active: true })
    .eq('email', email)
    .select();

  if (error) {
    console.error('Error enabling user:', error.message);
    return;
  }

  if (data.length === 0) {
    console.log('User not found.');
  } else {
    console.log('User enabled successfully:', data[0].email);
  }
}

enableUser();
