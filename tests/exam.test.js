import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
    getExamSubjects,
    getQuestionsForSimulation,
    getSubjectLabel,
    getTimerOptions,
    normalizeSubject,
} from '../src/js/exam.js';
import { formatarTempo } from '../src/js/timer.js';

async function loadExam(edition) {
    const raw = await readFile(
        new URL(`../public/data/questoes_oab_${edition}_tipo1.json`, import.meta.url),
        'utf8',
    );
    return JSON.parse(raw).questoes;
}

test('prova completa contém as 80 questões na ordem de cada edição', async () => {
    for (const edition of [39, 40, 41, 42, 43, 44, 45, 46, 47]) {
        const questions = await loadExam(edition);

        assert.equal(questions.length, 80, `edição ${edition}`);
        assert.deepEqual(
            getQuestionsForSimulation(questions, 'full', null),
            questions,
            `edição ${edition}`,
        );
    }
});

test('todas as matérias das edições publicadas podem ser selecionadas', async () => {
    for (const edition of [39, 40, 41, 42, 43, 44, 45, 46, 47]) {
        const questions = await loadExam(edition);
        const subjects = getExamSubjects(questions);

        assert.ok(subjects.length >= 19, `edição ${edition}: ${subjects.length} matérias`);
        for (const question of questions) {
            assert.ok(
                subjects.includes(normalizeSubject(question.materia)),
                `edição ${edition} tem matéria não selecionável: ${question.materia}`,
            );
        }
    }
});

test('simulado por matéria filtra questões e normaliza nomes entre edições', async () => {
    const questions = await loadExam(47);
    const ethics = getQuestionsForSimulation(questions, 'subject', 'etica');

    assert.equal(ethics.length, 8);
    assert.ok(ethics.every(question => question.materia === 'etica'));
    assert.equal(normalizeSubject('filosofia'), normalizeSubject('filosofiadodireito'));
    assert.equal(normalizeSubject('processotrabalhista'), 'processualtrabalho');
    assert.equal(getSubjectLabel('processualdotrabalho'), 'Direito Processual do Trabalho');
});

test('tempos oferecem 5 horas ou sem limite para prova completa', () => {
    assert.deepEqual(
        getTimerOptions('full').map(option => option.minutes),
        [300, null],
    );
});

test('tempos por matéria começam na média de 30 minutos e avançam até 60', () => {
    assert.deepEqual(
        getTimerOptions('subject').map(option => option.minutes),
        [null, 30, 35, 40, 45, 50, 55, 60],
    );
});

test('prova completa exibe horas, minutos e segundos no cronômetro', () => {
    assert.equal(formatarTempo(18_000, true), '05:00:00');
    assert.equal(formatarTempo(3_599, true), '00:59:59');
    assert.equal(formatarTempo(3_599), '59:59');
});
