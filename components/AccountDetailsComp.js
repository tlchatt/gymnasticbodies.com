'use client'
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { GetSettings } from "@/lib/GetSettings.js";
import { DateTime } from 'luxon';
import { StandardContainer } from '@/components/StandardContainer/StandardContainer';
import { getUserWithEmail, queryUserSetting } from '@/lib/userSettings';
import { user } from "@/app/context/stateContext";
import useSWR from 'swr'
import axios from "axios";
import CircularIndeterminate from '@/components/CircularLoading';
import { Button, Stack } from '@mui/material';
import { useState } from 'react';
export default function AccountDetailsComp(props) {
    // let { customerId, setCustomerId } = user()
    /*//customer profile id
    //555933485 - for transaction history
    //803450130 - for subscription history
    //719388555 - with order id but no subscription
    //transaction id: 80901513052, 81476706790
    //779397289 - GW in woo commerce order but not in authorize subscription
    //657944831 - Dmitriy Akatkin - active subscription in woo commerce


    */

    let [authorizeCustomerId, setAuthorizeCustomerId] = useState(null)
    let testUrl = process.env.NEXT_PUBLIC_API_URL
    let appUrl = process.env.NEXT_PUBLIC_APP_URL


    // const token = searchParams.get('token');
    // const userId = searchParams.get('userId');
    let userInfoFetch = (url) => fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: props.userId,
            // username: props.username,
            type: 'subscription'
        })
    }).then((res) => res.json())
    const { data, error, isLoading } = useSWR(`/api/user/accountInformation`, userInfoFetch)
    // console.log("data in useSWR is:", data)
    // console.log("error in useSWR is:", error)
    // console.log("isLoading in useSWR is:", isLoading)


    let {
        cardType,
        cardNumber,
        impInfo,
        lastTransactionInvoiceNumber,
        lastTransactionStatus,
        transactionHistory
    } = data ?? {}

    console.log("data is:",data)
    /* style */

    let titleStyle = {
        color: "#656464",
        padding: "24px 0 0",
    }
    let headlineFontSize = {
        fontWeight: 'bold',
        margin: "20px",
        fontSize: {
            xs: '1.1rem',
            sm: '1.5rem',
        },
    }
    let valueFontSize = {
        margin: "20px",
        fontSize: {
            xs: '1.1rem',
            sm: '1.5rem',
        },
    }

    if (isLoading) return <CircularIndeterminate />
    if (error) return <div>
        <Typography variant='h3' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>Failed To Load, Try Again Later!
        </Typography>
    </div>


    /*function createSubscription() {
        //$75 per month, $225 billed quarterly
        //$60 per month, $720 billed annually
        if (term != "N/A") {
            // let transactionTerm = term.includes("quarterly") ? "quarterly" : "annually"

            let amount = subscriptionAmount ? subscriptionAmount : lastTransactionAmount
            let subscriptionName = "GymFit TV - $" + amount + " / " + term

            const formData = new FormData();
            formData.append("billTerm", transactionTerm);//monthly (1)/ days (365)
            formData.append("customerProfileId", customerProfileId);
            formData.append("customerShippingAddressId", customerAddressId);
            formData.append("customerPaymentProfileId", customerPaymentProfileId);
            formData.append("billAmount", amount);
            formData.append("name", subscriptionName);//subscription name
            formData.append("reason", "createSubscription");
            formData.append("billToFirstName", firstName);
            formData.append("billToLastName", lastName);
            formData.append("billCountry", country);
            formData.append("billStartDate", subscriptionEndDate);

            axios.post(`${testUrl}/api/paymentPortal`, formData)
                .then(function (response) {
                    console.log(response);
                })
                .catch(function (error) {
                    console.log(error);
                });
        }
    }*/
    if (data) {
        return (
            <>
                <Typography variant='h3' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>ACCOUNT
                </Typography>
                <Stack direction="column" spacing={2} style={{ margin: "20px" }}>
                    <Grid size={6} style={{
                    }}>
                        <Box style={{ width: "100%", boxShadow: "0 4px 5px 0 rgba(0,0,0,0.14),0 1px 10px 0 rgba(0,0,0,0.12),0 2px 4px -1px rgba(0,0,0,0.2),0 4px 5px 0 rgba(0,0,0,0.14)", padding: "20px" }}>
                            <Stack direction="row" spacing={2} style={{ margin: "20px" }}>
                                <Stack direction="column" spacing={2} style={{ width: "100%" }}>
                                    <Typography id="modal-modal-title" variant="h4" component="h2">
                                        User Information
                                    </Typography>
                                </Stack>
                                {/* <Stack direction="column" spacing={2} style={{ width: "100%", display: "flex", alignItems: "flex-end" }}>
                                       <a href={"https://my.gymnasticbodies.com/"}>
                                           <Button size='large' autoFocus variant='contained' >
                                               See Workout
                                           </Button>
                                       </a>
                                   </Stack> */}



                            </Stack>

                            <Stack direction="row" spacing={2} style={{ margin: "20px" }}
                            >
                                <Stack direction="column" spacing={2} style={{ justifyContent: "space-between", display: "flex" }}>
                                    <Typography variant="h5" component="h2" sx={headlineFontSize}>First Name</Typography>
                                    <Typography variant="h5" component="h2" sx={headlineFontSize} >Last Name</Typography>
                                    <Typography variant="h5" component="h2" sx={headlineFontSize} >Email</Typography>
                                    <Typography variant="h5" component="h2" sx={headlineFontSize} >Country</Typography>
                                    <Typography variant="h5" component="h2" sx={headlineFontSize} >Phone</Typography>
                                </Stack>
                                <Stack direction="column" spacing={2} style={{ justifyContent: "space-between", display: "flex" }}>
                                    <Typography variant="h5" component="h2" sx={valueFontSize}>{impInfo?.firstName}</Typography>
                                    <Typography variant="h5" component="h2" sx={valueFontSize}>{impInfo?.lastName}</Typography>
                                    <Typography variant="h5" component="h2" sx={valueFontSize}>{impInfo?.email}</Typography>
                                    <Typography variant="h5" component="h2" sx={valueFontSize}>{impInfo?.country}</Typography>
                                    <Typography variant="h5" component="h2" sx={valueFontSize}>{impInfo?.phoneNumber}</Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Grid>

                    <Grid size={6} style={{}}>
                        <Box style={{ width: "100%", boxShadow: "0 4px 5px 0 rgba(0,0,0,0.14),0 1px 10px 0 rgba(0,0,0,0.12),0 2px 4px -1px rgba(0,0,0,0.2),0 4px 5px 0 rgba(0,0,0,0.14)", padding: "20px" }}>
                            <Stack direction="row" spacing={2} style={{ margin: "20px" }}>
                                <Stack direction="column" spacing={2} style={{ width: "100%" }}>
                                    <Typography id="modal-modal-title" variant="h4" component="h2">
                                        Order Information
                                    </Typography>
                                </Stack>
                                {/* <Stack direction="column" spacing={2} style={{ width: "100%", display: "flex", alignItems: "flex-end" }}>
                                           <Button size='large' autoFocus onClick={createSubscription} variant='contained'>
                                               Create Subscription
                                           </Button>
                                       </Stack> */}



                            </Stack>
                            <Stack direction="row" spacing={2} style={{ margin: "20px" }}>
                                {impInfo?.merchantid &&
                                    <>
                                        <Stack direction="column" spacing={2} style={{ justifyContent: "space-between", display: "flex" }}>
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>Status</Typography>
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>Last Order Date</Typography>
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>Invoice</Typography>
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>Amount</Typography>
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>Next Payment Date</Typography>
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>Payment Method</Typography>
                                        </Stack>
                                        <Stack direction="column" spacing={2} style={{ justifyContent: "space-between", display: "flex" }}>
                                            <Typography variant="h5" component="h2" sx={valueFontSize}>{impInfo.status}</Typography>
                                            <Typography variant="h5" component="h2" sx={valueFontSize}>{impInfo?.redableRecentTransactionDate}</Typography>
                                            <Typography variant="h5" component="h2" sx={valueFontSize}>{lastTransactionInvoiceNumber}</Typography>
                                            <Typography variant="h5" component="h2" sx={valueFontSize}>${impInfo?.price} {impInfo.matchedTerm}</Typography>
                                            <Typography variant="h5" component="h2" sx={valueFontSize}>{impInfo?.redableNextPaymentDate}</Typography>
                                            <Typography variant="h5" component="h2" sx={valueFontSize}>{cardType!="N/A" ? `${cardType} ending in ${cardNumber}` : 'No Payment Info Added'}</Typography>

                                        </Stack>
                                    </>
                                }
                                {!impInfo?.merchantid &&

                                    <Stack direction="column" spacing={2} style={{ justifyContent: "space-between", display: "flex" }}>
                                        <Typography variant="h5" component="h2" sx={headlineFontSize}>No Order Found</Typography>
                                    </Stack>

                                }



                            </Stack>
                        </Box>
                    </Grid>

                    <Grid size={6} style={{}}>
                        <Box style={{ width: "100%", boxShadow: "0 4px 5px 0 rgba(0,0,0,0.14),0 1px 10px 0 rgba(0,0,0,0.12),0 2px 4px -1px rgba(0,0,0,0.2),0 4px 5px 0 rgba(0,0,0,0.14)", padding: "20px" }}>
                            <Typography id="modal-modal-title" variant="h4" component="h2">
                                Manage Subscription
                            </Typography>
                            <Stack direction="row" spacing={2} style={{ margin: "20px" }}>
                                {impInfo?.hasSubscription &&
                                    <>
                                        <Stack direction="column" spacing={2} style={{ justifyContent: "space-between", display: "flex" }}>
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>Status</Typography>
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>Name</Typography>
                                            {/* <Typography variant="h5" component="h2" sx={headlineFontSize}>Current Plan</Typography> */}
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>Amount</Typography>
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>Next Payment Date</Typography>
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>Payment Method</Typography>
                                        </Stack>
                                        <Stack direction="column" spacing={2} style={{ justifyContent: "space-between", display: "flex" }}>
                                            <Typography variant="h5" component="h2" sx={valueFontSize}>{impInfo?.status}</Typography>
                                            <Typography variant="h5" component="h2" sx={valueFontSize}>{impInfo?.subscriptionName}</Typography>
                                            {/* <Typography variant="h5" component="h2" sx={valueFontSize}>{plan ?? "N/A"}</Typography> */}
                                            <Typography variant="h5" component="h2" sx={valueFontSize}>${impInfo?.price} </Typography>
                                            <Typography variant="h5" component="h2" sx={valueFontSize}>{impInfo?.nextPaymentDate}</Typography>
                                            <Typography variant="h5" component="h2" sx={valueFontSize}>{`${cardType} ending in ${cardNumber}`}</Typography>
                                        </Stack>
                                    </>
                                }
                                {!impInfo?.hasSubscription &&
                                    <>
                                        <Stack direction="column" spacing={2} style={{ justifyContent: "space-between", display: "flex" }}>
                                            <Typography variant="h5" component="h2" sx={headlineFontSize}>No Subscription Found</Typography>

                                        </Stack>
                                    </>
                                }

                            </Stack>
                        </Box>

                    </Grid>



                </Stack >

                {/* </StandardContainer> */}
            </>

        );
    }



}