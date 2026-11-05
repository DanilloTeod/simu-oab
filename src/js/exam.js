const SUBJECT_ALIASES = new Map([
    ['filosofia', 'filosofiadodireito'],
    ['processotrabalhista', 'processualtrabalho'],
    ['processualdotrabalho', 'processualtrabalho'],
    ['estatutodacriancaedoadolescente', 'eca'],
]);

const SUBJECT_LABELS = {
    administrativo: 'Direito Administrativo',
    ambiental: 'Direito Ambiental',
    civil: 'Direito Civil',
    constitucional: 'Direito Constitucional',
    consumidor: 'Direito do Consumidor',
    direitoshumanos: 'Direitos Humanos',
    eca: 'Estatuto da Criança e do Adolescente',
    eleitoral: 'Direito Eleitoral',
    empresarial: 'Direito Empresarial',
    etica: 'Ética Profissional',
    filosofiadodireito: 'Filosofia do Direito',
    financeiro: 'Direito Financeiro',
    internacionalprivado: 'Direito Internacional Privado',
    internacional: 'Direito Internacional',
    internacionalpublico: 'Direito Internacional Público',
    penal: 'Direito Penal',
    previdenciario: 'Direito Previdenciário',
    processualcivil: 'Direito Processual Civil',
    processualpenal: 'Direito Processual Penal',
    processualtrabalho: 'Direito Processual do Trabalho',
    trabalho: 'Direito do Trabalho',
    tributario: 'Direito Tributário',
};

export function normalizeSubject(subject) {
    const normalized = String(subject ?? '').trim().toLowerCase();
    return SUBJECT_ALIASES.get(normalized) || normalized;
}

export function getExamSubjects(questions) {
    return [...new Set(
        questions
            .map(question => normalizeSubject(question.materia))
            .filter(Boolean)
    )].sort((a, b) => getSubjectLabel(a).localeCompare(getSubjectLabel(b), 'pt-BR'));
}

export function getSubjectLabel(subject) {
    const normalized = normalizeSubject(subject);
    return SUBJECT_LABELS[normalized] || normalized;
}

export function getQuestionsForSimulation(questions, mode, subject) {
    if (mode === 'full') return questions;
    const normalizedSubject = normalizeSubject(subject);
    return questions.filter(question =>
        normalizeSubject(question.materia) === normalizedSubject
    );
}

export function getTimerOptions(mode) {
    if (mode === 'full') {
        return [
            { minutes: 300, label: '5 horas — tempo oficial da prova' },
            { minutes: null, label: 'Sem limite (sem cronômetro)' },
        ];
    }

    return [
        { minutes: null, label: 'Sem limite (sem cronômetro)' },
        ...Array.from({ length: 7 }, (_, index) => {
            const minutes = 30 + index * 5;
            const reference = minutes === 30
                ? ' — tempo médio para 8 questões'
                : '';
            return { minutes, label: `${minutes} minutos${reference}` };
        }),
    ];
}
