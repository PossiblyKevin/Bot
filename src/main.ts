import './style.css';
import { ToobitTrader } from './toobitService';

const trader = new ToobitTrader();

// DOM Element Bindings
const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
const apiSecretInput = document.getElementById('apiSecretInput') as HTMLInputElement;
const saveConfigBtn = document.getElementById('saveConfigBtn') as HTMLButtonElement;

const marketTypeSelect = document.getElementById('marketType') as HTMLSelectElement;
const symbolInput = document.getElementById('symbolInput') as HTMLInputElement;
const orderSideSelect = document.getElementById('orderSide') as HTMLSelectElement;
const orderTypeSelect = document.getElementById('orderType') as HTMLSelectElement;
const priceGroup = document.getElementById('priceGroup') as HTMLDivElement;
const priceInput = document.getElementById('priceInput') as HTMLInputElement;
const quantityInput = document.getElementById('quantityInput') as HTMLInputElement;
const executeOrderBtn = document.getElementById('executeOrderBtn') as HTMLButtonElement;
const logOutput = document.getElementById('logOutput') as HTMLPreElement;

// Pre-fill fields if stored
const storedKey = localStorage.getItem('toobit_api_key');
const storedSecret = localStorage.getItem('toobit_api_secret');
if (storedKey) apiKeyInput.value = storedKey;
if (storedSecret) apiSecretInput.value = storedSecret;

// Toggle Limit Price field visibility
orderTypeSelect.addEventListener('change', () => {
  if (orderTypeSelect.value === 'LIMIT') {
    priceGroup.style.display = 'flex';
  } else {
    priceGroup.style.display = 'none';
  }
});

// Update default symbol format recommendation when switching markets
marketTypeSelect.addEventListener('change', () => {
  if (marketTypeSelect.value === 'futures') {
    symbolInput.value = 'BTC-SWAP-USDT';
  } else {
    symbolInput.value = 'BTCUSDT';
  }
});

saveConfigBtn.addEventListener('click', () => {
  trader.setCredentials(apiKeyInput.value, apiSecretInput.value);
  logOutput.textContent = `[${new Date().toLocaleTimeString()}] Credentials saved successfully to local browser state.`;
});

executeOrderBtn.addEventListener('click', async () => {
  try {
    logOutput.textContent = `[${new Date().toLocaleTimeString()}] Dispatching order to Toobit...`;
    
    const result = await trader.placeOrder({
      marketType: marketTypeSelect.value as 'spot' | 'futures',
      symbol: symbolInput.value,
      side: orderSideSelect.value,
      type: orderTypeSelect.value,
      quantity: parseFloat(quantityInput.value),
      price: orderTypeSelect.value === 'LIMIT' ? parseFloat(priceInput.value) : undefined
    });

    logOutput.textContent = `[${new Date().toLocaleTimeString()}] ✅ Order Executed Successfully!\n\n` + JSON.stringify(result, null, 2);
  } catch (error: any) {
    logOutput.textContent = `[${new Date().toLocaleTimeString()}] ❌ Error Executing Order:\n\n` + (error.message || error);
  }
});