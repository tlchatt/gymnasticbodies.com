'use client';
import Script from "next/script";
import { useEffect } from "react";

export default function paymentPortal() {




    useEffect(() => {
        window.responseHandler = function (response) {
            // handle response
            console.log("response is:", response)
            if (response.messages.resultCode === "Error") {
                var i = 0;
                while (i < response.messages.message.length) {
                    console.log(
                        response.messages.message[i].code + ": " +
                        response.messages.message[i].text
                    );
                    i = i + 1;
                }
            } else {
                paymentFormUpdate(response.opaqueData);
            }
        }
        function paymentFormUpdate(opaqueData) {
            document.getElementById("dataDescriptor").value = opaqueData.dataDescriptor;
            document.getElementById("dataValue").value = opaqueData.dataValue;

            /*document.getElementById("cardNumber").value = "";
            document.getElementById("expMonth").value = "";
            document.getElementById("expYear").value = "";
            document.getElementById("cardCode").value = "";
            document.getElementById("accountNumber").value = "";
            document.getElementById("routingNumber").value = "";
            document.getElementById("nameOnAccount").value = "";
            document.getElementById("accountType").value = "";*/
            // document.getElementById("paymentForm").submit();
        }
    }, []);

    return (
        <div>
            <Script src="https://js.authorize.net/v3/AcceptUI.js
  " strategy="beforeInteractive" />
            <div>Payment Portal</div>
            <form id="paymentForm"
                method="POST"
                action="https://gymnasticbodies-com.vercel.app/api/paymentPortal">
                <input type="hidden" name="dataValue" id="dataValue" />
                <input type="hidden" name="dataDescriptor" id="dataDescriptor" />
                <button type="button"
                    className="AcceptUI"
                    data-billingaddressoptions='{"show":true, "required":false}'
                    data-apiloginid="7F57wRjv"
                    data-clientkey="6vPVd2WmeVmz24UB5qkm8Avr3w5yxpAVW6c5MdkWT3kJ2E5U38A2Z5E2LZvdz9Qb"
                    data-acceptuiformbtntxt="Submit"
                    data-acceptuiformheadertxt="Card Information"
                    data-paymentoptions='{"showCreditCard": true, "showBankAccount": true}'
                    data-responsehandler="responseHandler">Pay
                </button>
            </form>
        </div>
    );
}