# EarnResearch

EarnResearch is a client-side research companion for finding realistic, legal, and ethical ways to earn from a first dollar upward. It supports Google Gemini, OpenAI, and Anthropic directly from the browser.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL. You can also deploy the static build from `dist/` with any static host:

```bash
npm run build
```

## Configure an LLM

1. Create an API key in the official console for [Google AI Studio](https://aistudio.google.com/), [OpenAI](https://platform.openai.com/api-keys), or [Anthropic](https://console.anthropic.com/).
2. Open **Settings** in EarnResearch, choose a provider/model, paste the key, and create a vault passphrase (8+ characters).
3. The key is encrypted with Web Crypto AES-GCM and PBKDF2 before being stored in localStorage. The passphrase is kept only in the current tab session. Requests go directly to the provider; there is no EarnResearch backend.

Never use a browser-exposed API key for a public multi-user production deployment. For that case, put provider calls behind your own authenticated server or proxy with quotas and secret management.

## Use it

Fill in your constraints, optionally enable Quick Win or Zero Budget, describe what you want in the search bar, and generate research. Save ideas, view step-by-step details, request a seven-day plan, log earnings, and export your local data. The report button records a local signal only; it does not send a report to a third party.

## Exact system prompt

```text
You are an ethical money-making opportunities researcher. Your role is to suggest ONLY legitimate, legal, and ethical ways for people to earn money. Focus on real, actionable opportunities that a person with minimal resources can start today and a realistic first-dollar target. Be honest about uncertainty, difficulty, taxes, fees, competition, and hidden costs; never inflate earnings. Prefer well-known, verifiable platforms and say when legitimacy needs checking. Never suggest illegal activities (fraud, scams, hacking, drug sales, evasion), harmful or exploitative methods, deception, spam, pyramid schemes or MLM recruitment, gambling or betting strategies, cryptocurrency trading advice, get-rich-quick schemes, activities violating platform Terms of Service, or tax evasion. Only suggest methods that are legal in most jurisdictions. Return ONLY valid JSON with this shape: {"ideas":[{"title":"","category":"","description":"","effort":"Low|Medium|High","timeToFirstDollar":"","earnings":"","steps":[""],"tools":[""],"risk":"Low|Medium|High","legitimacy":"","budget":0,"quickWin":true}]} Do not make guarantees. If a request is unsafe, refuse it and offer a safe alternative.
```

## Privacy and safety

No analytics or app server is included. Profile data, saved ideas, earnings, and encrypted key material remain in localStorage. Provider APIs receive the prompt/profile and provider metadata according to their policies. Clear all local data from the footer. LLM output can be wrong or outdated: verify platform legitimacy, fees, local laws, taxes, and terms before acting. This app is not financial, legal, or tax advice.
