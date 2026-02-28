// script.js - Duck Hunt con menú y efectos de disparo y sprites

// --- Carga de Sprites ---
const sprites = {
    duck: {
        red: {
            left: [null, null, null],
            right: [null, null, null],
            'top-left': [null, null, null],
            'top-right': [null, null, null],
            dead: [null, null, null],
            shot: [null, null, null]
        },
        black: {
            left: [null, null, null],
            right: [null, null, null],
            'top-left': [null, null, null],
            'top-right': [null, null, null],
            dead: [null, null, null],
            shot: [null, null, null]
        }
    },
    scene: {
        back: null,
        tree: null
    },
    dog: {
        find: null,
        jump: [null, null],
        laugh: [null, null],
        sniff: [null, null, null, null, null],
        single: null,
        double: null
    },
};

// Cargar sprites de forma síncrona (cacheando las imágenes)
function loadSprites() {
    const loadImage = (path) => {
        const img = new Image();
        img.src = path;
        return img;
    };

    // Cargar ducks (3 frames por dirección)
    const colors = ['red', 'black'];
    const directions = ['left', 'right', 'top-left', 'top-right', 'dead', 'shot'];
    
    colors.forEach(color => {
        directions.forEach(dir => {
            for (let i = 0; i < 3; i++) {
                const path = `assets/images/duck/${color}/${dir}/${i}.png`;
                sprites.duck[color][dir][i] = loadImage(path);
            }
        });
    });

    // Cargar scene
    sprites.scene.back = loadImage('assets/images/scene/back/0.png');
    sprites.scene.tree = loadImage('assets/images/scene/tree/0.png');

    // Cargar dog
    sprites.dog.laugh[0] = loadImage('assets/images/dog/laugh/0.png');
    sprites.dog.laugh[1] = loadImage('assets/images/dog/laugh/1.png');
    sprites.dog.single = loadImage('assets/images/dog/single/0.png');
    sprites.dog.double = loadImage('assets/images/dog/double/0.png');
}

// Iniciar carga de sprites
loadSprites();

// --- Elementos del DOM ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('score');
const ducksLeftSpan = document.getElementById('ducksLeft');
const menuDiv = document.getElementById('menu');
const gameOverDiv = document.getElementById('gameOver');
const finalScoreSpan = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// --- Variables del juego ---
let score = 0;
let ducksEscaped = 0;      // Patos que han escapado (para modo infinito)
const MAX_ESCAPED = 5;      // Juego termina cuando escapan 5
let gameActive = false;
let ducks = [];
let crosshair = { x: 0, y: 0 };
let efectos = [];
let dog = null; // Perro del juego

// --- Configuración del canvas ---
canvas.width = 800;
canvas.height = 400;

// --- Clase Pato ---
class Duck {
    constructor() {
        // Seleccionar color aleatorio (red o black)
        this.color = Math.random() < 0.5 ? 'red' : 'black';
        this.reset();
    }

    reset() {
        // Determinar dirección de vuelo
        const rand = Math.random();
        if (rand < 0.25) {
            this.flyDirection = 'right';
            this.vx = 1;
            this.vy = 0;
        } else if (rand < 0.5) {
            this.flyDirection = 'left';
            this.vx = -1;
            this.vy = 0;
        } else if (rand < 0.75) {
            this.flyDirection = 'top-right';
            this.vx = 1;
            this.vy = -0.4; // Move upward
        } else {
            this.flyDirection = 'top-left';
            this.vx = -1;
            this.vy = -0.4; // Move upward
        }
        
        // Dirección horizontal para posición inicial
        this.direction = this.vx;
        
        if (this.direction === 1) {
            this.x = -60; // aparece por izquierda
        } else {
            this.x = canvas.width + 60; // aparece por derecha
        }
        
        this.y = 145 + Math.random() * 150; // altura aleatoria
        this.speed = 2 + Math.random() * 4;
        this.radius = 30; // radio de colisión
        this.alive = true;
        this.frame = 0;
        this.animationFrame = 0;
        this.state = 'alive';
        this.deadY = this.y;
        this.showDogWhenDead = false; // Controla si mostrar perro al caer
        this.deadSpeed = 2;
    }

    update() {
        if (this.state === 'dead') {
            // Caer
            this.deadY += this.deadSpeed;
            if (this.deadY > canvas.height + 50) {
                this.alive = false;
                // Mostrar perro con el pato cuando cae
                if (this.showDogWhenDead && dog) {
                    dog.showSingle();
                }
            }
            return;
        }

        // Movimiento normal
        this.x += this.speed * this.vx;
        this.y += this.speed * this.vy;
        this.frame++;
        
        // Animación: cambiar frame cada 10 ticks
        this.animationFrame = Math.floor(this.frame / 10) % 3;

        // Comprobar si escapó por el borde
        if ((this.vx === 1 && this.x > canvas.width + 50) ||
            (this.vx === -1 && this.x < -50) ||
            this.y < -50) {
            this.alive = false;
            ducksEscaped++;
            if (ducksEscaped > MAX_ESCAPED) ducksEscaped = MAX_ESCAPED;
            // Mostrar perro cuando el pato escapa
            if (dog) dog.showLaugh();
            updateUI();
        }
    }

    draw() {
        if (!this.alive) return;

        ctx.save();
        
        // Usar deadY si está muerto, y si no usar y
        const drawY = this.state === 'dead' ? this.deadY : this.y;
        ctx.translate(this.x, drawY);
        
        // No voltear - el sprite ya tiene la dirección correcta
        // La selección del sprite según flyDirection maneja la orientación

        // Obtener el sprite según el estado y dirección de vuelo
        let spriteKey = this.state === 'dead' ? 'dead' : this.flyDirection;
        const spriteImg = sprites.duck[this.color][spriteKey][this.animationFrame];
        
        // Dibujar sprite si está disponible y cargado
        if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
            ctx.drawImage(spriteImg, -32, -32, 64, 64);
        }
        
        ctx.restore();
    }

    hitTest(px, py) {
        if (this.state !== 'alive') return false;
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.radius;
    }

    kill() {
        this.state = 'dead';
        this.deadY = this.y;
    }
}

// --- Clase Perro ---
class Dog {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 40;
        this.state = 'hidden'; // hidden, sniff, find, laugh, jump, single
        this.frame = 0;
        this.animationFrame = 0;
        this.visible = false;
        this.timer = 0;
    }


    // Mostrar animación de risa cuando se falla un disparo
    showLaugh() {
        this.visible = true;    
        this.state = 'laugh'; // Usar animación de risa
        this.x = canvas.width / 2;
        this.startY = canvas.height -40; // Empieza abajo de la escena
        this.y = this.startY;
        this.targetY = canvas.height -130; // Salta hasta los arbustos
        this.animationFrame = 0;
        this.timer = 100;
        this.jumping = true;
    }

    // Mostrar perro con pato cuando se captura
    showSingle() {
        this.visible = true;
        this.state = 'single'; // Usar animación de pato capturado
        this.x = canvas.width / 2;
        this.startY = canvas.height -40; // Empieza abajo de la escena
        this.y = this.startY;
        this.targetY = canvas.height -130; // Salta hasta los arbustos
        this.animationFrame = 0;
        this.timer = 90;
        this.jumping = true;
    }

    hide() {
        this.visible = false;
        this.state = 'hidden';
        this.jumping = false;
    }

    update() {
        if (!this.visible) return;

        this.timer--;
        this.frame++;
        
        // Animación basada en el estado
        if (this.state === 'find' || this.state === 'single') {
            this.animationFrame = 0;
        } else if (this.state === 'laugh') {
            this.animationFrame = Math.floor(this.frame / 15) % 2;
        }

        // Animación de salto
        if (this.jumping && this.y > this.targetY) {
            this.y -= 3; // Velocidad del salto
            if (this.y < this.targetY) {
                this.y = this.targetY;
                this.jumping = false;
            }
        }

        if (this.timer <= 0) {
            this.hide();
        }
    }

    draw() {
        if (!this.visible) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        let spriteImg = null;

        if (this.state === 'find') {
            spriteImg = sprites.dog.find;
        } else if (this.state === 'laugh') {
            spriteImg = sprites.dog.laugh[this.animationFrame];
        } else if (this.state === 'single') {
            spriteImg = sprites.dog.single;
        }

        if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
            ctx.drawImage(spriteImg, -32, -40, 100, 100);
        } else {
            // Fallback: dibujar perro simple
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-20, -20, 40, 30);
            ctx.fillStyle = '#D2691E';
            ctx.beginPath();
            ctx.arc(-10, -25, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// Inicializar perro después de definir la clase
dog = new Dog();

// --- Clase EfectoDisparo ---
class EfectoDisparo {
    constructor(x, y, acierto) {
        this.x = x;
        this.y = y;
        this.acierto = acierto;
        this.vida = 10; // frames
    }

    update() {
        this.vida--;
    }

    draw() {
        if (this.vida <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        const size = 20 + this.vida * 2;
        ctx.strokeStyle = this.acierto ? 'red' : 'white';
        ctx.fillStyle = this.acierto ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, size/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = 'bold ' + (20 + this.vida) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.acierto ? 'darkred' : 'black';
        ctx.fillText('¡BANG!', 0, -30);
        ctx.restore();
    }
}

// --- Funciones auxiliares ---
function spawnDuck() {
    // Modo infinito: siempre spawnear cuando no hay patos
    if (ducks.length === 0 && gameActive && ducksEscaped < MAX_ESCAPED) {
        ducks.push(new Duck());
    }
}

function updateUI() {
    scoreSpan.textContent = score;
    ducksLeftSpan.textContent = ducksEscaped + ' / ' + MAX_ESCAPED;
}

function resetGame() {
    score = 0;
    ducksEscaped = 0;
    ducks = [];
    efectos = [];
    gameActive = true;
    updateUI();
    // Ocultar menús
    menuDiv.style.display = 'none';
    gameOverDiv.style.display = 'none';
    // Ocultar perro
    if (dog) dog.hide();
    // Spawnear primer pato
    spawnDuck();
}

function mostrarGameOver() {
    gameActive = false;
    finalScoreSpan.textContent = score;
    gameOverDiv.style.display = 'flex';
}

// --- Eventos de disparo ---
function handleShoot(e) {
    e.preventDefault();
    if (!gameActive) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    let impacto = false;
    for (let i = ducks.length - 1; i >= 0; i--) {
        const duck = ducks[i];
        if (duck.hitTest(canvasX, canvasY)) {
            duck.kill();
            duck.showDogWhenDead = true; // Mostrar perro cuando caiga
            score++;
            updateUI();
            impacto = true;
            break;
        }
    }

    // Añadir efecto visual
    efectos.push(new EfectoDisparo(canvasX, canvasY, impacto));

    // Reacciones del perro
    if (!impacto) {
        // Fallaste el disparo - perro se ríe
        if (dog) dog.showLaugh();
    }
    // Si acertaste, el perro aparecerá cuando el pato caiga (en Duck.update)

    // Si no quedan patos vivos, spawnear otro (infinito)
    const aliveDucks = ducks.filter(d => d.state === 'alive');
    if (aliveDucks.length === 0 && gameActive) {
        spawnDuck();
    }

    // Verificar game over: cuando escapen 5 patos
    if (ducksEscaped >= MAX_ESCAPED) {
        gameActive = false;
        mostrarGameOver();
    }
}

// --- Movimiento de la mira ---
function moveCrosshair(e) {
    e.preventDefault();
    if (!gameActive) return; // Solo mover mira si el juego está activo

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    crosshair.x = Math.min(canvas.width, Math.max(0, (clientX - rect.left) * scaleX));
    crosshair.y = Math.min(canvas.height, Math.max(0, (clientY - rect.top) * scaleY));
}

// --- Eventos de canvas (siempre activos, pero handleShoot solo dispara si gameActive) ---
canvas.addEventListener('mousemove', moveCrosshair);
canvas.addEventListener('touchmove', moveCrosshair, { passive: false });
canvas.addEventListener('mousedown', handleShoot);
canvas.addEventListener('touchstart', handleShoot, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// --- Botones del menú ---
startBtn.addEventListener('click', () => {
    resetGame();
});

restartBtn.addEventListener('click', () => {
    resetGame();
});

// --- Bucle de animación ---
function gameLoop() {
    // Actualizar
    if (gameActive) {
        ducks.forEach(duck => duck.update());
        // Eliminar patos muertos (que ya no están vivos)
        ducks = ducks.filter(duck => duck.alive);
        // Siempre spawnear nuevo pato (modo infinito)
        if (ducks.length === 0 && gameActive) {
            spawnDuck();
        }
    }

    // Dibujar - siempre dibujar el fondo, pero solo dibujar elementos del juego si está activo
    ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Perro (detrás del suelo/arbustos)
    if (dog) {
        dog.update();
        dog.draw();
    }

    ducks.forEach(duck => duck.draw());
    
    // Fondo
    if (sprites.scene.back && sprites.scene.back.complete && sprites.scene.back.naturalWidth > 0) {
        ctx.drawImage(sprites.scene.back, 0, 0, canvas.width, canvas.height);
    } else {
        // Fallback: cielo (color original de Duck Hunt)
        ctx.fillStyle = '#5c94fc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Árboles
    if (sprites.scene.tree && sprites.scene.tree.complete && sprites.scene.tree.naturalWidth > 0) {
        ctx.drawImage(sprites.scene.tree, 30, canvas.height - 130, 100, 100);
        ctx.drawImage(sprites.scene.tree, 670, canvas.height - 180, 120, 150);
    }


    // Patos - solo dibujar si hay patos vivos o en animación de muerte


    // Efectos de disparo
    for (let i = efectos.length - 1; i >= 0; i--) {
        efectos[i].update();
        efectos[i].draw();
        if (efectos[i].vida <= 0) {
            efectos.splice(i, 1);
        }
    }

    // Mira - solo dibujar si el juego está activo
    if (gameActive) {
        ctx.save();
        ctx.translate(crosshair.x, crosshair.y);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(15, 0);
        ctx.moveTo(0, -15);
        ctx.lineTo(0, 15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

// Iniciar bucle
gameLoop();