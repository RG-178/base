function getNativeBiometric() {
    return window?.Capacitor?.Plugins?.NativeBiometric;
}

async function isBiometricAvailable() {
    const NB = getNativeBiometric();
    if (!NB) return false;
    try {
        const res = await NB.isAvailable();
        return !!res?.isAvailable;
    } catch { return false; }
}

export async function saveCreds(username, password) {
    const NB = getNativeBiometric();
    if (!NB) return;
    await NB.setCredentials({ username, password, server: SERVER_ID });
}

export async function fillWithBiometrics() {
    const NB = getNativeBiometric();
    if (!NB) return;

    const ok = await isBiometricAvailable();
    if (!ok) return;

    try {

        await NB.verifyIdentity({
            reason: 'Verify your identity',
            title: 'Access autofill',          // Android: optional
            subtitle: 'Saved data', // Android: optional
            description: 'We fill in username and password.', // Android: optional
            negativeButtonText: 'Cancel',    // Android: optional
            // Falls dein Plugin diese Option hat und du KEIN PIN-Fallback willst:
            // allowDeviceCredentials: false
        });

        const { username, password } = await NB.getCredentials({
        server: SERVER_ID,
        reason: 'Autofill credentials',
        });
        document.getElementById('username').value = username || '';
        document.getElementById('password').value = password || '';
    } catch (e) {
        console.log('Biometric cancelled/no creds', e);
    }
}