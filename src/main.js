let font;
let particles = [];
let lastTimeString = "";
const weekdays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

// Physics parameters
let stiffness = 0.22;
let damping = 0.8;
let mouseDist = 120;

function preload() {
    // Fontsource CDN for Inter TTF link
    font = loadFont('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf');
}

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container');
    
    updateClock();
    
    textAlign(CENTER, CENTER);
    textFont(font);
}

function draw() {
    background(253, 253, 253);
    
    drawGrid();
    
    // Check time every frame
    updateClock();
    
    // Dynamic Breeze (Pulse)
    let pulse = sin(frameCount * 0.04) * 0.4;
    
    for (let p of particles) {
        p.behaviors(pulse);
        p.update();
        p.show();
    }
    
    drawConnections();
}

function updateClock() {
    let d = new Date();
    let year = d.getFullYear();
    let month = months[d.getMonth()];
    let date = nf(d.getDate(), 2);
    let hour = nf(d.getHours(), 2);
    let minText = nf(d.getMinutes(), 2);
    let sec = nf(d.getSeconds(), 2);
    let day = weekdays[d.getDay()];

    let isPortrait = width < height;
    
    let lines = [];
    let stateKey = "";

    if (!isPortrait) {
        // Landscape Design (2 Lines)
        let line1 = `${month} ${date} ${year} ${day.substring(0, 3)}`;
        let line2 = `${hour}:${minText}:${sec}`;
        lines = [
            { text: line1, size: min(windowWidth * 0.05, 55) },
            { text: line2, size: min(windowWidth * 0.12, 140) }
        ];
        stateKey = line1 + line2;
    } else {
        // Portrait / Mobile Design (3 Lines)
        let line1 = `${month} ${date}`;
        let line2 = `${year} ${day.substring(0, 3)}`;
        let line3 = `${hour}:${minText}:${sec}`;
        lines = [
            { text: line1, size: min(windowWidth * 0.12, 85) },
            { text: line2, size: min(windowWidth * 0.07, 45) },
            { text: line3, size: min(windowWidth * 0.15, 120) }
        ];
        stateKey = line1 + line2 + line3;
    }

    if (stateKey !== lastTimeString) {
        lastTimeString = stateKey;
        updateTypography(lines);
    }
}

function updateTypography(lines) {
    let spacing = height * 0.04;
    let allPts = [];

    // Pre-calculate line heights and total height
    let totalH = (lines.length - 1) * spacing;
    let lineBounds = [];
    
    for (let lineItem of lines) {
        let b = font.textBounds(lineItem.text, 0, 0, lineItem.size);
        lineBounds.push(b);
        totalH += b.h;
    }
    
    let currentY = height / 2 - totalH / 2;

    for (let i = 0; i < lines.length; i++) {
        let l = lines[i];
        let b = lineBounds[i];
        currentY += b.h;
        
        let x = width / 2 - b.w / 2;
        let y = currentY;
        
        let pts = font.textToPoints(l.text, x, y, l.size, {
            sampleFactor: i === lines.length - 1 ? 0.07 : 0.12, // Lower sample for larger time line
            simplifyThreshold: 0
        });
        
        allPts = allPts.concat(pts);
        currentY += spacing;
    }

    // Morphing pool logic
    let newCount = allPts.length;
    let oldCount = particles.length;

    if (newCount > oldCount) {
        for (let i = oldCount; i < newCount; i++) {
            particles.push(new Particle(random(width), random(height)));
        }
    }

    for (let i = 0; i < particles.length; i++) {
        if (i < newCount) {
            particles[i].setHome(allPts[i].x, allPts[i].y);
            particles[i].active = true;
        } else {
            particles[i].active = false;
            particles[i].setHome(random(width), -100);
        }
    }
}

function drawGrid() {
    stroke(0, 15);
    strokeWeight(1);
    const step = 40;
    for (let x = 0; x < width; x += step) {
        line(x, 0, x, height);
    }
    for (let y = 0; y < height; y += step) {
        line(0, y, width, y);
    }
}

function drawConnections() {
    noFill();
    for (let i = 0; i < particles.length - 1; i++) {
        let p1 = particles[i];
        let p2 = particles[i+1];
        
        if (!p1.active || !p2.active) continue;

        let dOrig = dist(p1.targetHome.x, p1.targetHome.y, p2.targetHome.x, p2.targetHome.y);
        if (dOrig > 25) continue;

        let speed = (p1.vel.mag() + p2.vel.mag()) / 2;
        let sw = map(speed, 0, 12, 2.5, 0.4);
        sw = constrain(sw, 0.4, 2.5);
        
        stroke(0);
        strokeWeight(sw);
        line(p1.pos.x, p1.pos.y, p2.pos.x, p2.pos.y);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    lastTimeString = ""; // Re-init
}

class Particle {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.currentHome = createVector(x, y);
        this.targetHome = createVector(x, y);
        this.vel = createVector();
        this.acc = createVector();
        this.maxSpeed = 18;
        this.maxForce = 2.5;
        this.active = true;
    }
    
    setHome(x, y) {
        this.targetHome.set(x, y);
    }
    
    behaviors(pulse) {
        this.currentHome.lerp(this.targetHome, 0.08);
        let arrive = this.arrive(this.currentHome);
        let mouse = createVector(mouseX, mouseY);
        let flee = this.flee(mouse);
        
        arrive.mult(1.3);
        flee.mult(7);
        
        this.applyForce(arrive);
        this.applyForce(flee);
        
        if (this.active) {
            let pForce = createVector(pulse, pulse * cos(this.pos.x * 0.02));
            this.applyForce(pForce);
        }
    }
    
    applyForce(f) {
        this.acc.add(f);
    }
    
    update() {
        this.pos.add(this.vel);
        this.vel.add(this.acc);
        this.vel.mult(damping);
        this.acc.mult(0);
    }
    
    show() {
        if (!this.active) return;
        stroke(0);
        strokeWeight(3.5);
        point(this.pos.x, this.pos.y);
    }
    
    arrive(target) {
        let desired = p5.Vector.sub(target, this.pos);
        let d = desired.mag();
        let speed = this.maxSpeed;
        if (d < 120) {
            speed = map(d, 0, 120, 0, this.maxSpeed);
        }
        desired.setMag(speed);
        let steer = p5.Vector.sub(desired, this.vel);
        steer.limit(stiffness * 12);
        return steer;
    }
    
    flee(target) {
        let desired = p5.Vector.sub(target, this.pos);
        let d = desired.mag();
        if (d < mouseDist) {
            desired.setMag(this.maxSpeed);
            desired.mult(-2.2);
            let steer = p5.Vector.sub(desired, this.vel);
            steer.limit(this.maxForce);
            return steer;
        } else {
            return createVector(0, 0);
        }
    }
}
