// pages/api/charge-card.js

import ApiContracts from 'authorizenet/lib/api/contracts';
import ApiControllers from 'authorizenet/lib/api/controllers';

// Load credentials from environment variables for security
const apiLoginId = process.env.AUTHORIZE_NET_API_LOGIN_ID;
const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nonce, amount } = req.body;

  if (!nonce || !amount) {
    return res.status(400).json({ error: 'Missing payment nonce or amount' });
  }

  // Set up the merchant authentication
  const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(apiLoginId);
  merchantAuthenticationType.setTransactionKey(transactionKey);

  // Set up the opaque data object with the payment nonce
  const opaqueData = new ApiContracts.OpaqueDataType();
  opaqueData.setDataDescriptor("COMMON.ACCEPT.INAPP.PAYMENT");
  opaqueData.setDataValue(nonce);

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
