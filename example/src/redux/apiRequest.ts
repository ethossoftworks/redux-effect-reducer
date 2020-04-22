import { ReduxActionCreator } from "../util"
import { Effect, run, dispatch } from "@ethossoftworks/redux-effect-reducer/effects"

export type APIRequestState = {
    isLoading: boolean
    posts: string[]
}

const initialState: APIRequestState = {
    isLoading: false,
    posts: [],
}

type ApiRequestActions = ReduxActionCreator<typeof ApiRequestActions>

export const ApiRequestActions = {
    loadPosts: () => ({ type: "LOAD_POSTS" } as const),
    postsLoaded: (posts: string[]) => ({ type: "POSTS_LOADED", posts } as const),
    postsFailed: (error: Error) => ({ type: "POSTS_FAILED", error } as const),
}

export function apiRequestReducer(state: APIRequestState = initialState, action: ApiRequestActions): APIRequestState {
    switch (action.type) {
        case "LOAD_POSTS":
            return { ...state, isLoading: true }
        case "POSTS_LOADED":
            return { ...state, posts: action.posts, isLoading: false }
        case "POSTS_FAILED":
            return { ...state, isLoading: false }
        default:
            return state
    }
}

export function apiRequestEffectReducer(state: APIRequestState, action: ApiRequestActions): Effect | void {
    switch (action.type) {
        case "LOAD_POSTS":
            return run(async () => {
                try {
                    const response = await fetch("https://jsonplaceholder.typicode.com/posts")
                    const posts: any[] = await response.json()
                    return dispatch(ApiRequestActions.postsLoaded(posts.slice(0, 10).map((post: any) => post.title)))
                } catch (e) {
                    return dispatch(ApiRequestActions.postsFailed(e))
                }
            })
    }
}
