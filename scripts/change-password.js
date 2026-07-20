const bcrypt = require('bcryptjs');
const { supabase } = require('./supabaseClient');

async function changePassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Usage: node change-password.js <email> <newPassword>');
    process.exit(1);
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { data, error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email)
      .select();

    if (error) {
      console.error('Error changing password:', error.message);
      return;
    }

    if (data.length === 0) {
      console.log('User not found.');
    } else {
      console.log('Password updated successfully for:', data[0].email);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

changePassword();
