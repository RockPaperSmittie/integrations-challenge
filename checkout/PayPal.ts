import {
  ClientIDSecretCredentials,
  ParsedAuthorizationResponse,
  ParsedCaptureResponse,
  PayPalOrder,
  ProcessorConnection,
  RawAuthorizationRequest,
  RawCancelRequest,
  RawCaptureRequest,
} from '@primer-io/app-framework';

import HTTPClient from '../common/HTTPClient';

const PayPalConnection: ProcessorConnection<
  ClientIDSecretCredentials,
  PayPalOrder
> = {
  name: 'PAYPAL',

  website: 'https://paypal.com',

  configuration: {
    accountId: 'sb-uj8pp5004311@business.example.com',
    clientId: 'AULlNwYFGGrps1zPyF2zFESSUfsNJ_CR8f6oYOSMVDVAyLtbGdUoGletw5eiVkmSVD4yJl7kC5al6dzr',
    clientSecret: 'EOM49KHixELxpWcvjeric1wFgkh6n6fNvVjKXobNO7cQvTXSI2zE_QnbKdGWOtNIm_OMwDRlFFPaeGP3',
  },

  /** 
   * Authorize specific order by orderId
   * Use base64 encoded client credentials for authorization
   */
  async authorize(
    request: RawAuthorizationRequest<ClientIDSecretCredentials, PayPalOrder>,
  ): Promise<ParsedAuthorizationResponse> {
    try {
      const encodedAuth = Buffer.from(this.configuration.clientId + ':' + this.configuration.clientSecret).toString('base64')
      const response = await HTTPClient.request(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${request.paymentMethod.orderId}/authorize`, {
        method: 'post',
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic " + encodedAuth,
        },
         // No request body required by API but required in HTTPRequest type
        body: ''
      })
      const parsedResponseText = JSON.parse(response.responseText)
      // If status code in 200 range, order is authorized
      if (response.statusCode.toString().startsWith('2')) {
        const processorTransactionId = parsedResponseText.purchase_units[0].payments.authorizations[0].id
        return { processorTransactionId, transactionStatus: 'AUTHORIZED' }
      }
      // Return failed order response
      return { errorMessage: parsedResponseText.message ? parsedResponseText.message : parsedResponseText.error_description, transactionStatus: 'FAILED' }
    } catch (error) {
      return Promise.reject(error)
    }
  },

 /** 
   * Cancel specific order by transactionId
   * Use base64 encoded client credentials for authorization
   */
  async cancel(
    request: RawCancelRequest<ClientIDSecretCredentials>,
  ): Promise<ParsedCaptureResponse> {
    try {
      const encodedAuth = Buffer.from(this.configuration.clientId + ':' + this.configuration.clientSecret).toString('base64')
      const response = await HTTPClient.request(`https://api-m.sandbox.paypal.com/v2/payments/authorizations/${request.processorTransactionId}/void`, {
        method: 'post',
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic " + encodedAuth,
        },
        // No request body required by API but required in HTTPRequest type
        body: ''
      })
      // Return order successfully cancelled response
      if (response.statusCode === 204) {
        return { transactionStatus: 'CANCELLED'}
      }
      // Return order cancellation failed response
      const parsedResponseText = JSON.parse(response.responseText)
      return { transactionStatus: 'FAILED', declineReason: parsedResponseText.name, errorMessage: parsedResponseText.message}
    } catch (error) {
      return Promise.reject(error)
    }
  },

  /**
   * Capture a PayPal order (You can ignore this method for the exercise)
   */
  capture(
    request: RawCaptureRequest<ClientIDSecretCredentials>,
  ): Promise<ParsedCaptureResponse> {
    throw new Error('Not Implemented');
  },
};

export default PayPalConnection;
