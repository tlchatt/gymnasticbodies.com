'use client';
import { useEffect, useRef } from "react";
import Button from '@mui/material/Button';
import { useSearchParams } from 'next/navigation';
import { useState } from "react";
import axios from "axios";
import { useRouter } from 'next/navigation';
import { user } from "@/app/context/stateContext";
import Alert from '@mui/material/Alert';

import CircularIndeterminate from '@/components/CircularLoading';
import { paymentFormUpdate, storeInLocalStorage } from "@/lib/commonFunctions";
import { ConnectingAirportsOutlined } from "@mui/icons-material";
import { paymentFunctionality } from "@/lib/commonServerFunction";
import { convertProcessSignalToExitCode } from "util";

export function PaymentPortal(props) {
    let url = process.env.NEXT_PUBLIC_API_URL
    console.log("url:", url)
    const router = useRouter();
    const { email, setEmail, setCustomerId } = user()
    let [error, setError] = useState(false)
    let [success, setSuccess] = useState(false)
    let [loading, setLoading] = useState(false)
    let [message, setMessage] = useState("")
    let [response, setResponse] = useState(null)
    const [count, setCount] = useState(5);
    const searchParams = useSearchParams();

    const amount = searchParams.get('amount');
    const term = searchParams.get('term');
    const trial = searchParams.get('trial');

    const formRef = useRef(null);
    console.log("inside useEffect", amount, term, trial)
    useEffect(() => {
        window.responseHandler = async function (response) {
            // handle response

            // console.log("response in responseHandler is:", response)

            // console.log("loading if:", loading)

            if (response?.messages?.resultCode === "Error") {
                var i = 0;
                while (i < response.messages.message.length) {
                    console.log(
                        response.messages.message[i].code + ": " +
                        response.messages.message[i].text
                    );
                    i = i + 1;
                }
            } else {
                // console.log("loading else:", loading)
                setResponse(response)
                // await paymentFormUpdate(response);
                // console.log("loading after else:", loading)
            }
        }
    });

    useEffect(() => {
        let timer
        console.log("response in component is:", response)

        if (response) {
            setLoading(true)
            const updateForm = async () => {
                let formResponse = await paymentFormUpdate(response, amount, term, trial, formRef);
                if (formResponse.existingCustomer) {//existing customer
                    if (count > 0) {
                        timer = setTimeout(() => setCount(count - 1), 1000);
                        setLoading(false)
                        setError(true)
                        setMessage(`${formResponse.message}. Redirecting in ${count} seconds...`)
                    } else {
                        router.push(`https://my.gymnasticbodies.com/`)
                    }
                    // router.push(`https://my.gymnasticbodies.com/`)
                } else {//new customer
                    console.log("formResponse in else:", formResponse)

                    let transaction = formResponse?.transaction ?? false
                    let customerCreated = formResponse?.customerCreated ?? false
                    let subscriptionCreated = formResponse?.subscriptionCreated ?? false

                    if (!transaction || !customerCreated || !subscriptionCreated) {//not successfull and a new customer
                        setLoading(false)
                        setError(true)
                        setMessage(`${formResponse?.message ?? "Transaction Failed!"} Please Try Again.`)
                    } else {//successfull and a new customer
                        //set success icon state to true here
                        console.log("formResponse in else after transaction:", formResponse)
                        let data = JSON.parse(formResponse.data)
                        let user = await storeInLocalStorage(data)
                        console.log("user in paymentFormUpdate is:", JSON.stringify(user))
                        setLoading(false)
                        setSuccess(true)
                        setMessage(`${formResponse.message}. Redirecting To Your Workouts ...`)
                        router.push(`https://my.gymnasticbodies.com/?authToken=${user.token}&refreshToken=${user.token}&refreshExpireTime=${user.refreshExpireTime}&AuthExpirationDate=${user.expirationDate}&timezone=${user.timezone}&postAWS=${user.postAWS}&userId=${user.id}&username=${user.email}&name=${user.name}`)
                    }
                }
            };
            updateForm();
        }
        return () => {
            if (timer) clearTimeout(timer);
        };

    }, [response, count]);

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
                    ref={formRef}
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
                    <input type="hidden" name="postAWS" id="postAWS" />
                    <input type="hidden" name="trial" id="trial" />
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
                    {message}
                </Alert>
            }
            {success &&
                <Alert severity="success" style={{ marginTop: "20px" }}>{message}</Alert>
            }
            {loading &&
                <CircularIndeterminate incomingStyle={{ width: "100%", height: "100%", top: "0", left: "0", background: "#FAFAFA", opacity: "0.3", zIndex: "5" }} />
            }

        </>

    );
}