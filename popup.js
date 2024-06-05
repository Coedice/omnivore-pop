document.addEventListener('DOMContentLoaded', function () {
    const apiKeyForm = document.getElementById('apiKeyForm');

    apiKeyForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const apiKey = document.getElementById('apiKeyInput').value;

        chrome.storage.sync.set({ 'apiKey': apiKey }, function () {
            console.log('API Key is set to ' + apiKey);
            window.close();
        });
    });
});
