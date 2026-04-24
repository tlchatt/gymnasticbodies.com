const config = {
    headers: {
        "Content-Type": "application/json"
    }
}
let data = {
    email: ""

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
}