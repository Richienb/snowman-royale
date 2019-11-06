const lock = new Auth0Lock(
  "w72j6KObRRkXL889ivFXoroFVyoxGq1H",
  "richienb.au.auth0.com",
  {
    theme: {
      logo: "https://www.richie-bendall.ml/images/manifest/icon-72x72.png",
      primaryColor: "#00BFFF",
      foregroundColor: "#212121"
    },
    languageDictionary: {
      title: "Snowman Battle Royale"
    }
  }
);

lock.on("authenticated", ({ accessToken }) => {
  lock.getUserInfo(accessToken, (error, profile) => {
    if (error) {
      return;
    }

    localStorage.setItem("token", accessToken);
    localStorage.setItem("profile", JSON.stringify(profile));
  });
});

if (!localStorage.getItem("token") || !localStorage.getItem("profile"))
  lock.show();
else {
  const umbrellaImage = new Image(100, "auto");
  umbrellaImage.src =
    "https://cdn.glitch.com/346174ee-7849-4c29-ac52-d68677ec23dc%2FGiganticLateEyas-small.gif?v=1572439344305";
  const players = {};
  const socket = io();

  const { given_name, nickname, name } = JSON.parse(
    localStorage.getItem("profile")
  );
  const username =
    given_name ||
    nickname ||
    name ||
    `Player${chance.integer({ min: 1, max: 9999 })}`;
  const canvas = document.querySelector(".game");
  const context = canvas.getContext("2d");

  socket.emit("add user", username);

  socket.on("user joined", data => {
    console.log(`${data.username} joined`);
  });

  const player = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    umbrella: false,
   facing: "right",
    score: 0
  };

  const keysPressed = [];
  let jumpCounts = 0;
  let jumpDownCounts = 0;

  let platforms = [];
  let paused = false;
  let justDied = false;

  let firstUpdate = true;

  function setText(
    text,
    x,
    y,
    { color = "white", size = 30, font = "Roboto", align = "center" } = {}
  ) {
    context.font = `${size}px ${font}`;
    context.fillStyle = color;
    context.textAlign = align;

    context.fillText(text, x, y);
  }

  function drawPlayerAt({ username, x, y, umbrella, facing, score }) {
    colourRect(x, y, 30, 30, "white");
    colourRect(x + 5, y - 20, 20, 20, "white");
    colourRect(facing === "left" ? x + 15 : x + 10, y - 15, 5, 5, "black");
    colourRect(facing === "left" ? x : x + 20, y - 15, 10, 5, "orange");
    colourRect(x + 12.5, y + 5, 5, 5, "black");
    colourRect(x + 12.5, y + 15, 5, 5, "black");
    colourRect(x + 12.5, y + 25, 5, 5, "black");
    if (umbrella)
      context.drawImage(
        umbrellaImage,
        facing === "left" ? x - 55 : x - 15,
        y - 65,
        100,
        100
      );
    setText(`${username} ☆${score}`, x + 15, y - 35, { color: "black", size: 15 });
  }

  setInterval(() => {
    colourRect(0, 0, canvas.width, canvas.height, "#00BFFF");
    setText("v0.2.0 The brolley update", 20, canvas.height - 20, {
      align: "left",
      size: 20
    });
    if (keysPressed["ArrowLeft"] && player.x > 20 && !paused) player.x -= 7.5;
    if (keysPressed["ArrowRight"] && player.x < canvas.width - 40 && !paused)
      player.x += 7.5;
    if (keysPressed["ArrowUp"] && !player.jumped && !paused)
      player.jumped = true;
    if (player.jumped) {
      if (jumpCounts !== 15) {
        player.y -= 10;
        jumpCounts++;
      } else if (jumpDownCounts !== 15) {
        player.y += 10;
        jumpDownCounts++;
      } else {
        jumpCounts = 0;
        jumpDownCounts = 0;
        player.jumped = false;
      }
    }

    socket.emit("update player", player);

    socket.on("player updated", ({username, data}) => {
      players[username] = data;
    });

    socket.on("update platforms", latestPlatforms => {
      platforms = latestPlatforms;
      firstUpdate = false;
    });

    if (keysPressed["ArrowLeft"]) player.facing = "left";
    else if (keysPressed["ArrowRight"]) player.facing = "right";

    drawPlayerAt({ username, ...player });

    _.forOwn(players, (data, username) => {
      drawPlayerAt({ username, ...data });
    });

    platforms.forEach(({ x, y }, i) => {
      colourRect(x, y, 50, 10, "white");
      if (!firstUpdate) platforms[i].y += 5;
      if (y > player.y && player.x > x && player.x < x + 50 && !player.umbrella) {
        if (!justDied) {
          justDied = true;
          setTimeout(() => (justDied = false), 3000);
          player.score = _.round(player.score / 2, 2);
        }
      } else if (y > canvas.height) {
        delete platforms[i];
        if (!justDied && !player.umbrella) player.score++;
      }
    });
    setText(player.score, canvas.width / 2, canvas.height / 2);
    if (paused) {
      setText("Paused", canvas.width / 2, canvas.height / 3);
    }

    if (justDied) {
      setText(
        "You Died.",
        canvas.width / 2,
        canvas.height / 3 + canvas.height / 2
      );
    }
  }, 1000 / 60);

  function colourRect(x, y, width, height, colour) {
    context.fillStyle = colour;
    context.fillRect(x, y, width, height);
  }

  window.addEventListener("keydown", ({ key }) => (keysPressed[key] = true));

  window.addEventListener("keyup", ({ key }) => (keysPressed[key] = false));

  const cost  = {
    umbrella: 75
  }
  
  window.addEventListener("keypress", ({ key }) => {
    if (key === "p") paused = !paused;
    else if (key === "b" && player.score >= cost.umbrella && !player.umbrella) {
      player.umbrella = true;
      player.score -= cost.umbrella
      setTimeout(() => player.umbrella = false, 10000)
    }
  });

  // $(() => {
  //   const FADE_TIME = 150; // ms
  //   const TYPING_TIMER_LENGTH = 400; // ms
  //   const COLORS = [
  //     '#e21400', '#91580f', '#f8a700', '#f78b00',
  //     '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
  //     '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  //   ];

  //   // Initialize variables
  //   const $window = $(window);
  //   const $usernameInput = $('.usernameInput'); // Input for username
  //   const $messages = $('.messages'); // Messages area
  //   const $inputMessage = $('.inputMessage'); // Input message input box

  //   const $loginPage = $('.login.page'); // The login page
  //   const $chatPage = $('.chat.page'); // The chatroom page

  //   // Prompt for setting a username
  //   let username;
  //   let connected = false;
  //   let typing = false;
  //   let lastTypingTime;
  //   let $currentInput = $usernameInput.focus();

  //   const addParticipantsMessage = ({ numUsers }) => {
  //     let message = '';
  //     if (numUsers === 1) {
  //       message += "there's 1 participant";
  //     } else {
  //       message += `there are ${numUsers} participants`;
  //     }
  //     log(message);
  //   }

  //   // Sends a chat message
  //   const sendMessage = () => {
  //     let message = $inputMessage.val();
  //     // Prevent markup from being injected into the message
  //     message = cleanInput(message);
  //     // if there is a non-empty message and a socket connection
  //     if (message && connected) {
  //       $inputMessage.val('');
  //       addChatMessage({
  //         username,
  //         message
  //       });
  //       // tell server to execute 'new message' and send along one parameter
  //       socket.emit('new message', message);
  //     }
  //   }

  //   // Log a message
  //   const log = (message, options) => {
  //     const $el = $('<li>').addClass('log').text(message);
  //     addMessageElement($el, options);
  //   }

  //   // Adds the visual chat message to the message list
  //   const addChatMessage = (data, options) => {
  //     // Don't fade the message in if there is an 'X was typing'
  //     const $typingMessages = getTypingMessages(data);
  //     options = options || {};
  //     if ($typingMessages.length !== 0) {
  //       options.fade = false;
  //       $typingMessages.remove();
  //     }

  //     const $usernameDiv = $('<span class="username"/>')
  //       .text(data.username)
  //       .css('color', getUsernameColor(data.username));
  //     const $messageBodyDiv = $('<span class="messageBody">')
  //       .text(data.message);

  //     const typingClass = data.typing ? 'typing' : '';
  //     const $messageDiv = $('<li class="message"/>')
  //       .data('username', data.username)
  //       .addClass(typingClass)
  //       .append($usernameDiv, $messageBodyDiv);

  //     addMessageElement($messageDiv, options);
  //   }

  //   // Adds the visual chat typing message
  //   const addChatTyping = (data) => {
  //     data.typing = true;
  //     data.message = 'is typing';
  //     addChatMessage(data);
  //   }

  //   // Removes the visual chat typing message
  //   const removeChatTyping = (data) => {
  //     getTypingMessages(data).fadeOut(function () {
  //       $(this).remove();
  //     });
  //   }

  //   // Adds a message element to the messages and scrolls to the bottom
  //   // el - The element to add as a message
  //   // options.fade - If the element should fade-in (default = true)
  //   // options.prepend - If the element should prepend
  //   //   all other messages (default = false)
  //   const addMessageElement = (el, options) => {
  //     const $el = $(el);

  //     // Setup default options
  //     if (!options) {
  //       options = {};
  //     }
  //     if (typeof options.fade === 'undefined') {
  //       options.fade = true;
  //     }
  //     if (typeof options.prepend === 'undefined') {
  //       options.prepend = false;
  //     }

  //     // Apply options
  //     if (options.fade) {
  //       $el.hide().fadeIn(FADE_TIME);
  //     }
  //     if (options.prepend) {
  //       $messages.prepend($el);
  //     } else {
  //       $messages.append($el);
  //     }
  //     $messages[0].scrollTop = $messages[0].scrollHeight;
  //   }

  //   // Prevents input from having injected markup
  //   const cleanInput = input => $('<div/>').text(input).html()

  //   // Updates the typing event
  //   const updateTyping = () => {
  //     if (connected) {
  //       if (!typing) {
  //         typing = true;
  //         socket.emit('typing');
  //       }
  //       lastTypingTime = (new Date()).getTime();

  //       setTimeout(() => {
  //         const typingTimer = (new Date()).getTime();
  //         const timeDiff = typingTimer - lastTypingTime;
  //         if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
  //           socket.emit('stop typing');
  //           typing = false;
  //         }
  //       }, TYPING_TIMER_LENGTH);
  //     }
  //   }

  //   // Gets the 'X is typing' messages of a user
  //   const getTypingMessages = data => $('.typing.message').filter(function (i) {
  //     return $(this).data('username') === data.username;
  //   })

  //   // Gets the color of a username through our hash function
  //   const getUsernameColor = (username) => {
  //     // Compute hash code
  //     let hash = 7;
  //     for (let i = 0; i < username.length; i++) {
  //       hash = username.charCodeAt(i) + (hash << 5) - hash;
  //     }
  //     // Calculate color
  //     const index = Math.abs(hash % COLORS.length);
  //     return COLORS[index];
  //   }

  //   // Keyboard events

  //   $window.keydown(({ ctrlKey, metaKey, altKey, which }) => {
  //     // Auto-focus the current input when a key is typed
  //     if (!(ctrlKey || metaKey || altKey)) {
  //       $currentInput.focus();
  //     }
  //     // When the client hits ENTER on their keyboard
  //     if (which === 13) {
  //       if (username) {
  //         sendMessage();
  //         socket.emit('stop typing');
  //         typing = false;
  //       } else {
  //         setUsername();
  //       }
  //     }
  //   });

  //   $inputMessage.on('input', () => {
  //     updateTyping();
  //   });

  //   // Click events

  //   // Focus input when clicking anywhere on login page
  //   $loginPage.click(() => {
  //     $currentInput.focus();
  //   });

  //   // Focus input when clicking on the message input's border
  //   $inputMessage.click(() => {
  //     $inputMessage.focus();
  //   });

  //   // Socket events

  //   // Whenever the server emits 'login', log the login message
  //   socket.on('login', (data) => {
  //     connected = true;
  //     // Display the welcome message
  //     const message = "Welcome to Socket.IO Chat – ";
  //     log(message, {
  //       prepend: true
  //     });
  //     addParticipantsMessage(data);
  //   });

  //   // Whenever the server emits 'new message', update the chat body
  //   socket.on('new message', (data) => {
  //     addChatMessage(data);
  //   });

  //   // Whenever the server emits 'user joined', log it in the chat body
  //   socket.on('user joined', (data) => {
  //     log(`${data.username} joined`);
  //     addParticipantsMessage(data);
  //   });

  //   // Whenever the server emits 'user left', log it in the chat body
  //   socket.on('user left', (data) => {
  //     log(`${data.username} left`);
  //     addParticipantsMessage(data);
  //     removeChatTyping(data);
  //   });

  //   // Whenever the server emits 'typing', show the typing message
  //   socket.on('typing', (data) => {
  //     addChatTyping(data);
  //   });

  //   // Whenever the server emits 'stop typing', kill the typing message
  //   socket.on('stop typing', (data) => {
  //     removeChatTyping(data);
  //   });

  //   socket.on('disconnect', () => {
  //     log('you have been disconnected');
  //   });

  //   socket.on('reconnect', () => {
  //     log('you have been reconnected');
  //     if (username) {
  //       socket.emit('add user', username);
  //     }
  //   });

  //   socket.on('reconnect_error', () => {
  //     log('attempt to reconnect has failed');
  //   });

  // });
}
