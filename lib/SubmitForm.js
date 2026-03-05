import Axios from 'axios'
// import { handleEmailDB, sendEmailSG } from './ServerActions'
export async function submitForm(branding, data) {
  let acquisitionData
  let contactCreated
  let sent
  const NEWAPI = process.env.REACT_APP_API_NEW
  console.log('async function submitForm(branding, data)')
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  data.to = branding.Settings.Email
  data.bcc = 'contact@tlchatt.com'
  data.from = 'contact@gymnasticbodies.com' 
  data.subject = `${branding.Settings.SiteTitle} Contact Form Submission from ${data.name}`

  if ((data?.email?.includes('@')) && (data?.email.includes('.'))) {
    data.replyTo = data.email
  }
  if (data?.DateTime) {
    data.DateTime = (data.DateTime.toLocaleTimeString() + ' ' + data.DateTime.toLocaleTimeString() + ' ' + localTimeZone)
  }

  // try {
  //   acquisitionData = await getAcquisitionData()
  //   if (acquisitionData) {
  //     data.acquisitionData = JSON.stringify(acquisitionData)
  //   }
  // } catch (error) {
  //   console.error('\n\n getAcquisitionData error :', error);
  // }

  try {
    // contactCreated = await handleEmailDB(data)
  } catch (error) {
    console.error('\n\n handleEmailDB(data) error :', error);
  }

  try {
    const config = {
      headers: {
        "Content-Type": "application/json"
      }
    }
    const res = await Axios.post(NEWAPI + '/api/user/contactUs', data, config);
    console.log("res in submitForm is:", res);
    return true;
  } catch (error) {
    console.log("error in submitForm is:", error);
    return false;
  }


  // if (sent && contactCreated) {
  //   console.log('sent', sent)
  //   // logEvent1()
  //   return true
  // }
  // else {
  //   // logEventProblem()
  // }
  // console.log('sendEmail data', data)
}