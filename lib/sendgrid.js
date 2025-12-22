const sgMail = require('@sendgrid/mail')
export async function sendEmailErrorSG(data) {
  console.log('sendEmailErrorSG(data) {', data)
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const msg = {
    to: 'error@tlchatt.com',
    from: 'contact@gymnasticbodies.com',
    subject: '🎉 Error F*** on GymFit Password Reset,',
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
  console.log('sendEmailSG(data)', data)
  console.log('sendEmailSG(data) email', data.email)
  console.log('sendEmailSG(data) password', data.password)
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  // console.log(process.env.SENDGRID_API_KEY)
  //console.log(`\n app.post('/', (req, res) => { \n` ,req.body)
  const msg = {
    to: data.email,
    replyTo: "no-reply@tlchatt.com",
    from: "pc@tlchatt.com",
    subject: "Thank you for signing up for Gymnastic-bodies", //'Sending with SendGrid is Fun',
    //text: data?.message,// 'and easy to do anywhere, even with Node.js',
    // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
    content: [{
      type: 'text/html',
      value: `<h2>Thank you for signing up for Gymnastic-bodies, here are your initial sign on credentials, follow the link to login.</h2>
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
    replyTo: "no-reply@gymnasticbodies.com",
    from: "contact@gymnasticbodies.com",
    subject: "Link to reset your password for Gymnastic-bodies", //'Sending with SendGrid is Fun',
    //text: data?.message,// 'and easy to do anywhere, even with Node.js',
    // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
    content: [{
      type: 'text/html',
      value: `<h2>Following is the link to reset your password.</h2>
          <p><strong>Email: </strong> ${data.email}</p>
          <p><strong>Link: </strong> <a href="https://my.gymnasticbodies.com/reset-password/${data.userId}/none">https://my.gymnasticbodies.com/reset-password/</a></p>
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
  sgMail
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