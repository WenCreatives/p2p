// dist/js/loader.js

// Immediately disable scroll to prevent flashing/scrolling before DOM completes
if (document.body) {
    document.body.style.overflow = 'hidden';
} else {
    document.addEventListener('DOMContentLoaded', () => {
        document.body.style.overflow = 'hidden';
    });
}

// Fade out and remove loader once everything is fully loaded
window.addEventListener('load', () => {
    const loader = document.getElementById('jordan-loader');
    if (loader) {
        // Start fade out
        loader.classList.add('loader-hidden');

        // Re-enable scrolling immediately so it feels responsive
        document.body.style.overflow = '';

        // Remove from DOM after transition finishes (500ms matches CSS)
        setTimeout(() => {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        }, 500);
    }
});
