const { App } = globalThis.capacitorApp;

export async function closeApp() {
    await App.exitApp()
}