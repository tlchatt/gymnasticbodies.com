const sgMail = require('@sendgrid/mail')
export async function sendEmailErrorSG(data) {
  console.log('sendEmailErrorSG(data) {', data)
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const msg = {
    to: 'error@tlchatt.com',
    from: process.env.SENDGRID_FROM,
    subject: '🎉 Error F*** on GymFit,',
    content: [{
      type: 'text/html',
      value: `<h2>Data:</h2>
        <p>${JSON.stringify(data)}</p>
        <p>%open-track%</p>`
    }],
    trackingSettings: {
      clickTracking: {
        enable: true,
        enableText: false
      },
      openTracking: {
        enable: true,
        substitutionTag: '%open-track%'
      },
      subscriptionTracking: {
        enable: false
      }
    }
  }
  let sgRes = sgMail
    .send(msg)
    .then(() => {
      console.log('\n\n 🎉 Email Sent !')
      console.log('\n', msg, '\n')
      console.log('\n\n')
      return true
    })
    .catch((error) => {
      console.log('\n\n 🎉 Email Error Error F*** !')
      if (error?.response?.body) {
        error = error?.response?.body
      }
      console.log('\n', msg, '\n')
      console.log('!\n', error, '\n')
      console.log('!\n\n')
      return false
    })
  return sgRes
}

export async function sendCredentialsEmailSG(data) {
  console.log('sendEmailSG(data) email', data.email)
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  //console.log(`\n app.post('/', (req, res) => { \n` ,req.body)
  const msg = {
    to: data.email,
    from: 'noreply@gymnasticbodies.com',
    subject: "Thank you for signing up for Gymnasticbodies", //'Sending with SendGrid is Fun',
    //text: data?.message,// 'and easy to do anywhere, even with Node.js',
    // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
    content: [{
      type: 'text/html',
      value: `<h2>Thank you for signing up for Gymnasticbodies, here are your initial sign on credentials, follow the link to login.</h2>
            <p><strong>Email: </strong> ${data.email}</p>
            <p><strong>Password: </strong> ${data.password}</p>
            <p><strong>Link to login: </strong> <a href="https://my.gymnasticbodies.com/">https://my.gymnasticbodies.com/</a></p>
            <p>%open-track%</p>`
    }],
    trackingSettings: {
      clickTracking: {
        enable: true,
        enableText: false
      },
      openTracking: {
        enable: true,
        substitutionTag: '%open-track%'
      },
      subscriptionTracking: {
        enable: false
      }
    }
  }
  let sgRes = sgMail
    .send(msg)
    .then(() => {
      console.log('\n\n 🎉 Email Sent !')
      console.log('\n', msg, '\n')
      console.log('\n\n')
      return true
    })
    .catch((error) => {
      console.log('\n\n 🎉 Email Error F*** !')
      if (error?.response?.body) {
        error = error?.response?.body
      }
      console.log(error)
      console.log('\n', msg, '\n')
      console.log('!\n', error, '\n')
      console.log('!\n\n')
      let data = {
        msg: msg,
        error: error
      }
      sendEmailErrorSG(data)

      return false
    })
  return sgRes
}

export async function sendResetLinkEmailSG(data) {
  console.log('sendEmailSG(data)', data)
  console.log('sendEmailSG(data) email', data.email)
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const msg = {
    to: data.email,
    from: 'noreply@gymnasticbodies.com',
    subject: "Link to reset your password for Gymnasticbodies", //'Sending with SendGrid is Fun',
    //text: data?.message,// 'and easy to do anywhere, even with Node.js',
    // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
    content: [{
      type: 'text/html',
      value: `<h2>Following is the link to reset your password.</h2>
          <p><strong>Email: </strong> ${data.email}</p>
          <p><strong>Link: </strong> <a href="https://my.gymnasticbodies.com/reset-password/${data.userId}/${data.token || 'none'}">https://my.gymnasticbodies.com/reset-password/</a></p>
          <p>This link expires in one hour.</p>
          <p>%open-track%</p>`
    }],
    trackingSettings: {
      clickTracking: {
        enable: true,
        enableText: false
      },
      openTracking: {
        enable: true,
        substitutionTag: '%open-track%'
      },
      subscriptionTracking: {
        enable: false
      }
    }
  }
  let sgRes = sgMail
    .send(msg)
    .then(() => {
      console.log('\n\n 🎉 Email Sent !')
      console.log('\n', msg, '\n')
      console.log('\n\n')
      return true
    })
    .catch((error) => {
      console.log('\n\n 🎉 Email Error F*** !')
      if (error?.response?.body) {
        error = error?.response?.body
      }
      console.log(error)
      console.log('\n', msg, '\n')
      console.log('!\n', error, '\n')
      console.log('!\n\n')
      let data = {
        msg: msg,
        error: error
      }
      sendEmailErrorSG(data)

      return false
    })
  return sgRes
}

export async function sendSubsCancelledEmailSG(email) {
  console.log('sendEmailSG(data)', email)
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const msg = {
    to: email,
    from: 'noreply@gymnasticbodies.com',
    subject: "Your Subscription to Gymnasticbodies is Cancelled", //'Sending with SendGrid is Fun',
    //text: data?.message,// 'and easy to do anywhere, even with Node.js',
    // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
    content: [{
      type: 'text/html',
      value: `<h2>Subscription Changed</h2>
          <p>Your subscription to gymnasticbodies is cancelled</p>
         
          <p>%open-track%</p>`
    }],
    trackingSettings: {
      clickTracking: {
        enable: true,
        enableText: false
      },
      openTracking: {
        enable: true,
        substitutionTag: '%open-track%'
      },
      subscriptionTracking: {
        enable: false
      }
    }
  }
  let sgRes = sgMail
    .send(msg)
    .then(() => {
      console.log('\n\n 🎉 Email Sent !')
      console.log('\n', msg, '\n')
      console.log('\n\n')
      return true
    })
    .catch((error) => {
      console.log('\n\n 🎉 Email Error F*** !')
      if (error?.response?.body) {
        error = error?.response?.body
      }
      console.log(error)
      console.log('\n', msg, '\n')
      console.log('!\n', error, '\n')
      console.log('!\n\n')
      let data = {
        msg: msg,
        error: error
      }
      sendEmailErrorSG(data)

      return false
    })
  return sgRes
}
export async function sendEmailChangeSG(toEmail, verificationLink) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const msg = {
    to: toEmail,
    from: 'noreply@gymnasticbodies.com',
    subject: 'Confirm your new email address — GymnasticBodies',
    content: [{
      type: 'text/html',
      value: `<h2>Confirm your new email</h2>
        <p>Click the link below to confirm <strong>${toEmail}</strong> as your new GymnasticBodies email address.</p>
        <p><a href="${verificationLink}" style="background:#f05621;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Confirm Email Change</a></p>
        <p>This link expires in 24 hours. If you did not request this change, you can safely ignore this email.</p>
        <p>%open-track%</p>`,
    }],
    trackingSettings: {
      clickTracking: { enable: true, enableText: false },
      openTracking: { enable: true, substitutionTag: '%open-track%' },
      subscriptionTracking: { enable: false },
    },
  }
  return sgMail.send(msg).then(() => true).catch((error) => {
    console.error('sendEmailChangeSG error:', error?.response?.body ?? error)
    return false
  })
}

export async function sendEmailSG(data) {
  console.log('sendEmailSG(data) {', data)
  console.log('sendEmailSG a p k', process.env.SENDGRID_API_KEY)
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  // console.log(process.env.SENDGRID_API_KEY)
  //console.log(`\n app.post('/', (req, res) => { \n` ,req.body)
  let msg

  if (data.mediaId) {
    msg = {
      to: data.to,
      bcc: data?.bcc,
      replyTo: data?.replyTo,
      from: data?.from,
      subject: data?.subject, //'Sending with SendGrid is Fun',
      //text: data?.message,// 'and easy to do anywhere, even with Node.js',
      // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
      content: [{
        type: 'text/html',
        value: `<h2>${data?.subject}</h2>`
      }]
    }
  } else {
    msg = {
      to: data.to,
      bcc: data?.bcc,
      replyTo: data?.replyTo,
      from: data?.from,
      subject: data?.subject, //'Sending with SendGrid is Fun',
      //text: data?.message,// 'and easy to do anywhere, even with Node.js',
      // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
      content: data?.DateTime ? [{
        type: 'text/html',
        value: `<h2>${data?.subject}</h2>
            <p><strong>${data?.name}: </strong>${data?.message}</p>
            <h2>Sender Contact Information:</h2>
            <p><strong>Name: </strong>${data?.name}</p>
            <p><strong>Phone: </strong>${data?.phone}</p>
            <p><strong>Email: </strong>${data?.email}</p>
            <p><strong>Scheduled Meeting: </strong>${data?.DateTime}</p>
            <p><strong>Calendar Invite: </strong>${data?.CalendarInvite}</p>
            <p><strong>Text Reminders: </strong>${data?.TextReminders}</p>
            <p><strong>Email Reminders: </strong>${data?.EmailReminders}</p>
            <p><strong>Acquisition Data: </strong>${data?.acquisitionData}</p>
            <p>%open-track%</p>`
      }]
        :
        [{
          type: 'text/html',
          value: `<h2>${data?.subject}</h2>
        <p><strong>${data?.name}: </strong>${data?.message}</p>
        <h2>Sender Contact Information:</h2>
        <p><strong>Name: </strong>${data?.name}</p>
        <p><strong>Phone: </strong>${data?.phone}</p>
        <p><strong>Email: </strong>${data?.email}</p>
        <p><strong>Acquisition Data: </strong>${data?.acquisitionData}</p>
        <p>%open-track%</p>`
        }],
      trackingSettings: {
        clickTracking: {
          enable: true,
          enableText: false
        },
        openTracking: {
          enable: true,
          substitutionTag: '%open-track%'
        },
        subscriptionTracking: {
          enable: false
        }
      }
    }
  }


  let sgRes = sgMail
    .send(msg)
    .then(() => {
      console.log('\n\n 🎉 Email Sent !')
      console.log('\n', msg, '\n')
      console.log('\n\n')
      return true
    })
    .catch((error) => {
      console.log('\n\n 🎉 Email Error F*** !')
      if (error?.response?.body) {
        error = error?.response?.body
      }
      console.log(error)
      console.log('\n', msg, '\n')
      console.log('!\n', error, '\n')
      console.log('!\n\n')
      let data = {
        msg: msg,
        error: error
      }
      sendEmailErrorSG(data)

      return false
    })
  return sgRes
}