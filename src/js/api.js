
import { state } from "./state.js";

export async function loadQuestions(edicao){ // função assíncrona para filtrar as questões
    try {
        const response = await fetch(`/data/questoes_oab_${edicao}_tipo1.json`); // fetch: fazer pedidos de recursos externos

        if (!response.ok){ // Verifica se encontrou o diretório com o arquivo
            throw new Error(`Não foi possível carregar as questões do Exame ${edicao}. Status ${response.status}.`);
        }

        // converte a resposta bruta em um objeto array
        const data = await response.json();

        const subjectQuestions = data.questoes.filter(
            q => q.materia === state.subject
        );

        //console.log(`Questões encontradas para ${state.subject}`, subjectQuestions);

        return subjectQuestions; // retorna o array filtrado para usar na tela de QUIZ

    } catch(error){
        console.error("Erro ao carregar arquivo o JSON: ", error);
        return [];
    }
};


export async function login(email, senha){
    try {
        const resposta = await fetch('https://danilloteod.pythonanywhere.com/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email, senha: senha })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            localStorage.setItem('token_oab', dados.token); // armazena o token JWT recebido do backend
            localStorage.setItem('user_name', dados.estudante.nome); // armazena o nome do estudante
            return true;
        } else {
            alert(dados.erro || 'Falha ao realizar login');
            return false;
        }

    } catch (erro){
        console.error('Erro na conexão: ', erro);
        alert('Não foi possível conectar ao servidor.');
        return false;
    }
};


export async function cadastrar(nome, email, senha) {
    try {
        const resposta = await fetch('https://danilloteod.pythonanywhere.com/api/cadastro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha
            })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            alert(dados.mensagem || 'Registro realizado com sucesso!');

            // efetuar login automático logo após o registro
            // await login(email, senha);

            return true;
        } else {
            alert(dados.erro || 'Falha ao realizar o registro.');
            return false;
        }

    } catch (erro) {
        console.error('Erro na conexão com o servidor:', erro);
        alert('Não foi possível conectar ao servidor.');
        return false;
    }
};


export async function enviarSimulado(arrayAnswers, correctAnswers, editionSelected, totalQuestions) {
    const token = localStorage.getItem('token_oab'); // verifica se o usuário está logado

    if (!token) { // se não estiver logado, impede o envio do simulado
        alert('Você precisa estar logado para salvar seu desempenho!');
        return false;
    }

    const payload = {
        edition: editionSelected,
        total_questions: totalQuestions,
        score: correctAnswers,
        answers: arrayAnswers
    };

    try {
        // envia os dados para o backend Flask
        const resposta = await fetch('https://danilloteod.pythonanywhere.com/api/simulados/salvar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // injeta o token de autorização no cabeçalho da requisição
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const dados = await resposta.json();

        if (resposta.status === 401) { // verifica se o token está ausente, inválido ou expirado
            localStorage.removeItem('token_oab'); // remove o token inválido
            localStorage.removeItem('user_name'); // remove o nome armazenado

            alert('Sua sessão expirou ou o token é inválido. Faça login novamente.');
            return false;
        }

        if (resposta.ok) {
            alert('Simulado salvo com sucesso no seu histórico!');
            return true;
        } else {
            alert(dados.erro || 'Erro ao salvar simulado.');
            return false;
        }

    } catch (erro) {
        console.error('Erro ao enviar simulado:', erro);
        alert('Não foi possível conectar ao servidor.');
        return false;
    }
};
