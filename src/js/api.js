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

