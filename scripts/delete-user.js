const { supabase } = require('./supabaseClient');

async function deleteUser() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node delete-user.js <email>');
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('users')
    .delete()
    .eq('email', email)
    .select();

  if (error) {
    console.error('Error deleting user:', error.message);
    return;
  }

  if (data.length === 0) {
    console.log('User not found.');
  } else {
    console.log('User deleted successfully:', data[0].email);
  }
}

deleteUser();
