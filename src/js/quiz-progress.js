import { state, userState } from "./state.js";

const STORAGE_KEY = 'simu-oab-active-quiz';
const validAnswers = new Set(['a', 'b', 'c', 'd']);

export function saveQuizProgress() {
    if (state.screen !== 'QUIZ' || state.quizFinalized) return;

    const progress = {
        subject: state.subject,
        editionSelected: state.editionSelected,
        currentIndex: state.currentIndex,
        correctAnswers: state.correctAnswers,
        totalQuestions: state.totalQuestions,
        arrayAnswers: state.arrayAnswers,
        answers: userState.answers,
        questionId: userState.questionId,
        timerDurationMinutes: state.timerDurationMinutes,
        timerDeadline: state.timerDeadline,
        selectedAnswer: state.selectedAnswer,
    };

    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (erro) {
        console.error('Não foi possível salvar o progresso do simulado:', erro);
    }
}

export function restoreQuizProgress() {
    let rawProgress;
    try {
        rawProgress = sessionStorage.getItem(STORAGE_KEY);
    } catch (erro) {
        console.error('Não foi possível ler o progresso salvo do simulado:', erro);
        return false;
    }
    if (!rawProgress) return false;

    try {
        const progress = JSON.parse(rawProgress);
        const valid = progress
            && typeof progress.subject === 'string'
            && typeof progress.editionSelected === 'string'
            && Number.isInteger(progress.currentIndex)
            && progress.currentIndex >= 0
            && Number.isInteger(progress.correctAnswers)
            && Number.isInteger(progress.totalQuestions)
            && Array.isArray(progress.arrayAnswers)
            && Array.isArray(progress.answers)
            && Array.isArray(progress.questionId)
            && progress.arrayAnswers.length === progress.currentIndex
            && progress.answers.length === progress.currentIndex
            && progress.questionId.length === progress.currentIndex
            && progress.arrayAnswers.every(answer =>
                answer
                && Number.isInteger(answer.question_id)
                && validAnswers.has(answer.selected_option)
            )
            && progress.answers.every(answer => validAnswers.has(answer))
            && progress.questionId.every(id => Number.isInteger(id))
            && (progress.selectedAnswer === null
                || validAnswers.has(progress.selectedAnswer))
            && (progress.timerDeadline === null
                || Number.isFinite(progress.timerDeadline));

        if (!valid) throw new Error('Os dados salvos do simulado são inválidos.');

        state.screen = 'QUIZ';
        state.subject = progress.subject;
        state.editionSelected = progress.editionSelected;
        state.currentIndex = progress.currentIndex;
        state.correctAnswers = progress.correctAnswers;
        state.totalQuestions = progress.totalQuestions;
        state.arrayAnswers = progress.arrayAnswers;
        state.timerDurationMinutes = progress.timerDurationMinutes;
        state.timerDeadline = progress.timerDeadline;
        state.selectedAnswer = progress.selectedAnswer;
        state.timerExpired = false;
        state.quizFinalized = false;

        userState.answers = progress.answers;
        userState.questionId = progress.questionId;
        userState.correctAnswers = progress.correctAnswers;
        return true;
    } catch (erro) {
        console.error('O progresso salvo do simulado não pôde ser restaurado:', erro);
        clearQuizProgress();
        return false;
    }
}

export function clearQuizProgress() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch (erro) {
        console.error('Não foi possível remover o progresso salvo do simulado:', erro);
    }
}

export function protectQuizFromAccidentalExit() {
    window.addEventListener('beforeunload', event => {
        if (state.screen !== 'QUIZ' || state.quizFinalized) return;
        saveQuizProgress();
        event.preventDefault();
        event.returnValue = '';
    });
}
