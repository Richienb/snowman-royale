// Setup basic express server
const express = require("express")
const app = express()
const path = require("path")
const server = require("http").createServer(app)
const io = require("socket.io")(server)
const chance = require("secure-chance")
const port = process.env.PORT || 8080
const _ = require("lodash")
const browserify = require("browserify-middleware")

// require("./utils/concurrency")(() =>
//   server.listen(port, () => {
//     console.log("Server listening at port %d", port);
//   })
// );

app.use(require("compression")())
app.use(require("express-minify")())

server.listen(port, () => {
    console.log("Server listening at port %d", port)
})

// provide a browserified file at a path
app.get("/client.js", browserify(__dirname + "/src/client.js"))

// Routing
app.use(express.static(path.join(__dirname, "public")))

// Chatroom

const platformInterval = 25

const platforms = []
setInterval(() => {
    if (chance.integer({ min: 1, max: 3 }) === 1) {
        platforms.push({
            x: chance.integer({ min: 0, max: 1280 }),
            y: -50,
        })
    }
}, platformInterval)

setInterval(
    () => {
        platforms.forEach((_, i) => {
            platforms[i].y += 50
        })

        _.remove(platforms, ({ y }) => y > 720)
    },
    1000 / 6,
)

let numUsers = 0

io.on("connection", (socket) => {
    let addedUser = false

    // when the client emits 'new message', this listens and executes
    socket.on("new message", (data) => {
        // we tell the client to execute 'new message'
        socket.broadcast.emit("new message", {
            username: socket.username,
            message: data,
        })
    })

    setInterval(
        () => socket.broadcast.emit("update platforms", platforms),
        1000 / 6,
    )

    // when the client emits 'add user', this listens and executes
    socket.on("add user", (username) => {
        if (addedUser) return

        // we store the username in the socket session for this client
        socket.username = username
        ++numUsers
        addedUser = true
        socket.emit("login", {
            numUsers,
        })
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit("user joined", {
            username: socket.username,
            numUsers,
        })
    })

    // when the client emits 'add user', this listens and executes
    socket.on("update player", (data) => {
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit("player updated", {
            username: socket.username,
            data,
        })
    })

    // when the client emits 'typing', we broadcast it to others
    socket.on("typing", () => {
        socket.broadcast.emit("typing", {
            username: socket.username,
        })
    })

    // when the client emits 'stop typing', we broadcast it to others
    socket.on("stop typing", () => {
        socket.broadcast.emit("stop typing", {
            username: socket.username,
        })
    })

    // when the user disconnects.. perform this
    socket.on("disconnect", () => {
        if (addedUser) {
            --numUsers

            // echo globally that this client has left
            socket.broadcast.emit("user left", {
                username: socket.username,
                numUsers,
            })
        }
    })
})
