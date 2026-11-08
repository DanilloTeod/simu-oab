import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applySavedTheme, canUsePersonalTheme, setSiteTheme } from '../src/js/themes.js';

function configureBrowserStorage(values = {}) {
    const storage = new Map(Object.entries(values));
    globalThis.localStorage = {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: key => storage.delete(key),
    };
    globalThis.document = { documentElement: { dataset: {} } };
}

test('tema pessoal pode ser aplicado quando o backend concede a permissão', () => {
    configureBrowserStorage({
        token_oab: 'token',
        can_use_personal_theme: 'true',
    });

    assert.equal(canUsePersonalTheme(), true);
    assert.equal(setSiteTheme('eyshila'), true);
    assert.equal(document.documentElement.dataset.theme, 'eyshila');
});

test('tema pessoal é bloqueado sem a permissão do backend', () => {
    configureBrowserStorage({
        token_oab: 'token',
        user_name: 'Eyshila Ribeiro Costa Fraga',
        site_theme: 'eyshila',
        can_use_personal_theme: 'false',
    });

    assert.equal(canUsePersonalTheme(), false);
    assert.equal(setSiteTheme('eyshila'), false);
    assert.equal(applySavedTheme(), 'ocean');
    assert.equal(document.documentElement.dataset.theme, 'ocean');
});

test('administradores também recebem a permissão do tema pessoal do backend', () => {
    configureBrowserStorage({
        token_oab: 'token',
        is_admin: 'true',
        can_use_personal_theme: 'true',
    });

    assert.equal(canUsePersonalTheme(), true);
});
