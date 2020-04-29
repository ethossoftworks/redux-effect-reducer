import { useDispatch, useSelector } from "react-redux"
import { AppState } from "../redux/store"
import React from "react"
import { ApiRequestActions } from "../redux/apiRequest"

export function ApiRequest(): JSX.Element {
    const dispatch = useDispatch()
    const state = useSelector((state: AppState) => state.apiRequest)

    return (
        <div className="section">
            <div className="section-title">API Request</div>
            <div className="button-cont">
                <button onClick={() => dispatch(ApiRequestActions.loadPosts())}>Load Posts</button>
            </div>
            <div> {state.isLoading ? "Loading..." : null}</div>
            <ol>
                {state.posts.map((post, i) => (
                    <li key={i} className="post-title">
                        {post}
                    </li>
                ))}
            </ol>
        </div>
    )
}
