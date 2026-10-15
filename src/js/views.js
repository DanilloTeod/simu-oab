import { userState, state } from "./state.js"
import { loadQuestions } from "./api.js";

export function render() {
    let choice = null;
    const app = document.getElementById('app');

    // --- TELA: HOME ---
    if (state.screen === 'HOME') {
        app.innerHTML = `
            <div class="card">
                <h1>Simulado OAB 1ª Fase</h1>
                <p><strong>Escolha uma Disciplina</strong></p>
                
                <button data-materia="etica" class="btn-materia">Ética Profissional</button>
                <button data-materia="constitucional" class="btn-materia">Direito Constitucional</button>
                <button data-materia="civil" class="btn-materia">Direito Civil</button>
                <button data-materia="processualcivil" class="btn-materia">Direito Processual Civil</button>
                <button data-materia="penal" class="btn-materia">Direito Penal</button>        
                <button data-materia="processualpenal" class="btn-materia">Direito Processual Penal</button>        

                <button id="btn-iniciar" class="btn-primary">Iniciar Simulado</button>
            </div>
        `;

        const subjectButtons = app.querySelectorAll('.btn-materia');
        const start = app.querySelector('#btn-iniciar');

        // 1. Configura o clique em cada botão de matéria (O LOOP)
        subjectButtons.forEach(botao => {
            botao.addEventListener('click', (e) => {
                subjectButtons.forEach(b => b.classList.remove('ativo'));
                e.target.classList.add('ativo');
                
                // Guardamos diretamente no estado correto
                state.subject = e.target.getAttribute('data-materia');
                console.log("Matéria guardada na memória:", state.subject);
            });
        }); // <-- O loop .forEach() fecha AQUI!

        //  clique no botão Iniciar 
        start.addEventListener("click", () => {
            if (state.subject === null) {
                alert("Escolha ao menos uma Disciplina!");
            } else {
                console.log("Disciplina escolhida com sucesso: ", state.subject);
                // Agora sim: muda o ecrã para QUIZ e redesenha!
                state.screen = 'QUIZ';
                render();
            }
        });
    }
    
    // --- TELA: QUIZ ---
    else if (state.screen === 'QUIZ') {
        // é chamada a funcao assincrona para carregar os dados
        loadQuestions().then(questoes => {
            if (state.currentIndex >= questoes.length){ // fim das questoes
                state.screen = "RESULT";
                render();
                return;
            };
            app.innerHTML = `
                <div class="card" style="text-align: center;">
                    <h1>Simulado de ${state.subject.toUpperCase()} </h1>
                    <span style="display: inline-block; padding: 4px 12px; background-color: rgba(255, 255, 255, 0.1); border-radius: 12px; font-size: 0.85rem; margin-bottom: 15px;">
            ${state.currentIndex + 1} / ${questoes.length}</span>
            <div id="container-question"> Carregando questões...</div>
            </div>
            `;
            const container = document.getElementById('container-question');

            if (questoes.length === 0){
                container.innerHTML = `<p>Não existem questões cadastradas para esta matéria ainda.</p>`;
                return;
            }

            choice = null;
            const questao = questoes[state.currentIndex];
            const letters = ['a', 'b', 'c', 'd'];
            let buttonsHTML = '';

            letters.forEach(letter => {
                buttonsHTML += `
                <button class="btn-alternativa" data-letra="${letter}">
                    <strong>${letter.toUpperCase()}.</strong> ${questao.alternativas[letter]}
                </button>
                `;
            });

            // Injetando tudo no container
            container.innerHTML = `
            <p class="enunciado"><strong> Questão ${questao.id}. </strong>${questao.enunciado}</p>
            <div class="container-alternativas">
                ${buttonsHTML}
            </div>
            <button class="btn-primary" id="btn-confirmar" style="margin-top: 20px;">Confirmar</button>
            `;
            const choiceButton = container.querySelectorAll(".btn-alternativa")
            choiceButton.forEach(botao => {
                botao.addEventListener('click', (e) => {
                choiceButton.forEach(b => b.classList.remove('ativo'));
                e.currentTarget.classList.add('ativo');
                
                choice = e.currentTarget.getAttribute('data-letra');
                console.log("Alternativa escolhida: ", choice);
                });

            });
            // click botao de confirmar
            const confirm = app.querySelector('#btn-confirmar');
            confirm.addEventListener("click", () => {
                console.log("confirmou")
                //console.log(userState.answers[state.currentIndex])
                if (choice === null){
                    alert("Escolha ao menos uma alternativa.")
                    return;
                };
                
                userState.answers.push(choice);
                userState.questionId.push(questao.id);
                
                if (userState.answers[state.currentIndex].toLowerCase() === questao.correta.toLowerCase()){
                    // state.correctAnswers++;
                    userState.correctAnswers++;
                    
                };
                console.log(`id = ${userState.questionId[state.currentIndex]} : resposta =  ${userState.answers[state.currentIndex]}`);
                state.currentIndex++;
                render();
            });
        });
    }
    else if (state.screen == "RESULT"){

        if (state.currentResultIndex == undefined){
            state.currentResultIndex = 0;
        };

        loadQuestions().then(questoes => { // funcao assincrona que devolve uma promise
            let gabaritoHTML = '';
            let gridBotoesHTML = '';
            userState.answers.forEach((answer, index) => {
                const qId = userState.questionId[index]; // pego o id da questao nos indices
                const qOriginal = questoes.find(q => q.id === qId);


                const acertou = answer.toLowerCase() == qOriginal.correta.toLowerCase();
                const corBorda = acertou ? '#22c55e' : '#ef4444';
                const corFundo = acertou ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.07)';
                const classeAtiva = index === state.currentResultIndex ? 'ativo' : '';

                gridBotoesHTML += `
                    <button class="btn-grid-questao ${classeAtiva}" data-index="${index}" style="border-bottom: 3px solid ${corBorda};">
                        ${index + 1}
                    </button>
                `;
            }); 
            
                const indexAtual = state.currentResultIndex;
                const qIdAtual = userState.questionId[indexAtual];
                const qOriginalAtual = questoes.find(q => q.id === qIdAtual);
                const respostaUsuario = userState.answers[indexAtual];

                const acertouAtual = respostaUsuario.toLowerCase() === qOriginalAtual.correta.toLowerCase();
                const corBordaDetalhe = acertouAtual ? '#22c55e' : '#ef4444';
                const corFundoDetalhe = acertouAtual ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.07)';

                let alternativasHTML = '';
                ['a', 'b', 'c', 'd'].forEach(letra =>{
                    alternativasHTML += 
                    `
                    <div class="gabarito-alternativas">
                        <strong>${letra.toUpperCase()}.</strong> ${qOriginalAtual.alternativas[letra]}
                    </div>
                    `;

                });
            
                console.log(userState.answers)
                console.log(userState.questionId)
            

                app.innerHTML = `
                    <div class="card card-result" style="max-width: 1050px !important;">
                        <!-- Topo Centralizado e Destacado -->
                        <div style="text-align: center; margin-bottom: 25px;">
                            <h1 style="margin-bottom: 8px;">Simulado Concluído!</h1>
                            <p class="concluido" style="font-size: 1.1rem; margin: 0; opacity: 0.9;">
                                Você acertou <strong style="color: #4ade80; font-size: 1.2rem;">${userState.correctAnswers}</strong> de <strong>${userState.answers.length}</strong> questões.
                            </p>
                        </div>
                        
                        <div class="resultado-container-layout">
                            <!-- Coluna Esquerda: Grelha de Navegação -->
                            <div class="sidebar-questoes">
                                <div class="sidebar-titulo">Questões (${userState.answers.length})</div>
                                <div class="grid-botoes">
                                    ${gridBotoesHTML}
                                </div>
                            </div>

                            <!-- Coluna Direita: Detalhe da Questão Atual -->
                            <div class="painel-detalhe" style="border-left: 6px solid ${corBordaDetalhe}; background-color: ${corFundoDetalhe};">
                                <div class="gabarito-enunciado">
                                    <strong>Questão ${qOriginalAtual.id} (${indexAtual + 1} de ${userState.answers.length}).</strong> ${qOriginalAtual.enunciado}
                                </div>

                                <div style="margin-bottom: 15px;">
                                    ${alternativasHTML}
                                </div>

                                <div class="gabarito-rodape">
                                    <span>Sua resposta: <strong style="color: ${corBordaDetalhe}; font-size: 1.1rem;">${respostaUsuario.toUpperCase()}</strong></span>
                                    <span class="gabarito-badge">Correta: <strong style="color: #4ade80; font-size: 1.1rem;">${qOriginalAtual.correta.toUpperCase()}</strong></span>
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; width: 100%; margin-top: 20px;">
                            <button class="btn-primary" id="btn-reiniciar" style="margin: 0; width: auto; padding: 10px 20px;">Voltar ao Início</button>
                        </div>
                    </div>
                    `;


        const botoesGrid = app.querySelectorAll('.btn-grid-questao');
            botoesGrid.forEach(botao => {
                botao.addEventListener('click', (e) => {
                    const novoIndex = parseInt(e.currentTarget.getAttribute('data-index'));
                    state.currentResultIndex = novoIndex;
                    render(); // Atualiza o ecrã para mostrar a nova questão selecionada
                });
        });

        const btnReiniciar = app.querySelector("#btn-reiniciar");
        btnReiniciar.addEventListener('click', () => {
            state.screen = "HOME";
            state.subject = null;
            state.currentIndex = 0;
            state.correctAnswers = 0;
            state.currentResultIndex = 0;

            userState.correctAnswers = 0;
            userState.questionId = [];
            userState.answers = [];
            render();
            });
        });
    };
};