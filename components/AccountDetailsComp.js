'use client'
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { GetSettings } from "@/lib/GetSettings.js";
import { DateTime } from 'luxon';
import { StandardContainer } from '@/components/StandardContainer/StandardContainer';
import { getUserWithEmail, queryUserSetting, updateUserSetting } from '@/lib/userSettings';
import { user } from "@/app/context/stateContext";
import useSWR from 'swr'
import axios from "axios";
import CircularIndeterminate from '@/components/CircularLoading';
import { Button, Stack } from '@mui/material';
import ModalPopUp from './ModalPopUp';
import { CancelSubscriptionInAuthorize } from '@/lib/commonServerFunction';
import { useState } from 'react';
import { getAccountInformation, getCorrectNameFormat } from '@/lib/commonFunctions';
import { PaymentPortal } from './PaymentPortal';
import { Suspense } from 'react';
import Script from 'next/script';
import Checkout from '@/app/checkout/page';

export default function AccountDetailsComp({ data }) {
    let [loading, setLoading] = useState(false)
    let [displayPayWall, setDisplayPayWall] = useState(false)
    let {
        impInfo,
        lastTransactionInvoiceNumber
    } = data ?? {}

    let titleStyle = {
        color: "#656464",
        padding: "24px 0 0",
    }

    let SubscriptionData = [
        {
            ButtonText: "Add Subscription"

        }
    ]
    let paymentUpdateData =
    {
        title: "Insert payment details",
        subTitle: `Subscription Plan: [Original Plan Info]`,
        ButtonText: "Update Payment Method",
        SecondaryButtonText: "",//for the modal
        PrimaryButtonText: "Yes, Create Subscription",//for the modal
        function: "payment",
        primaryOnClick: cancelSubscription,
        secondaryOnClick: "close"
    }

    let paymentPortalData = {
        title: "Update Payment to activate your subscription - [subscription Information]",
        buttonText: "Update Payment Method",
        email: impInfo?.email,
        name: impInfo?.firstName,
        price: impInfo?.amount,

    }
    // let plan =  data?.impInfo?.
    let updatePaymentInfo = {//for non auth users, and (in future) for those whose credit card details have expired
        title: "Review And Update Payment",
        subTitle: `To continue enjoying your workout subscription, update your payment info!`,
        boldSubText: impInfo?.status == "Active" ? `` : `Renewing  Plan: $${impInfo?.price} ${impInfo?.matchedTerm}`,
        ButtonText: "Update Payment Info",
        // SecondaryButtonText: "Never Mind",//for the modal
        SecondaryButtonPosition: "right",
        // PrimaryButtonText: "Yes, Cancel Subscription",//for the modal
        primaryOnClick: cancelSubscription,
        secondaryOnClick: "close",
        function: "paymentUpdate",
        note: false

    }


    let formData = {
        "steps": [
            "form-Options"
        ],
        "form-Options": {
            "inputs": [
                {
                    "type": "form-Options",
                    "options": [
                        {
                            "type": "formOption",
                            "formTitle": "Subscription Information",
                            "id": "Subscription Information",
                            "buttonText": "Submit",
                            "inputs": [
                                // {
                                //     "type": "text",
                                //     "content": "First Name *",
                                //     "id": "first_name",
                                //     "required": true,
                                //     "width": "half"
                                //   },
                                //   {
                                //     "type": "text",
                                //     "content": "Last Name *",
                                //     "id": "last_name",
                                //     "required": true,
                                //     "width": "half"
                                //   },
                                {
                                    "type": "tel",
                                    "content": "Phone ( + Country Code ) *",
                                    "id": "phone",
                                    "required": true,
                                    "width": "full"
                                },
                            ]
                        }
                    ]
                }
            ]
        },
        "scheme": "secondary",
        "note": false,
        "title": "",
        "style": { padding: '0' }
    }
    console.log("data??????????", data)
    const nextPayment = new Date(impInfo.redableNextPaymentDate)

    const todaysDate = new Date()
    let userData = {
        billEmail:impInfo?.email,
        billToFirstName:impInfo?.firstName,
        billToLastName:impInfo?.lastName,
        billAmount:impInfo?.price,
        billTerm:impInfo?.matchedTerm,
        billStartDate:impInfo?.nextPaymentDate != "N/A" && impInfo?.nextPaymentDate ? impInfo?.nextPaymentDate : todaysDate,
        postAWS:false
    }


    return (
        <>
            <Typography variant='h3' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>ACCOUNT
            </Typography>

            <Stack direction="column" spacing={2} style={{ margin: "20px" }}>
                {/* <Script src="https://js.authorize.net/v3/AcceptUI.js" strategy="afterInteractive" />
                <Suspense>
                    <PaymentPortal data={paymentPortalData} />
                </Suspense> */}

                {impInfo?.nextPaymentDate && impInfo?.matchedTerm !== "oneTime" && impInfo?.matchedTerm !== "N/A" && new Date(nextPayment) < new Date(todaysDate) &&
                    <ModalPopUp data={updatePaymentInfo} formData={formData} paywall={true} userData={userData} />
                }

                {/* <ModalPopUp data={updatePaymentInfo} formData={formData} paywall={true} userData={userData} /> */}


                {/* <Checkout /> */}

                <DisplayUser data={data} />

                <DisplayOrder data={data} />

                <DisplaySubscription data={data} />

            </Stack >
        </>

    );




}
function DisplayUser({ data }) {
    let {
        impInfo
    } = data ?? {}

    let content = [
        { "First Name": impInfo?.firstName },
        { "Last Name": impInfo?.lastName },
        { "Email": impInfo?.email },
        { "Country": impInfo?.country },
        { "Phone": impInfo?.phoneNumber },
    ]

    let paymentPortalData = {
        title: "Update Payment to activate your subscription - [subscription Information]",
        buttonText: "Update Payment Method",
        email: impInfo?.email,
        name: impInfo?.firstName,
        price: impInfo?.amount,

    }

    return (
        <GridBox>
            <Stack direction="row" spacing={2} style={{ margin: "20px" }}>
                <Headline data={"User Information"} />
                {/* <Stack direction="column" spacing={2} style={{ width: "100%", display: "flex", alignItems: "flex-end" }}>
                       <a href={"https://my.gymnasticbodies.com/"}>
                           <Button size='large' autoFocus variant='contained' >
                               See Workout
                           </Button>
                       </a>
                   </Stack> */}
            </Stack>

            <Stack direction="row" spacing={2} style={{ margin: "20px", display: "grid" }}>
                <Content content={content} />
            </Stack>
        </GridBox>

    )
}
function DisplayOrder({ data }) {

    let {
        cardType,
        cardNumber,
        impInfo,
        lastTransactionInvoiceNumber,
        lastTransactionStatus,
        transactionHistory
    } = data ?? {}
    console.log("data in displayOrder:", impInfo)
    let presentContent = [
        { "Status": impInfo?.status },
        { "Last Order Date": impInfo?.redableRecentTransactionDate },
        { "Invoice": lastTransactionInvoiceNumber },
        { "Amount": `${impInfo?.price} ${impInfo?.matchedTerm}` },
        { "Next Payment Date": impInfo?.redableNextPaymentDate },
        { "Payment Method": cardType != "N/A" ? `${cardType} ending in ${cardNumber}` : 'No Payment Info Added' },
    ]
    let otherSourcesContent = [
        { "Status": impInfo?.status },
        { "Amount": `${impInfo?.price} ${impInfo?.matchedTerm}` },
        { "Name": `${impInfo?.subscriptionName}` },
        { "Next Payment Date": impInfo?.redableNextPaymentDate },
        // { "Payment Method": cardType != "N/A" ? `${cardType} ending in ${cardNumber}` : 'No Payment Info Added' },
    ]
    let absentContent = [
        { "No Order Present": "N/A" }
    ]
    console.log("data?.OtherSourcesNextImport:", data?.impInfo?.OtherSourcesNextImport)
    return (
        <GridBox>
            <Stack direction="row" spacing={2} style={{ margin: "20px" }}>
                <Headline data={"Order Information"} />
            </Stack>
            <Stack direction="row" spacing={2} style={{ margin: "20px", display: "grid" }}>
                {
                    lastTransactionInvoiceNumber && lastTransactionInvoiceNumber !== "N/A"
                        ? <Content content={presentContent} />
                        : data?.impInfo?.OtherSourcesNextImport
                            ? <Content content={otherSourcesContent} />
                            : <Content content={absentContent} />
                }
            </Stack>
        </GridBox>
    )
}
function DisplaySubscription({ data }) {
    let [cancelled, setCancelled] = useState(false)
    let {
        cardType,
        cardNumber,
        impInfo,
        lastTransactionInvoiceNumber,
        lastTransactionStatus,
        transactionHistory
    } = data ?? {}
    let presentContent = [
        { "Status": impInfo?.status },
        impInfo?.trial ? { "Trial End Date": impInfo?.trialEndDate } : null,
        { "Name": impInfo?.subscriptionName },
        { "Amount": `$${impInfo?.price}` },
        { "Next Payment Date": impInfo?.redableNextPaymentDate },
        { "Payment Method": cardType != "N/A" ? `${cardType} ending in ${cardNumber}` : 'No Payment Info Added' },
    ]
    let absentContent = [
        { "No Subscription Present": "N/A" }
    ]
    // let cancelSubscriptionData = [
    //     {
    //         title: "Subscriptions",
    //         // subTitle: `If you cancel now, you will lose your access after ${impInfo?.redableNextPaymentDate}.`,
    //         ButtonText: "Cancel Subscription",
    //         SecondaryButtonText: "Never Mind",//for the modal
    //         // PrimaryButtonText: "Yes, Cancel Subscription",//for the modal
    //         // primaryOnClick: cancelSubscription,
    //         secondaryOnClick: "close"
    //     }
    // ]
    let addSubscriptionData = {
        title: "Choose A Subscription",
        // subTitle: `If you cancel now, you will lose your access after ${impInfo?.redableNextPaymentDate}.`,
        ButtonText: "Add Subscription",
        SecondaryButtonText: "Never Mind",//for the modal
        // PrimaryButtonText: "Yes, Cancel Subscription",//for the modal
        // primaryOnClick: cancelSubscription,
        secondaryOnClick: "close"
    }
    let cancelSubscriptionData = {
        title: "Subscriptions",
        subTitle: `If you cancel now, you will lose your access after ${impInfo?.redableNextPaymentDate}.`,
        ButtonText: "Cancel Subscription",
        SecondaryButtonText: "Never Mind",//for the modal
        PrimaryButtonText: "Yes, Cancel Subscription",//for the modal
        primaryOnClick: cancelSubscription,
        secondaryOnClick: "close"
    }

    console.log("impInfo?.status:", impInfo?.status)
    return (
        <GridBox>
            <Stack direction="row" spacing={2} style={{ margin: "20px" }}>
                <Headline data={"Manage Subscription"} />
                {impInfo?.status == "Active" && //Cancel subscription button
                    <Stack direction="column" spacing={2} style={{ width: "100%", display: "flex", alignItems: "flex-end" }}>
                        {/* <Button size='large' autoFocus variant='contained' onClick={cancelSubscription} >
                                                Cancel Subscription
                                            </Button> */}
                        <ModalPopUp data={cancelSubscriptionData} />
                    </Stack>
                }
                {impInfo?.status != "Active" && //Add subscription button
                    <Stack direction="column" spacing={2} style={{ width: "100%", display: "flex", alignItems: "flex-end" }}>
                        {/* <Button size='large' autoFocus variant='contained' >
                            Add Subscription
                        </Button> */}
                        <ModalPopUp data={addSubscriptionData} />

                        {/* <ModalPopUp data={SubscriptionData} /> */}
                    </Stack>
                }
                {/* {cancelled &&
                    <ModalPopUp data={cancelledSubscriptionData} />
                } */}
            </Stack>
            <Stack direction="row" spacing={2} style={{ margin: "20px" }}>
                {impInfo?.hasSubscription &&
                    <Stack direction="column" spacing={2} style={{ justifyContent: "space-between", display: "flex" }}>
                        <Content content={presentContent} />
                    </Stack>
                }
                {!impInfo?.hasSubscription &&
                    <Stack direction="column" spacing={2} style={{ justifyContent: "space-between", display: "flex" }}>
                        <Content content={absentContent} />
                    </Stack>
                }
            </Stack>
        </GridBox>
    )

}
function Content({ content }) {
    console.log("content:", content)
    return (
        <Stack direction="column" spacing={2}>

            {content.map((item, index) => {
                if (item) {
                    const [data] = Object?.entries(item); // get first key-value pair
                    return (
                        <div key={index}>
                            {content.length > 1 &&
                                <Stack direction="row" spacing={2} style={{ display: "grid", gridAutoFlow: "column", justifyContent: "start" }} >
                                    <Titles title={data[0]} />
                                    <Values value={data[1]} />
                                </Stack>
                            }
                            {content.length == 1 &&
                                <Stack direction="row" spacing={2} style={{ display: "grid", gridAutoFlow: "column", justifyContent: "start" }} >
                                    <Titles title={data[0]} />
                                </Stack>
                            }
                        </div>
                    )
                }

            })
            }
        </Stack>
    )
    function Titles({ title }) {

        let headlineFontSize = {
            fontWeight: 'bold',
            margin: "20px",
            fontSize: {
                xs: '1.1rem',
                sm: '1.5rem',
            },
        }
        return (
            <Typography variant="h5" component="h2" sx={headlineFontSize}>{title}</Typography>
        )
    }
    function Values({ value }) {

        let valueFontSize = {
            margin: "20px",
            fontSize: {
                xs: '1.1rem',
                sm: '1.5rem',
            },
        }
        return (
            <Typography variant="h5" component="h2" sx={valueFontSize}>{value}</Typography>
        )
    }
}
function Headline({ data }) {
    return (
        <Stack direction="column" spacing={2} style={{ width: "100%" }}>
            <Typography id="modal-modal-title" variant="h4" component="h2">
                {data}
            </Typography>
        </Stack>
    )
}
function GridBox({ children }) {
    return (
        <Grid size={6}>
            <Box style={{ width: "100%", boxShadow: "0 4px 5px 0 rgba(0,0,0,0.14),0 1px 10px 0 rgba(0,0,0,0.12),0 2px 4px -1px rgba(0,0,0,0.2),0 4px 5px 0 rgba(0,0,0,0.14)", padding: "20px" }}>
                {children}
            </Box>
        </Grid>
    )
}
const cancelSubscription = async () => {
    console.log("clicked", impInfo?.subscriptionId)
    let subscription = await CancelSubscriptionInAuthorize(impInfo?.subscriptionId)
    console.log("subscription:", subscription)
    let settings
    if (subscription?.status) {
        //update neon db 
        //get neon db user
        let matching = await queryUserSetting(impInfo?.id, 'subscription')
        if (matching) {
            let settingsRecord = { ...matching }

            let updatedData = JSON.parse(matching.data)
            updatedData.status = 'Inactive'
            updatedData.renewaldate = 'N/A'

            settingsRecord.status = 'inactive'
            settingsRecord.data = JSON.stringify(updatedData)
            settings = await updateUserSetting(matching, settingsRecord)
            // console.log("settings after updateUserSetting:", settings)
            // console.log("settings[0]?.status:", settings[0]?.status)
            if (settings[0]?.status == "Inactive" || settings[0]?.status == "inactive") {
                setCancelled(true)
            }
        }
    }
}