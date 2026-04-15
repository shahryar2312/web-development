/**
 * Validates that all required environment variables are set.
 * Crashes the process with a clear error message if any are missing.
 */
const validateEnv = () => {
  const required = [
    'MONGO_URI',
    'SESSION_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`ERROR: Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please check your .env file.');
    process.exit(1);
  }

  // Ensure secrets aren't using placeholders in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.SESSION_SECRET === 'change_this_session_secret') {
      console.warn('WARNING: Using placeholder value for SESSION_SECRET in production!');
    }
  }
};

module.exports = validateEnv;
