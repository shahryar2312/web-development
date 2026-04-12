const sgMail = require('@sendgrid/mail');

/**
 * Send an email using SendGrid.
 * Configure SENDGRID_API_KEY in your .env file.
 *
 * @param {object} options - Email options { email, subject, message }
 */
const sendEmail = async (options) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('WARNING: SENDGRID_API_KEY is not set. Email not sent.');
    console.log(`Email intended for ${options.email}: ${options.message}`);
    return;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: options.email,
    from: process.env.EMAIL_FROM, // Replace with your verified sender
    subject: options.subject,
    text: options.message,
    // html: options.html, // Optional
  };

  try {
    await sgMail.send(msg);
    console.log('SendGrid message sent successfully');
  } catch (error) {
    console.error('SendGrid Error:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;
