const path = require("path")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")

const packageName = "redux-effect-reducer-example"
const entryFile = "index"

module.exports = {
    entry: `./src/${entryFile}.tsx`,
    devtool: "source-map",
    mode: "development",
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
