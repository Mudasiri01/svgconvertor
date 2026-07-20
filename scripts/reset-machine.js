const { supabase } = require('./supabaseClient');

async function resetMachine() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node reset-machine.js <email>');
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('users')
    .update({ machine_id: null })
    .eq('email', email)
    .select();

  if (error) {
    console.error('Error resetting machine ID:', error.message);
    return;
  }

  if (data.length === 0) {
    console.log('User not found.');
  } else {
    console.log('Machine ID reset successfully for:', data[0].email);
  }
}

resetMachine();
