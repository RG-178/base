fillWithBiometrics();

var faults = 0;

if (isLogged === true) loadPage('home.html');

var userinput = document.getElementById('username');
if (userinput) userinput.focus();

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const isValid = await checkLogin(username, password);

    if (isValid) {
        try { await saveCreds(username, password); } catch (e) { console.log(e); }
        isLogged = true;
        setTimeout(() => loadPage('home.html'), 250);
    } else {
        document.getElementById('loginError').style.display = 'block';
        faults++;
        if (faults == 3) await closeApp();
    }
});