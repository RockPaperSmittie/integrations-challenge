# Checkout - Payment Methods

## Overview
This is my submission for Primer's checkout challenge which implements PayPal's REST API along with its' client SDK.

This README will serve as documentation for the implemented integration and will also cover some of my findings and explain my thought process around the code I introduced.

## Let's get started

The checkout application is containerized and can be run by using Docker or with a script.

Run the program without docker:

```bash
yarn install

yarn start:payment-methods
```
Run with docker:
```bash
cd container

docker-compose up -d --build
```

Your browser should open at `http://localhost:4444`

![Client Home](./assets/client-home.png)


## PayPal's Sandbox Environment
You will be prompted to login into [PayPal's sandbox environment](https://www.sandbox.paypal.com/signin)  when clicking on the PayPal button.

If you do not have a [PayPal developers](https://developer.paypal.com/home) account, please sign up and log into the dashboard.
Under SANDBOX -> Accounts, you will find two default, auto-generated sandbox accounts. Use the personal account details to log into [PayPal's sandbox environment](https://www.sandbox.paypal.com/signin).

Back in the checkout directory, inside PayPal.ts, replace the accountId value inside the `configuration` object with your own sandbox accountId.

```typescript
configuration: {
    accountId: 'PUT YOUR ACCOUNTID HERE',
    clientId: 'XXXXXXX',
    clientSecret: 'XXXXXXX',
  },
```

Then you're all set!

## Tests
Included in the checkout directory are tests that can be run with: 

```bash
yarn test
```
These tests were written using Mocha/Chai and utilizes Nock to intercept and mock requests posted to PayPal's REST API.

## Client Implementation And Findings

I utilized Bootstrap on the client-side to make some UI changes and implement toast notifications. These notifications provide information on the transaction's status to the user.

### Order creation & authorization

After PayPal's SDK intializes, the user is prompted with the PayPal button. On click, the PayPal button calls `createOrder` which directs the user to PayPal's payment dialog.
Once the user clicks 'Pay Now', `onApproved` is called which in turn calls `onAuthorizeTransaction`. The order is now created and ready to be authorized.

Once authorization is complete, a toast notification will notify the user if the authorization was successful or not.

With this implementation, I found that PayPal makes it quite easy for a developer to access the order API without needing server-side code. Their 'smart buttons' allow the client to create orders and approve them while specifying the intent within the provided script url.

### Order Cancellation

Once an order has been successfully authorized, it can then be cancelled. Cancellation of an authorized order can only happen once and doing so will disable the 'cancel transaction' button until a new order is created. 

The user will also be notified if an order is successfully cancelled.

## PayPal REST API Implementation And Findings

### Authorize

When `authorize` in PayPal.ts is called, a post request is made to:

`/v2/checkout/orders/{id}/authorize`

This endpoint authorizes an order by its ID and allows the order to stay in a pending state until captured but only if the intent on approval was set to 'authorize' and not 'capture'.

```typescript
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
```
It's important to remember that when using basic header authorization, the clientId and clientSecret has to be base64 encoded.

The successful response returned from the request provides details on the order, the user and also the order authorization. We are ultimately interested in the 'authorizations' object, since it contains the transaction id and authorization status.

A `ParsedAuthorizationResponse` can be returned from `authorize` and sent to the client to notify the client of the order's authorization success.

### Cancel

An authorized transaction can be cancelled before it's captured by posting to PayPal's Payments API:

`/v2/payments/authorizations/{authorization_id}/void`

The authorization id is the same id returned from the `authorize` function and is used to select and void/cancel the pending transaction.

```typescript 
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
```
The response returned from a successful cancellation request is simply: ``204 No Content``

The `cancel` function will either return a successful transaction status, or in the case that the cancellation request fails, a failed transaction status along with a decline reason and error message.

Implementing PayPal's REST API within the given app-framework was quite an interesting challenge. I enjoyed working through HTTPClient.ts and identifying the types and interfaces I had to conform to when writing the `authorize` and `cancel` functions.

I was happy to find a good solution for cancelling an authorized transaction in PayPal's Payments API. Perhaps there is a way to do it via the Orders API, but it seems to be a good enough solution.

## Conclusion

Overall Primer's checkout challenge was a fun exercise which allowed me to learn a lot about how PayPal's API works and more about the general flow regarding the creation and authorization of payment methods. 

If nothing else, I feel like I've definitely gained some valuable knowledge from this challenge, which I will be able to use in future projects.