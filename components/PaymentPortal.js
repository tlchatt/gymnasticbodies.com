'use client';
import Script from "next/script";
import { useEffect } from "react";
import Button from '@mui/material/Button';
import { GetSettings } from "@/lib/GetSettings";
import { useSearchParams } from 'next/navigation';
import { useState } from "react";
import axios from "axios";
import { useRouter } from 'next/navigation';
import { user } from "@/app/context/stateContext";
import Alert from '@mui/material/Alert';
import moment from 'moment-timezone'
import CircularIndeterminate from '@/components/CircularLoading';

export function PaymentPortal(props) {
    let testUrl = process.env.NEXT_PUBLIC_API_URL
    const router = useRouter();

    const { email, setEmail, setCustomerId } = user()
    let [error, setError] = useState(false)
    let [loading, setLoading] = useState(false)
    let [errorMessage, setErrorMessage] = useState("")
    let { Settings, Style, Media } = GetSettings(props, "PaymentPortal");
    let { isActive, isLargeMobile, isSmall, isLarge, isXLarge, isHD } = Media;
    const searchParams = useSearchParams();
    const amount = searchParams.get('amount');
    const term = searchParams.get('term');

    //set customer data above in global state


    useEffect(() => {
        window.responseHandler = function (response) {
            // handle response
            console.log("response is:", response)
            if (response.messages.resultCode === "Error") {
                var i = 0;
                while (i < response.messages.message.length) {
                    console.log(
                        response.messages.message[i].code + ": " +
                        response.messages.message[i].text
                    );
                    i = i + 1;
                }
            } else {
                paymentFormUpdate(response);
            }
        }
        function paymentFormUpdate(response) {
            //create variables
            document.getElementById("dataDescriptor").value = response.opaqueData.dataDescriptor;
            document.getElementById("dataValue").value = response.opaqueData.dataValue;
            document.getElementById("billToFirstName").value = response.customerInformation.firstName;
            document.getElementById("billToLastName").value = response.customerInformation.lastName;
            document.getElementById("billAmount").value = amount;
            let email = document.querySelector("#email").value;
            document.getElementById("billEmail").value = email;
            let phone = document.querySelector("#phone").value;
            document.getElementById("billPhone").value = phone;
            let country = document.querySelector("#search_country").value;
            document.getElementById("billCountry").value = country;
            let password = document.querySelector("#password").value;
            document.getElementById("userPassword").value = password;
            document.getElementById("billTerm").value = term;

            //set global state email
            setEmail(email)

            const formData = new FormData(document.getElementById("paymentForm"));

            // fetch(`${testUrl}/api/paymentPortal`, {
            //     method: 'POST',
            //     body: formData,
            // })
            setLoading(true);
            axios.post(`${testUrl}/api/paymentPortal`, formData)
                .then(response => {
                    setLoading(false);
                    console.log("response is:", response.data)
                    let testResponse = {
                        "message": "Transaction successful, but customer creation failed",
                        "transaction": true,
                        "customerCreated": false,
                        "subscriptionCreated": false,
                        "error": {
                            "transactionResponse": {
                                "responseCode": "2",
                                "authCode": "",
                                "avsResultCode": "B",
                                "cvvResultCode": "",
                                "cavvResultCode": "",
                                "transId": "81491921659",
                                "refTransID": "",
                                "transHash": "",
                                "testRequest": "0",
                                "accountNumber": "XXXX0002",
                                "accountType": "AmericanExpress",
                                "errors": [
                                    {
                                        "errorCode": "37",
                                        "errorText": "The credit card number is invalid."
                                    }
                                ],
                                "transHashSha2": "",
                                "SupplementalDataQualificationIndicator": 0
                            },
                            "messages": {
                                "resultCode": "Ok",
                                "message": [
                                    {
                                        "code": "I00001",
                                        "text": "Successful."
                                    }
                                ]
                            }
                        }
                    }
                    let transaction = response?.data?.data ? response?.data?.data.transaction : response?.data?.transaction
                    let customerCreated = response?.data?.data ? response?.data?.data.customerCreated : response?.data?.customerCreated
                    let subscriptionCreated = response?.data?.data ? response?.data?.data.subscriptionCreated : response?.data?.subscriptionCreated
                    console.log("transaction:", transaction)
                    console.log("customerCreated:", customerCreated)
                    console.log("subscriptionCreated:", subscriptionCreated)
                    //session token is: HNE8u0JV2oICvU0IpDaboMIG3Z7FlAeE
                    if (transaction && customerCreated && !subscriptionCreated) {//doesn't matter since card is being charged anyway - fix that
                        setError(true)
                        //useCase: Credit Card expires before the start of the subscription.
                        console.log("response.error:", response.data.error.data.messages.message[0].text)
                        setErrorMessage(response.data.error.data.messages ? response.data.error.data.messages.message[0].text : "Something went wrong! Contact Admin at admin@gymnasticbodies.com")
                    } else if (transaction && customerCreated) {
                        // router.push('/accountDetails')
                        // let name = response.data?.data?.firstName
                        // let id = response.data?.data?.userInNeon?.data?.data?.user?.id
                        // let userEmail = response.data?.data?.userInNeon?.data?.data?.user?.email
                        // let token = response.data?.data?.token
                        // localStorage.setItem('name', name);
                        // localStorage.setItem('userId', id);
                        // localStorage.setItem('username', userEmail);
                        // localStorage.setItem('authToken', token);
                        // localStorage.setItem('AuthExpirationDate', expirationDate);
                        // localStorage.setItem('refreshToken', token);
                        // localStorage.setItem('refreshExpireTime', refreshExpireTime);
                        // localStorage.setItem('timezone', timezone);
                        // localStorage.setItem('postAWS', postAWS);

                        const today = new Date();
                        const expirationDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                        const refreshExpireTime = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                        let postAWS = response?.data?.impInfo?.AuthorizeNextImport
                        const timezone = moment.tz.guess();

                        let user = {
                            ...response.data?.data?.userInNeon?.data?.data?.user,
                            token: response.data?.data?.token,
                            refreshToken: response.data?.data?.token,
                            expirationDate: expirationDate,
                            refreshExpireTime: refreshExpireTime,
                            timezone: timezone,
                            postAWS: postAWS,

                        }
                        console.log("user from localstorage in payment portal is:", user)
                        localStorage.setItem('user', JSON.stringify(user));

                        // //generate the url params using user object
                        // let paramsString = getParamStringUser(user)

                        // function getParamStringUser(user){
                        //     let finalString
                        //     for(let [key, value] of Object.entries(user)){

                        //         finalString = `${key}=${value}`
                        //     }
                        // }

                        router.push(`https://my.gymnasticbodies.com/?authToken=${user.token}&refreshToken=${user.token}&refreshExpireTime=${user.refreshExpireTime}&AuthExpirationDate=${user.expirationDate}&timezone=${user.timezone}&postAWS=${user.postAWS}&userId=${user.id}&username=${user.email}&name=${user.name}`)
                    }
                    else {
                        setError(true)
                        setErrorMessage(response.data.error.data.messages ? response.data.error.data.messages.message[0].text : "Something went wrong! Contact Admin at admin@gymnasticbodies.com")
                    }

                })
                .then(data => {
                    setLoading(false);
                    console.log("data is:", data)
                    let customerProfileId = data?.customerId?.data?.customerProfileId ? data?.customerId?.data?.customerProfileId : '803450130'
                    console.log("customerProfileId:", customerProfileId)
                    setCustomerId(customerProfileId)
                    // if()
                    // router.push('/accountDetails');
                })
                .catch(error => {
                    setLoading(false);
                    console.error("error is", error)
                    setError(true)
                    setErrorMessage("Transaction Failed, Try Again ! Contact Admin at admin@gymnasticbodies.com")

                });

            // document.getElementById("paymentForm").submit();
        }
    }, []);


    console.log("email:", email)

    let FormInnerStyle = {
        display: 'grid',
        // gap: isSmall ? Settings.standardGap : Settings.highPadding,//GW: could we add hghgap?
        position: 'relative',
        alignSelf: 'start',
        placeItems: 'unset',
        minWidth: '100%',
        overflow: 'inherit',
        gridTemplateColumns: '1fr 1fr'
    }

    return (
        <>
            {/* {!customerData && */}
            <div>
                <Script src="https://js.authorize.net/v3/AcceptUI.js" strategy="beforeInteractive" />
                {/* <div>Payment Portal</div> */}
                <form id="paymentForm"
                    method="POST"
                    style={FormInnerStyle}
                    action={`${testUrl}/api/paymentPortal`}>
                    <input type="hidden" name="dataValue" id="dataValue" />
                    <input type="hidden" name="dataDescriptor" id="dataDescriptor" />
                    <input type="hidden" name="billToFirstName" id="billToFirstName" />
                    <input type="hidden" name="billToLastName" id="billToLastName" />
                    <input type="hidden" name="billAmount" id="billAmount" />
                    <input type="hidden" name="billEmail" id="billEmail" />
                    <input type="hidden" name="billPhone" id="billPhone" />
                    <input type="hidden" name="billCountry" id="billCountry" />
                    <input type="hidden" name="billTerm" id="billTerm" />
                    <input type="hidden" name="userPassword" id="userPassword" />
                    <Button
                        type="button"
                        variant="contained"
                        color="primary"
                        style={{ marginTop: "2em", width: "max-content" }}
                        className="AcceptUI"
                        data-billingaddressoptions='{"show":true, "required":false}'
                        data-apiloginid="7F57wRjv"
                        data-clientkey="6vPVd2WmeVmz24UB5qkm8Avr3w5yxpAVW6c5MdkWT3kJ2E5U38A2Z5E2LZvdz9Qb"
                        data-acceptuiformbtntxt="Submit"
                        data-acceptuiformheadertxt="Card Information"
                        data-paymentoptions='{"showCreditCard": true, "showBankAccount": false}'
                        data-responsehandler="responseHandler"
                    >
                        Confirm & Pay
                    </Button>
                </form>
            </div>
            {/* } */}
            {error &&
                <Alert variant="filled" severity="error" style={{ marginTop: "20px" }}>
                    {errorMessage}
                </Alert>
            }
            {loading &&
                <CircularIndeterminate incomingStyle={{ width: "100%", height: "100%", top: "0", left: "0", background: "#FAFAFA", opacity: "0.3", zIndex: "5" }} />
            }

        </>

    );
}