const PERSONAL_THEME = 'personal';
const AVAILABLE_THEMES = [
    'paper', 'mist', 'ocean', 'forest', 'plum', 'sunset',
    'paper-dark', 'mist-dark', 'ocean-dark', 'forest-dark', 'sunset-dark',
    PERSONAL_THEME,
];

export function canUsePersonalTheme() {
    return Boolean(localStorage.getItem('token_oab'))
        && localStorage.getItem('can_use_personal_theme') === 'true';
}

export function applySavedTheme() {
    const temaSalvo = localStorage.getItem('site_theme');
    const temaValido = AVAILABLE_THEMES.includes(temaSalvo) || temaSalvo === 'purple';
    const tema = temaSalvo === 'purple'
        ? 'plum'
        : temaValido ? temaSalvo : 'ocean';
    const temaPermitido = tema === PERSONAL_THEME && !canUsePersonalTheme() ? 'ocean' : tema;

    document.documentElement.dataset.theme = temaPermitido;
    return temaPermitido;
}

export function setSiteTheme(theme) {
    if (!AVAILABLE_THEMES.includes(theme) || (theme === PERSONAL_THEME && !canUsePersonalTheme())) {
        return false;
    }

    localStorage.setItem('site_theme', theme);
    applySavedTheme();
    return true;
}
