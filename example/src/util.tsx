import { Action } from "redux"

export type ReduxActionCreator<T extends Record<string, (...args: any) => any>> = ReturnType<
    Extract<T[keyof T], (...args: any) => Action<string>>
>
