import { gsap } from "gsap";

const VISIBLE_MS = 3200;
const navElements = () => [
    document.querySelector("#online-students"),
    document.querySelector("#app .top-navbar"),
].filter(Boolean);

export function initNavAnimations() {
    let hideTimer;
    let navVisible = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const showNav = () => {
        window.clearTimeout(hideTimer);
        if (!navVisible) {
            navVisible = true;
            const elements = navElements();
            if (reducedMotion) {
                gsap.set(elements, { autoAlpha: 1, y: 0 });
            } else {
                gsap.to(elements, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.28,
                    stagger: 0.045,
                    ease: "power2.out",
                    overwrite: true,
                });
            }
        }
        hideTimer = window.setTimeout(hideNav, VISIBLE_MS);
    };

    const hideNav = () => {
        if (document.querySelector("#settings-panel:not([hidden])")) {
            hideTimer = window.setTimeout(hideNav, VISIBLE_MS);
            return;
        }
        navVisible = false;
        const elements = navElements();
        if (reducedMotion) {
            gsap.set(elements, { autoAlpha: 0, y: -6 });
        } else {
            gsap.to(elements, {
                autoAlpha: 0,
                y: -8,
                duration: 0.24,
                stagger: 0.035,
                ease: "power2.in",
                overwrite: true,
            });
        }
    };

    const animateNewHeader = (header) => {
        if (reducedMotion) {
            gsap.set(header, { autoAlpha: 1, y: 0 });
            return;
        }
        gsap.fromTo(header,
            { autoAlpha: 0, y: -12 },
            { autoAlpha: 1, y: 0, duration: 0.42, ease: "power2.out", overwrite: true }
        );
    };

    const app = document.querySelector("#app");
    if (app) {
        let lastHeader = null;
        let quizActive = false;
        const observer = new MutationObserver(() => {
            const header = app.querySelector(".top-navbar");
            if (header && header !== lastHeader) {
                lastHeader = header;
                if (!animateNewHeader.hasAnimated) {
                    animateNewHeader.hasAnimated = true;
                    animateNewHeader(header);
                } else {
                    gsap.set(header, { autoAlpha: navVisible ? 1 : 0, y: navVisible ? 0 : -8 });
                }
            }

            const quizCard = app.querySelector(".card:has(.quiz-heading)");
            if (quizCard && !quizActive) {
                quizActive = true;
                if (reducedMotion) {
                    gsap.set(quizCard, { autoAlpha: 1, y: 0, scale: 1 });
                } else {
                    gsap.fromTo(quizCard,
                        { autoAlpha: 0, y: 18, scale: 0.99 },
                        { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out", overwrite: true }
                    );
                }
            } else if (!quizCard) {
                quizActive = false;
            }
        });
        observer.observe(app, { childList: true, subtree: true });
    }

    document.addEventListener("pointermove", showNav, { passive: true });
    document.addEventListener("keydown", showNav);
    document.addEventListener("touchstart", showNav, { passive: true });
    document.addEventListener("focusin", showNav);

    const status = document.querySelector("#online-students");
    if (status && !reducedMotion) {
        gsap.fromTo(status,
            { autoAlpha: 0, y: -12 },
            { autoAlpha: 1, y: 0, duration: 0.42, ease: "power2.out", delay: 0.08 }
        );
    }

    // Show the first header briefly, then let it tuck away until interaction.
    window.requestAnimationFrame(showNav);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavAnimations, { once: true });
} else {
    initNavAnimations();
}
