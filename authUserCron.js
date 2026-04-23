//get user from neon db
//get the autorize_customer_id,status and data (renewal_date,status,email,term) from user_settings from neon db
//if status is active, 
    //check if an active subscription exists for the user in authorize with that customer_id
        //if (not) - create a subscription for the renewalDate in authorize based on the term
        //card info is saved in authorize, so we can use that to create the subscription
    //if (yes) 
        //check the user Status in neondb,
        //update to Active if it's not active, and update the renewal date based on the term in authorize



//if user in in-active, lead them to account information page, show add subscription option, with details of last renewal date and other info

//hachibear8@gmail.com - has no subscription, but has active status
//c.sommerother@gmail.com - multiple subscriptions
//space11120@gmail.com - active subscription
//fqc@grupocarolina.com.mx - renewal date is 21st april 2026



let email = "jdflood38@gmail.com"
const config = {
    headers: {
        "Content-Type": "application/json"
    }
}

let data = {
    email: email
}

try {
    const res = await fetch('http://localhost:3001/api/testCron', {
        method: 'POST',
        headers: {
            ...config.headers,
        },
        body: JSON.stringify(data),
    });
    if (res.ok) {
        const responseData = await res.json();
        console.log("responseData:", responseData)
        // handle response data
    } else {
        // handle error
    }
} catch (error) {
    // handle fetch error
    console.log("Error in fetch:", error)
}