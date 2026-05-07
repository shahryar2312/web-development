const sgMail = require('@sendgrid/mail');

/**
 * Send an email using SendGrid.
 * Configure SENDGRID_API_KEY and FROM_EMAIL in your .env file.
 *
 * @param {object} options - Email options { email, subject, message, html? }
 */
const sendEmail = async (options) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('WARNING: SENDGRID_API_KEY is not set. Email not sent.');
    console.log(`[DEV] Email intended for ${options.email}: ${options.message}`);
    return;
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.FROM_EMAIL;
  if (!fromAddress) {
    console.error('ERROR: EMAIL_FROM or FROM_EMAIL env var is not set.');
    throw new Error('Email could not be sent');
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: options.email,
    from: fromAddress,
    subject: options.subject,
    text: options.message,
    ...(options.html && { html: options.html }),
  };

  try {
    await sgMail.send(msg);
    console.log(`[SendGrid] Email sent to ${options.email}`);
  } catch (err) {
    console.error('[SendGrid] Error sending email:', err.message);
    if (err.response) {
      console.error('[SendGrid] Response body:', JSON.stringify(err.response.body));
    }
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;
