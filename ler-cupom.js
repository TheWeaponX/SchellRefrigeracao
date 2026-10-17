// Arquivo: api/ler-cupom.js

export default async function handler(req, res) {
    // Bloqueia qualquer coisa que não seja POST
    if (req.method !== 'POST') {
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    const { imagemBase64 } = req.body;
    if (!imagemBase64) {
        return res.status(400).json({ erro: 'Nenhuma imagem fornecida' });
    }

    // A chave da API fica segura nas variáveis de ambiente da Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    // A instrução restrita para a IA retornar apenas o formato exato que o seu ERP precisa
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
        
        // Pega a resposta de texto da IA e transforma de volta em JSON para seu ERP
        const textoIA = data.candidates[0].content.parts[0].text;
        const jsonLimpo = textoIA.replace(/```json/g, '').replace(/```/g, '').trim();
        const resultadoFinal = JSON.parse(jsonLimpo);

        return res.status(200).json(resultadoFinal);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Falha ao processar o cupom na IA.' });
    }
}
