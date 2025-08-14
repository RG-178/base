const { Storage } = globalThis.capacitorStorage;

export async function getStorageItem(key) {
    const { value } = await Storage.get({ key });
    return value;
}

export async function setStorageItem(key, value) {
    await Storage.set({
        key,
        value: value.toString(),
    });
}