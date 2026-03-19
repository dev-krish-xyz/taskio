import Mailgen from "mailgen";

const RESEND_API_URL = "https://api.resend.com/emails";

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

  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!apiKey || !emailFrom) {
    console.error("[mail] Missing RESEND_API_KEY or EMAIL_FROM. Email not sent.");
    return;
  }

  const mail = {
    from: emailFrom,
    to: [options.email],
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  };

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(mail),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend API failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    console.log(`[mail] sent to ${options.email} — id: ${data?.id || "unknown"}`);
  } catch (error) {
    console.error(`[mail] FAILED to send to ${options.email}`);
    console.error(error);
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
