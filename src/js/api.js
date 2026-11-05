
import { state } from "./state.js";
import { notify } from "./notifications.js";

const API_BASE_URL = import.meta.env.DEV
    ? 'http://127.0.0.1:5000'
    : 'https://danilloteod.pythonanywhere.com';

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
        const resposta = await fetch(`${API_BASE_URL}/api/login`, {
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
            localStorage.setItem('is_admin', String(dados.is_admin === true));
            try {
                await atualizarPresenca();
            } catch (erro) {
                console.error('Erro ao registrar presença após login:', erro);
            }
            return { sucesso: true };
        } else {
            return {
                sucesso: false,
                erro: dados.erro || 'Não foi possível entrar. Confira seus dados e tente novamente.',
            };
        }

    } catch (erro){
        console.error('Erro na conexão: ', erro);
        return {
            sucesso: false,
            erro: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
        };
    }
};


export async function cadastrar(nome, email, senha) {
    try {
        const resposta = await fetch(`${API_BASE_URL}/api/cadastro`, {
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
            // efetuar login automático logo após o registro
            // await login(email, senha);

            return { sucesso: true };
        } else {
            return {
                sucesso: false,
                erro: dados.erro || 'Não foi possível criar a conta. Confira os dados e tente novamente.',
            };
        }

    } catch (erro) {
        console.error('Erro na conexão com o servidor:', erro);
        return {
            sucesso: false,
            erro: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
        };
    }
};


export async function enviarSimulado(arrayAnswers, correctAnswers, editionSelected, totalQuestions) {
    const token = localStorage.getItem('token_oab'); // verifica se o usuário está logado

    if (!token) { // se não estiver logado, impede o envio do simulado
        notify('Entre na sua conta para salvar seu desempenho.', 'info');
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
        const resposta = await fetch(`${API_BASE_URL}/api/simulados/salvar`, {

            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // injeta o token de autorização no cabeçalho da requisição
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const dados = await resposta.json();

        if (resposta.status === 401 || resposta.status === 422) {
            localStorage.removeItem('token_oab'); // remove o token inválido
            localStorage.removeItem('user_name'); // remove o nome armazenado
            localStorage.removeItem('is_admin');

            notify('Sua sessão expirou. Entre novamente para continuar.', 'error');
            return false;
        }

        if (resposta.ok) {
            notify('Resultado salvo no seu histórico.', 'success');
            return true;
        } else {
            notify(dados.erro || 'Não foi possível salvar o simulado. Tente novamente.', 'error');
            return false;
        }

    } catch (erro) {
        console.error('Erro ao enviar simulado:', erro);
        notify('Não foi possível conectar ao servidor. Tente novamente mais tarde.', 'error');
        return false;
    }
};

export async function historico() {
    const token = localStorage.getItem('token_oab');
    if (!token) {
        throw new Error('Você precisa estar logado para consultar seu histórico.');
    }
    const resposta = await fetch(`${API_BASE_URL}/api/simulados/historico`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (resposta.status === 401 || resposta.status === 422) {
        localStorage.removeItem('token_oab');
        localStorage.removeItem('user_name');
        localStorage.removeItem('is_admin');
        throw new Error('Sua sessão expirou ou o token não é válido para este servidor. Faça login novamente.');
    }

    const dados = await resposta.json();
    if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível carregar seu histórico.');
    }

    if (!Array.isArray(dados)) {
        throw new Error('O servidor retornou um histórico em formato inválido.');
    }

    return dados;
}

function obterIdSessao() {
    let sessionId = localStorage.getItem('presence_session_id');
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('presence_session_id', sessionId);
    }
    return sessionId;
}

export async function atualizarPresenca() {
    const token = localStorage.getItem('token_oab');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const resposta = await fetch(`${API_BASE_URL}/api/presenca`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ session_id: obterIdSessao() }),
    });

    if (resposta.status === 401 || resposta.status === 422) {
        localStorage.removeItem('token_oab');
        localStorage.removeItem('user_name');
        localStorage.removeItem('is_admin');
    }

    if (!resposta.ok) {
        throw new Error(`Não foi possível atualizar a presença (HTTP ${resposta.status}).`);
    }

    const dados = await resposta.json();
    if (!Number.isInteger(dados.online_total) || dados.online_total < 0) {
        throw new Error('O servidor retornou uma contagem de estudantes online inválida.');
    }

    return dados.online_total;
}

export async function carregarPainelAdmin() {
    const token = localStorage.getItem('token_oab');
    if (!token) throw new Error('Faça login para acessar o painel administrativo.');

    const resposta = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const dados = await resposta.json();

    if (resposta.status === 401 || resposta.status === 422) {
        localStorage.removeItem('token_oab');
        localStorage.removeItem('user_name');
        localStorage.removeItem('is_admin');
    }
    if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível carregar o painel administrativo.');
    }

    return dados;
}

async function requisicaoAdmin(path, options = {}) {
    const token = localStorage.getItem('token_oab');
    if (!token) throw new Error('Faça login para acessar o painel administrativo.');

    const resposta = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });
    const dados = await resposta.json();

    if (resposta.status === 401 || resposta.status === 422) {
        localStorage.removeItem('token_oab');
        localStorage.removeItem('user_name');
        localStorage.removeItem('is_admin');
    }
    if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível concluir a ação administrativa.');
    }

    return dados;
}

export async function criarUsuarioAdmin(usuario) {
    return requisicaoAdmin('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(usuario),
    });
}

export async function atualizarPermissaoAdmin(id, isAdmin) {
    return requisicaoAdmin(`/api/admin/users/${encodeURIComponent(id)}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ is_admin: isAdmin }),
    });
}

export async function editarUsuarioAdmin(id, usuario) {
    return requisicaoAdmin(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(usuario),
    });
}

export async function excluirUsuarioAdmin(id) {
    return requisicaoAdmin(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
}

export async function loadEditionQuestions(edicao) {
    const response = await fetch(`/data/questoes_oab_${edicao}_tipo1.json`);
    if (!response.ok) {
        throw new Error(`Não foi possível carregar as questões do Exame ${edicao}. Status ${response.status}.`);
    }

    const data = await response.json();
    if (!Array.isArray(data.questoes)) {
        throw new Error(`O arquivo do Exame ${edicao} não contém uma lista de questões válida.`);
    }

    return data.questoes;
}
