const { supabase } = require('./supabaseClient');

async function disableUser() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node disable-user.js <email>');
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('users')
    .update({ active: false })
    .eq('email', email)
    .select();

  if (error) {
    console.error('Error disabling user:', error.message);
    return;
  }

  if (data.length === 0) {
    console.log('User not found.');
  } else {
    console.log('User disabled successfully:', data[0].email);
  }
}

disableUser();
