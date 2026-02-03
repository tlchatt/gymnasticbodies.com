import { ApiContracts } from "authorizenet";


export async function POST(request) {
    console.log("request is:", request.body)
    const { opaqueData, customerInformation, amount = "10" } = request.body;

    const body = await request.text();
    const params = new URLSearchParams(body);
    const dataValue = params.get('dataValue');
    console.log("dataValue:", dataValue);
    // handle the data

    let data =
    {
        "createTransactionRequest": {
            "merchantAuthentication": {
                "name": "5KP3u95bQpv",
                "transactionKey": "346HZ32z3fP4hTG2"
            },
            "refId": "123456",
            "transactionRequest": {
                "transactionType": "authCaptureTransaction",
                "amount": "5",
                "payment": {
                    "creditCard": {
                        "cardNumber": "5424000000000015",
                        "expirationDate": "2025-12",
                        "cardCode": "999"
                    }
                },
                "lineItems": {
                    "lineItem": {
                        "itemId": "1",
                        "name": "vase",
                        "description": "Cannes logo",
                        "quantity": "18",
                        "unitPrice": "45.00"
                    }
                },
                "tax": {
                    "amount": "4.26",
                    "name": "level2 tax name",
                    "description": "level2 tax"
                },
                "duty": {
                    "amount": "8.55",
                    "name": "duty name",
                    "description": "duty description"
                },
                "shipping": {
                    "amount": "4.26",
                    "name": "level2 tax name",
                    "description": "level2 tax"
                },
                "poNumber": "456654",
                "customer": {
                    "id": "99999456654"
                },
                "billTo": {
                    "firstName": "Ellen",
                    "lastName": "Johnson",
                    "company": "Souveniropolis",
                    "address": "14 Main Street",
                    "city": "Pecan Springs",
                    "state": "TX",
                    "zip": "44628",
                    "country": "US"
                },
                "shipTo": {
                    "firstName": "China",
                    "lastName": "Bayles",
                    "company": "Thyme for Tea",
                    "address": "12 Main Street",
                    "city": "Pecan Springs",
                    "state": "TX",
                    "zip": "44628",
                    "country": "US"
                },
                "customerIP": "192.168.1.1",
                "transactionSettings": {
                    "setting": {
                        "settingName": "testRequest",
                        "settingValue": "false"
                    }
                },
                "userFields": {
                    "userField": [
                        {
                            "name": "MerchantDefinedFieldName1",
                            "value": "MerchantDefinedFieldValue1"
                        },
                        {
                            "name": "favorite_color",
                            "value": "blue"
                        }
                    ]
                },
                "processingOptions": {
                    "isSubsequentAuth": "true"
                },
                "subsequentAuthInformation": {
                    "originalNetworkTransId": "123456789NNNH",
                    "originalAuthAmount": "45.00",
                    "reason": "resubmission"
                },
                "authorizationIndicatorType": {
                    "authorizationIndicator": "final"
                }
            }
        }
    }

    // Set up the merchant authentication
    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(apiLoginId);
    merchantAuthenticationType.setTransactionKey(transactionKey);

    // Set up the payment object
    const paymentType = new ApiContracts.PaymentType();
    paymentType.setOpaqueData(opaqueData);

    // Set up the transaction request
    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION); // Auth and capture in one go
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount);

    // Build the full request
    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);


    // Execute the request using a promise-based approach
    const ctrl = new ApiControllers.CreateTransactionController(createRequest.toJSON());

    try {
        const apiResponse = await new Promise((resolve, reject) => {
            // Use the sandbox endpoint if in development
            // For production, change to the production endpoint
            ctrl.execute(resolve, reject, 'https://apitest.authorize.net/xml/v1/request.api');
        });

        const response = JSON.parse(apiResponse);

        if (response.messages.resultCode === ApiContracts.MessageTypeEnum.OK) {
            const transactionResponse = response.transactionResponse;
            if (transactionResponse.messages.resultCode === ApiContracts.MessageTypeEnum.OK) {
                // Success
                res.status(200).json({
                    success: true,
                    transactionId: transactionResponse.transId
                });
            } else {
                // Transaction error
                res.status(400).json({
                    success: false,
                    error: transactionResponse.errors.error[0].errorText
                });
            }
        } else {
            // Request level error
            res.status(400).json({
                success: false,
                error: response.messages.message[0].text
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }


}
// GET just to return 200 status for preflight to work
export async function GET() {
    return new Response('Success!', {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}