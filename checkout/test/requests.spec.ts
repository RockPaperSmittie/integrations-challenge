import { expect } from 'chai'
import * as nock from 'nock'
import * as fs from 'fs'
import PayPalConnection from '../PayPal'
import { RawAuthorizationRequest, ClientIDSecretCredentials, PayPalOrder, RawCancelRequest } from '@primer-io/app-framework';

/**
 * These tests, test the PayPal REST endpoints that are requested on order authorization and cancellation.
 * Requests are intercepted and mocked pay nock.
 * Dummy response data for mock requests are stored in the .json files in this directory.
 */

// ORDER AUTHORIZATION TESTS
describe('POST Authorize Order', () => {

  const authRequestInput: RawAuthorizationRequest<ClientIDSecretCredentials, PayPalOrder>  = {
    amount: 100.00,
    currencyCode: 'USD',
    paymentMethod: {
      orderId: '5O190127TN364715T'
    },
    processorConfig: {
      accountId: '123abc',
      clientId: '123abc',
      clientSecret: '123abc'
    },
  }

  it('returned AUTHORIZED order status', async () => {
    nock('https://api-m.sandbox.paypal.com')
    .post('/v2/checkout/orders/5O190127TN364715T/authorize')
    .reply(200, () => {
      return fs.createReadStream('./checkout/test/success_auth_response.json')
    })

    const authCompleteResponse: any = await PayPalConnection.authorize(authRequestInput)
    expect(authCompleteResponse.transactionStatus).to.equal('AUTHORIZED')
    expect(authCompleteResponse.processorTransactionId).to.equal('0AW2184448108334S')
  })
  
  it('returned FAILED order status', async () => {
    nock('https://api-m.sandbox.paypal.com')
      .post('/v2/checkout/orders/5O190127TN364715T/authorize')
      .reply(401, () => {
        return fs.createReadStream('./checkout/test/failed_auth_response.json')
      })
    const authCompleteResponse: any = await PayPalConnection.authorize(authRequestInput)
    expect(authCompleteResponse.transactionStatus).to.equal('FAILED')
    expect(authCompleteResponse.errorMessage).to.be.a('string')
  })
  nock.cleanAll()
})

// ORDER CANCELLATION TESTS
describe('POST Cancel Order', () => {

  const cancelRequestInput: RawCancelRequest<ClientIDSecretCredentials> = {
    processorTransactionId: '0AW2184448108334S',
    processorConfig: {
      accountId: '123abc',
      clientId: '123abc',
      clientSecret: '123abc'
    },
  }
  
  // TEST SUCCESSFUL ORDER CANCELLATION
  it('returned CANCELLED order cancellation status', async () => {
    nock('https://api-m.sandbox.paypal.com')
    .post('/v2/payments/authorizations/0AW2184448108334S/void')
    .reply(204)

    const authCancelResponse: any = await PayPalConnection.cancel(cancelRequestInput)
    expect(authCancelResponse.transactionStatus).to.equal('CANCELLED')
  })

  // TEST UNSUCCESSFUL ORDER CANCELLATION
  it('returned FAILED order cancellation status', async () => {
    nock('https://api-m.sandbox.paypal.com')
    .post('/v2/payments/authorizations/0AW2184448108334S/void')
    .reply(422, () => {
      return fs.createReadStream('./checkout/test/failed_cancel_response.json')
    })

    const authCancelResponse: any = await PayPalConnection.cancel(cancelRequestInput)
    expect(authCancelResponse.transactionStatus).to.equal('FAILED')
    expect(authCancelResponse.declineReason).to.be.a('string')
    expect(authCancelResponse.errorMessage).to.be.a('string')
  })
  nock.cleanAll()
})
