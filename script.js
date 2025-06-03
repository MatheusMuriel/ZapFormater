const inputTypeSelect = document.getElementById('inputType');
const phoneFormatSelect = document.getElementById('phoneFormat');

// Define as opções de formato de telefone disponíveis
const phoneFormatOptionsConfig = {
    somente_numero: [
        { value: "DDD_NUMERO_PARENTS_ESP", text: "(DDD) NÚMERO (ex: (11) 987654321)" },
        { value: "DDD_NUMERO_ESP", text: "DDD NÚMERO (ex: 11 987654321)" },
        { value: "DDDNUMERO_NOESP", text: "DDDNÚMERO (ex: 11987654321)" },
        { value: "DDD_NUM_ERO_HIFEN_ESP", text: "(DDD) NÚMERO-HIFEN (ex: (11) 98765-4321)" },
        { value: "MAIS55_DDD_NUMERO_ESP", text: "+55 (DDD) NÚMERO (ex: +55 (11) 987654321)" },
        { value: "MAIS55_DDD_NUM_ERO_HIFEN_ESP", text: "+55 (DDD) NÚMERO-HIFEN (ex: +55 (11) 98765-4321)" }
    ],
    numero_nome: [
        { value: "NOME_SEP_DDD_NUMERO_ESP", text: "Nome (DDD) NÚMERO" },
        { value: "NOME_SEP_DDDNUMERO_ESP", text: "Nome DDD NÚMERO" },
        { value: "NOME_SEP_DDD_NUM_ERO_HIFEN_ESP", text: "Nome (DDD) NÚMERO-HIFEN" },
        { value: "NOME_SEP_MAIS55_DDD_NUMERO_ESP", text: "Nome +55 (DDD) NÚMERO" },
        { value: "NOME_SEP_MAIS55_DDD_NUM_ERO_HIFEN", text: "Nome +55 (DDD) NÚMERO-HIFEN" },
        { value: "DDD_NUMERO_SEP_NOME", text: "(DDD) NÚMERO - Nome" },
        { value: "DDDNUMERO_SEP_NOME", text: "DDD NÚMERO - Nome" },
        { value: "DDD_NUM_ERO_HIFEN_SEP_NOME", text: "(DDD) NÚMERO-HIFEN - Nome" },
        { value: "MAIS55_DDD_NUMERO_SEP_NOME", text: "+55 (DDD) NÚMERO - Nome" },
        { value: "MAIS55_DDD_NUM_ERO_HIFEN_SEP_NOME", text: "+55 (DDD) NÚMERO-HIFEN - Nome" }
    ]
};

// Função para atualizar as opções do select 'phoneFormat'
function updatePhoneFormatOptions() {
    const selectedInputType = inputTypeSelect.value;
    const currentPhoneFormatValue = phoneFormatSelect.value; // Salva seleção atual
    
    phoneFormatSelect.innerHTML = ''; // Limpa opções existentes

    const optionsToShow = phoneFormatOptionsConfig[selectedInputType] || phoneFormatOptionsConfig.somente_numero;

    optionsToShow.forEach(opt => {
        const optionElement = document.createElement('option');
        optionElement.value = opt.value;
        optionElement.textContent = opt.text;
        phoneFormatSelect.appendChild(optionElement);
    });

    // Tenta restaurar a seleção anterior se o valor ainda existir nas novas opções
    if (optionsToShow.some(opt => opt.value === currentPhoneFormatValue)) {
        phoneFormatSelect.value = currentPhoneFormatValue;
    }
}

// Adiciona o event listener para mudar as opções de formato de telefone
inputTypeSelect.addEventListener('change', updatePhoneFormatOptions);

// Inicializa as opções de formato de telefone quando a página carrega
document.addEventListener('DOMContentLoaded', updatePhoneFormatOptions);


// Função principal para processar os contatos
function processContacts() {
    const inputData = document.getElementById('inputData').value;
    const phoneFormatOptionValue = phoneFormatSelect.value; // Valor da opção de formato
    const delimiterOption = document.getElementById('delimiter').value;
    const inputTypeOptionValue = inputTypeSelect.value; 
    
    let actualDelimiter = delimiterOption;
    if (delimiterOption === "\\n") { 
        actualDelimiter = '\n';
    }

    const lines = inputData.split('\n').filter(line => line.trim() !== ''); 
    const processedLines = [];

    lines.forEach(rawLine => {
        const line = rawLine.trim();
        const entry = parseLine(line, inputTypeOptionValue); 
        let outputLine = "";

        if (entry.error) {
            outputLine = entry.name ? `${entry.name}: ${entry.error}` : entry.error;
            if (entry.originalNumber && !entry.name && !entry.ddd) {
                    outputLine += ` (Entrada: ${entry.originalNumber})`;
            } else if (entry.originalNumber && !entry.ddd && entry.name) {
                outputLine += ` (Número original: ${entry.originalNumber})`;
            }
        } else if (inputTypeOptionValue === 'somente_numero') {
            if (entry.numberPart) {
                outputLine = formatSinglePhoneNumber(entry.ddd, entry.numberPart, phoneFormatOptionValue);
                if (!entry.ddd && (phoneFormatOptionValue.includes("DDD") || phoneFormatOptionValue.includes("MAIS55"))) {
                    outputLine += " (DDD não informado)";
                }
            } else {
                outputLine = `${entry.originalNumber || line} (Número inválido ou não reconhecido)`;
            }
        } else { // inputTypeOptionValue === 'numero_nome'
            if (entry.name && entry.numberPart) {
                let baseFormat = phoneFormatOptionValue;
                if (phoneFormatOptionValue.startsWith('NOME_SEP_')) {
                    baseFormat = phoneFormatOptionValue.substring('NOME_SEP_'.length);
                    const formattedNum = formatSinglePhoneNumber(entry.ddd, entry.numberPart, baseFormat);
                    outputLine = `${entry.name} ${formattedNum}`;
                } else if (phoneFormatOptionValue.endsWith('_SEP_NOME')) {
                    baseFormat = phoneFormatOptionValue.substring(0, phoneFormatOptionValue.lastIndexOf('_SEP_NOME'));
                    const formattedNum = formatSinglePhoneNumber(entry.ddd, entry.numberPart, baseFormat);
                    outputLine = `${formattedNum} - ${entry.name}`;
                } else { // Fallback se o formato não for reconhecido (não deveria acontecer)
                    const formattedNum = formatSinglePhoneNumber(entry.ddd, entry.numberPart, "DDD_NUMERO_PARENTS_ESP");
                    outputLine = `${entry.name} ${formattedNum}`;
                }
            } else if (entry.numberPart) { // Tem número mas não nome
                const baseFormatToUse = extractBaseFormat(phoneFormatOptionValue);
                const formattedNum = formatSinglePhoneNumber(entry.ddd, entry.numberPart, baseFormatToUse);
                outputLine = `${formattedNum} (Nome não encontrado)`;
            } else if (entry.name) { // Tem nome mas não número
                outputLine = `${entry.name} (Número não encontrado/inválido)`;
            } else {
                outputLine = `${line} (Não foi possível processar)`;
            }
        }
        processedLines.push(outputLine);
    });

    document.getElementById('outputData').value = processedLines.join(actualDelimiter);
}

// Função para extrair o formato base do número de uma opção combinada
function extractBaseFormat(combinedFormat) {
    if (combinedFormat.startsWith("NOME_SEP_")) {
        return combinedFormat.substring("NOME_SEP_".length);
    } else if (combinedFormat.endsWith("_SEP_NOME")) {
        return combinedFormat.substring(0, combinedFormat.lastIndexOf("_SEP_NOME"));
    }
    return combinedFormat; // Já é um formato base ou não reconhecido como combinado
}

function cleanPhoneNumber(phoneStr) {
    if (!phoneStr) return "";
    return phoneStr.replace(/\D/g, ''); 
}

function formatSinglePhoneNumber(ddd, numberPart, formatOption) {
    if (!numberPart) return "Número Inválido"; 

    let formattedDdd = ddd ? `(${ddd})` : ""; 
    let formattedNumber = numberPart;
    let prefix = "";

    // Determina o prefixo (+55)
    if (formatOption.startsWith("MAIS55_")) {
        prefix = "+55 ";
    }
    
    // Determina a formatação do DDD
    if (
        formatOption.includes("DDD_NUMERO_ESP") || 
        formatOption.includes("DDDNUMERO_NOESP") || 
        formatOption.includes("NOME_SEP_DDDNUMERO_ESP") || 
        formatOption.includes("DDDNUMERO_SEP_NOME") 
    ) { // Sem parênteses no DDD
        formattedDdd = ddd ? `${ddd}` : "";
    }


    // Formatação do número com hífen
    if (formatOption.includes("_HIFEN")) {
        if (numberPart.length === 9) { 
            formattedNumber = `${numberPart.substring(0, 5)}-${numberPart.substring(5)}`;
        } else if (numberPart.length === 8) { 
            formattedNumber = `${numberPart.substring(0, 4)}-${numberPart.substring(4)}`;
        }
    } else { // Sem hífen
        formattedNumber = numberPart;
    }
    
    // Monta a string final do número
    if (ddd && formattedDdd) { // Se tem DDD e ele foi formatado (não é vazio)
        if (formatOption.includes("_NOESP")){
            return `${prefix}${formattedDdd}${formattedNumber}`.trim();
        }
        return `${prefix}${formattedDdd} ${formattedNumber}`.trim();
    } else if (ddd && !formattedDdd) { // Se tem DDD mas a formatação não usa parênteses (ex: DDD_NUMERO_ESP)
        if (formatOption.includes("_NOESP")){
            return `${prefix}${ddd}${formattedNumber}`.trim();    
        }
        return `${prefix}${ddd} ${formattedNumber}`.trim();
    }
    else { // Sem DDD
        return `${prefix}${formattedNumber}`.trim();
    }
}

function parseLine(line, inputType) { 
    let originalLine = line;
    let name = "";
    let numberStr = "";
    let match; 

    if (inputType === "somente_numero") {
        numberStr = cleanPhoneNumber(line);
        name = ""; 
    } else { 
        /**
         * Explicação de regex 
         * "+55": (\+?\s*55\s*)?
         * "(43)": \(?\s*(\d{2})\s*\)?
         * "99888": \s*(\d{4,6})\s*
         * "-": [-.\s]?
         * "7777": \s*(\d{4,5})|(\d{8,14})
         */
        const phoneRegex = /(\+?\s*55\s*)?\(?\s*(\d{2})\s*\)?\s*(\d{4,6})\s*[-.\s]?\s*(\d{4,5})|(\d{8,14})/;
        const simplePhoneRegex = /(\d{8,11})/;

        match = line.match(phoneRegex);
        let extractedPhoneNumberString = "";

        console.log(match)
        if (match) {
            if (match[2] && match[3] && match[4]) { 
                extractedPhoneNumberString = (match[1] || "") + match[2] + match[3] + match[4];
                numberStr = cleanPhoneNumber(extractedPhoneNumberString);
            } else if (match[5]) { 
                numberStr = cleanPhoneNumber(match[5]);
            }
        }
        
        if (!numberStr) {
            match = line.match(simplePhoneRegex);
            if (match && match[1]) {
                numberStr = cleanPhoneNumber(match[1]);
            }
        }
        
        if (numberStr) {
            let tempName = originalLine;
            if (match && match[0]) { 
                // Para evitar remover parte do nome se o número estiver no meio,
                // tentamos ser um pouco mais específicos.
                // Substituímos apenas a primeira ocorrência para casos como "Nome 1199998888 Nome Meio"
                // No entanto, a regex já tenta ser "gananciosa" e pegar o número completo.
                tempName = originalLine.replace(match[0], "");
            } else if (numberStr) { 
                // Fallback mais simples: se a regex não deu match[0] mas temos numberStr (de simplePhoneRegex)
                // tentamos remover a string limpa, o que é menos preciso.
                // Uma heurística seria remover todos os blocos de dígitos que formam o numberStr.
                // Por ora, a remoção de match[0] é a principal. Se ela falha e numberStr existe,
                // a extração de nome pode ser imperfeita.
            }
            
            name = tempName.replace(/[:\-"'\(\)]/g, "").replace(/[\s-]+$/, "").replace(/^[\s-]+/, "").trim();
            if (!/[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(name)) { 
                name = "";
            }
        } else {
            if (/[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(originalLine)) {
                name = originalLine.trim();
            }
        }
    }

    let ddd = "";
    let numberPart = "";
    let cleanedInputNumber = numberStr; 

    if (cleanedInputNumber.startsWith("55") && cleanedInputNumber.length >= 12) {
        cleanedInputNumber = cleanedInputNumber.substring(2);
    }

    if (cleanedInputNumber.length === 11) { 
        ddd = cleanedInputNumber.substring(0, 2);
        numberPart = cleanedInputNumber.substring(2);
    } else if (cleanedInputNumber.length === 10) { 
        ddd = cleanedInputNumber.substring(0, 2);
        numberPart = cleanedInputNumber.substring(2);
    } else if (cleanedInputNumber.length === 9 && (cleanedInputNumber.startsWith('9') || cleanedInputNumber.startsWith('8') || cleanedInputNumber.startsWith('7'))) { 
        numberPart = cleanedInputNumber; 
    } else if (cleanedInputNumber.length === 8) { 
        numberPart = cleanedInputNumber; 
    } else if (cleanedInputNumber.length > 0) { 
            return { name: name, ddd: null, numberPart: cleanedInputNumber, originalNumber: numberStr || originalLine, error: "Formato de número não reconhecido ou DDD ausente." };
    } else if (name && inputType === 'numero_nome') { 
        return { name: name, ddd: null, numberPart: null, originalNumber: originalLine, error: "Número não encontrado." };
    } else if (!name && !cleanedInputNumber && inputType === 'somente_numero') {
            return { name: null, ddd: null, numberPart: null, originalNumber: originalLine, error: "Número inválido." };
    }
    else { 
        return { name: name || originalLine, ddd: null, numberPart: null, originalNumber: originalLine, error: "Entrada não processável." };
    }
    return { name: name, ddd: ddd, numberPart: numberPart, originalNumber: numberStr || originalLine };
}
// Garante que a função de atualização seja chamada após o DOM estar completamente carregado
// se o script for movido para o <head> ou executado antes do select existir.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updatePhoneFormatOptions);
} else {
    updatePhoneFormatOptions(); // Chama imediatamente se o DOM já estiver pronto.
}


function copyOutput() {
    const outputTextarea = document.getElementById('outputData');
    const textToCopy = outputTextarea.value;

    if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Opcional: Mudar o texto do botão ou mostrar uma notificação
            const copyButton = document.querySelector('.copy-button'); // Ou use um ID se preferir
            if (copyButton) {
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copiado!';
                setTimeout(() => {
                    copyButton.textContent = originalText;
                }, 2000); // Volta ao texto original após 2 segundos
            }
        }).catch(err => {
            console.error('Erro ao copiar texto: ', err);
            alert('Erro ao copiar. Verifique o console para mais detalhes.');
        });
    } else {
        alert('Nada para copiar!');
    }
}
