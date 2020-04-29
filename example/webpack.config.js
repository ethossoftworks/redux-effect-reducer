const path = require("path")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")

const packageName = "redux-effect-reducer-example"
const entryFile = "index"

const prodConfig = {
    entry: `./src/${entryFile}.tsx`,
    mode: "production",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".jsx"],
    },
    plugins: [new CleanWebpackPlugin()],
    output: {
        filename: `${packageName}.js`,
        path: path.resolve(__dirname, "build"),
        globalObject: "this",
    },
}

const devConfig = {
    ...prodConfig,
    devtool: "source-map",
    mode: "development",
}

module.exports = (env) => {
    switch (env) {
        case "prod":
            return prodConfig
        case "dev":
            return devConfig
    }
}
