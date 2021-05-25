// Import Libraries
const express = require('express')
const mysql = require('mysql')
const cors = require('cors')
const http = require('http')
const socket = require('socket.io')

// Initialize Variable
const app = express()
app.use(cors())
const httpApp = http.createServer(app)
const io = socket(httpApp)
const PORT = 5000

// Create Connection
const db = mysql.createConnection({
    user: 'root',
    password: 'Lukas',
    database: 'livechat_system',
    port: 3306
})

// Routes
app.get('/', (req, res) => {
    res.send('Welcome to Live Chat System API')
})

let userConnected = []

io.on('connection', (socket) => {
    console.log('User Connect With Id ' + socket.id)

    socket.on('user-join', ({name, room}) => {
        let checkTotalUserInRoom = userConnected.filter((value) => value.room === room)
        console.log(checkTotalUserInRoom)
        if(checkTotalUserInRoom.length >= 5){
            return socket.emit('total-user', checkTotalUserInRoom.length)
        }else{
            socket.emit('total-user', checkTotalUserInRoom.length)
        }

        userConnected.push({
            id: socket.id,
            name: name,
            room: room
        })
        socket.join(room)
        let userInRoom = userConnected.filter((value) => value.room === room)

        db.query('SELECT * FROM message WHERE room = ?', room, (err, result) => {
            try {
                if(err) throw err

                socket.emit('send-history-message-from-server', result)
                io.in(room).emit('user-online', userInRoom)
                socket.to(room).emit('send-message-from-server', {from: 'Bot', message: name + ' Join To The Chat'})
            } catch (error) {
                console.log(error)
            }
        })

    })

    socket.on('send-user-message', (data) => {
        let index = null

        userConnected.forEach((value, idx) => {
            if(value.id === socket.id){
                index = idx
            }
        })
        let room = userConnected[index].room
        
        let dataToInsert = {
            socket_id: socket.id,
            name: data.name,
            room: data.room,
            message: data.message
        }

        db.query('INSERT INTO message SET ?', dataToInsert, (err, result) => {
            try {
                if(err) throw err
                
                socket.to(room).emit('send-user-message-back', {from: data.name, message: data.message})
                socket.emit('send-user-message-back', {from: data.name, message: data.message})
            } catch (error) {
                console.log(error)
            }
        })
    })

    socket.on('typing-message', (data) => {
        let index = null

        userConnected.forEach((value, idx) => {
            if(value.id === socket.id){
                index = idx
            }
        })
        let room = userConnected[index].room

        socket.to(room).emit('typing-message-back', {from: data.name, message: data.message})
    })

    socket.on('disconnect', () => {
        let index = null
        console.log(userConnected)
        userConnected.forEach((value, idx) => {
            if(value.id === socket.id){
                index = idx
            }
        })

        if(index !== null){
            var name = userConnected[index].name
            var room = userConnected[index].room
            userConnected.splice(index, 1)
        }

        socket.to(room).emit('send-message-from-server', {from: 'Bot', message: name + ' Left From Chat Room'})
    })
})

// Create Server
httpApp.listen(PORT, () => {
    console.log('Server Running on Port ' + PORT)
})