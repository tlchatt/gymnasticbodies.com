'use client';
import { useEffect } from "react";
import Button from '@mui/material/Button';
import { useSearchParams } from 'next/navigation';
import { useState } from "react";
import axios from "axios";
import { useRouter } from 'next/navigation';
import { user } from "@/app/context/stateContext";
import Alert from '@mui/material/Alert';

import CircularIndeterminate from '@/components/CircularLoading';
import { storeInLocalStorage } from "@/lib/commonFunctions";

export function PaymentPortal(props) {
    let url = process.env.NEXT_PUBLIC_API_URL
    const router = useRouter();
    const { email, setEmail, setCustomerId } = user()
    let [error, setError] = useState(false)
    let [loading, setLoading] = useState(false)
    let [errorMessage, setErrorMessage] = useState("")
    const searchParams = useSearchParams();

    const amount = searchParams.get('amount');
    const term = searchParams.get('term');

    useEffect(() => {
        window.responseHandler = function (response) {
            // handle response
            console.log("response in responseHandler is:", response)
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
        async function paymentFormUpdate(response) {
            //create variables
            let email = document.querySelector("#email").value;
            let phone = document.querySelector("#phone").value;
            let password = document.querySelector("#password").value;
            let country = document.querySelector("#search_country").value;

            document.getElementById("dataDescriptor").value = response.opaqueData.dataDescriptor;
            document.getElementById("dataValue").value = response.opaqueData.dataValue;
            document.getElementById("billToFirstName").value = response.customerInformation.firstName;
            document.getElementById("billToLastName").value = response.customerInformation.lastName;
            document.getElementById("billAmount").value = amount;
            document.getElementById("billEmail").value = email;
            document.getElementById("billPhone").value = phone;
            document.getElementById("billCountry").value = country;
            document.getElementById("userPassword").value = password;
            document.getElementById("billTerm").value = term;

            //set global state email
            setEmail(email)
            setLoading(true);

            const formData = new FormData(document.getElementById("paymentForm"));
            try {
                let response = await axios.post(`${url}/api/paymentPortal`, formData)
                    .then(async response => {
                        setLoading(false);
                        console.log("response from /api/paymentPortal is:", JSON.stringify(response.data))
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
                        let responseData = response?.data?.data
                        let transaction = responseData ? responseData.transaction : response?.data?.transaction
                        let customerCreated = responseData ? responseData.customerCreated : response?.data?.customerCreated
                        let subscriptionCreated = responseData ? responseData.subscriptionCreated : response?.data?.subscriptionCreated
                        
                        console.log("transaction: ", transaction, "\n customerCreated value:",customerCreated, "\n subscriptionCreated value:",subscriptionCreated)

                        if (transaction && customerCreated && !subscriptionCreated) {//doesn't matter since card is being charged anyway - fix that
                            setError(true)
                            //useCase: Credit Card expires before the start of the subscription.
                            console.log("response.error:", response?.data?.error?.data?.messages?.message[0]?.text)
                            setErrorMessage(response?.data?.error?.data?.messages ? response?.data?.error?.data?.messages.message[0].text : "Something went wrong! Contact Admin at admin@gymnasticbodies.com")
                        } else if (transaction && customerCreated) {
                            let user = await storeInLocalStorage(response)
                            console.log("user in paymentFormUpdate is:", JSON.stringify(user))

                            router.push(`https://my.gymnasticbodies.com/?authToken=${user.token}&refreshToken=${user.token}&refreshExpireTime=${user.refreshExpireTime}&AuthExpirationDate=${user.expirationDate}&timezone=${user.timezone}&postAWS=${user.postAWS}&userId=${user.id}&username=${user.email}&name=${user.name}`)
                        }
                        else {
                            setError(true)
                            setErrorMessage(response?.data?.error?.data?.messages ? response?.data?.error?.data?.messages.message[0]?.text : "Something went wrong! Contact Admin at admin@gymnasticbodies.com")
                        }
                    })
                    .then(data => {
                        setLoading(false);
                        console.log("data in paymentFormUpdate is:", data)
                        let customerProfileId = data?.customerId?.data?.customerProfileId
                        console.log("customerProfileId:", customerProfileId)
                        setCustomerId(customerProfileId)
                        /*if(customerProfileId){
                            router.push('/accountDetails')
                        }*/
                    })
                    .catch(error => {
                        setLoading(false);
                        console.error("error is", error)
                        setError(true)
                        setErrorMessage("Transaction Failed, Try Again ! Contact Admin at admin@gymnasticbodies.com")

                    });
            } catch (error) {
                console.log("outer catch block:", error)
            }

        }
    }, []);

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
                {/* <div>Payment Portal</div> */}
                <form id="paymentForm"
                    method="POST"
                    style={FormInnerStyle}
                    action={`${url}/api/paymentPortal`}>
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