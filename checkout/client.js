let authResponse = null;

window.primer.setup().then(onLoad);

function renderPayPalButton() {
  const button = document.getElementById('paypal-button');

  const options = {
    // Create an order on PayPal button click using PayPal client SDK
    createOrder: (data, actions) => {
      return actions.order.create({
        purchase_units: [{
          amount: {
            currency_code: 'EUR',
            value: '12.99'
          }
        }]
      }).catch((error) => {
        // Show create order failed notification
        $('#failed-create-order').toast('show')
        console.log('Create order error', error)
      })
    },

    // On order approve, call onAuthorizationTransaction creating authorization REST API request.
    onApprove: (data, actions) => {
      if (data && data.orderID) {
        onAuthorizeTransaction(data.orderID);
      }
    }
  };

  window.paypal.Buttons(options).render(button);
}

async function onLoad() {
  renderPayPalButton();

  document
    .getElementById('cancel-button')
    .addEventListener('click', onCancelTransaction);
}

function onAuthorizeTransaction(orderId) {
  fetch('/api/authorize', {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  })
    .then((r) => r.json())
    .then((response) => {
      authResponse = response;
      if (authResponse.transactionStatus === 'AUTHORIZED') {
        // Show order auth success notification and cancel button
        $('#success-auth').toast('show')
        document.getElementById('cancel-button').removeAttribute('hidden')
        document.getElementById('cancel-button').removeAttribute('disabled');
      } else {
        // Show order auth failed notification
        $('#failed-auth').toast('show')
      }
    })
    .catch((error) => console.log('Authorization Error', error));
}

function onCancelTransaction() {
  fetch('/api/cancel', {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: authResponse.processorTransactionId }),
  })
    .then((r) => r.json())
    .then((response) => {
      if (response.transactionStatus === 'CANCELLED') {
        // Show order cancel success toast notification and disable cancel button
        $('#success-cancel').toast('show')
        document.getElementById('cancel-button').setAttribute('disabled', true);
      } else {
        // Show order cancel failed toast notification
        $('#failed-cancel').toast('show')
      } 
    })
    .catch((error) => console.log('Order cancel error', error))
}
