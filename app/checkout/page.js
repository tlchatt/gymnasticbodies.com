'use client'
import Grid from '@mui/material/Grid';
import Link from 'next/link';
import Typography from '@mui/material/Typography';
import { PaymentPortal } from '@/components/PaymentPortal';
import { Forms } from '@/components/Forms';
import { Suspense } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);



export default function Checkout(props) {
    console.log("props in checkout:", props)
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

    let formTitle = props?.data?.title ?? "BILLING DETAILS"
    let formOuterStyle = {

        gridAutoFlow: "row",
        display: "grid",
        width: "100%",
        padding: "0 10vw",
        ...props?.data?.style
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
            {formTitle &&
                <Typography variant='h4' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>{formTitle}</Typography>
            }

            <Grid size={12} style={formOuterStyle}>

                <Forms data={props?.data?.["form-Options"] ? props?.data : formData} />
                {props?.modalData?.note &&
                    <>
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
                    </>
                }

                <Elements stripe={stripePromise}>
                    <Suspense>
                        <PaymentPortal data={props?.data} userData={props?.userData}/>
                    </Suspense>
                </Elements>
            </Grid>
            {/* </StandardContainer> */}


        </>
    );
}