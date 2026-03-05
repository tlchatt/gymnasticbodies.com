'use client'
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { GetSettings } from "@/lib/GetSettings.js";
import { StandardContainer } from '@/components/StandardContainer/StandardContainer';
import { useEffect, useState } from 'react';
import { getUserWithEmail, queryUserSetting } from '@/lib/userSettings';
import { user } from "@/app/context/stateContext";
import useSWR from 'swr'
import allSubscriptionData from "../../data/authorizeData1.json"
import { ConnectingAirportsOutlined } from '@mui/icons-material';



export default function AllUsers(props) {
    // const { email } = user()
    // const [data, setUserData] = useState()
    // console.log("email inside accountdetails is:", email)
    let testUrl = process.env.NEXT_PUBLIC_API_URL
    const fetcher = (url) => fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: '803450130', singleUser: false })
    }).then((res) => res.json())
    const { data, error, isLoading } = useSWR(`${testUrl}/api/user/authorizePlatform`, fetcher)

    // setUserData(result)

    let { Settings, Style, Media } = GetSettings(props, "AllUsers");
    let commonGap = {
        gap: "10px",
        display: "flex",
        flexFlow: "column"
    }
    let titleStyle = {
        color: "#656464",
        padding: "24px 0 0",
    }
    let ContainerStyle = {
        ...Style,
    }
    let ContainerInnerStyle = {
        ...Style,
        placeContent: 'unset',
        // gap: Settings.lowestGap,
    }

    // if (isLoading) return <div>Loading...</div>
    // if (error) return <div>Error: {error.message}</div>

    console.log("number:", allSubscriptionData.length)
    allSubscriptionData.map(subscription => {

        if (subscription?.transactionHistory?.data?.messages?.message[0]?.text != "No records found.") {

            if (subscription?.transactionHistory?.transactions) {

                subscription?.transactionHistory?.transactions.map(transaction => {
                    // console.log("transaction:", transaction.settleAmount)
                })
            }
        }
    })

    if (allSubscriptionData) {
        return (
            null

        );
    }



}