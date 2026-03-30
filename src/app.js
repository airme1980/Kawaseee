const CURRENCIES = [
  { code: 'JPY', label: 'JPY · 日本円' },
  { code: 'CNY', label: 'CNY · 人民元' },
  { code: 'USD', label: 'USD · US Dollar' },
  { code: 'EUR', label: 'EUR · Euro' }
];

const API_URL = 'https://api.frankfurter.app/latest?from=USD&to=JPY,CNY,EUR';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // refresh every 5 minutes
const quickContainer = document.getElementById('quickCurrencies');
const rateInfoEl = document.getElementById('rateInfo');
const timestampEl = document.getElementById('timestamp');

let rates = null;
let lastUpdated = null;
let refreshTimer = null;
const quickInputs = new Map();
const quickValueMap = new Map();
let activeCurrency = 'JPY';
let activeAmount = '';
let syncing = false;

function init() {
  renderQuickCurrencies();
  setActiveCurrency(activeCurrency, activeAmount);
  fetchRates();
}

function renderQuickCurrencies() {
  if (!quickContainer) return;
  quickContainer.innerHTML = '';
  quickInputs.clear();

  CURRENCIES.forEach(({ code, label }) => {
    const item = document.createElement('label');
    item.className = 'quick-item';
    item.dataset.currency = code;

    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'decimal';
    input.placeholder = '金額を入力';
    input.dataset.currency = code;

    const span = document.createElement('span');
    span.textContent = label;

    const initialValue = '';
    input.value = initialValue;
    quickValueMap.set(code, initialValue);

    input.addEventListener('input', () => handleAmountInput(code, input.value));

    item.appendChild(input);
    item.appendChild(span);
    quickContainer.appendChild(item);
    quickInputs.set(code, input);
  });
}

async function fetchRates() {
  clearTimeout(refreshTimer);
  rateInfoEl.textContent = 'レートを更新しています…';

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch rates');
    }
    const data = await response.json();
    if (!data || !data.rates) {
      throw new Error('Rates missing in response');
    }
    rates = { USD: 1, ...data.rates };
    lastUpdated = data.date ? new Date(`${data.date}T00:00:00Z`) : new Date();
    rateInfoEl.textContent = '最新の参考レートを表示中';
    updateTimestamp();
    updateResult();
  } catch (error) {
    console.error(error);
    rateInfoEl.textContent = 'レート取得に失敗しました。通信状況をご確認ください。';
    timestampEl.textContent = 'レートの更新に失敗しました';
  } finally {
    refreshTimer = setTimeout(fetchRates, REFRESH_INTERVAL_MS);
  }
}

function updateTimestamp() {
  if (!lastUpdated) return;
  const formatted = new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(lastUpdated);
  timestampEl.textContent = `最終更新: ${formatted}`;
}

function updateResult() {
  if (syncing) return;
  const rawAmount = quickValueMap.get(activeCurrency) ?? '';
  activeAmount = rawAmount;

  if (!rates) {
    syncQuickIndicator();
    return;
  }

  const amount = parseFloat(rawAmount);
  if (Number.isNaN(amount)) {
    syncing = true;
    quickInputs.forEach((input, currency) => {
      if (currency === activeCurrency) {
        input.value = rawAmount;
        quickValueMap.set(currency, rawAmount);
      } else {
        input.value = '';
        quickValueMap.set(currency, '');
      }
    });
    syncing = false;
    syncQuickIndicator();
    return;
  }

  const fromRate = rates[activeCurrency];
  if (!fromRate) {
    syncQuickIndicator();
    return;
  }

  syncing = true;
  quickInputs.forEach((input, currency) => {
    if (currency === activeCurrency) {
      input.value = rawAmount;
      quickValueMap.set(currency, rawAmount);
      return;
    }
    const toRate = rates[currency];
    if (!toRate) {
      input.value = '';
      quickValueMap.set(currency, '');
      return;
    }
    const converted = amount * (toRate / fromRate);
    const formattedValue = formatInputValue(converted);
    input.value = formattedValue;
    quickValueMap.set(currency, formattedValue);
  });
  syncing = false;
  syncQuickIndicator();
}

function handleAmountInput(currency, value) {
  quickValueMap.set(currency, value);
  setActiveCurrency(currency, value);
}

function syncQuickIndicator() {
  quickInputs.forEach((input, currency) => {
    const parent = input.closest('.quick-item');
    if (!parent) return;
    if (currency === activeCurrency) {
      parent.classList.add('active');
    } else {
      parent.classList.remove('active');
    }
  });
}

function setActiveCurrency(currency, value) {
  activeCurrency = currency;
  activeAmount = value;
  quickValueMap.set(currency, value);
  updateResult();
}

function formatInputValue(amount) {
  const fixed = amount.toFixed(4);
  const trimmed = fixed.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  return trimmed;
}

init();
