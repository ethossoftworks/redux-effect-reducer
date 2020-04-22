type UnwrapPromise<T> = T extends Promise<infer R> ? R : T

export async function race<T extends Record<string, Promise<any>>>(
    promises: T
): Promise<{ [K in keyof T]: UnwrapPromise<T[keyof T]> | undefined }> {
    const promiseMap = Object.entries(promises).map(async ([key, promise]) => {
        return { key: key, value: await promise.catch((e) => {}) }
    })

    return Promise.race(promiseMap).then((val) => {
        return { [`${val.key}`]: val.value } as { [K in keyof T]: UnwrapPromise<T[keyof T]> }
    })
}

export async function retry(func: () => Promise<any>, retryCount: number) {
    for (let i = 0; i < retryCount; i++) {
        try {
            return await func()
        } catch (e) {
            if (i === retryCount - 1) {
                throw e
            }
        }
    }
}

export async function sleep(duration: number): Promise<boolean> {
    return new Promise((res) => setTimeout(() => res(true), duration))
}

export async function allSettled<T>(promises: Promise<T>[]): Promise<T[]> {
    const convertedPromises = Array(promises.length)
    for (let i = 0, l = promises.length; i < l; i++) {
        convertedPromises[i] = promises[i].catch((e) => e)
    }
    return Promise.all(convertedPromises)
}
