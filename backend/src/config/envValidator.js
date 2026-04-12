/**
 * Validates that all required environment variables are set.
 * Crashes the process with a clear error message if any are missing.
 */
const validateEnv = () => {
  const required = [
    'MONGO_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`ERROR: Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please check your .env file.');
    process.exit(1);
  }

  // Ensure secrets aren't using placeholders in production
  if (process.env.NODE_ENV === 'production') {
    const placeholders = ['change_this_access_secret', 'change_this_refresh_secret'];
    const usedPlaceholders = [
      process.env.JWT_ACCESS_SECRET,
      process.env.JWT_REFRESH_SECRET,
    ].filter((val) => placeholders.includes(val));

    if (usedPlaceholders.length > 0) {
      console.warn('WARNING: Using placeholder values for JWT secrets in production!');
    }
  }
};

module.exports = validateEnv;
