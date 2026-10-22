import { state } from "./state.js";

export async function loadQuestions(edicao){ // função assincrona para filtrar as questões
    try {
        const response = await fetch(`/data/questoes_oab_${edicao}_tipo1.json`) // fetch: fazer pedidos de recursos externos
        if (!response.ok){ // Verifica se encontrou o diretorio com o arquivo
            throw new Error(`Não foi possível carregar as questões do Exame ${edicao}. Status ${response.status}.`)
        };
        
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

export async function login (email, senha){
    try {
        const resposta = await fetch('http://127.0.0.1:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, senha: senha})
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            localStorage.setItem('token_oab', dados.token);
            localStorage.setItem('user_name', dados.estudante.nome); // <--- Adicione esta linha!
            return true;
        } else{
            alert(dados.erro || 'Falha ao realizar login');
        }
    } catch (erro){
        console.error('Erro na conexão: ', erro);
    }
};

export async function cadastrar(nome, email, senha) {
    try {
        const resposta = await fetch('http://127.0.0.1:5000/api/cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nome: nome, 
                email: email, 
                senha: senha 
            })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            alert(dados.mensagem || 'Registo realizado com sucesso!');
            
            //efetuar login automático logo após o registo
            //await login(email, senha);
            return true;
        } else {
            alert(dados.erro || 'Falha ao realizar o registo.');
            return false;
        }
    } catch (erro) {
        console.error('Erro na ligação com o servidor:', erro);
        return false;
    }
};


export async function enviarSimulado (arrayAnswers, correctAnswers, editionSelected, totalQuestions) {
    const token = localStorage.getItem('token_oab'); // verifica se o usuario esta logado

    if (!token) { // se estiver logado, é injetado o token de autorizacao
        //alert('Você precisa estar logado para salvar seu desempenho!');
        return;
    };

    const payload = {
      edition: editionSelected,
      total_questions: totalQuestions,
      score: correctAnswers,
      answers: arrayAnswers
    };
    
    try {
        // envia os dados para o back-end Django em execução local
        const resposta = await fetch('http://127.0.0.1:5000/api/simulados/salvar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json',
                // Injeta o token com o prefixo Bearer
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            alert('Simulado salvo com sucesso no seu histórico!');
        } else {
            alert(dados.erro || 'Erro ao salvar simulado.')
        }
    } catch (erro) {
        console.error('Erro ao enviar simulado:', erro);
    }

};
