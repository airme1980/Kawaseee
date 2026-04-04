const CURRENCIES = [
  { code: 'JPY', label: 'JPY · 日本円' },
  { code: 'CNY', label: 'CNY · 人民元' },
  { code: 'USD', label: 'USD · US Dollar' },
  { code: 'EUR', label: 'EUR · Euro' }
];

const API_SOURCES = [
  {
    name: 'Frankfurter',
    url: 'https://api.frankfurter.app/latest?from=USD&to=JPY,CNY,EUR',
    normalize: (data) => {
      if (!data?.rates) {
        throw new Error('Frankfurter rates missing');
      }

      return {
        rates: normalizeRates(data.rates, { usdRate: 1 }),
        timestamp: data.date ? new Date(`${data.date}T00:00:00Z`) : new Date()
      };
    }
  },
  {
    name: 'Open ER API',
    url: 'https://open.er-api.com/v6/latest/USD',
    normalize: (data) => {
      if (data?.result !== 'success' || !data?.rates) {
        throw new Error('Open ER API returned invalid payload');
      }

      const timestamp = data.time_last_update_utc ? new Date(data.time_last_update_utc) : new Date();
      return {
        rates: normalizeRates(data.rates, { usdRate: data.rates.USD ?? 1 }),
        timestamp: Number.isNaN(timestamp?.getTime()) ? new Date() : timestamp
      };
    }
  }
];
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // refresh every 5 minutes
const quickContainer = document.getElementById('quickCurrencies');
const rateInfoEl = document.getElementById('rateInfo');
const timestampEl = document.getElementById('timestamp');
const copyStatusEl = document.getElementById('copyStatus');

let rates = null;
let lastUpdated = null;
let refreshTimer = null;
let copyStatusTimer = null;
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
    const item = document.createElement('div');
    item.className = 'quick-item';
    item.dataset.currency = code;

    const controls = document.createElement('div');
    controls.className = 'quick-input-row';

    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'decimal';
    input.placeholder = '0';
    input.dataset.currency = code;
    input.setAttribute('aria-label', `${label} の金額`);

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'copy-button';
    copyButton.setAttribute('aria-label', `${label} の値をコピー`);
    copyButton.title = `${label} の値をコピー`;
    copyButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M9 9.75A2.25 2.25 0 0 1 11.25 7.5h7.5A2.25 2.25 0 0 1 21 9.75v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5A2.25 2.25 0 0 1 9 17.25z"></path>
        <path d="M5.25 15A2.25 2.25 0 0 1 3 12.75v-7.5A2.25 2.25 0 0 1 5.25 3h7.5A2.25 2.25 0 0 1 15 5.25"></path>
      </svg>
    `;

    const span = document.createElement('span');
    span.textContent = label;

    const initialValue = '';
    input.value = initialValue;
    quickValueMap.set(code, initialValue);

    input.addEventListener('input', () => handleAmountInput(code, input.value));
    copyButton.addEventListener('click', () => handleCopy(code));

    controls.appendChild(input);
    controls.appendChild(copyButton);
    item.appendChild(controls);
    item.appendChild(span);
    quickContainer.appendChild(item);
    quickInputs.set(code, input);
  });
}

async function fetchFromSource(source) {
  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  const normalized = source.normalize(data);
  if (!normalized?.rates) {
    throw new Error('Normalizer returned empty rates');
  }
  return normalized;
}

function normalizeRates(sourceRates, { usdRate = 1 } = {}) {
  const normalized = {};
  CURRENCIES.forEach(({ code }) => {
    if (code === 'USD') {
      normalized.USD = typeof usdRate === 'number' && !Number.isNaN(usdRate) ? usdRate : 1;
      return;
    }

    const value = sourceRates?.[code];
    if (typeof value !== 'number') {
      throw new Error(`Missing rate for ${code}`);
    }

    normalized[code] = value;
  });
  return normalized;
}

async function fetchRates() {
  clearTimeout(refreshTimer);
  rateInfoEl.textContent = 'レートを更新しています…';

  let fetched = null;
  for (const source of API_SOURCES) {
    try {
      fetched = await fetchFromSource(source);
      break;
    } catch (error) {
      console.error(`Rate fetch failed via ${source.name}`, error);
    }
  }

  if (fetched) {
    rates = fetched.rates;
    lastUpdated = fetched.timestamp;
    rateInfoEl.textContent = '最新の参考レートを表示中';
    updateTimestamp();
    updateResult();
  } else {
    rateInfoEl.textContent = 'レート取得に失敗しました。通信状況をご確認ください。';
    timestampEl.textContent = 'レートの更新に失敗しました';
  }

  refreshTimer = setTimeout(fetchRates, REFRESH_INTERVAL_MS);
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

async function handleCopy(currency) {
  if (!navigator.clipboard?.writeText) {
    showCopyStatus('このブラウザではコピー機能を利用できません。', true);
    return;
  }

  try {
    const input = quickInputs.get(currency);
    const value = input?.value.trim() ?? '';

    if (!value) {
      showCopyStatus('コピーする値がありません。', true);
      return;
    }

    await navigator.clipboard.writeText(value);
    input?.focus();
    showCopyStatus(`${currency} の ${value} をコピーしました。`);
  } catch (error) {
    console.error(error);
    showCopyStatus('コピーに失敗しました。ブラウザの権限をご確認ください。', true);
  }
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

function showCopyStatus(message, isError = false) {
  if (!copyStatusEl) return;

  clearTimeout(copyStatusTimer);
  copyStatusEl.textContent = message;
  copyStatusEl.classList.toggle('is-error', isError);

  copyStatusTimer = setTimeout(() => {
    copyStatusEl.textContent = '';
    copyStatusEl.classList.remove('is-error');
  }, 3000);
}

init();
