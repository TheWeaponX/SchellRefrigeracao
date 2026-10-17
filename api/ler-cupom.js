export default async function handler(req, res) {
    // 1. Configurações de CORS (Permite que o seu HTML converse com a Vercel)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 2. Libera a requisição de pré-verificação de segurança do navegador (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. Bloqueia requisições que não sejam o envio do formulário (POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    const { imagemBase64 } = req.body;
    if (!imagemBase64) {
        return res.status(400).json({ erro: 'Nenhuma imagem fornecida' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `Você é um leitor de cupons fiscais brasileiros. 
    Analise a imagem e extraia os dados estritamente no seguinte formato JSON, sem marcações ou textos adicionais:
    {
      "fornecedor": "Nome do Mercado",
      "data": "YYYY-MM-DD",
      "itens": [
        {"produto_generico": "Nome limpo do produto", "quantidade": 1, "valor_total": 0.00}
      ]
    }`;

    try {
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: "image/jpeg", data: imagemBase64 } }
                    ]
                }]
            })
        });

        const data = await geminiResponse.json();
        
        // Trata e limpa o texto que volta da IA
        const textoIA = data.candidates[0].content.parts[0].text;
        const jsonLimpo = textoIA.replace(/```json/g, '').replace(/```/g, '').trim();
        const resultadoFinal = JSON.parse(jsonLimpo);

        return res.status(200).json(resultadoFinal);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Falha ao processar o cupom na IA.' });
    }
}
