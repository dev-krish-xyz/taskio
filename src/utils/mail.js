import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      // Appears in header & footer of e-mails
      name: "Taskio",
      link: "https://taskio.app",
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  const emailHtml = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT, // true for 465, false for other ports
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: "mail.taskio@example.com",
    to: options.email,
    subject: options.subject,
    text: emailTextual, // plain‑text body
    html: emailHtml, // HTML body
  };

  try {
    await transporter.sendMail(mail);
  }
  catch (error) {
    console.error(
        "Email service failed silently. Make sure you have provided your MAILTRAP credentials in the .env file"
    );
    console.error("Error: ", error);
  }


};


const emailVerificationMailgenContent = (username, verificationUrl) => {
return {
    body: {
        name:username,
        intro: "Welcome to our app! We're very excited to have you on board",
        action: {
            instructions: 'To verify your email please click on the following button: ',
            button: {
                color: '#22BC66', // Optional action button color
                text: 'Verify your email',
                link: verificationUrl,
            }
        },
        outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
    }
}
};

const forgotPasswordMailgenContent = (username, verificationUrl) => {
return {
    body: {
        name:username,
        intro: "We got a request to reset the password of your account",
        action: {
            instructions: 'To reset your password click on the following button: ',
            button: {
                color: '#22BC66', // Optional action button color
                text: 'Reset password',
                link: verificationUrl,
            }
        },
        outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
    }
}
};


export {
    sendEmail, forgotPasswordMailgenContent, emailVerificationMailgenContent
};