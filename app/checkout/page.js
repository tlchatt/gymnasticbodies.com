'use client'
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { PaymentPortal } from '@/components/PaymentPortal';
import { Forms } from '@/components/Forms';
import { GetSettings } from "@/lib/GetSettings.js";
import { StandardContainer } from '@/components/StandardContainer/StandardContainer';
import Script from 'next/script';
import { Suspense } from 'react';



export default function Checkout(props) {

    // let { Settings, Style, Media } = GetSettings(props, "Checkout");
    let commonGap = {
        gap: "10px",
        display: "flex",
        flexFlow: "column"
    }
    let titleStyle = {
        color: "#656464",
        padding: "24px 0 0",
    }
    let testJson = {
        status: "active",
        next_payment_date_gmt: "2027-01-30T19:40:53",
        start_date_gmt: "2026-01-01T12:22:53",
        billing: {
            first_name: 'Yousef ElDaour ElDaour',
            email: 'yeldaour@gmail.com'
        }
    }
    let formStyle = {
        width: "50%",
        ...commonGap
    }
    let ContainerStyle = {
        // ...Style,
    }
    let ContainerInnerStyle = {
        // ...Style,
        // placeContent: 'unset',
        // gap: Settings.lowestGap,
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
                                {
                                    "type": "email",
                                    "content": "Email Address *",
                                    "id": "email",
                                    "required": true,
                                    "width": "half"
                                },
                                {
                                    "type": "tel",
                                    "content": "Phone ( + Country Code ) *",
                                    "id": "phone",
                                    "required": true,
                                    "width": "half"
                                },
                                {
                                    "type": "search_country",
                                    "content": "Countries*",
                                    "id": "search_country",
                                    "required": true,
                                    "width": "full"
                                },
                                {
                                    "type": "password",
                                    "content": "Password",
                                    "id": "password",
                                    "required": true,
                                    "width": "half"
                                },
                                // {
                                //     "type": "pay",
                                //     "content": "Pay*",
                                //     "id": "pay_button",
                                //     "required": true,
                                //     "width": "half"
                                // }
                            ]
                        }
                    ]
                }
            ]
        },
        "scheme": "secondary",
        "note": "",
        "title": ""
    }


    return (
        <>
            {/* <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
           
            /> */}
            {/* <SnackBar open={props.fail} variation='error' /> */}


            {/* <StandardContainer style={ContainerStyle} innerStyle={ContainerInnerStyle} innerClassName="StandardContainerInnerMargin" id={Settings.id} innerID={Settings.innerID} {...props}> */}
            <Typography variant='h4' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>BILLING DETAILS</Typography>
            <Grid size={12} style={{ gridAutoFlow: "row", display: "grid", width: "100%", padding: "0 10vw" }}>

                <Forms data={formData} />

                <Typography variant='p' gutterBottom style={titleStyle} id="responsive-dialog-title" align='left'>By clicking on the "Pay" button below, I understand and agree to the following:</Typography>
                <Typography variant='p' gutterBottom style={titleStyle} id="responsive-dialog-title" align='left'>I am at least 18 years old and agree to the ‌
                    <Link href="/terms-of-service">
                        Terms of Service‌‌
                    </Link>
                    and
                    <Link href="/privacy-policy">
                        Privacy Policy .
                    </Link>
                </Typography>
                <Suspense>
                    <PaymentPortal />
                </Suspense>
            </Grid>
            {/* </StandardContainer> */}


        </>
    );
}