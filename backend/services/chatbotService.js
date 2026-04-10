const getOllamaConfig = () => {
    const baseUrl = (process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
    const model = process.env.OLLAMA_MODEL;
    const numPredict = Number.parseInt(process.env.OLLAMA_NUM_PREDICT || '180', 10);
    const timeoutMs = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS || '20000', 10);
    const keepAlive = process.env.OLLAMA_KEEP_ALIVE || '10m';

    if (!model) {
        throw new Error('OLLAMA_MODEL is not configured');
    }

    return { baseUrl, model, numPredict, timeoutMs, keepAlive };
};

const fetchWithTimeout = async (url, options, timeoutMs) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeoutError = new Error(`Ollama request timeout after ${timeoutMs}ms`);
            timeoutError.code = 'TIMEOUT';
            timeoutError.status = 408;
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

const askViaChatEndpoint = async ({ baseUrl, model, systemPrompt, userPrompt, numPredict, timeoutMs, keepAlive }) => {
    const response = await fetchWithTimeout(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            stream: false,
            keep_alive: keepAlive,
            options: {
                temperature: 0.4,
                num_predict: numPredict,
                num_ctx: 2048
            },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        })
    }, timeoutMs);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err = new Error(data?.error || 'Ollama request failed');
        err.status = response.status;
        throw err;
    }

    return String(data?.message?.content || '').trim();
};

const askViaGenerateEndpoint = async ({ baseUrl, model, systemPrompt, userPrompt, numPredict, timeoutMs, keepAlive }) => {
    const response = await fetchWithTimeout(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            stream: false,
            keep_alive: keepAlive,
            options: {
                temperature: 0.4,
                num_predict: numPredict,
                num_ctx: 2048
            },
            prompt: `${systemPrompt}\n\n${userPrompt}`
        })
    }, timeoutMs);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err = new Error(data?.error || 'Ollama request failed');
        err.status = response.status;
        throw err;
    }

    return String(data?.response || '').trim();
};

const askChatbot = async (question, context) => {
    const { baseUrl, model, numPredict, timeoutMs, keepAlive } = getOllamaConfig();

    const systemPrompt = `You are an AI assistant for a student-alumni mentorship platform.
Give practical, safe, and concise guidance for career growth in under 120 words.
If context is limited, say what is missing and suggest a next step.`;

    const userPrompt = `Context data from database:
${context}

Student Question:
${question}`;

    try {
        const outputText = await askViaChatEndpoint({ baseUrl, model, systemPrompt, userPrompt, numPredict, timeoutMs, keepAlive });
        if (outputText) {
            return outputText;
        }
    } catch (error) {
        const shouldTryFallbackEndpoint = [404, 408, 429, 500, 502, 503, 504].includes(error?.status) || error?.code === 'TIMEOUT';
        if (!shouldTryFallbackEndpoint) {
            throw error;
        }
    }

    const outputText = await askViaGenerateEndpoint({ baseUrl, model, systemPrompt, userPrompt, numPredict, timeoutMs, keepAlive });
    if (!outputText) {
        return 'I could not generate a response right now.';
    }

    return outputText;
};

module.exports = {
    askChatbot
};
