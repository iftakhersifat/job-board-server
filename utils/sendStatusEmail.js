const nodemailer = require("nodemailer");

async function sendStatusEmail(recipientEmail, status, applicantName = "Applicant") {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail", 
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    let subject = "Update on Your Job Application";
    let message = "";

    switch (status) {
      case "Pending":
        message = `
          <p>Dear ${applicantName},</p>
          <p>Thank you for applying to our company. Your application is currently under review. We will get back to you soon with an update.</p>
          <p>Best regards,<br/><strong>HR Team</strong></p>
        `;
        break;

      case "Call For Interview":
        message = `
          <p>Dear ${applicantName},</p>
          <p>Congratulations! Your application has been shortlisted. We would like to invite you for an interview at our company.</p>
          <p>Please check your email or contact HR to schedule the interview.</p>
          <p>Best regards,<br/><strong>HR Team</strong></p>
        `;
        break;

      case "Hired":
        message = `
          <p>Dear ${applicantName},</p>
          <p>We are pleased to inform you that you have been selected for the position you applied for. Welcome to our company!</p>
          <p>HR will contact you shortly with the joining details.</p>
          <p>Best regards,<br/><strong>HR Team</strong></p>
        `;
        break;

      case "Rejected":
        message = `
          <p>Dear ${applicantName},</p>
          <p>We appreciate the time and effort you put into your application. After careful consideration, we regret to inform you that you have not been selected for this position.</p>
          <p>We wish you all the best in your future endeavors.</p>
          <p>Best regards,<br/><strong>HR Team</strong></p>
        `;
        break;

      default:
        message = `
          <p>Dear ${applicantName},</p>
          <p>Your application status has been updated to "${status}".</p>
          <p>Best regards,<br/><strong>HR Team</strong></p>
        `;
        break;
    }

    const mailOptions = {
      from: `"JOB BOX HR" <${process.env.MAIL_USER}>`,
      to: recipientEmail,
      subject: subject,
      html: message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Status email (${status}) sent to ${recipientEmail}`);
  } catch (err) {
    console.error("Failed to send status email:", err.message);
    throw err;
  }
}

module.exports = sendStatusEmail;
