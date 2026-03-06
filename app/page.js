'use client';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import Icon from '@mui/material/Icon';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import CircularIndeterminate from '@/components/CircularLoading';
import Image from 'next/image';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import { RandomImages } from '@/components/RandomImages';
import Copyright from '@/components/Copyright';
import { ContactUs } from '@/components/ContactUs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import moment from 'moment-timezone'
import { getAllDataFromFile } from '@/lib/commonServerFunction';
// import allAuthorizeData from '../data/allAuthorizeData.json'


export default function Home() {
  const router = useRouter();
  let testUrl = process.env.NEXT_PUBLIC_API_URL
  let appUrl = process.env.NEXT_PUBLIC_APP_URL
  let [loading, setLoading] = useState(false)
  let commonGap = {
    gap: "10px",
    display: "flex",
    flexFlow: "column"
  }
  let containerStyle = {

  }
  let subscribeStyle = {
    right: "0",
    position: "absolute",
    margin: "5px",
    background: "linear-gradient(18deg, #fcb14e 0%, #f05621 100%) !important",
    zIndex: "3"
  }
  let paperStyle = {
    // margin: "28px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: '100%',
    justifyContent: 'center',
    textAlign: 'center',
  }
  let logoStyle = {
    maxWidth: "300px",
    margin: "auto",
    objectFit: 'cover'
  }
  let formContentStyle = {
    position: "fixed",
    right: "0",
    top: "0",
    bottom: "0",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  }
  function handleContactForm() {
    let contactFormDiv = document.querySelectorAll("#contactFormDiv")[0]
    let displayOfContactForm = contactFormDiv.style.display
    if (displayOfContactForm == "none") {
      contactFormDiv.style.display = "grid"
      contactFormDiv.style.alignItems = "center"
    } else {
      contactFormDiv.style.display = "none"
    }
  }
  async function handleLogin(e) {
    setLoading(true);
    const form = document.querySelectorAll('#loginForm')[0];
    const formData = new FormData(form);
    const values = Object.fromEntries(formData);
    const config = {
      headers: {
        "Content-Type": "application/json"
      }
    }
    console.log("values", values);
    if (values.email) {
      let data = {
        username: values.email,
        password: values.password,

      }

      //check if the email is in the neon database

     /* let response = await fetch(`${testUrl}/api/authentication`, {
        method: 'POST',
        config,
        body: JSON.stringify(data)
      })
      let userInfo = await response.json()

      let customerData = await getAllDataFromFile(values.email)
      let merchantId = customerData?.result?.profile?.merchantCustomerId;
      let customerId = customerData?.result?.profile?.customerProfileId;

      console.log("customerId:", customerId, "\nerchantId:", merchantId, "\customerData:", customerData)

      if (userInfo.status == "UNAUTHORIZED") {
        //check if users email is in neon db
        let checkNeonDB = {
          email: values.email,
          reason: "checkUserInNeon"
        }
        let response = await fetch(`${testUrl}/api/user/subscription`, {
          method: 'POST',
          config,
          body: JSON.stringify(checkNeonDB)
        })
        let userInNeon = await response.json()
        console.log("userInNeon:", userInNeon)

        // let customerData = allAuthorizeData.find(data => data.result.profile.email === values.email);
        // console.log("customerData:", customerData)
        // merchantId = customerData?.result?.profile?.merchantCustomerId;

        if (!customerId && !userInNeon.data) {
          router.push(`${testUrl}/subscribe`)//customer is neither in authorize nor in db (email check)
        }
        if (customerId && !userInNeon.data) {
          let customerName = customerData?.result?.profile?.paymentProfiles ? customerData?.result?.profile?.paymentProfiles[0]?.billTo?.firstName : "N/A"
          console.log("customerName:", customerName)
          // customer in authorize but not in db
          let createUserData = {
            email: values.email,
            password: values.password,
            reason: "registerWPass",
            first_name: customerName
          }
          let response = await fetch(`${testUrl}/api/user/subscription`, {
            method: 'POST',
            config,
            body: JSON.stringify(createUserData)
          })
          userInfo = await response.json()

        }
      }
      // let customerData = allAuthorizeData.find(data => data.result.profile.email === values.email);


      console.log("userInfo:", userInfo)

      const today = new Date();
      const expirationDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const refreshExpireTime = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const timezone = moment.tz.guess();
      let token = userInfo.token ? userInfo.token : userInfo.data.token
      let name = userInfo.user ? userInfo.user.name : userInfo.data.user.name
      let id = userInfo.user ? userInfo.user.id : userInfo.data.user.id
      let email = userInfo.user ? userInfo.user.email : userInfo.data.user.email
      console.log("merchantId:", merchantId)
      let postAWS = merchantId ? false : true//true limited options, false has all options
      console.log("postAWS:", postAWS)
      console.log("token:", token)
      localStorage.setItem('name', name);
      localStorage.setItem('userId', id);
      localStorage.setItem('username', email);
      localStorage.setItem('authToken', token);
      localStorage.setItem('AuthExpirationDate', expirationDate);
      localStorage.setItem('refreshToken', token);
      localStorage.setItem('refreshExpireTime', refreshExpireTime);
      localStorage.setItem('timezone', timezone);
      localStorage.setItem('postAWS', postAWS);*/

      /**TODO - store entire user object in localhost - reusable function */
      /*let user = {
        ...userInfo,
        expirationDate: expirationDate,
        refreshExpireTime: refreshExpireTime,
        timezone: timezone,
        postAWS: postAWS,

      }
      localStorage.setItem('user', JSON.stringify(user));*/

      /*var testObject = { 'one': 1, 'two': 2, 'three': 3 };

      // Put the object into storage
      localStorage.setItem('testObject', JSON.stringify(testObject));

      // Retrieve the object from storage
      var retrievedObject = localStorage.getItem('testObject');

      console.log('retrievedObject: ', JSON.parse(retrievedObject));*/

      // router.push(`${appUrl}?authToken=${token}&refreshToken=${token}&refreshExpireTime=${refreshExpireTime}&authExpireTime=${expirationDate}&timezone=${timezone}`)
      /*setLoading(false);
      router.push(`https://my.gymnasticbodies.com/?authToken=${token}&refreshToken=${token}&refreshExpireTime=${refreshExpireTime}&AuthExpirationDate=${expirationDate}&timezone=${timezone}&postAWS=${postAWS}&userId=${id}&username=${email}&name=${name}`)
*/
    }
  }

  return (
    <>
      {/* <a href={"/subscribe"}>
        <Button variant="contained" style={subscribeStyle} >
          Get Started
        </Button>

      </a> */}
      {loading &&
        <CircularIndeterminate incomingStyle={{ width: "100%", height: "100%", top: "0", left: "0", background: "#FAFAFA", opacity: "0.3", zIndex: "5" }} />
      }
      <Grid container spacing={1} style={containerStyle}>
        <Grid size={{ xs: 0, sm: 7 }}>
          <RandomImages />
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }} style={formContentStyle}>
          <div style={paperStyle} id="loginFormDiv">
            <div style={{ width: '100%', height: '84px', position: 'relative' }}>
              <Link href={`/`}>
                <Image
                  src="/images/log_in/GFmarkandName.png"
                  alt="logo"
                  style={logoStyle}
                  fill
                />
              </Link>
            </div>
            <LoginForm />
            <Box mt={5} style={commonGap}>
              <Copyright />
              <div style={{ zIndex: "2", display: "grid", justifyItems: "center" }}>
                <Button
                  type="button"
                  variant="contained"
                  color="primary"
                  style={{ fontSize: "1rem", letterSpacing: 1 }}
                  // className={classes.submit}
                  onClick={() => handleContactForm()}
                >
                  Contact Support
                </Button>
              </div>
            </Box>
          </div>
          <div id="contactFormDiv" style={{ overflow: "auto", height: "100%", display: "none", position: "absolute", zIndex: "2" }}>
            <IconButton className='close-button' aria-label="close" onClick={handleContactForm} style={{ justifyContent: "flex-end" }}>
              <HighlightOffIcon sx={{ fontSize: 30 }} />
            </IconButton>
            <ContactUs />
          </div>
        </Grid>
      </Grid>
    </>
  );
  function LoginForm() {
    let initValue, formInfo = {}
    let [value, setValue] = useState(initValue);
    let formStyle = {
      width: "80%",
      ...commonGap
    }
    let passwordLength = 10
    async function handleValue(e) {
      console.log("e.current", e.target.id, ":", e.target.value)
      formInfo = { ...formInfo, [e.target.id]: e.target.value }
      setValue(e.target.value)

    }
    console.log("formInfo:", formInfo)
    return (
      <form style={formStyle} noValidate id="loginForm">
        <TextField
          variant="outlined"
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          // onChange={e => handleValue(e)}
          autoComplete="email"
          autoFocus
        />
        <TextField
          variant="outlined"
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          // onChange={e => handleValue(e)}
          helperText={`Must be at least ${passwordLength} characters`}
          slotProps={{
            // This targets the actual <input> element
            htmlInput: {
              minLength: 10
            }
          }}
          id="password"
          autoComplete="current-password"
        />
        <Button
          type="button"
          fullWidth
          variant="contained"
          color="primary"
          style={{ fontSize: "1rem", letterSpacing: 1 }}
          // className={classes.submit}
          onClick={(e) => handleLogin(e)}
        // disabled={!props.validEmail}
        >
          {/* 1.a.check if in neon db */}
          Sign In
        </Button>
        <Grid container>
          <Grid item xs style={{ textAlign: "left" }}>
            <Link href="/reset">
              Forgot your password?
            </Link>

          </Grid>
        </Grid>
      </form>

    )
  }
}


