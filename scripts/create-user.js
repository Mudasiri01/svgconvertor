const bcrypt = require('bcryptjs');
const { supabase } = require('./supabaseClient');

async function createUser() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node create-user.js <email> <password>');
    process.exit(1);
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword, active: true }])
      .select();

    if (error) {
      console.error('Error creating user:', error.message);
      return;
    }

    console.log('User created successfully:', data[0].email);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createUser();
